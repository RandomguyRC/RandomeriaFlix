import { existsSync } from "fs";
import { isAbsolute, join } from "path";
import maxmind, { CityResponse, Reader } from "maxmind";

export interface DeviceInfo {
  deviceType: string;
  browser: string;
  os: string;
  userAgent: string;
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

let geoReader: Reader<CityResponse> | null | undefined = undefined; // undefined = not tried yet, null = tried and failed

function getHeader(request: Request, name: string) {
  return request.headers.get(name) || request.headers.get(name.toLowerCase());
}

function normalizeIp(ip: string) {
  const trimmed = ip.trim();
  if (!trimmed) return "unknown";
  if (trimmed.startsWith("::ffff:")) return trimmed.slice(7);
  return trimmed;
}

export function getClientIp(request: Request): string {
  const forwardedFor = getHeader(request, "x-forwarded-for");
  if (forwardedFor) {
    return normalizeIp(forwardedFor.split(",")[0]);
  }

  const realIp = getHeader(request, "x-real-ip");
  if (realIp) return normalizeIp(realIp);

  const cfIp = getHeader(request, "cf-connecting-ip");
  if (cfIp) return normalizeIp(cfIp);

  return "unknown";
}

export function parseDeviceInfo(request: Request): DeviceInfo {
  const userAgent = getHeader(request, "user-agent") || "";
  const ua = userAgent.toLowerCase();

  let deviceType = "desktop";
  if (/bot|crawler|spider|crawling/.test(ua)) deviceType = "bot";
  else if (/ipad|tablet|kindle|playbook/.test(ua)) deviceType = "tablet";
  else if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) deviceType = "mobile";
  else if (/android/.test(ua)) deviceType = "tablet";
  else if (!userAgent) deviceType = "unknown";

  let browser = "Unknown";
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/opr\//.test(ua) || /opera/.test(ua)) browser = "Opera";
  else if (/chrome\//.test(ua) || /crios\//.test(ua)) browser = "Chrome";
  else if (/firefox\//.test(ua) || /fxios\//.test(ua)) browser = "Firefox";
  else if (/safari\//.test(ua)) browser = "Safari";

  let os = "Unknown";
  if (/windows nt/.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/.test(ua)) os = "iOS";
  else if (/android/.test(ua)) os = "Android";
  else if (/mac os x|macintosh/.test(ua)) os = "macOS";
  else if (/linux/.test(ua)) os = "Linux";

  return { deviceType, browser, os, userAgent };
}

function getGeoDbPath() {
  const configured = process.env.GEOIP_DB_PATH;
  if (!configured) return null;
  return isAbsolute(configured) ? configured : join(process.cwd(), configured);
}

async function getGeoReader() {
  if (geoReader !== undefined) return geoReader;

  const dbPath = getGeoDbPath();
  if (!dbPath || !existsSync(dbPath)) {
    geoReader = null;
    return null;
  }

  try {
    geoReader = await maxmind.open<CityResponse>(dbPath, {
      cache: { max: 5000 },
      watchForUpdates: true,
      watchForUpdatesNonPersistent: true,
    });
    return geoReader;
  } catch (error) {
    console.warn("GeoIP database could not be opened:", error);
    geoReader = null;
    return null;
  }
}

function headerLocation(request: Request): LocationInfo {
  const country = getHeader(request, "cf-ipcountry") || getHeader(request, "cloudfront-viewer-country");
  const region = getHeader(request, "x-vercel-ip-country-region");
  const city = getHeader(request, "x-vercel-ip-city");
  const timezone = getHeader(request, "x-vercel-ip-timezone");

  return {
    country: country || undefined,
    region: region || undefined,
    city: city ? decodeURIComponent(city) : undefined,
    timezone: timezone || undefined,
  };
}

let webGeoCache = new Map<string, LocationInfo>();
const WEB_GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const WEB_GEO_RATE_LIMIT = 40; // stay under ip-api.com's 45/min free limit
let webGeoCount = 0;
let webGeoResetAt = Date.now();

async function lookupWebGeoIp(ipAddress: string): Promise<LocationInfo | null> {
  const cached = webGeoCache.get(ipAddress);
  if (cached) return cached;

  // Rate limit: reset counter every 60 s
  const now = Date.now();
  if (now - webGeoResetAt > 60_000) {
    webGeoCount = 0;
    webGeoResetAt = now;
  }
  if (webGeoCount >= WEB_GEO_RATE_LIMIT) return null;
  webGeoCount++;

  try {
    const res = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,regionName,city,lat,lon,timezone`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "success") return null;

    const info: LocationInfo = {
      country: data.country || undefined,
      region: data.regionName || undefined,
      city: data.city || undefined,
      timezone: data.timezone || undefined,
      latitude: data.lat ?? undefined,
      longitude: data.lon ?? undefined,
    };

    webGeoCache.set(ipAddress, info);
    // Evict old entries if cache grows too large
    if (webGeoCache.size > 5000) {
      webGeoCache = new Map([...webGeoCache.entries()].slice(-2000));
    }

    return info;
  } catch {
    return null;
  }
}

export async function lookupLocation(ipAddress: string, request: Request): Promise<LocationInfo> {
  const fallback = headerLocation(request);

  if (ipAddress === "unknown" || ipAddress === "127.0.0.1" || ipAddress === "::1") {
    return fallback;
  }

  // Try local MaxMind GeoIP database first
  const reader = await getGeoReader();
  if (reader && maxmind.validate(ipAddress)) {
    try {
      const result = reader.get(ipAddress);
      if (result) {
        const mmCountry = result.country?.names?.en || result.registered_country?.names?.en || fallback.country;
        const mmRegion = result.subdivisions?.[0]?.names?.en || fallback.region;
        const mmCity = result.city?.names?.en || fallback.city;

        // If MaxMind returned city + region, use it directly
        if (mmCity && mmRegion) {
          return {
            country: mmCountry,
            region: mmRegion,
            city: mmCity,
            timezone: result.location?.time_zone || fallback.timezone,
            latitude: result.location?.latitude,
            longitude: result.location?.longitude,
          };
        }

        // MaxMind had partial data — use ip-api.com fallback to fill in gaps
        const web = await lookupWebGeoIp(ipAddress);
        return {
          country: mmCountry || web?.country || fallback.country,
          region: mmRegion || web?.region || fallback.region,
          city: mmCity || web?.city || fallback.city,
          timezone: result.location?.time_zone || web?.timezone || fallback.timezone,
          latitude: result.location?.latitude ?? web?.latitude,
          longitude: result.location?.longitude ?? web?.longitude,
        };
      }
    } catch {
      // fall through to web fallback
    }
  }

  // MaxMind unavailable or returned nothing — try web fallback
  const web = await lookupWebGeoIp(ipAddress);
  return {
    country: web?.country || fallback.country,
    region: web?.region || fallback.region,
    city: web?.city || fallback.city,
    timezone: web?.timezone || fallback.timezone,
    latitude: web?.latitude,
    longitude: web?.longitude,
  };
}

export function classifyArea(pathname: string) {
  if (!pathname) return "Unknown";
  if (pathname.startsWith("/admin/live-chat")) return "Admin Live Chat";
  if (pathname.startsWith("/admin")) return "Admin Panel";
  if (pathname.startsWith("/watch") && pathname.includes("/livechat")) return "Viewer Live Chat";
  if (pathname.startsWith("/watch")) return "Viewer";
  if (pathname.startsWith("/profiles")) return "Profile Picker";
  if (pathname.startsWith("/intro")) return "Intro";
  if (pathname.startsWith("/api/")) return "API";
  return "App";
}

export function normalizePath(pathname: unknown) {
  if (typeof pathname !== "string") return "/";
  const trimmed = pathname.trim();
  if (!trimmed.startsWith("/")) return "/";
  return trimmed.slice(0, 300);
}

export async function getSessionMetadata(request: Request, pathname: string) {
  const ipAddress = getClientIp(request);
  const device = parseDeviceInfo(request);
  const location = await lookupLocation(ipAddress, request);
  const lastPath = normalizePath(pathname);

  return {
    ipAddress,
    ...location,
    ...device,
    lastPath,
    area: classifyArea(lastPath),
  };
}

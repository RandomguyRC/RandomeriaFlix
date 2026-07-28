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

export async function lookupLocation(ipAddress: string, request: Request): Promise<LocationInfo> {
  const fallback = headerLocation(request);

  if (ipAddress === "unknown" || ipAddress === "127.0.0.1" || ipAddress === "::1") {
    return fallback;
  }

  const reader = await getGeoReader();
  if (!reader || !maxmind.validate(ipAddress)) return fallback;

  try {
    const result = reader.get(ipAddress);
    if (!result) return fallback;

    return {
      country: result.country?.names?.en || result.registered_country?.names?.en || fallback.country,
      region: result.subdivisions?.[0]?.names?.en || fallback.region,
      city: result.city?.names?.en || fallback.city,
      timezone: result.location?.time_zone || fallback.timezone,
      latitude: result.location?.latitude,
      longitude: result.location?.longitude,
    };
  } catch {
    return fallback;
  }
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

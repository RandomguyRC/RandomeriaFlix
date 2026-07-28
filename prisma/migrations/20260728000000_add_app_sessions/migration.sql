-- CreateTable
CREATE TABLE "AppSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL DEFAULT 'unknown',
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "timezone" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "deviceType" TEXT NOT NULL DEFAULT 'unknown',
    "browser" TEXT NOT NULL DEFAULT 'Unknown',
    "os" TEXT NOT NULL DEFAULT 'Unknown',
    "userAgent" TEXT,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "lastPath" TEXT,
    "area" TEXT NOT NULL DEFAULT 'Unknown',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AppSession_lastActiveAt_idx" ON "AppSession"("lastActiveAt");

-- CreateIndex
CREATE INDEX "AppSession_role_lastActiveAt_idx" ON "AppSession"("role", "lastActiveAt");

-- CreateIndex
CREATE INDEX "AppSession_ipAddress_idx" ON "AppSession"("ipAddress");

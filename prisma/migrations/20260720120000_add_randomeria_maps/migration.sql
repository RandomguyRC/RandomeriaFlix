-- CreateTable
CREATE TABLE "MapConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "defaultLat" REAL NOT NULL DEFAULT 22.9734,
    "defaultLng" REAL NOT NULL DEFAULT 78.6569,
    "defaultZoom" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapConfig_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapPlace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "iconEmoji" TEXT NOT NULL DEFAULT '💖',
    "color" TEXT NOT NULL DEFAULT 'rose',
    "thumbnailContentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapPlace_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapPlace_thumbnailContentId_fkey" FOREIGN KEY ("thumbnailContentId") REFERENCES "ContentItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapPlaceContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mapPlaceId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MapPlaceContent_mapPlaceId_fkey" FOREIGN KEY ("mapPlaceId") REFERENCES "MapPlace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapPlaceContent_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MapConfig_profileId_key" ON "MapConfig"("profileId");

-- CreateIndex
CREATE INDEX "MapPlace_profileId_sortOrder_idx" ON "MapPlace"("profileId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MapPlaceContent_mapPlaceId_contentItemId_key" ON "MapPlaceContent"("mapPlaceId", "contentItemId");

-- CreateIndex
CREATE INDEX "MapPlaceContent_mapPlaceId_sortOrder_idx" ON "MapPlaceContent"("mapPlaceId", "sortOrder");

-- Add Randomeria Maps to viewer navigation for existing installs.
INSERT OR IGNORE INTO "NavTab" ("id", "slug", "label", "kind", "sortOrder", "isEnabled", "createdAt", "updatedAt")
VALUES ('randomeria-maps-tab', 'maps', 'Randomeria Maps', 'MAPS', 35, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

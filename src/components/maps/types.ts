export interface MapMediaAsset {
  id: string;
  mimeType: string;
}

export interface MapContentItem {
  id: string;
  type: string;
  title: string;
  mainAsset: MapMediaAsset;
  thumbnailAsset?: { id: string } | null;
}

export interface MapPlaceMedia {
  id: string;
  sortOrder: number;
  contentItem: MapContentItem;
}

export interface MapPlace {
  id: string;
  title: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  iconEmoji: string;
  color: string;
  thumbnailContentId?: string | null;
  sortOrder: number;
  isPublished?: boolean;
  media: MapPlaceMedia[];
}

export interface MapConfig {
  defaultLat: number;
  defaultLng: number;
  defaultZoom: number;
  description?: string | null;
}

export interface MapMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  iconEmoji?: string;
  color?: string;
  thumbnailUrl?: string;
}

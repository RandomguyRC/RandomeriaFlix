export interface ContentItem {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  dateLabel?: string | null;
  tags?: string | null;
  mood?: string | null;
  thumbCropX?: number | null;
  thumbCropY?: number | null;
  musicStartMs?: number | null;
  musicDurationMs?: number | null;
  videoRotation?: number | null;

  mainAsset: {
    id: string;
    mimeType: string;
  };

  thumbnailAsset?: {
    id: string;
  } | null;

  musicAsset?: {
    id: string;
    mimeType: string;
  } | null;
}

export interface Placement {
  id: string;
  contentItem: ContentItem;
}

export interface Category {
  id: string;
  title: string;
  placements: Placement[];
}
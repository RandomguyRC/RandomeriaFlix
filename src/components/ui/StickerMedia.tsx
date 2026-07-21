"use client";

interface StickerMediaProps {
  assetId: string;
  mimeType?: string | null;
  title?: string;
  className?: string;
  /** Larger stickers (expanded view) can use native controls instead of silent autoplay loop */
  expanded?: boolean;
}

export default function StickerMedia({ assetId, mimeType, title, className, expanded }: StickerMediaProps) {
  const isVideo = !!mimeType && mimeType.startsWith("video/");
  const src = `/api/media/${assetId}`;

  if (isVideo) {
    return (
      <video
        src={src}
        className={className}
        autoPlay
        loop
        muted
        playsInline
        controls={expanded}
        // Keep looping smoothly even with controls shown
        preload="metadata"
      />
    );
  }

  // image/png, image/webp (static or animated), image/gif (animated) all autoplay natively via <img>
  return <img src={src} alt={title || "Sticker"} className={className} loading="lazy" />;
}

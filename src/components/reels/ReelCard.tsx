"use client";

import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Share2, Send, X, Pause } from "lucide-react";

interface ReelItem {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  dateLabel?: string | null;
  tags?: string | null;
  mood?: string | null;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  videoRotation?: number | null;
  mainAsset: { id: string; mimeType: string };
  thumbnailAsset?: { id: string } | null;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export default function ReelCard({
  reel,
  isActive,
  onInView,
}: {
  reel: ReelItem;
  isActive: boolean;
  onInView: () => void;
}) {
  const [liked, setLiked] = useState(reel.liked);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Intersection observer for snap
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onInView(); },
      { threshold: 0.6 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onInView]);

  // Auto-play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.currentTime = 0;
      video.muted = false;
      video.play().catch(() => {
        // If autoplay blocked, try muted first then unmute
        video.muted = true;
        video.play().then(() => { video.muted = false; }).catch(() => {});
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive]);

  // Tap to play/pause
  const [showPauseIcon, setShowPauseIcon] = useState(false);

  function handleMediaTap() {
    if (isVideo && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setShowPauseIcon(false);
      } else {
        videoRef.current.pause();
        setShowPauseIcon(true);
      }
    }
  }

  // Load comments when panel opens
  useEffect(() => {
    if (showComments && comments.length === 0) {
      setLoadingComments(true);
      fetch(`/api/reels/${reel.id}/comments`)
        .then((r) => r.json())
        .then(setComments)
        .finally(() => setLoadingComments(false));
    }
  }, [showComments]);

  const isVideo = reel.type === "VIDEO";

  async function toggleLike() {
    try {
      const res = await fetch(`/api/reels/${reel.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount((c) => (data.liked ? c + 1 : c - 1));
      }
    } catch {}
  }

  async function addComment() {
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`/api/reels/${reel.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText, author: "You" }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [comment, ...prev]);
        setCommentText("");
      }
    } catch {}
  }

  return (
    <div
      ref={ref}
      className="relative h-[calc(100vh-56px)] w-full snap-start flex items-center justify-center bg-black"
      onClick={handleMediaTap}
    >
      {/* Pause indicator */}
      {showPauseIcon && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-black/40 p-4 backdrop-blur-sm">
            <Pause className="h-8 w-8 text-white" />
          </div>
        </div>
      )}

      {/* Media */}
      <div className="absolute inset-0 pointer-events-none">
        {isVideo ? (
          <video
            ref={videoRef}
            src={`/api/media/${reel.mainAsset.id}`}
            className={`h-full w-full ${isPortrait ? "object-contain bg-black" : "object-cover"}`}
            style={{ transform: `rotate(${reel.videoRotation ?? 0}deg)` }}
            loop
            playsInline
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              setIsPortrait(video.videoHeight > video.videoWidth);
            }}
          />
        ) : (
          <img
            src={`/api/media/${reel.mainAsset.id}?w=800`}
            alt={reel.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Pause indicator */}
      {showPauseIcon && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-black/40 p-4 backdrop-blur-sm">
            <Pause className="h-8 w-8 text-white" />
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 pointer-events-none" />

      {/* Right side actions */}
      <div className="absolute right-4 bottom-32 z-10 flex flex-col items-center gap-5" onClick={(e) => e.stopPropagation()}>
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <div className={`rounded-full p-3 transition-all ${liked ? "bg-red-500/20" : "bg-black/30 backdrop-blur-sm"}`}>
            <Heart className={`h-7 w-7 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
          </div>
          <span className="text-xs text-white font-medium">{likeCount}</span>
        </button>

        <button onClick={() => setShowComments(!showComments)} className="flex flex-col items-center gap-1">
          <div className="rounded-full bg-black/30 p-3 backdrop-blur-sm">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <span className="text-xs text-white font-medium">{reel.commentCount}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="rounded-full bg-black/30 p-3 backdrop-blur-sm">
            <Share2 className="h-7 w-7 text-white" />
          </div>
          <span className="text-xs text-white font-medium">Share</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-20 z-10" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2">
          {reel.mood && (
            <span className="mr-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">
              {reel.mood}
            </span>
          )}
          {reel.dateLabel && (
            <span className="text-xs text-white/60">{reel.dateLabel}</span>
          )}
        </div>
        <p className="text-sm font-semibold text-white">{reel.title}</p>
        {reel.description && (
          <div className="mt-1">
            {showDesc ? (
              <p className="text-sm text-white/80">{reel.description}</p>
            ) : (
              <button onClick={() => setShowDesc(true)} className="text-sm text-white/60">
                {reel.description.length > 80 ? reel.description.slice(0, 80) + "..." : reel.description}
              </button>
            )}
          </div>
        )}
        {reel.tags && (
          <p className="mt-1 text-xs text-white/40">
            {reel.tags.split(",").map((t) => `#${t.trim()}`).join(" ")}
          </p>
        )}
      </div>

      {/* Comments panel */}
      {showComments && (
        <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">{comments.length} Comments</p>
            <button onClick={() => setShowComments(false)} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {loadingComments ? (
              <p className="text-center text-sm text-gray-500">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-center text-sm text-gray-500">No comments yet. Be the first!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
                      {c.author.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white">{c.author}</span>
                      <span className="ml-2 text-[10px] text-gray-500">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 ml-9 text-sm text-gray-300">{c.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-800 px-4 py-3 flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()}
              placeholder="Add a comment..."
              className="flex-1 rounded-full bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
            <button onClick={addComment} className="text-red-500 hover:text-red-400">
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

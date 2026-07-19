"use client";

interface VinylRecordProps {
  albumArt: string;
  isPlaying: boolean;
  size?: number;
}

export default function VinylRecord({ albumArt, isPlaying, size = 200 }: VinylRecordProps) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Vinyl disc */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `
            radial-gradient(circle, transparent 28%, rgba(0,0,0,0.3) 28.5%, rgba(0,0,0,0.3) 29%, transparent 29.5%),
            repeating-radial-gradient(circle, transparent 0px, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px),
            radial-gradient(circle, #1a1a1a 0%, #0d0d0d 60%, #050505 100%)
          `,
          animation: isPlaying ? "vinyl-spin 4s linear infinite" : "none",
        }}
      />

      {/* Center label / album art */}
      <div
        className="absolute rounded-full overflow-hidden border-2 border-gray-700/50"
        style={{
          width: size * 0.38,
          height: size * 0.38,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {albumArt ? (
          <img src={albumArt} alt="Album" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <span className="text-gray-500 text-xs">♫</span>
          </div>
        )}
      </div>

      {/* Center hole */}
      <div
        className="absolute rounded-full bg-gray-950 border border-gray-700/30"
        style={{
          width: size * 0.06,
          height: size * 0.06,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Subtle reflection */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
        }}
      />
    </div>
  );
}

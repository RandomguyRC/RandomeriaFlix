import { motion } from "motion/react";
import { Heart, Film, Book, MessageCircle } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
      {/* Cinematic background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#050304] via-[#120A0B] to-[#8B0000]/20" />
      
      {/* Radial glow effect */}
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B0000]/10 blur-[120px]" />

      <section className="relative z-10 max-w-5xl text-center">
        {/* Animated logo/icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            duration: 0.8, 
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
          className="mb-8 flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-[#8B0000] opacity-20 blur-xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#8B0000] to-[#a80000] shadow-2xl">
              <Heart className="h-12 w-12 fill-white text-white" />
            </div>
          </div>
        </motion.div>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-4 font-['Outfit'] text-sm font-semibold uppercase tracking-[0.3em] text-[#8B0000]"
        >
          Private Memory Cinema
        </motion.p>
        
        {/* Main title */}
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mb-6 font-['Playfair_Display'] text-6xl font-bold leading-tight tracking-tight text-white sm:text-7xl md:text-8xl lg:text-9xl"
        >
          RandomeriaFlix
        </motion.h1>
        
        {/* Description */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mx-auto mb-12 max-w-2xl font-['Outfit'] text-base leading-relaxed text-[#A39294] sm:text-lg md:text-xl"
        >
          A cinematic journey through our most cherished memories. 
          Every moment, every smile, every heartbeat — preserved in luxury.
        </motion.p>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mb-12 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4"
        >
          <div className="group flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#8B0000]/50 hover:bg-white/10">
            <Film className="h-8 w-8 text-[#8B0000] transition-transform duration-300 group-hover:scale-110" />
            <span className="font-['Outfit'] text-sm font-medium text-white">Videos</span>
          </div>
          <div className="group flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#8B0000]/50 hover:bg-white/10">
            <Heart className="h-8 w-8 text-[#8B0000] transition-transform duration-300 group-hover:scale-110" />
            <span className="font-['Outfit'] text-sm font-medium text-white">Memories</span>
          </div>
          <div className="group flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#8B0000]/50 hover:bg-white/10">
            <MessageCircle className="h-8 w-8 text-[#8B0000] transition-transform duration-300 group-hover:scale-110" />
            <span className="font-['Outfit'] text-sm font-medium text-white">Chats</span>
          </div>
          <div className="group flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#8B0000]/50 hover:bg-white/10">
            <Book className="h-8 w-8 text-[#8B0000] transition-transform duration-300 group-hover:scale-110" />
            <span className="font-['Outfit'] text-sm font-medium text-white">Books</span>
          </div>
        </motion.div>
        
        {/* Decorative divider */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 1 }}
          className="mx-auto h-1 w-40 rounded-full bg-[#8B0000] shadow-[0_0_28px_rgba(139,0,0,0.8)]"
        />
      </section>
    </main>
  );
}

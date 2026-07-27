"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Heart, Lock } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Authentication failed");
        return;
      }

      const { redirectTo } = await response.json();
      router.push(redirectTo);
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050304] p-6">
      {/* Romantic background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#8B0000]/20 via-[#050304] to-[#120A0B]" />
      
      {/* Animated particles/hearts in background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#8B0000]/30"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-[#050304]/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {/* Logo/Header */}
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-4 flex justify-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#8B0000] to-[#a80000] shadow-lg">
                <Heart className="h-8 w-8 fill-white text-white" />
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-2 font-['Playfair_Display'] text-4xl font-bold text-white"
            >
              RandomeriaFlix
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="font-['Outfit'] text-sm text-[#A39294]"
            >
              Enter your password to unlock our memories
            </motion.p>
          </div>

          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A39294]" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#120A0B]/50 py-3.5 pl-12 pr-4 font-['Outfit'] text-white placeholder-[#A39294] backdrop-blur-sm transition-all duration-300 focus:border-[#8B0000] focus:outline-none focus:ring-2 focus:ring-[#8B0000]/50"
                  placeholder="Password (Hint: DDMMYY)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password-input"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center"
              >
                <p className="font-['Outfit'] text-sm font-medium text-red-400">
                  {error}
                </p>
              </motion.div>
            )}

            <button
              type="submit"
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-[#8B0000] px-6 py-3.5 font-['Outfit'] text-base font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#a80000] hover:shadow-[0_0_30px_rgba(139,0,0,0.5)] focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:ring-offset-2 focus:ring-offset-[#050304] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              data-testid="login-submit-button"
            >
              {isLoading ? (
                <>
                  <svg
                    className="mr-3 h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Unlocking...
                </>
              ) : (
                <>
                  Unlock Memories
                  <Heart className="ml-2 h-5 w-5 fill-white transition-transform duration-300 group-hover:scale-110" />
                </>
              )}
            </button>
          </motion.form>

          {/* Decorative element */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-8 h-0.5 w-full bg-gradient-to-r from-transparent via-[#8B0000]/50 to-transparent"
          />
        </div>
      </motion.div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export default function IntroPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-lg text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <img src="/logo.png" alt="RandomeriaFlix" className="mx-auto mb-8 h-16 w-auto" />

          <h1 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
            Welcome Back ❤️
          </h1>

          <p className="mb-6 text-base leading-relaxed text-gray-400">
            This app is to help you recall your memories
            which you have forgotten.
          </p>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/profiles")}
            className="rounded-full bg-red-600 px-10 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-colors hover:bg-red-700"
          >
            Continue
          </motion.button>
        </motion.div>
      </div>
    </main>
  );
}

"use client";

import { motion } from "framer-motion";
import AuraAvatar from "./AuraAvatar";

export default function ThinkingDots() {
  return (
    <div className="flex items-start gap-2.5 mb-4" aria-label="Aura is thinking">
      <AuraAvatar state="thinking" size={32} />
      <div className="bg-white dark:bg-gray-800/90 shadow-sm border border-gray-100 dark:border-gray-700/50 rounded-2xl px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-amber-400"
            animate={{
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              repeat: Infinity,
              duration: 0.8,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import type { Category } from "@/types";

interface CategoryTilesProps {
  categories: Category[];
  onSelect?: (category: Category) => void;
  showMoreMessage?: string;
}

const categoryIcons: Record<string, string> = {
  books: "📚",
  fashion: "👗",
  giftset: "🎁",
  kidstoys: "🧸",
  babyitems: "👶",
  sports: "⚽",
  flowers: "🌸",
  "personalized gifts": "🎁",
  cakes: "🎂",
  chocolates: "🍫",
  electronic: "📱",
  grocery: "🛒",
  jewellery: "💎",
  perfumes: "✨",
  birthday: "🎂",
  wedding: "💒",
  valentine: "❤️",
  christmas: "🎄",
  anniversary: "💕",
  mother: "💐",
  fathersday: "👔",
  graduation: "🎓",
  corporate: "🏢",
  pet: "🐾",
  liquor: "🍷",
  cosmetics: "💄",
  pharmacy: "💊",
  household: "🏠",
  softtoy: "🧸",
  clothing: "👕",
  bestsellers: "⭐",
  newadditions: "🆕",
  samedaydelivery: "🚀",
  uniquegifts: "✨",
};

function getIcon(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, "");
  return categoryIcons[key] || "🏷️";
}

export default function CategoryTiles({ categories, onSelect, showMoreMessage }: CategoryTilesProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-1 flex items-center gap-2">
        <span className="w-4 h-0.5 bg-gradient-to-r from-aura-gold to-aura-emerald rounded-full" />
        Found {categories.length} categories
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {categories.map((cat, i) => (
          <motion.button
            key={cat.id}
            className="category-tile rounded-xl px-3 py-2.5 text-left group"
            onClick={() => onSelect?.(cat)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.6), type: "spring" as const, damping: 20, stiffness: 300 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg flex-shrink-0">{getIcon(cat.name)}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-aura-gold dark:group-hover:text-aura-goldenLight transition-colors">
                {cat.name}
              </span>
            </div>
          </motion.button>
        ))}
        {showMoreMessage && (
          <div className="category-tile rounded-xl px-3 py-2.5 flex items-center justify-center">
            <span className="text-xs font-medium text-aura-gold dark:text-aura-goldenLight text-center">
              {showMoreMessage}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

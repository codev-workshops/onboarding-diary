"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { City } from "@/types";

interface CityListProps {
  cities: City[];
  onSelectCity?: (cityName: string) => void;
}

export default function CityList({ cities, onSelectCity }: CityListProps) {
  const reducedMotion = useReducedMotion();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return cities;
    const q = filter.toLowerCase();
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.aliases?.some((a) => a.toLowerCase().includes(q))
    );
  }, [cities, filter]);

  return (
    <motion.div
      className="rounded-2xl border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-900 p-4 shadow-sm"
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Delivery Cities ({cities.length})
      </h4>

      {/* Search / filter input */}
      <div className="relative mb-3">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter cities..."
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
            bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-aura-gold/50"
        />
      </div>

      {/* City grid */}
      <div className="max-h-48 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {filtered.map((city) => (
            <button
              key={city.name}
              onClick={() => onSelectCity?.(city.name)}
              className="text-left text-sm px-3 py-2 rounded-lg transition-colors
                text-gray-700 dark:text-gray-300
                hover:bg-amber-50 dark:hover:bg-amber-900/30
                hover:text-amber-700 dark:hover:text-amber-300
                focus:outline-none focus:ring-2 focus:ring-aura-gold/50"
            >
              {city.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-gray-400 dark:text-gray-500 py-3">
              No cities match &ldquo;{filter}&rdquo;
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

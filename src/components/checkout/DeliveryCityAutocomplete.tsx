"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DeliveryCityAutocompleteProps {
  value: string;
  onChange: (city: string) => void;
  onCityConfirmed?: (city: string) => void;
}

interface CityOption {
  name: string;
  aliases?: string[];
}

export default function DeliveryCityAutocomplete({
  value,
  onChange,
  onCityConfirmed,
}: DeliveryCityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CityOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/cities?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error("Failed to fetch cities");
      const data = await res.json();
      const cityNames: string[] = data.cities ?? [];
      setSuggestions(
        cityNames
          .map((name) => ({ name: name.trim() }))
          .filter((c) => c.name.length > 0)
      );
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.length >= 2) {
        fetchCities(value);
        setIsOpen(true);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchCities]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectCity = (cityName: string) => {
    onChange(cityName);
    setIsOpen(false);
    onCityConfirmed?.(cityName);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Delivery City
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Type a city name (e.g. Colombo)"
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-aura-gold/50 focus:border-aura-gold"
          autoComplete="off"
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
            border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.ul
            className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg
              bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {suggestions.map((city) => (
              <li key={city.name}>
                <button
                  type="button"
                  onClick={() => selectCity(city.name)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                    hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300
                    transition-colors"
                >
                  {city.name}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

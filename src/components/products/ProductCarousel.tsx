"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ProductCard from "./ProductCard";
import type { Product } from "@/types";

interface ProductCarouselProps {
  products: Product[];
  title?: string;
  onViewDetails?: (product: Product) => void;
}

const cardContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, damping: 20, stiffness: 300 },
  },
};

export default function ProductCarousel({
  products,
  title,
  onViewDetails,
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 260;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 300);
  };

  useEffect(() => {
    checkScroll();
    const current = scrollRef.current;
    if (!current) return;

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(current);
    return () => resizeObserver.disconnect();
  }, [products.length]);

  if (products.length === 0) return null;

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1 flex items-center gap-2">
          <span className="w-4 h-0.5 bg-gradient-to-r from-aura-gold to-aura-emerald rounded-full" />
          {title}
        </h3>
      )}
      <div className="relative group">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 touch-target
              w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg backdrop-blur-sm
              flex items-center justify-center text-gray-600 dark:text-gray-300
              opacity-0 group-hover:opacity-100 transition-all hover:bg-white dark:hover:bg-gray-800
              border border-gray-200/50 dark:border-gray-600/50"
            aria-label="Scroll left"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}

        <motion.div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-thin pb-2 px-0.5 overscroll-x-contain"
          variants={cardContainerVariants}
          initial="hidden"
          animate="visible"
          onScroll={checkScroll}
        >
          {products.map((product) => (
            <motion.div
              key={product.id}
              variants={cardItemVariants}
              className="snap-center flex-shrink-0 w-[min(78vw,280px)]"
            >
              <ProductCard product={product} onViewDetails={onViewDetails} />
            </motion.div>
          ))}
        </motion.div>

        {/* Right arrow */}
        {canScrollRight && products.length > 1 && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 touch-target
              w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg backdrop-blur-sm
              flex items-center justify-center text-gray-600 dark:text-gray-300
              opacity-0 group-hover:opacity-100 transition-all hover:bg-white dark:hover:bg-gray-800
              border border-gray-200/50 dark:border-gray-600/50"
            aria-label="Scroll right"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { motion, useAnimationControls } from "framer-motion";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  onViewDetails?: (product: Product) => void;
  recommendation?: string;
}

function getStockColor(product: Product) {
  if (!product.inStock) return "text-red-500 bg-red-50 dark:bg-red-900/30";
  if (product.stockLevel === "low") return "text-amber-600 bg-amber-50 dark:bg-amber-900/30";
  return "text-violet-600 bg-violet-50 dark:bg-violet-900/30";
}

function getStockLabel(product: Product) {
  if (!product.inStock) return "Out of Stock";
  if (product.stockLevel === "low") return "Low Stock";
  return "In Stock";
}

function getStockDot(product: Product) {
  if (!product.inStock) return "bg-red-500";
  if (product.stockLevel === "low") return "bg-amber-500 animate-pulse";
  return "bg-violet-500";
}

export default function ProductCard({
  product,
  onViewDetails,
  recommendation,
}: ProductCardProps) {
  const { dispatch } = useCart();
  const controls = useAnimationControls();

  const handleAddToCart = () => {
    controls.start({
      scale: [1, 1.15, 1],
      transition: { duration: 0.35, times: [0, 0.4, 1] },
    });
    dispatch({
      type: "ADD_ITEM",
      payload: {
        productId: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        quantity: 1,
        imageUrl: product.imageUrl,
      },
    });
  };

  return (
    <motion.div
      className="product-card rounded-2xl bg-white dark:bg-gray-800/80 overflow-hidden shadow-sm w-full border border-gray-100 dark:border-gray-700/50"
      role="article"
      aria-label={`${product.name}, ${product.currency} ${product.price.toLocaleString()}, ${getStockLabel(product)}`}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Image section */}
      <div className="relative h-44 w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 overflow-hidden group">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={`${product.name} — product photo`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
            </svg>
          </div>
        )}

        {/* Stock badge - top right */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium backdrop-blur-sm ${getStockColor(product)}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${getStockDot(product)}`} />
            {getStockLabel(product)}
          </span>
        </div>

        {/* Category badge - top left */}
        {product.category && (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[11px] font-medium rounded-full bg-black/40 text-white backdrop-blur-sm">
            {product.category}
          </span>
        )}
      </div>

      {/* Content section */}
      <div className="p-3.5">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 leading-snug">
          {product.name}
        </h3>

        {/* Price & rating */}
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {product.currency}{" "}
            <span className="tabular-nums">{product.price.toLocaleString()}</span>
          </span>
          {product.rating != null && product.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {product.rating.toFixed(1)}
            </span>
          )}
        </div>

        {recommendation && (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-2 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
            💡 {recommendation}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails?.(product)}
            className="touch-target flex-1 py-2 px-3 text-xs font-semibold rounded-xl
              border border-gray-200 dark:border-gray-600
              text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
          >
            Details
          </button>
          <motion.button
            onClick={handleAddToCart}
            animate={controls}
            disabled={!product.inStock}
            className="touch-target flex-1 py-2 px-3 text-xs font-semibold rounded-xl
              bg-gradient-to-r from-aura-gold to-aura-emerald hover:from-yellow-600 hover:to-violet-700
              text-white shadow-sm hover:shadow-md
              disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Add to Cart
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

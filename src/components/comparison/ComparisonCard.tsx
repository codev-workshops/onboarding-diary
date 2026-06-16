"use client";

import Image from "next/image";
import type { Product } from "@/types";

interface ComparisonCardProps {
  product: Product;
  isBestValue?: boolean;
  onAddToCart?: (product: Product) => void;
}

export default function ComparisonCard({
  product,
  isBestValue = false,
  onAddToCart,
}: ComparisonCardProps) {
  return (
    <div
      className={`relative rounded-xl border p-4 bg-white dark:bg-gray-800 ${
        isBestValue
          ? "border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {isBestValue && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-bold rounded-full bg-primary-500 text-white">
          Best Value ✦
        </span>
      )}

      <div className="relative h-32 w-full bg-gray-100 dark:bg-gray-700 rounded-lg mb-3">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="250px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
            📦
          </div>
        )}
      </div>

      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
        {product.name}
      </h4>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Price</span>
          <span className="font-bold text-primary-700 dark:text-primary-400">
            {product.currency} {product.price.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Rating</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {product.rating ? `${product.rating}/5 ⭐` : "N/A"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Stock</span>
          <span
            className={`font-medium ${
              product.inStock ? "text-green-600" : "text-red-500"
            }`}
          >
            {product.inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>
      </div>

      {onAddToCart && (
        <button
          onClick={() => onAddToCart(product)}
          disabled={!product.inStock}
          className="mt-3 w-full touch-target py-2 text-xs font-medium rounded-lg
            bg-primary-500 hover:bg-primary-600 text-white
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add to Cart
        </button>
      )}
    </div>
  );
}

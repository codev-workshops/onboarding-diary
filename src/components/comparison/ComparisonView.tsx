"use client";

import { motion } from "framer-motion";
import ComparisonCard from "./ComparisonCard";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types";

interface ComparisonViewProps {
  products: Product[];
}

function getBestValue(products: Product[]): string | null {
  const withRating = products.filter((p) => p.rating);
  if (withRating.length < 2) return null;
  const best = withRating.reduce((a, b) =>
    (a.rating ?? 0) / a.price > (b.rating ?? 0) / b.price ? a : b
  );
  return best.id;
}

export default function ComparisonView({ products }: ComparisonViewProps) {
  const { dispatch } = useCart();
  const bestValueId = getBestValue(products);

  const handleAddToCart = (product: Product) => {
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
    <div className="w-full">
      {/* Desktop: side-by-side grid */}
      <div className="hidden lg:grid grid-cols-2 lg:grid-cols-3 gap-4">
        {products.slice(0, 3).map((product) => (
          <ComparisonCard
            key={product.id}
            product={product}
            isBestValue={product.id === bestValueId}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>

      {/* Mobile: swipeable horizontal */}
      <motion.div
        className="lg:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 pb-2"
        drag="x"
        dragConstraints={{ left: -((products.length - 1) * 280), right: 0 }}
      >
        {products.slice(0, 3).map((product) => (
          <motion.div
            key={product.id}
            className="snap-center min-w-[280px] flex-shrink-0"
          >
            <ComparisonCard
              product={product}
              isBestValue={product.id === bestValueId}
              onAddToCart={handleAddToCart}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

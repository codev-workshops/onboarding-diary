"use client";

export default function ProductCardSkeleton() {
  return (
    <div
      className="rounded-2xl bg-white dark:bg-gray-800/80 overflow-hidden shadow-sm min-w-[220px] max-w-[280px] border border-gray-100 dark:border-gray-700/50"
      role="status"
      aria-label="Loading product"
    >
      {/* Image placeholder with shimmer */}
      <div className="h-44 w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 relative overflow-hidden">
        <div className="absolute inset-0 animate-shimmer" />
        {/* Stock badge placeholder */}
        <div className="absolute top-2.5 right-2.5">
          <div className="h-4 w-16 rounded-full bg-gray-200/60 dark:bg-gray-600/40" />
        </div>
        {/* Category badge placeholder */}
        <div className="absolute top-2.5 left-2.5">
          <div className="h-4 w-14 rounded-full bg-gray-200/60 dark:bg-gray-600/40" />
        </div>
      </div>

      {/* Content placeholder */}
      <div className="p-3.5 space-y-2.5">
        {/* Title — two lines */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-lg w-[85%] animate-pulse" />
          <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-lg w-[60%] animate-pulse" />
        </div>

        {/* Price */}
        <div className="pt-1">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-[40%] animate-pulse" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1.5">
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1 animate-pulse" />
          <div className="h-9 rounded-xl flex-1 animate-pulse bg-gradient-to-r from-amber-100 to-violet-100 dark:from-amber-900/20 dark:to-violet-900/20" />
        </div>
      </div>
    </div>
  );
}

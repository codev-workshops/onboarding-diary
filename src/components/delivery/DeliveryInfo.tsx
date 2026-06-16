"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { DeliveryResult } from "@/types";

interface DeliveryInfoProps {
  delivery: DeliveryResult;
}

export default function DeliveryInfo({ delivery }: DeliveryInfoProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`rounded-2xl border p-4 shadow-sm ${
        delivery.available
          ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30"
          : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"
      }`}
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Availability badge */}
      <div className="flex items-center gap-2 mb-3">
        {delivery.available ? (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Delivery Available
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Not Available
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex justify-between">
          <span className="font-medium">City</span>
          <span>{delivery.city}</span>
        </div>
        {delivery.available && delivery.deliveryDate && (
          <div className="flex justify-between">
            <span className="font-medium">Delivery Date</span>
            <span className="text-green-700 dark:text-green-300 font-medium">
              {delivery.deliveryDate}
            </span>
          </div>
        )}
        {delivery.available && delivery.rate != null && (
          <div className="flex justify-between">
            <span className="font-medium">Rate</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {delivery.currency || "LKR"} {delivery.rate.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Perishable warning */}
      {delivery.perishableWarning && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2
          bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {delivery.perishableWarning}
        </div>
      )}
    </motion.div>
  );
}

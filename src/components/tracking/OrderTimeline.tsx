"use client";

import type { OrderTracking } from "@/types";

interface OrderTimelineProps {
  tracking: OrderTracking;
}

export default function OrderTimeline({ tracking }: OrderTimelineProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
        Order {tracking.orderId}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Status: {tracking.status}
        {tracking.estimatedDelivery && ` · ETA: ${tracking.estimatedDelivery}`}
      </p>

      <div className="space-y-0">
        {tracking.steps.map((step, index) => (
          <div key={index} className="flex gap-3">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  step.completed
                    ? "bg-green-500"
                    : step.current
                      ? "bg-primary-500 ring-2 ring-primary-200"
                      : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
              {index < tracking.steps.length - 1 && (
                <div
                  className={`w-0.5 h-8 ${
                    step.completed
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              )}
            </div>

            {/* Step content */}
            <div className="pb-6">
              <p
                className={`text-sm font-medium ${
                  step.current
                    ? "text-primary-700 dark:text-primary-400"
                    : step.completed
                      ? "text-gray-900 dark:text-gray-100"
                      : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {step.description}
                </p>
              )}
              {step.timestamp && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {step.timestamp}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

const cartSidebarVariants = {
  closed: { x: "100%" },
  open: {
    x: 0,
    transition: { type: "spring" as const, damping: 25, stiffness: 250 },
  },
};

const overlayVariants = {
  closed: { opacity: 0 },
  open: { opacity: 0.5, transition: { duration: 0.2 } },
};

export default function CartPanel({ isOpen, onClose, onCheckout }: CartPanelProps) {
  const { state, dispatch, totalItems, totalPrice } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black z-40"
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
          />

          {/* Desktop sidebar */}
          <motion.aside
            className="hidden md:flex fixed right-0 top-0 h-full w-80 z-50
              bg-white dark:bg-gray-900 shadow-2xl flex-col"
            variants={cartSidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <CartContent
              state={state}
              dispatch={dispatch}
              totalItems={totalItems}
              totalPrice={totalPrice}
              onClose={onClose}
              onCheckout={onCheckout}
            />
          </motion.aside>

          {/* Mobile bottom sheet */}
          <motion.div
            className="md:hidden fixed bottom-0 left-0 right-0 z-50
              rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) onClose();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            style={{ maxHeight: "85dvh" }}
          >
            <div className="mx-auto my-2 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            <div className="overflow-y-auto" style={{ maxHeight: "calc(85dvh - 20px)" }}>
              <CartContent
                state={state}
                dispatch={dispatch}
                totalItems={totalItems}
                totalPrice={totalPrice}
                onClose={onClose}
                onCheckout={onCheckout}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CartContent({
  state,
  dispatch,
  totalItems,
  totalPrice,
  onClose,
  onCheckout,
}: {
  state: ReturnType<typeof useCart>["state"];
  dispatch: ReturnType<typeof useCart>["dispatch"];
  totalItems: number;
  totalPrice: number;
  onClose: () => void;
  onCheckout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Cart ({totalItems})
        </h2>
        <button
          onClick={onClose}
          className="touch-target w-8 h-8 flex items-center justify-center
            text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close cart"
        >
          ✕
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {state.items.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            Your cart is empty. Let Aura help you find something!
          </p>
        ) : (
          state.items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    📦
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {item.name}
                </p>
                {item.variant && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.variant}
                  </p>
                )}
                <p className="text-sm font-bold text-primary-700 dark:text-primary-400">
                  {item.currency} {(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <button
                  onClick={() =>
                    dispatch({
                      type: "REMOVE_ITEM",
                      payload: { productId: item.productId },
                    })
                  }
                  className="text-xs text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400
                    transition-colors px-1"
                  aria-label={`Remove ${item.name} from cart`}
                >
                  ✕
                </button>
                <div className="flex items-center gap-0.5 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 shadow-sm">
                  <button
                    onClick={() =>
                      dispatch({
                        type: "UPDATE_QUANTITY",
                        payload: {
                          productId: item.productId,
                          quantity: item.quantity - 1,
                        },
                      })
                    }
                    className="w-7 h-7 flex items-center justify-center text-sm font-medium
                      text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600
                      rounded-l-lg transition-colors"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="text-xs w-6 text-center font-semibold text-gray-800 dark:text-gray-100">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "UPDATE_QUANTITY",
                        payload: {
                          productId: item.productId,
                          quantity: item.quantity + 1,
                        },
                      })
                    }
                    className="w-7 h-7 flex items-center justify-center text-sm font-medium
                      text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600
                      rounded-r-lg transition-colors"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Gift message */}
      {state.items.length > 0 && (
        <div className="px-4 pb-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            <span>🎁</span>
            <span>Gift Message</span>
          </label>
          <textarea
            placeholder="Write a personal message for the recipient..."
            value={state.giftMessage || ""}
            onChange={(e) =>
              dispatch({ type: "SET_GIFT_MESSAGE", payload: e.target.value || null })
            }
            rows={2}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
              bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
              placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-aura-gold/50
              focus:border-aura-gold resize-none"
          />
        </div>
      )}

      {/* Footer */}
      {state.items.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between mb-3">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Total
            </span>
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
              LKR {totalPrice.toLocaleString()}
            </span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full touch-target py-3 rounded-xl font-semibold text-white
              bg-gradient-to-r from-aura-gold to-aura-emerald
              hover:from-yellow-600 hover:to-violet-700
              shadow-lg shadow-aura-gold/25 transition-all"
          >
            Proceed to Checkout →
          </button>
        </div>
      )}
    </div>
  );
}

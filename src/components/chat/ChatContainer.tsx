"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useChat, Message } from "ai/react";
import { motion, AnimatePresence } from "framer-motion";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import ThinkingDots from "./ThinkingDots";
import QuickActionChips from "./QuickActionChips";
import ChatInput from "./ChatInput";
import OfflineBanner from "./OfflineBanner";
import ToolResultRenderer from "./ToolResultRenderer";
import CartPanel from "@/components/cart/CartPanel";
import ProductDetail from "@/components/products/ProductDetail";
import CheckoutFlow, { type OrderDetails } from "@/components/checkout/CheckoutFlow";
import ChatHistory from "./ChatHistory";
import AuraAvatar from "./AuraAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { useChatHistory, type ChatSession } from "@/contexts/ChatHistoryContext";
import { parseResponseActions } from "@/lib/parseResponseActions";
import type { AvatarState, Product } from "@/types";

function getAvatarState(isLoading: boolean, messages: Message[]): AvatarState {
  if (isLoading) return "thinking";
  if (messages.length === 0) return "idle";

  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.role === "assistant") {
    const content = lastMsg.content.toLowerCase();
    if (/order.*placed|order.*confirmed|successfully/i.test(content)) return "celebrating";
    if (/broke up|sad|sorry|miss you|condolence/i.test(content)) return "empathetic";
    if (lastMsg.toolInvocations?.length) return "excited";
  }
  return "idle";
}

export default function ChatContainer() {
  const { language } = useLanguage();
  const { state: cartState, dispatch: cartDispatch } = useCart();
  const { saveSession } = useChatHistory();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);

  const { messages, isLoading, append } = useChat({
    api: "/api/chat",
    body: { language },
    onError: (err) => {
      console.error("Chat error:", err);
      const msg = err.message || "";
      const isRateLimit = msg.includes("429") ||
        /rate.?limit|too many requests|busy/i.test(msg);
      const isTokenLimit = msg.includes("413") ||
        /too large|token.*limit|too long/i.test(msg);
      if (isRateLimit) {
        setError("Aura is a bit busy right now. Retrying shortly...");
        setRetryCountdown(5);
      } else if (isTokenLimit) {
        setError("Conversation got too long. Try sending a shorter message or start fresh.");
      } else {
        setError("Something went wrong. Tap retry or send your message again.");
      }
    },
  });

  const avatarState = getAvatarState(isLoading, messages);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
      saveSession(messages.map((m) => ({ id: m.id, role: m.role, content: m.content })));
    }
  }, [messages, saveSession]);

  // Parse dynamic actions from latest assistant message
  const dynamicActions = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant?.content) return undefined;
    const parsed = parseResponseActions(lastAssistant.content);
    return parsed.length > 0 ? parsed : undefined;
  }, [messages]);

  // Auto-retry countdown for rate limit errors
  useEffect(() => {
    if (retryCountdown <= 0) return;
    if (retryCountdown === 1 && lastFailedMessage) {
      // Auto-retry when countdown hits 0
      setRetryCountdown(0);
      setError(null);
      append({ role: "user", content: lastFailedMessage });
      setLastFailedMessage(null);
      return;
    }
    const timer = setTimeout(() => setRetryCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryCountdown, lastFailedMessage, append]);

  const handleSendMessage = useCallback(
    (text: string) => {
      setError(null);
      setLastFailedMessage(text);
      setRetryCountdown(0);
      append({ role: "user", content: text });
    },
    [append]
  );

  const handleRetry = useCallback(() => {
    if (!lastFailedMessage) return;
    setError(null);
    setRetryCountdown(0);
    append({ role: "user", content: lastFailedMessage });
    setLastFailedMessage(null);
  }, [lastFailedMessage, append]);

  const handleQuickAction = useCallback(
    (text: string) => {
      handleSendMessage(text);
    },
    [handleSendMessage]
  );

  const handleCheckout = useCallback(() => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  }, []);

  const handleRestoreSession = useCallback(
    (session: ChatSession) => {
      // Restore by re-appending the messages from history
      session.messages.forEach((m) => {
        if (m.role === "user") {
          append({ role: "user", content: m.content });
        }
      });
      setShowWelcome(false);
    },
    [append]
  );

  const handleNewChat = useCallback(() => {
    window.location.reload();
  }, []);

  const handlePlaceOrder = useCallback(
    (details: OrderDetails) => {
      setIsCheckoutOpen(false);
      const itemLines = cartState.items.map(
        (item) => `${item.name} (ID: ${item.productId}, qty: ${item.quantity})`
      );
      const msg = [
        `Place my order. Cart: ${itemLines.join("; ")}.`,
        `Recipient: ${details.recipientName}, Phone: ${details.recipientPhone}.`,
        `Delivery: ${details.recipientAddress}, ${details.deliveryCity}, Date: ${details.deliveryDate}.`,
        `Sender: ${details.senderName}.`,
        details.giftMessage ? `Gift message: ${details.giftMessage}` : "",
      ].filter(Boolean).join(" ");
      handleSendMessage(msg);
      // Clear cart after order is placed
      cartDispatch({ type: "CLEAR_CART" });
    },
    [handleSendMessage, cartState.items, cartDispatch]
  );

  const handleCategorySelect = useCallback(
    (category: { name: string }) => {
      handleSendMessage(`Show me products in ${category.name}`);
    },
    [handleSendMessage]
  );

  const handleCitySelect = useCallback(
    (cityName: string) => {
      handleSendMessage(`Check delivery to ${cityName}`);
    },
    [handleSendMessage]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedProduct) setSelectedProduct(null);
        else if (isCartOpen) setIsCartOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedProduct, isCartOpen]);

  return (
    <div className="app-container flex flex-col bg-aura-cream dark:bg-aura-dark">
      <OfflineBanner />
      <ChatHeader
        avatarState={avatarState}
        onCartOpen={() => setIsCartOpen(true)}
        onHistoryOpen={() => setIsHistoryOpen(true)}
      />

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin chat-bg"
        role="log"
        aria-label="Chat conversation"
        aria-live="polite"
      >
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              className="flex flex-col items-center justify-center py-8 md:py-16 text-center relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Divine tree background illustration */}
              <div className="divine-tree-bg absolute inset-0 pointer-events-none opacity-40 dark:opacity-25" />

              {/* Floating golden particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[
                  { left: "20%", top: "60%", size: 6, delay: "0s", dur: "4s" },
                  { left: "75%", top: "55%", size: 5, delay: "1s", dur: "5s" },
                  { left: "40%", top: "70%", size: 4, delay: "0.5s", dur: "4.5s" },
                  { left: "60%", top: "65%", size: 7, delay: "2s", dur: "5.5s" },
                  { left: "30%", top: "50%", size: 3, delay: "1.5s", dur: "4s" },
                  { left: "85%", top: "45%", size: 5, delay: "0.8s", dur: "5s" },
                ].map((p, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: p.left,
                      top: p.top,
                      width: p.size,
                      height: p.size,
                      background: `radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(212,160,23,0.4) 60%, transparent 100%)`,
                      animation: `float-particle-${(i % 3) + 1} ${p.dur} ease-in-out ${p.delay} infinite`,
                    }}
                  />
                ))}
              </div>

              {/* Decorative divine tree SVG */}
              <motion.svg
                className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-[0.07] dark:opacity-[0.04]"
                width="280" height="320" viewBox="0 0 280 320" fill="none"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.3 }}
              >
                <ellipse cx="140" cy="120" rx="110" ry="100" fill="url(#treeGrad)" />
                <ellipse cx="140" cy="90" rx="80" ry="70" fill="url(#treeInner)" />
                <rect x="132" y="200" width="16" height="100" rx="8" fill="#8B6914" opacity="0.3" />
                <circle cx="140" cy="80" r="50" fill="url(#haloGrad)" />
                <defs>
                  <radialGradient id="treeGrad" cx="50%" cy="40%">
                    <stop offset="0%" stopColor="#2D6A4F" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#1B4332" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="treeInner" cx="50%" cy="40%">
                    <stop offset="0%" stopColor="#52B788" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#2D6A4F" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="haloGrad" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#FFD700" stopOpacity="0.5" />
                    <stop offset="50%" stopColor="#D4A017" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </motion.svg>

              {/* Hero avatar with dramatic halo */}
              <motion.div
                className="mb-8 relative z-10"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <div className="aura-halo rounded-full p-1">
                  <AuraAvatar state="idle" size={100} />
                </div>
              </motion.div>

              {/* Title — animated gradient */}
              <motion.h2
                className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight relative z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="gradient-text-animated">Ayubowan!</span>{" "}
                <span className="text-gray-900 dark:text-gray-100">🙏</span>
              </motion.h2>

              {/* Subtitle in glassmorphism card */}
              <motion.div
                className="glass-card rounded-2xl px-6 py-4 max-w-md mb-3 relative z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">
                  I&apos;m <strong className="gradient-text font-bold">Aura</strong> (ඕරා), your divine shopping companion from the Kapruka tree.
                </p>
              </motion.div>
              <motion.p
                className="text-gray-400 dark:text-gray-500 max-w-md mb-8 text-sm relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
              >
                Search products, compare prices, check delivery, and checkout — all through chat.
              </motion.p>

              {/* Quick actions */}
              <motion.div
                className="relative z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <QuickActionChips onAction={handleQuickAction} />
              </motion.div>

              {/* Powered by badge — premium style */}
              <motion.div
                className="mt-8 glass-card rounded-full px-5 py-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <span>Powered by</span>
                <span className="font-bold gradient-text">Kapruka MCP</span>
                <span className="text-aura-gold">×</span>
                <span className="font-bold text-aura-emerald dark:text-aura-leaf">AI</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.content && (
                <MessageBubble
                  role={msg.role as "user" | "assistant"}
                  content={msg.content}
                  isStreaming={isLoading && msg.id === messages[messages.length - 1]?.id && msg.role === "assistant"}
                  avatarState={avatarState}
                />
              )}

              {/* Render tool results inline */}
              {msg.toolInvocations?.map((invocation) => {
                if (invocation.state !== "result") {
                  return (
                    <ToolResultRenderer
                      key={invocation.toolCallId}
                      toolName={invocation.toolName}
                      result={null}
                      isLoading={true}
                    />
                  );
                }
                return (
                  <div key={invocation.toolCallId} className="my-2 ml-10">
                    <ToolResultRenderer
                      toolName={invocation.toolName}
                      result={invocation.result}
                      onViewProduct={setSelectedProduct}
                      onSelectCategory={handleCategorySelect}
                      onSelectCity={handleCitySelect}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {isLoading && !messages[messages.length - 1]?.content && (
            <div className="flex gap-2 items-center mb-3">
              <ThinkingDots />
            </div>
          )}

          {error && (
            <motion.div
              className="flex justify-center mb-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm">
                <span className="text-base">{retryCountdown > 0 ? "⏳" : "⚠️"}</span>
                <span className="flex-1">
                  {retryCountdown > 0
                    ? `${error} (${retryCountdown}s)`
                    : error}
                </span>
                {retryCountdown === 0 && lastFailedMessage && (
                  <button
                    onClick={handleRetry}
                    className="ml-2 px-3 py-1 rounded-lg bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 text-amber-800 dark:text-amber-200 text-xs font-medium transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {!showWelcome && messages.length > 0 && !isLoading && (
          <div className="max-w-3xl mx-auto mt-2">
            <QuickActionChips onAction={handleQuickAction} dynamicActions={dynamicActions} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <ChatInput
        onSubmit={handleSendMessage}
        isLoading={isLoading}
        inputRef={inputRef}
      />

      {/* Cart panel */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
      />

      {/* Checkout flow modal */}
      <CheckoutFlow
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onPlaceOrder={handlePlaceOrder}
      />

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Chat history panel */}
      <ChatHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestoreSession={handleRestoreSession}
        onNewChat={handleNewChat}
      />

      {/* SR-only announcements */}
      {!isLoading && messages.length > 0 && (
        <span className="sr-only" aria-live="assertive">
          Aura finished responding.
        </span>
      )}
    </div>
  );
}

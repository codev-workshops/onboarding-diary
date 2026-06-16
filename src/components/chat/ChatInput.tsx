"use client";

import { useState, useEffect, type RefObject, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  isLoading?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement>;
}

export default function ChatInput({
  onSubmit,
  isLoading = false,
  inputRef,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const { language } = useLanguage();
  const { isSupported, isListening, transcript, startListening, stopListening } =
    useVoiceInput("en");

  const placeholder = language === "si"
    ? "Aura ගෙන් ඕනෑම දෙයක් අහන්න..."
    : language === "tanglish"
      ? "Aura kiyan eka ahanna..."
      : "Ask Aura anything...";

  useEffect(() => {
    if (transcript) setText(transcript);
  }, [transcript]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed && !isLoading) {
      onSubmit(trimmed);
      setText("");
    }
  };

  return (
    <div className="glass-header px-3 py-3 z-10" style={{ borderBottom: "none", borderTop: "1px solid rgba(212,160,23,0.1)" }}>
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto flex items-center gap-2"
      >
        {isSupported && (
          <motion.button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`touch-target w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${
              isListening
                ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                : "header-btn text-gray-500 dark:text-gray-400"
            }`}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </motion.button>
        )}

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={placeholder}
            disabled={isLoading}
            className="premium-input chat-input w-full resize-none rounded-2xl border border-gray-200/60 dark:border-gray-700/60
              bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm
              px-4 py-3 pr-12 text-sm text-gray-900 dark:text-gray-100
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:outline-none
              disabled:opacity-60 disabled:cursor-not-allowed"
            rows={1}
            aria-label="Type your message"
          />
          <motion.button
            type="submit"
            disabled={!text.trim() || isLoading}
            className="send-btn absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full
              text-white
              disabled:cursor-not-allowed"
            aria-label="Send message"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </motion.button>
        </div>
      </form>
    </div>
  );
}

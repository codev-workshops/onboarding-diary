"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useChatHistory, type ChatSession } from "@/contexts/ChatHistoryContext";

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSession: (session: ChatSession) => void;
  onNewChat: () => void;
}

export default function ChatHistory({
  isOpen,
  onClose,
  onRestoreSession,
  onNewChat,
}: ChatHistoryProps) {
  const { sessions, deleteSession, clearAll } = useChatHistory();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] z-50
              bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl flex flex-col
              border-l border-aura-goldenLight/20 dark:border-aura-gold/10"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-aura-goldenLight/20 dark:border-aura-gold/10">
              <h2 className="text-lg font-bold gradient-text">
                Chat History
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-gray-500
                  hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close history"
              >
                ✕
              </button>
            </div>

            {/* New Chat + Clear */}
            <div className="flex gap-2 p-3 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="send-btn flex-1 py-2 rounded-xl text-sm font-medium text-white"
              >
                + New Chat
              </button>
              {sessions.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-3 py-2 rounded-xl text-sm font-medium
                    text-red-500 border border-red-200 dark:border-red-800
                    hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
                  No chat history yet
                </div>
              ) : (
                sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    className="group relative p-3 rounded-xl border border-gray-100 dark:border-gray-800
                      hover:border-aura-gold/30 hover:bg-aura-cream/50 dark:hover:bg-aura-dark/50
                      cursor-pointer transition-all"
                    onClick={() => {
                      onRestoreSession(session);
                      onClose();
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {session.messages.length} messages · {formatDate(session.updatedAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center
                          text-gray-400 hover:text-red-500 transition-all text-xs"
                        aria-label={`Delete session: ${session.title}`}
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

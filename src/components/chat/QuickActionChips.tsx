"use client";

import { motion } from "framer-motion";

interface DynamicAction {
  label: string;
  icon?: string;
  text: string;
}

interface QuickActionChipsProps {
  onAction: (text: string) => void;
  disabled?: boolean;
  dynamicActions?: DynamicAction[] | null;
}

const defaultActions: DynamicAction[] = [
  { label: "Gift Ideas", icon: "🎁", text: "Help me find a gift for someone special" },
  { label: "Cakes & Sweets", icon: "🎂", text: "Show me birthday cakes and sweets" },
  { label: "Flowers", icon: "💐", text: "I want to send flowers" },
  { label: "Browse All", icon: "🛍️", text: "Show me all categories" },
  { label: "Track Order", icon: "📦", text: "I want to track my order" },
];

// Sri Lankan festival-aware actions — shown based on time of year
function getFestiveActions(): DynamicAction[] | null {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();

  // Sinhala & Tamil New Year season (April 1-20)
  if (month === 3 && day <= 20) {
    return [
      { label: "අවුරුදු තෑගි", icon: "🪷", text: "Show me Avurudu gift ideas" },
      { label: "Kevili & Sweets", icon: "🍬", text: "Show me traditional Avurudu sweets and kevili" },
      { label: "New Year Outfits", icon: "👗", text: "Show me new clothes for Avurudu" },
      { label: "Gift Hampers", icon: "🎁", text: "Show me Avurudu gift hampers" },
      { label: "Browse All", icon: "🛍️", text: "Show me all categories" },
    ];
  }

  // Vesak season (May 1-31)
  if (month === 4) {
    return [
      { label: "Vesak Gifts", icon: "🪷", text: "Show me Vesak gift ideas" },
      { label: "Vesak Lanterns", icon: "🏮", text: "I'm looking for Vesak decorations" },
      { label: "White Clothing", icon: "🤍", text: "Show me white clothing for Vesak" },
      { label: "Gift Ideas", icon: "🎁", text: "Help me find a gift" },
      { label: "Browse All", icon: "🛍️", text: "Show me all categories" },
    ];
  }

  // Christmas season (December 1-31)
  if (month === 11) {
    return [
      { label: "Christmas Gifts", icon: "🎄", text: "Show me Christmas gift ideas" },
      { label: "Christmas Cakes", icon: "🎂", text: "Show me Christmas cakes" },
      { label: "Chocolates", icon: "🍫", text: "Show me chocolate gift boxes" },
      { label: "Gift Hampers", icon: "🎁", text: "Show me Christmas gift hampers" },
      { label: "Browse All", icon: "🛍️", text: "Show me all categories" },
    ];
  }

  // Valentine's season (February 1-14)
  if (month === 1 && day <= 14) {
    return [
      { label: "Valentine's Gifts", icon: "💝", text: "Show me Valentine's Day gifts" },
      { label: "Roses & Flowers", icon: "💐", text: "Show me romantic flower bouquets" },
      { label: "Chocolates", icon: "🍫", text: "Show me chocolate gifts for Valentine's" },
      { label: "Gift Ideas", icon: "🎁", text: "Help me find a romantic gift" },
      { label: "Browse All", icon: "🛍️", text: "Show me all categories" },
    ];
  }

  return null; // No festive override
}

export default function QuickActionChips({
  onAction,
  disabled = false,
  dynamicActions,
}: QuickActionChipsProps) {
  if (dynamicActions && dynamicActions.length === 0) return null;

  const actions = dynamicActions ? dynamicActions : (getFestiveActions() || defaultActions);

  return (
    <div className="flex flex-wrap justify-center gap-2.5 px-4 py-2">
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          className="premium-chip touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium
            text-gray-700 dark:text-gray-300
            disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onAction(action.text)}
          disabled={disabled}
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: index * 0.07, type: "spring" as const, damping: 20, stiffness: 300 }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          tabIndex={0}
        >
          {action.icon && <span className="text-base">{action.icon}</span>}
          {action.label}
        </motion.button>
      ))}
    </div>
  );
}

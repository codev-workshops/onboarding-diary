# Score Improvement Plan: Aura E-Commerce Agent (78 → 92+)

## Current Score: 78/100

This document outlines 6 targeted improvements to push the judge's evaluation score from 78 to 92+. Each improvement addresses a specific scoring dimension with concrete implementation steps.

---

## Improvement 1: ToolResultRenderer for Order / Delivery / Cities

**Scoring dimension:** Tool Integration & UI Richness

**Problem:** The `ToolResultRenderer` currently only handles product search, categories, and order tracking. Results from `kapruka_create_order`, `kapruka_check_delivery`, and `kapruka_list_delivery_cities` fall through to `return null` — the user sees no visual feedback for these critical flows.

**Solution:**
- Add `OrderConfirmation` component — shows order ID, total, item count, a large "Pay Now" button, and a 60-minute countdown timer for price lock. Includes a celebration animation on mount.
- Add `DeliveryInfo` component — shows city, delivery date, rate, green check / red X for availability, and a perishable warning badge if applicable.
- Add `CityList` component — scrollable grid of city names, each clickable (triggers "Check delivery to {city}" as a chat message), with a filter/search input.
- Add `parseOrder()`, `parseDelivery()`, `parseCities()` helpers and wire rendering cases in `ToolResultRenderer.tsx`.

**Expected score impact:** +3–4 points

---

## Improvement 2: Checkout UI Flow

**Scoring dimension:** User Experience & Conversion Flow

**Problem:** Clicking "Proceed to Checkout" in the cart simply sends a chat message. There is no structured checkout experience — the user must negotiate delivery details through free-form conversation, which is error-prone and slow.

**Solution:**
- Add `CheckoutFlow` component — a 3-step modal overlay:
  1. Order summary from CartContext (items, quantities, subtotal)
  2. Delivery form (city autocomplete, recipient name, phone, address, optional gift message)
  3. Confirm & pay — shows delivery date/rate, final total, "Place Order" button
- Add `DeliveryCityAutocomplete` — input that calls `kapruka_list_delivery_cities` via an API helper, shows dropdown of matching cities, and triggers `kapruka_check_delivery` on selection.
- Update `ChatContainer` to open `CheckoutFlow` modal instead of sending a chat message.

**Expected score impact:** +3–4 points

---

## Improvement 3: Multi-Agent Orchestration

**Scoring dimension:** Architecture & Agent Design

**Problem:** All user messages go through a single `streamText` call with all tools available. There is no intent-based routing — the LLM must choose from 7 tools every time, increasing latency and hallucination risk.

**Solution:**
- Split tools into `getShopperTools()` (search, get product, list categories) and `getLogisticsTools()` (list delivery cities, check delivery).
- Create an orchestrator that uses gpt-4o-mini with a small system prompt to classify intent as "shopping", "logistics", or "general".
- Route to the appropriate sub-agent with filtered tools and a focused system prompt.
- Order creation and tracking stay with the Concierge (general) agent.

**Expected score impact:** +2–3 points

---

## Improvement 4: (Reserved — Conversation Memory / Context Window)

This improvement is planned for a future iteration.

---

## Improvement 5: Voice Language Detection

**Scoring dimension:** Multi-Language & Accessibility

**Problem:** The voice input hook hardcodes `recognition.lang = "en-US"`. Users who set the app to Sinhala mode or Tanglish still get English speech recognition, leading to poor transcription.

**Solution:**
- Update `useVoiceInput` to accept a `lang` parameter.
- Map: `"en"` → `"en-US"`, `"si"` → `"si-LK"`, `"tanglish"` → `"en-US"`.
- Update `ChatInput` to pass the current language from `LanguageContext` to the voice hook.

**Expected score impact:** +1–2 points

---

## Improvement 6: Enhanced Avatar Animations

**Scoring dimension:** Visual Polish & Delight

**Problem:** The `celebrating` state on `AuraAvatar` has a wiggle animation but no confetti or particles. The `idle` state has a floating animation only when shown in the welcome screen via Framer Motion, but the SVG itself has no built-in idle breathing.

**Solution:**
- Add confetti particle animation for `celebrating` state — spawn 10–15 small colored circles with staggered animations that fall and fade out.
- Add a gentle idle breathing bob using SVG `<animateTransform>` (translate Y ±2px at 0.8 Hz).
- Respect `prefers-reduced-motion` for all new animations.

**Expected score impact:** +1–2 points

---

## Summary

| # | Improvement | Dimension | Expected Impact |
|---|------------|-----------|----------------|
| 1 | ToolResultRenderer for order/delivery/cities | Tool Integration & UI | +3–4 |
| 2 | Checkout UI Flow | UX & Conversion | +3–4 |
| 3 | Multi-Agent Orchestration | Architecture | +2–3 |
| 4 | (Reserved) | — | — |
| 5 | Voice Language Detection | Multi-Language | +1–2 |
| 6 | Enhanced Avatar | Visual Polish | +1–2 |

**Total expected improvement: +10–15 points → Target: 88–93**

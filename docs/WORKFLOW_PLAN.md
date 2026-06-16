# Aura Kapruka — E2E Shopping Workflow Plan

## Executive Summary

This document outlines the implementation plan for a complete end-to-end shopping workflow in the Aura Kapruka shopping assistant. The goal is to transform Aura from a conversational product discovery tool into a full shopping experience: **Browse → Select → Cart → Delivery → Checkout → Tracking**.

Based on research of [Kapruka MCP tools](https://mcp.kapruka.com) and the [Kapruka Agent Challenge requirements](https://www.kapruka.com/contactUs/agentChallenge.html#build).

---

## Current State (What We Have)

| Capability | Status |
|---|---|
| Product search & browsing | Done |
| Category listing | Done |
| Product detail view | Done |
| Add to cart (client-side) | Done |
| Emotional support agent | Done |
| Sinhala/Tanglish language support | Done |
| Delivery city lookup | Done |
| Order creation (kapruka_create_order) | Partially integrated |
| Order tracking (kapruka_track_order) | Partially integrated |

---

## Target Workflow (State Machine)

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐     ┌────────────────┐
│   BROWSE    │────▶│  SELECT      │────▶│  CART    │────▶│  DELIVERY      │
│             │     │  PRODUCT     │     │  REVIEW  │     │  DETAILS       │
└─────────────┘     └──────────────┘     └──────────┘     └────────────────┘
                                                                    │
┌─────────────┐     ┌──────────────┐     ┌──────────┐              │
│  TRACKING   │◀────│  CONFIRM     │◀────│ CHECKOUT │◀─────────────┘
│             │     │  (Pay Link)  │     │  SUMMARY │
└─────────────┘     └──────────────┘     └──────────┘
```

### States & Transitions

1. **BROWSE** — User discovers products via search, categories, or AI recommendations
2. **SELECT_PRODUCT** — User clicks/selects a product → detail view with variants
3. **CART_REVIEW** — Multi-item cart with quantities, subtotals
4. **DELIVERY_DETAILS** — Recipient info + city selection + delivery date
5. **CHECKOUT_SUMMARY** — Final order review (items + delivery cost + total)
6. **CONFIRM** — Order placed → pay link generated → customer clicks to pay
7. **TRACKING** — Order number stored → status updates via `kapruka_track_order`

---

## Phase 1: Cart & Multi-Item Management (Priority: HIGH)

### Tasks
- [ ] **Cart state persistence** — Save cart to localStorage so it survives page refresh
- [ ] **Multi-item cart drawer** — Slide-out panel showing all items, quantities, images, subtotals
- [ ] **Quantity controls** — +/- buttons per item, delete item, clear cart
- [ ] **Cart badge** — Show item count on cart icon in header
- [ ] **"Continue Shopping" flow** — After adding to cart, user can keep browsing
- [ ] **Conversational cart** — Aura can respond to "what's in my cart?" / "remove the phone"

### Technical Notes
- Cart state already exists via `CartContext` — needs localStorage sync
- `CartPanel.tsx` exists but may need UX improvements for mobile

---

## Phase 2: Delivery Flow (Priority: HIGH)

### Tasks
- [ ] **Delivery city autocomplete** — Use `kapruka_list_delivery_cities` for fuzzy search
- [ ] **Delivery date picker** — Calendar UI; validate with `kapruka_check_delivery`
- [ ] **Delivery cost display** — Show rate from API response
- [ ] **Perishable product warnings** — Flag cakes/flowers that have delivery constraints
- [ ] **Recipient form** — Name, phone, address, city (validated against delivery cities)
- [ ] **Gift message (optional)** — Text input for gift messages

### Kapruka MCP Tools Used
- `kapruka_list_delivery_cities` → autocomplete city search
- `kapruka_check_delivery` → validate city + date + get delivery cost + perishable flag

### Technical Notes
- `DeliveryCityAutocomplete.tsx` already exists — extend with delivery date validation
- DeliveryInfo component exists for displaying results

---

## Phase 3: Checkout & Order Creation (Priority: HIGH)

### Tasks
- [ ] **Checkout summary screen** — All items + delivery cost + grand total
- [ ] **Order creation** — Call `kapruka_create_order` with structured payload:
  ```json
  {
    "cart": [{"product_id": "...", "quantity": 1}],
    "recipient": {"name": "...", "phone": "..."},
    "delivery": {"address": "...", "city": "...", "date": "2026-07-01"},
    "sender": {"name": "..."},
    "gift_message": "Optional message"
  }
  ```
- [ ] **Pay link display** — Show the click-to-pay URL prominently (60-min expiry)
- [ ] **Order confirmation UI** — Success animation + order number + pay link button
- [ ] **Multi-currency support** — LKR (local) and USD (diaspora customers)

### Kapruka MCP Tools Used
- `kapruka_create_order` → generates guest-checkout order + pay link

### Technical Notes
- `CheckoutFlow.tsx` already has a multi-step form — needs to wire to the MCP tool
- OrderConfirmation component exists for success state

---

## Phase 4: Order Tracking (Priority: MEDIUM)

### Tasks
- [ ] **Store order numbers** — Save completed order numbers in localStorage
- [ ] **"Track my order" flow** — Ask for order number or show recent orders
- [ ] **Status timeline UI** — Visual timeline showing order progress
- [ ] **Proactive updates** — If user has a recent order, Aura can ask "want an update?"

### Kapruka MCP Tools Used
- `kapruka_track_order` → returns status, recipient, items, timestamped delivery progress

### Technical Notes
- `OrderTimeline.tsx` already renders tracking data — needs to be connected to user flow

---

## Phase 5: Conversational Checkout Assistant (Priority: MEDIUM)

### Tasks
- [ ] **Guided checkout via chat** — Aura walks user through delivery details conversationally
  - "Where should I deliver this?" → city autocomplete in chat
  - "Who's the lucky recipient?" → collect name + phone
  - "Any special message for the card?" → gift message
- [ ] **Smart defaults** — Remember previous delivery info for repeat customers
- [ ] **Validation in chat** — "Hmm, I can't deliver to that city on Sunday. How about Monday?"
- [ ] **Delivery date suggestions** — Based on perishable constraints

---

## Phase 6: UX Polish & Competition Differentiators (Priority: MEDIUM-HIGH)

### Tasks
- [ ] **Animated transitions between states** — Smooth flow feeling
- [ ] **Mobile-first responsive** — Every step must work perfectly on phones
- [ ] **Product image gallery** — Swipeable product images in detail view
- [ ] **Price comparison** — "This is Rs. 500 cheaper than similar products"
- [ ] **Urgency indicators** — "Only 3 left!" / "Order in 2 hours for same-day delivery"
- [ ] **Sri Lankan payment context** — Explain pay link process clearly
- [ ] **Accessibility** — ARIA labels, keyboard navigation, screen reader support

---

## Phase 7: Advanced Features (Priority: LOW — Competition Bonus)

### Tasks
- [ ] **Multi-item cart checkout** — Handle multiple products in single order
- [ ] **Delivery-date constraints** — Smart date picker that greys out unavailable dates
- [ ] **Gift messaging UI** — Pretty card preview with message
- [ ] **Tanglish/Sinhala checkout** — Full workflow in local languages
- [ ] **Repeat order** — "Order the same as last time"
- [ ] **Wishlist** — "Save for later" functionality

---

## Competition Scoring Alignment

Based on the [Kapruka Agent Challenge rubric](https://www.kapruka.com/contactUs/agentChallenge.html#build):

| Criterion | Weight | Our Strategy |
|---|---|---|
| Experience & Polish | 30pts | Purple+gold branding, animations, mobile-first |
| Visual Richness | 20pts | Product carousels, image galleries, rich cards |
| Personality | 15pts | Aura's persona, emotional-first design, Sinhala support |
| Usefulness | 15pts | Smart recommendations, delivery validation, guided checkout |
| E2E Completeness | 15pts | Full workflow from browse to pay link |
| Creativity | 5pts | Sinhala language support, emotional shopping assistant concept |

**Bonus differentiators we already have:** Tanglish conversation, Sinhala-language support, multi-item carts (partial).

---

## Implementation Timeline (Suggested)

| Session | Focus | Deliverable |
|---|---|---|
| Session 1 | **Caching layer + Cart persistence** | localStorage cache manager, user prefs persistence, cart sync, categories cache (stale-while-revalidate), returning user greeting |
| Session 2 | **Delivery flow + address cache** | Delivery city autocomplete, date picker, saved addresses, recipient form pre-fill from cache |
| Session 3 | **Checkout + order creation** | kapruka_create_order integration, pay link display, order confirmation, order history cache |
| Session 4 | **Order tracking + conversational checkout** | Natural language checkout, repeat orders, cached delivery suggestions |
| Session 5 | **UX polish + token optimization** | Reduced system prompt, mobile polish, animations, competition-ready |
| Session 6 | **Testing + edge cases + Sinhala checkout** | Full Tanglish/Sinhala checkout flow, integration test suite, final QA |

---

## Architecture Decisions

1. **State management** — Keep using React Context (`CartContext`) + localStorage for persistence. No need for server-side state since Kapruka MCP is the source of truth for orders.

2. **Checkout flow** — Hybrid approach:
   - Visual UI (existing `CheckoutFlow.tsx` modal) for structured input
   - Conversational fallback — Aura can collect the same info via chat messages
   - Both funnel into the same `kapruka_create_order` call

3. **Order storage** — LocalStorage for order history (order numbers + timestamps). No user accounts needed since Kapruka uses guest checkout.

4. **Error handling** — Graceful degradation:
   - Delivery city not found → suggest alternatives
   - Date unavailable → suggest next available
   - Rate limit → queue + retry with backoff

---

## Caching Strategy (Priority: HIGH — Implement in Phase 1)

### Why Cache?
- **Reduce token usage** — Don't re-send full category lists or user context every message
- **Faster UX** — Instant greetings, pre-populated forms, no waiting for MCP calls
- **Smooth repeat transactions** — "Same address as last time?" instead of re-collecting

### Cache Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    localStorage                          │
│                                                         │
│  aura_user_prefs     → addressing, language, name       │
│  aura_categories     → categories + TTL timestamp       │
│  aura_recent_items   → last 20 viewed products          │
│  aura_delivery_info  → saved recipient details[]        │
│  aura_cart           → current cart items                │
│  aura_order_history  → completed order numbers[]        │
│  aura_top_products   → trending/popular items + TTL     │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│              React Context (in-memory)                    │
│                                                         │
│  UserPrefsContext  → hydrated from localStorage on load │
│  CacheContext      → categories, top items, delivery    │
│  CartContext       → already exists, add persistence    │
│  OrderContext      → new: order state machine           │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│           Token Budget Optimization                      │
│                                                         │
│  System prompt includes ONLY:                           │
│  - User pref summary (1 line: "Sir, English, Colombo") │
│  - Recent intent context (not full history)             │
│  - Cached delivery info if checkout intent detected     │
│  - NO full category list (handled client-side)          │
└─────────────────────────────────────────────────────────┘
```

### What to Cache

| Data | Storage Key | TTL | Size | Token Savings |
|------|-------------|-----|------|---------------|
| User preferences (address mode, language, name) | `aura_user_prefs` | Never expires | ~50 bytes | ~200 tokens/msg (skip re-asking) |
| Categories list | `aura_categories` | 24 hours | ~2KB | ~800 tokens (skip category tool call) |
| Top/trending products | `aura_top_products` | 1 hour | ~5KB | ~500 tokens (instant recommendations) |
| Recently viewed products | `aura_recent_items` | 7 days | ~3KB | ~300 tokens (personalized suggestions) |
| Delivery details (recipients) | `aura_delivery_info` | Never expires | ~1KB per address | ~400 tokens (skip form re-fill) |
| Cart state | `aura_cart` | Session + persist | ~2KB | Already exists — add persistence |
| Order history | `aura_order_history` | Never expires | ~500 bytes per order | Enables "reorder" and tracking |

### Cache Implementation Details

**1. User Preferences Cache (`aura_user_prefs`)**
```typescript
interface UserPrefs {
  addressingMode: 'sir' | 'madam' | 'bro' | 'machan' | 'sis' | 'name';
  name?: string;
  preferredLanguage: 'en' | 'si' | 'tanglish';
  lastVisit: string; // ISO timestamp
}
```
- Populated on first interaction (addressing chip click)
- On return visit: skip welcome screen, go straight to "Welcome back, Sir! What can I help with?"
- Language auto-detected from history — don't re-learn each session

**2. Categories Cache (`aura_categories`)**
```typescript
interface CachedCategories {
  data: Category[];
  fetchedAt: number; // Unix timestamp
  ttl: 86400000; // 24 hours in ms
}
```
- First "Browse categories" → call MCP, cache response
- Subsequent requests → serve from cache, render instantly
- Background refresh if stale (stale-while-revalidate pattern)
- Token savings: eliminate `kapruka_list_categories` from system prompt context

**3. Delivery Info Cache (`aura_delivery_info`)**
```typescript
interface SavedDelivery {
  id: string;
  label: string; // "Home", "Office", "Mom's place"
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  lastUsed: string;
}
```
- Save after successful order
- On next checkout: "Deliver to Mom's place again?" → one-click confirmation
- Multiple saved addresses supported (max 5)

**4. Token Budget Optimization**
- Current: ~2000 token system prompt + full message history
- With caching: ~800 token system prompt (user pref summary only) + trimmed history
- Categories rendered client-side from cache (no LLM involvement)
- Delivery form pre-filled from cache (no conversational collection needed)
- Estimated **40-60% token reduction** per conversation

### Cache Invalidation Rules

| Trigger | Action |
|---------|--------|
| User clears chat history | Keep preferences, clear recent items |
| Categories older than 24h | Background refresh on next load |
| Product data older than 1h | Refresh on next search |
| User changes addressing mode | Update preferences immediately |
| Successful order | Save delivery info, add to order history |
| localStorage full | Evict oldest recent items first |

---

## Files to Create/Modify

### New Files
- `src/lib/cache/cacheManager.ts` — Generic cache utilities (get/set/invalidate with TTL)
- `src/lib/cache/userPrefsCache.ts` — User preferences persistence
- `src/lib/cache/categoriesCache.ts` — Categories with stale-while-revalidate
- `src/lib/cache/deliveryCache.ts` — Saved delivery addresses
- `src/contexts/CacheContext.tsx` — React context hydrated from localStorage
- `src/contexts/OrderContext.tsx` — Order state management + localStorage
- `src/components/checkout/DeliveryForm.tsx` — Full delivery details form (pre-filled from cache)
- `src/components/checkout/PaymentLink.tsx` — Pay link display component
- `src/components/checkout/CheckoutSummary.tsx` — Final order review
- `src/lib/agents/checkoutAgent.ts` — Conversational checkout prompts

### Modified Files
- `src/components/chat/ChatContainer.tsx` — Hydrate user prefs from cache on load, skip welcome if returning user
- `src/components/cart/CartPanel.tsx` — Enhanced multi-item UX + localStorage sync
- `src/components/checkout/CheckoutFlow.tsx` — Wire to MCP order creation + pre-fill from cache
- `src/lib/agents/orchestrator.ts` — Route checkout/delivery intents + inject cached context
- `src/lib/agents/concierge.ts` — Add checkout conversation flows + reduced system prompt
- `src/app/api/chat/route.ts` — Handle checkout tool calls + token budget management

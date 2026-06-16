# Aura Kapruka — Integration Test Cases

Manual and automated test cases for verifying language detection, emotional support, addressing preferences, and conversational quality on the live deployment.

## Test Infrastructure

- **Unit tests:** `src/__tests__/detectLanguage.test.ts` — 24 automated tests for `detectLanguage()`
- **Unit tests:** `src/__tests__/orchestrator.test.ts` — Intent classification tests
- **Unit tests:** `src/__tests__/cacheManager.test.ts` — Cache manager utility (TTL, stale-while-revalidate, corrupted data)
- **Unit tests:** `src/__tests__/userPrefsCache.test.ts` — User preferences, addressing modes (all 13), returning user greeting
- **Unit tests:** `src/__tests__/categoriesCache.test.ts` — Categories cache (24h TTL, stale-while-revalidate)
- **Live deployment:** https://aura-kapruka.vercel.app/
- **Run all tests:** `npm run test`

---

## 1. Language Detection (Automated: `detectLanguage.test.ts`)

### Pure Sinhala → Respond in Sinhala Unicode Script

| Input | Expected Language | Expected Response Language |
|-------|------------------|--------------------------|
| `kohomada` | `si` | Full Sinhala Unicode (e.g., "හොඳින් ඉන්නවා!") |
| `mokada` | `si` | Full Sinhala Unicode |
| `ayubowan` | `si` | Full Sinhala Unicode |
| `mata dukai` | `si` | Full Sinhala Unicode |
| `sinhalen kiyanna` | `si` | Full Sinhala Unicode |
| `oya kohomada` | `si` | Full Sinhala Unicode |
| `mama hondai` | `si` | Full Sinhala Unicode |
| `bohoma isthuthi` | `si` | Full Sinhala Unicode |

### Tanglish (Code-switching) → Respond Mixing Sinhala Script + English

| Input | Expected Language | Expected Response Style |
|-------|------------------|------------------------|
| `mama phone ekak ganna one, budget eka 50k` | `tanglish` | Mix Sinhala Unicode + English (e.g., "මරු! Phone එකක් බලමු 🔥") |
| `mage laptop ekak repair karanna one` | `tanglish` | Mix Sinhala Unicode + English |
| `birthday gift ekak ganna one` | `tanglish` | Mix Sinhala Unicode + English |
| `mage gf` | `tanglish` | Mix Sinhala Unicode + English |
| `camera ekak balanna one under 50000` | `tanglish` | Mix Sinhala Unicode + English |
| `podi aulk bro` | `tanglish` | Mix Sinhala Unicode + English (emotional empathy) |
| `gf case machan` | `tanglish` | Mix Sinhala Unicode + English (emotional empathy) |

### English → Respond in English

| Input | Expected Language | Expected Response Style |
|-------|------------------|------------------------|
| `show me birthday cakes` | `en` | English |
| `I need a gift for my friend` | `en` | English |
| `what are the best phones under 50000` | `en` | English |
| `hello` | `en` | English |
| `track my order` | `en` | English |

---

## 2. Addressing Preference (Manual — Welcome Screen)

| Action | Expected Behavior |
|--------|-------------------|
| Click "Sir" chip | Sends "Call me Sir", Aura responds warmly with "Sir" |
| Click "Madam" chip | Sends "Call me Madam", Aura responds with female-appropriate slang only |
| Click "Bro" chip | Sends "Call me Bro", Aura responds with "Ela!" and uses male slang |
| Click "Machan" chip | Sends "Call me Machan", Aura uses casual male slang |
| Click "Sis" chip | Sends "Call me Sis", Aura uses female-appropriate slang only |
| Click "Just my name" chip | Sends "Call me by my name", Aura asks for name |
| Click "Aiya" chip | Sends "Call me Aiya", Aura responds with "Aiya" addressing |
| Click "Akka" chip | Sends "Call me Akka", Aura responds with "Akka" addressing |
| Click "Nangi" chip | Sends "Call me Nangi", Aura responds with "Nangi" addressing |
| Click "Malli" chip | Sends "Call me Malli", Aura responds with "Malli" addressing |
| Click "Uncle" chip | Sends "Call me Uncle", Aura responds with "Uncle" addressing |
| Click "Aunty" chip | Sends "Call me Aunty", Aura responds with "Aunty" addressing |
| Click "Boss" chip | Sends "Call me Boss", Aura responds with "Boss" addressing |
| Click "My name" chip | Name input field appears, enter name → "Call me by my name. My name is {name}" sent |

### Name Input Flow

| Step | Expected |
|------|----------|
| Click "My name" chip | Inline text input field appears with "Enter your name" placeholder |
| Type name + press Enter or click "Go" | Message "Call me by my name. My name is {name}" sent to LLM |
| Name cached | `aura_user_prefs.name` set in localStorage |
| Return visit | Greeting shows "Welcome back, {name}!" |

### Gender-Aware Slang Rules

| If user is... | ALLOWED expressions | NEVER use |
|---------------|--------------------|-----------| 
| Female (Madam/Sis) | niyamai, hari, shaa, lassanai, aniwa, saththai, maru | ela, machan, bro, patta, gindara, supiri |
| Male (Sir/Bro/Machan) | All expressions freely | — |

---

## 3. Emotional Support Agent (Manual)

### "Aiyo" Usage Rule
**"Aiyo" is ONLY for the USER'S OWN genuine emotional pain/grief.** Never for:
- Third-party positive news (e.g., "eya promote una" = she got promoted)
- Promotions, achievements, celebrations
- Search/technical errors
- Excitement, curiosity, or positive contexts
- **Normal shopping requests** ("I need groceries", "show me cakes", "I want chocolate")
- **General questions** ("what categories do you have?", "how does delivery work?")

| Input | Expected "Aiyo"? | Expected Response |
|-------|------------------|-------------------|
| `my girlfriend broke up with me` | Yes (own sadness) | "Aiyo... that's rough" + empathy |
| `I got promoted!` | No | "Maru!" / "Congratulations!" + celebration |
| `eya promote una` (she got promoted) | No | "Congratulations!" / "That's wonderful!" — positive tone |
| `I need a birthday gift` | No | "Who's the lucky one?" |
| `mata dukai` (I'm sad) | Yes (own sadness) | "Aiyo..." + Sinhala empathy |
| `I just got engaged!` | No | "MARU!" + congratulations |
| `work is stressing me out` | No | "That sounds tough" + empathy |
| `my dog died` | Yes (own loss) | "Aiyo..." + condolences |
| `job promotion` | No | "Congratulations!" / "Niyamai!" — NO "Aiyo" |
| Search failed / API error | No | "Hmm, let me try again" — NO "Aiyo" |
| `I need to buy groceries` | No (neutral shopping) | "Maru! 🥦🍚 What kind of groceries?" — NO "Aiyo" |
| `show me birthday cakes` | No (neutral shopping) | "Shaa! 🎂 Birthday cake එකක් බලමු!" — NO "Aiyo" |
| `I want chocolate` | No (neutral shopping) | "Chocolates බලමු! 🍫" — NO "Aiyo" |
| `what categories do you have?` | No (informational) | Helpful response — NO "Aiyo" |

### "Shaa!" Usage Rule
**"Shaa!" is ONLY for excitement, celebration, or wow moments.** NEVER for sad, stressed, or difficult situations.

| Input | Expected "Shaa!"? | Expected Response |
|-------|-------------------|-------------------|
| `podi aulk machan` (small problem) | NO | Empathetic — "mokada vune?" / "That sounds tough" |
| `aulak thamai` (having trouble) | NO | Empathetic — ask what happened |
| `I got promoted!` | Yes (celebration) | "Shaa!" / "Maru!" + congratulations |
| `I just got a new job!` | Yes (celebration) | Excitement + celebration |
| `gf case machan` (relationship problem) | NO | Empathetic — "mokada vune machan?" in Tanglish |

### Sri Lankan Slang Emotional Patterns (Automated: `orchestrator.test.ts`)

| Input | Expected Intent | Notes |
|-------|----------------|-------|
| `gf case machan` | `emotional` | "case" = relationship problem, NOT phone case |
| `my boyfriend scene is messed up` | `emotional` | "scene" = drama/situation |
| `ex cut kala` | `emotional` | "cut kala" = ghosted/broke up |
| `case broke with my crush` | `emotional` | Reversed word order still matches |
| `patch up karanawa` | `emotional` | Trying to reconcile |
| `podi aulk machan` | `emotional` | "podi aulk" = small problem |
| `aulak thamai` | `emotional` | Having trouble |
| `gediya wedi` | `emotional` | Tough situation |

### Language Matching in Emotional Responses

| Input Language | Expected Response Language |
|---------------|--------------------------|
| `gf case machan` (Tanglish) | Tanglish — mix Sinhala Unicode + English (e.g., "Aiyo... මොකද වුනේ machan?") |
| `podi aulk` (Sinhala words only) | Sinhala Unicode |
| `I'm feeling sad` (English) | English |

### Emotional Intent Detection
These should trigger the `emotional` intent (NOT shopping):

| Input | Expected Intent |
|-------|----------------|
| `I'm feeling sad` | `emotional` |
| `I got promoted!` | `emotional` |
| `my girlfriend broke up with me` | `emotional` |
| `I'm so stressed` | `emotional` |
| `feeling lonely today` | `emotional` |
| `we're celebrating our anniversary` | `emotional` |

---

## 4. Gift Suggestion Format (Manual)

When suggesting gift categories or product types, the response MUST:
- Format as a clear bullet/numbered list with emojis
- These MUST render as clickable action chips below the message

| Input | Expected Format | Expected Chips |
|-------|----------------|---------------|
| `job promotion, I want to get a gift` | Emoji bullet list | Clickable buttons (e.g., "🎁 Gift hampers", "🍫 Chocolates", "💐 Flowers", "🎂 Cakes") |
| `I want a gift for my friend` | Emoji bullet list | Clickable category chips |
| `what can I buy for amma?` | Emoji bullet list | Clickable category chips |

**NOT acceptable:** Embedding suggestions inline in prose (e.g., "You could try flowers, cakes, or chocolates")

---

## 5. Shopping Flow (Manual — No Regressions)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Product search | Type "show me birthday cakes under 5000 LKR" | Product cards with images, prices, buttons |
| Product carousel (mobile) | Search products on mobile viewport | Cards visible, horizontally scrollable, no blank area |
| Context actions (search) | After search results appear | Chips: "Add to Cart", "Find Similar", "Compare Options" |
| Context actions (product select) | Click "Details" on a product | Chips: "Add to Cart", "Find Similar", "Continue Delivery" |
| Add to cart | Click "Add to Cart" on a product | Cart count increases |
| Category browse | Click "Browse categories" chip | Category tiles appear at top. NO duplicated category buttons at bottom |
| Delivery check | Ask "can you deliver to Colombo?" | Logistics response |
| Dark mode | Click moon/sun toggle | UI switches theme |
| Chat history | Click clipboard icon | History panel slides out |

---

## 6. Sir/Madam Formal Language (Manual)

Sir/Madam users expect FORMAL English by default — NO Sinhala slang.

| Input (as Sir/Madam) | Expected | NOT Expected |
|---------------------|----------|-------------|
| Click "Sir" chip | "Good day, Sir. Welcome — how can I help you today?" | "Ela!", "Machan", "Shaa!" or any casual slang |
| `show me phones` | Professional English product listing | Sinhala slang mixed in |
| `eya promote una` | "That's wonderful! Congratulations!" (English) | "Aiyo...", "Maru!" or Sinhala expressions |

**Exception:** Sinhala expressions ARE allowed when the conversation switches to Sinhala mode (user types in pure Sinhala/Singlish and language is detected as `si` or `tanglish`).

---

## 7. UI / Visual (Manual)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Background scroll (light) | Scroll conversation to the very bottom | Background gradient continues smoothly — NO hard cutoff or color boundary |
| Background scroll (dark) | Switch to dark mode, scroll to bottom | Deep purple gradient fills entire area — NO plain black sections |
| Golden tree visible | Load welcome screen | Golden tree watermark visible in background (subtle) |
| Mobile product carousel | Search on mobile | Products render as swipeable cards with proper widths |

---

## 8. Caching Layer (Automated: `cacheManager.test.ts`, `userPrefsCache.test.ts`, `categoriesCache.test.ts`)

### Cache Manager (`src/lib/cache/cacheManager.ts`)

| Test Case | Expected |
|-----------|----------|
| `setCache` + `getCache` within TTL | Returns stored data |
| `getCache` past TTL | Returns null |
| `invalidateCache` | Removes entry from localStorage |
| `isCacheStale` within TTL | Returns false |
| `isCacheStale` past TTL | Returns true |
| `getCacheStale` past TTL | Returns data (ignores TTL) |
| Corrupted JSON in localStorage | Returns null gracefully (no throw) |
| `{data, timestamp}` JSON structure | Entries stored with data payload and numeric timestamp |

### User Preferences Cache (`src/lib/cache/userPrefsCache.ts`)

| Test Case | Expected |
|-----------|----------|
| Store and retrieve prefs | `getUserPrefs()` returns `{addressingMode, preferredLanguage, lastVisit}` |
| Prefs persisted under `aura_user_prefs` key | `localStorage.getItem('aura_user_prefs')` contains JSON |
| Optional name field | When `addressingMode: "name"`, `name` field stored and retrievable |
| `updateUserPrefs` partial update | Updates only specified fields, preserves others |
| `clearUserPrefs` | Removes `aura_user_prefs` from localStorage |
| `detectAddressingMode` — all 13 modes | Detects sir, madam, bro, machan, sis, aiya, akka, nangi, malli, uncle, aunty, boss, name |
| `detectAddressingMode` — case insensitive | "call me sir", "CALL ME BRO", "Call Me Aiya" all detected |
| `detectAddressingMode` — unrecognized | Returns null for non-matching messages |
| `getAddressingLabel` | Capitalizes mode; returns user name for "name" mode |
| `getReturningGreeting` | "Welcome back, Sir!" / "Welcome back, Lahiru!" |

### Categories Cache (`src/lib/cache/categoriesCache.ts`)

| Test Case | Expected |
|-----------|----------|
| Store and retrieve within 24h | `getCachedCategories()` returns categories array |
| Retrieve past 24h | `getCachedCategories()` returns null |
| `getStaleCategories` past 24h | Returns categories (stale-while-revalidate) |
| `areCategoriesStale` fresh | Returns false |
| `areCategoriesStale` past 24h | Returns true |
| `getCategoriesWithStaleness` fresh | `{categories, needsRefresh: false}` |
| `getCategoriesWithStaleness` stale | `{categories, needsRefresh: true}` |
| `getCategoriesWithStaleness` empty | `{categories: null, needsRefresh: true}` |

---

## 9. Cart Persistence & E2E Workflow (Manual)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Cart add | Search products → click "Add to Cart" | Cart badge increments, item in `aura-cart` localStorage |
| Cart survives refresh | Add item → refresh page | Cart badge still shows count, items preserved |
| Cart localStorage structure | Check `aura-cart` key | `{items: [{productId, name, price, currency, quantity, imageUrl}], deliveryCity, giftMessage}` |
| Returning user + cart | Set prefs → add to cart → reload | Welcome greeting shown, cart preserved |
| Full E2E workflow | 1. Select addressing mode → 2. Search products → 3. Add to cart → 4. Check delivery → 5. Reload | All state persisted: prefs cached, cart items preserved, delivery response rendered |

---

## 10. Returning User Flow (Manual)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| First visit | Clear localStorage → load page | Welcome screen with "Ayubowan!" and 13 addressing chips |
| Set preference | Click any addressing chip | Message sent, prefs cached in `aura_user_prefs` |
| Return visit | Reload page with prefs cached | Welcome screen hidden, "Welcome back, {label}!" greeting shown |
| No dual display | Return visit after fix | Only greeting card visible, NOT both welcome + greeting |
| Name mode return | Set "My name" + enter name → reload | "Welcome back, {name}!" greeting |

---

## 11. Running Tests

```bash
# All tests (unit + integration)
npm run test

# Just language detection
npx vitest run src/__tests__/detectLanguage.test.ts

# Just orchestrator (intent classification)
npx vitest run src/__tests__/orchestrator.test.ts

# Cache manager tests
npx vitest run src/__tests__/cacheManager.test.ts

# User preferences cache tests
npx vitest run src/__tests__/userPrefsCache.test.ts

# Categories cache tests
npx vitest run src/__tests__/categoriesCache.test.ts

# TypeScript check
npx tsc --noEmit

# Lint
npm run lint
```

---

## 12. Judge Evaluation Test Cases (Manual — Full E2E from URL)

These test cases simulate what a Kapruka competition judge would evaluate when opening https://aura-kapruka.vercel.app/.

### First Impression (Experience & Polish — 30 pts)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| First load | Open URL in incognito | "Ayubowan!" welcome screen with animated Aura avatar, floating golden particles |
| 13 addressing chips | View welcome screen | All chips visible: Sir, Madam, Bro, Machan, Sis, Aiya, Akka, Nangi, Malli, Uncle, Aunty, Boss, My name |
| Chip interaction | Click "Machan" | Message "Call me Machan" sent, warm Tanglish response ("Ela!") |
| Name input flow | Click "My name" → type name → Go | Name cached, Aura greets by name |
| Returning user | Reload after chip click | "Welcome back, {label}!" greeting, no duplicate welcome screen |
| Dark mode toggle | Click 🌙 button | Full theme switch, product cards/chat bubbles render correctly |
| Mobile responsive | Resize to mobile viewport | Layout adapts, product cards horizontally scrollable |
| ThinkingDots animation | Send any message | Yellow bouncing dots appear for at least 1.2s |

### Product Search & Visual Richness (Visual — 20 pts)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Product search | Type "birthday cake under 5000" | Product cards with images, names, prices, Details/Add to Cart buttons |
| Product carousel | View search results | Horizontal scrollable carousel with multiple product cards |
| Low stock badge | View product cards | "Low Stock" indicator visible on applicable items |
| Product detail | Click "Details" on product card | Product detail view with additional information |
| Opinionated recommendation | View AI response after search | AI picks a favorite ("If I had to pick one, I'd recommend...") |

### Personality & Language (Personality — 15 pts)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Tanglish input | Type "machan mama girlfriend ta valentine gift ekak ganna one" | Response in Tanglish with Sri Lankan expressions |
| Tanglish delivery | Ask about delivery in Tanglish | Delivery info in Tanglish ("Aiyo, machan! Kandy ta delivery karanna...") |
| Sinhala script input | Type "මට birthday cake එකක් ඕනෙ" | Response includes Sinhala Unicode script |
| Pure Sinhala input | Type "kohomada" | Response in Sinhala mode |
| Sir/Madam formal | Select "Sir" → ask a question | Formal English, no Sinhala slang |
| Bro/Machan casual | Select "Machan" → ask a question | Casual Tanglish with "Ela!", "Machan" etc. |
| Contextual chips | After search results | Chips: "Add my favorite to cart", "Compare Options", "Check delivery", "Show cheaper options" |
| Post-delivery chips | After delivery check | Chips: "Proceed to checkout", "Keep browsing", "Check another city" |

### Cart & Checkout (E2E — 15 pts)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Add to cart | Click "Add to Cart" on product card | Cart badge increments to 1 |
| Cart panel | Click cart icon | Side panel with product image, name, price, quantity +/-, gift message |
| Gift message | Open cart panel | Gift message textarea visible with placeholder |
| Checkout Step 1 | Click "Proceed to Checkout" | Modal: "Checkout Step 1/3 — Order Summary" with item list and subtotal |
| Checkout Step 2 | Click "Continue to Delivery" | Delivery details form |
| Checkout Step 3 | Complete delivery → next | Confirm & Pay step |
| Cart persistence | Add item → reload page | Cart badge still shows count |

### Usefulness (15 pts)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Budget filtering | "show me cakes under 3000" | Only products within budget returned |
| Delivery check | "can you deliver to Colombo?" | Delivery card with city, cost, availability |
| Gift guidance | "help me find a gift" | Guided flow: Who → Occasion → Budget |
| Cross-sell | Add item to cart | AI suggests complementary product |
| Compare options | Click "Compare Options" chip | AI compares top products |

### Creativity (5 pts)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Cultural addressing | 13 unique Sri Lankan modes | Aiya, Akka, Nangi, Malli, Uncle, Aunty, Boss + standard |
| Voice input button | View input bar | Microphone icon present |
| Chat history | Click clipboard icon | Previous sessions accessible |
| Preference caching | Set mode → return later | Preferences remembered across sessions |

---

## 13. Sinhala Language Test Cases (Manual)

| Input | Expected Language | Expected Response |
|-------|------------------|-------------------|
| `මට cake එකක් ඕනෙ` | `si` (Sinhala Unicode detected) | Sinhala Unicode response about cakes + **product search triggered** (real Kapruka products) |
| `මට birthday gift එකක් ඕනෙ` | `si` | Sinhala response with gift suggestions |
| `කොහොමද` | `si` | Sinhala greeting response |
| `මොකද ඕනෙ` | `si` | Sinhala asking what they need |
| `bohoma isthuthi` | `si` | Sinhala "you're welcome" response |
| `mama hondai` | `si` | Sinhala positive response |
| `sinhalen kiyanna` | `si` | Switch to full Sinhala mode |
| `ආයුබෝවන්` | `si` | Full Sinhala greeting response |
| `මට phone එකක් ගන්න ඕනෙ budget eka 50000` | `tanglish` | Mix Sinhala + English |

---

## 14. Sinhala Cultural Intelligence (Manual — Evaluated at 97/100)

These test cases verify the Sinhala/Sri Lankan cultural fixes from the 85→97 scoring improvement.

### Product Hallucination Guard

The AI MUST ONLY mention products returned by MCP tool calls. Never invent product names.

| Input | Expected | NOT Expected |
|-------|----------|--------------|
| `mage yaluwa ta chocolate ekak one, budget 3000` | Real Kapruka products (e.g., Java brand chocolates with LKR prices) | Cadbury Dairy Milk, Ferrero Rocher, Lindt, or any non-Kapruka products |
| `show me phones under 50000` | Products from MCP search results only | Samsung Galaxy, iPhone, or any guessed product names |
| MCP returns 0 results | Culturally-appropriate fallback: "Aiyo, machan! Search karala hitiye namuth eka nathiwa" (informal) / "I wasn't able to find that" (formal) | Invented product suggestions |

### Sinhala/Tanglish Product Search Triggering

Sinhala Unicode and Tanglish product mentions MUST trigger `kapruka_search_products`.

| Input | Expected Intent | Expected Behavior |
|-------|----------------|--------------------|
| `මට cake එකක් ඕනෙ` | `shopping` | Product search triggered, real cake products returned |
| `chocolate ඕනෙ` | `shopping` | Product search for "chocolate" |
| `flowers ganna one` | `shopping` | Product search for "flowers" |
| `mama phone ekak ganna one` | `shopping` | Product search for "phone" |
| `කේක්` (pure Sinhala for cake) | `shopping` | Product search for "cake" |

### "Aiyo" Empathy Expression (Correct Usage)

| Input | Expected Expression | Expected Response |
|-------|--------------------|-----------|
| `podi aulak machan` | **Aiyo** (empathy) | "Aiyo, machan! මොකද වුනේ? කියන්න — I'm here to listen." |
| `I just got promoted!` | **Maru** (celebration) | "Maru! 🎉 Congratulations!" — NOT "Aiyo" |
| `I need to buy groceries` | **Maru/Shaa/neutral** | Helpful shopping response — NEVER "Aiyo" |
| `show me cakes` | **Shaa/neutral** | Product search response — NEVER "Aiyo" |
| `work is killing me` | **Aiyo** (frustration) | "Aiyo, [mode]! That sounds tough." |
| `my dog died` | **Aiyo** (grief) | "Aiyo... I'm so sorry." |

### Script Purity (No Foreign Script Leakage)

Responses MUST only contain Sinhala Unicode (U+0D80–U+0DFF) and Latin/English characters.

| Scenario | Expected | NOT Expected |
|----------|----------|--------------|
| Any Sinhala/Tanglish response | Sinhala Unicode + English only | Japanese (例えば, こんにちは), Chinese (你好), Korean (안녕하세요) |
| "for example" in Sinhala context | "for example" or "උදාහරණයක් විදිහට" | 例えば (Japanese) |
| Product suggestions | Sinhala + English product names | Any CJK characters |

### Conversational Product Wrapper Text

Product results MUST be wrapped with personality text, not shown silently.

| Mode | Expected Wrapper | NOT Expected |
|------|------------------|--------------|
| Machan/Bro | "Shaa! මේවා බලන්න, machan!" or similar | Silent "Found X products" with no personality |
| Sis | "මේවා බලන්න! Hondama options ටික! ✨" | Just product cards with no text |
| Sir/Madam | "Here are the options I found for you:" | Casual slang |
| Sinhala | "මේවා බලන්න! ඔයාගේ budget එකට ගැලපෙනවා! 😊" | English-only wrapper |

### Branding

| Element | Expected | NOT Expected |
|---------|----------|--------------|
| Footer badge | "Powered by Kapruka × AI" | "Kapruka MCP × AI" or any internal tech naming |
| Bot name transliteration | ඔරා (correct) | ඕරා (incorrect vowel) |

### Sri Lankan Festival Awareness

The AI should naturally weave in festival context when relevant.

| Season | Expected Awareness |
|--------|--------------------|
| April (Aluth Avurudu) | Suggest sweets (kavum, kokis), new year hampers. Greeting: "සුභ අලුත් අවුරුද්දක් වේවා! 🎊" |
| May (Vesak) | Suggest white flowers, lanterns. Avoid alcohol. Greeting: "සුභ වෙසක් දිනයක්! 🪷" |
| December (Christmas) | Suggest cakes, hampers, decorations. Greeting: "Merry Christmas! 🎄" |
| February (Valentine's) | Suggest romantic gifts. "Valentine's Day ළඟයි! ❤️" |
| June (Father's Day) | "Happy Father's Day! Thaththa ta gift ekak? 👨‍👧" |

---

## 15. Comparison & Indecision Handling (PR #26)

When a user expresses indecision between brands/products, Aura should help with a comparison — NOT just dump two separate product lists.

### Comparison Intent Detection (Automated: `orchestrator.test.ts`)

| Input | Expected Intent | Notes |
|-------|----------------|-------|
| "apple da samsung da hithaganna ba mata phone" | shopping | Tanglish indecision pattern |
| "iPhone vs Samsung which is better phone" | shopping | English comparison "vs" |
| "can't decide between apple and samsung phone" | shopping | English indecision |
| "compare iPhone and Samsung phone" | shopping | Explicit comparison |
| "hithaganna bari apple samsung phone" | shopping | Tanglish "can't decide" |

### Comparison Response Quality (Manual — Live App)

| Input | Expected Behavior | NOT Expected |
|-------|-------------------|--------------|
| "apple da samsung da hithaganna ba mata" | Acknowledge dilemma → Ask clarifying questions (camera? battery? budget?) → Head-to-head comparison → Personal recommendation | Two separate product listings with no comparison or opinion |
| "iPhone vs Samsung for photography" | Compare camera specs from actual products → Recommend one with reasoning | Generic product dump |
| "mokada honda laptop ekak ganna" (which is good to buy a laptop) | Ask use case → Compare 2-3 options → Give opinion | Single product listing |

### Indecision Tanglish/Sinhala Phrases

| Phrase | Meaning | Should Trigger |
|--------|---------|----------------|
| "hithaganna ba" / "hithaganna bari" | Can't decide | Comparison mode |
| "X da Y da" | X or Y? | Comparison mode |
| "mokada honda" | Which is good? | Comparison mode |
| "confused machan" | Confused, bro | Comparison mode |

---

## 16. UI Polish & Error Handling (PRs #24, #25)

### MCP Error Resilience (PR #24)

| Action | Expected | NOT Expected |
|--------|----------|--------------|
| Click "Browse categories" when MCP server is slow | Bot says "Service temporarily unavailable" or shows categories normally | "Something went wrong. Tap retry" crash |
| Search products when MCP times out | Bot acknowledges the issue and asks to retry | Entire chat stream crashes |

### Avatar & Indicator Colors (PR #25)

| Element | Expected | NOT Expected |
|---------|----------|--------------|
| Online indicator dot (header) | Green (emerald-400) when idle/active | Violet or orange |
| Online indicator dot (thinking) | Amber (amber-400) | Violet |
| Avatar during tool calls | Gold/purple gradient matching branding | Orange |
| Welcome text | "from Kapruka" | "from the Kapruka" |
| Quick actions section | "Or jump right in:" intro text above chips | No intro text |

---

## 17. Adding New Test Cases

When adding new Sinhala words or emotional patterns:

1. Add the word to `SINHALA_WORDS` set in `src/lib/detectLanguage.ts`
2. Add a test case in `src/__tests__/detectLanguage.test.ts`
3. Add the expected behavior to this document
4. Run `npm run test` to verify

When adding new emotional keywords:
1. Add the keyword to `EMOTIONAL_PATTERNS` in `src/lib/agents/orchestrator.ts`
2. Add a test case in `src/__tests__/orchestrator.test.ts`
3. Add the expected behavior to this document

When adding new addressing modes:
1. Add the mode to `AddressingMode` type in `src/lib/cache/userPrefsCache.ts`
2. Add a detection regex pattern in `detectAddressingMode()`
3. Add the chip button in `src/components/chat/ChatContainer.tsx`
4. Add test cases in `src/__tests__/userPrefsCache.test.ts`
5. Add the expected behavior to this document

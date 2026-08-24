# Design Document
## AgriSetu — UI/UX Design Specification
**Version:** 1.0 | **Build Window:** 17–23 Aug 2026

---

## 1. Design Philosophy

AgriSetu serves two very different user types:
- **Farmers:** low-literacy, mobile-first, local language, needs icon-heavy, colour-coded, simple UI
- **FPO/Agronomist/Partners:** data-literate, analytical, needs map + charts + tables

Design must serve both without compromise. Use **role-based views** — same app, different interfaces based on user type selected at login.

**Core principles:**
1. **Clarity over aesthetics** — a farmer must understand the screen without reading much
2. **Colour-first communication** — Green = good, Yellow = caution, Red = alert
3. **Voice-first accessible** — every key action has a mic icon
4. **Multilingual from the start** — no hardcoded English strings; all via i18n keys

---

## 2. Colour Palette

| Token | Hex | Usage |
|---|---|---|
| `--green-primary` | `#2D6A4F` | Primary CTA buttons, healthy status |
| `--green-light` | `#52B788` | Hover states, success badges |
| `--green-bg` | `#D8F3DC` | Healthy status backgrounds |
| `--yellow-alert` | `#F4A261` | Caution/watch status |
| `--yellow-bg` | `#FFF3E0` | Caution backgrounds |
| `--red-danger` | `#E63946` | Disease alert, danger status |
| `--red-bg` | `#FFE8E8` | Danger/alert backgrounds |
| `--blue-data` | `#1B4F72` | Data labels, map overlays, charts |
| `--neutral-dark` | `#212529` | Body text |
| `--neutral-mid` | `#6C757D` | Secondary labels |
| `--neutral-light` | `#F8F9FA` | Page backgrounds |
| `--white` | `#FFFFFF` | Cards, modals |
| `--brics-gold` | `#C9A84C` | BRICS branding accent |

---

## 3. Typography

| Role | Font | Size | Weight |
|---|---|---|---|
| App Name / Hero | Inter | 28px | 700 |
| Section Headings | Inter | 20px | 600 |
| Body Text | Inter | 16px | 400 |
| Small Labels | Inter | 13px | 400 |
| Status Icons Label | Inter | 18px | 600 |
| Data Values | Inter Mono | 16px | 500 |

**Note:** Use system fonts as fallback (`-apple-system, BlinkMacSystemFont, 'Segoe UI'`) to ensure fast load without font downloads.

---

## 4. Component Library (Tailwind CSS + Custom)

All components built with **React + Tailwind CSS**. No external component library to keep bundle size small.

### 4.1 Status Card (Farmer View)
```
┌──────────────────────────────────────┐
│  🌱  Crop Health          [GREEN]    │
│      Your wheat is healthy           │
│      NDVI: 0.72 (Good)               │
└──────────────────────────────────────┘
```
- Background: `--green-bg` for GREEN, `--yellow-bg` for YELLOW, `--red-bg` for RED
- Icon: Large emoji or SVG icon (64px) left-aligned
- Status badge: Pill with colour + label in farmer's language
- Sub-text: One simple sentence

### 4.2 Advisory Card
```
┌──────────────────────────────────────────────┐
│  🌾 Recommended Crop: Wheat              94% │
│  📅 Sowing Window: 15 Oct – 30 Oct           │
│  💧 Irrigation: Every 7 days                 │
│  🌿 Regenerative: Try intercropping mustard  │
│  ─────────────────────────────────────────── │
│  Why: Your soil N=45 (Low). Wheat + mustard  │
│       will restore nitrogen naturally.        │
└──────────────────────────────────────────────┘
```

### 4.3 Disease Result Card
```
┌──────────────────────────────────────────────┐
│  🔴 Tomato Late Blight          87% sure     │
│  Severity: Moderate                          │
│  ─────────────────────────────────────────── │
│  Treatment: Copper-based fungicide           │
│  Organic: Neem oil spray                     │
│  [📷 Diagnose Another] [💬 Ask More]         │
└──────────────────────────────────────────────┘
```

### 4.4 Chat Widget
- Fixed bottom-right floating button (💬) on all pages
- Opens slide-up panel (60% screen height on mobile)
- Language selector at top of chat
- Mic button for voice input
- Message bubbles: farmer = right-aligned green, advisor = left-aligned white
- Typing indicator (3-dot animation) while awaiting LLM response

### 4.5 Map Component (Leaflet.js)
- Default tile layer: OpenStreetMap
- Farm plot boundaries: Green polygon outline, semi-transparent fill
- NDVI overlay: Green-to-red gradient raster
- Disease heatmap: Orange-to-red density layer
- Zoom controls bottom-right
- Click on plot → popup with plot summary

---

## 5. Screen Designs

### 5.1 Landing / Language Selection
```
┌─────────────────────────────────┐
│          🌾 AgriSetu            │
│    BRICS Digital Agriculture    │
│                                 │
│  Select your language:          │
│  [हिंदी] [मराठी] [English]      │
│  [Português] [中文]             │
│                                 │
│  [Register Farm] [Login]        │
└─────────────────────────────────┘
```

### 5.2 Farm Onboarding — Map Screen
```
┌─────────────────────────────────────────────────────┐
│  📍 Register Your Farm                              │
│  Draw your farm boundary or enter your location     │
│ ┌───────────────────────────────────────────────┐   │
│ │         [Interactive Leaflet Map]             │   │
│ │         [Draw boundary tool active]           │   │
│ └───────────────────────────────────────────────┘   │
│  OR: Village: [___________] District: [__________]  │
│  Crop last grown: [_________]                       │
│                                                     │
│  [✓ Save Farm & Get Data]                           │
└─────────────────────────────────────────────────────┘
```

### 5.3 Farmer Dashboard (Simple View)
```
┌─────────────────────────────────────────────────────┐
│  🌾 AgriSetu          [Farm: Rampur Plot A]  [≡]   │
├─────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────┐    │
│  │ 🌱 Crop Health     │  │ 💧 Water Today?    │    │
│  │   HEALTHY 🟢       │  │    YES 💧           │    │
│  │   NDVI: 0.72       │  │    Next: 3 days    │    │
│  └────────────────────┘  └────────────────────┘    │
│  ┌────────────────────┐  ┌────────────────────┐    │
│  │ 🌦 Weather Risk    │  │ 🐛 Disease Alert   │    │
│  │   LOW 🟢           │  │   NONE ✅           │    │
│  │   Rain in 5 days   │  │   Last check: today │   │
│  └────────────────────┘  └────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  [🌾 Get Advisory]  [📷 Diagnose Disease]  [💬 Chat]│
└─────────────────────────────────────────────────────┘
```

### 5.4 FPO / Agronomist Dashboard (Analytical View)
```
┌──────────────────────────────────────────────────────────────┐
│  AgriSetu — FPO Dashboard    [Sangli District, Maharashtra]  │
├──────────────────────┬───────────────────────────────────────┤
│  SIDE NAV            │  MAP PANEL                            │
│  > Overview          │  [Full-screen Leaflet map]            │
│  > Plots Map         │  [Plots coloured by NDVI health]      │
│  > Disease Heatmap   │  [Toggle: NDVI | Soil Moisture]       │
│  > Regen Adoption    ├───────────────────────────────────────┤
│  > BRICS API Panel   │  STATS PANEL                          │
│  > Alerts            │  Total Plots: 24 | Alerts: 3          │
│                      │  NDVI < 0.4: 3 plots (🔴)            │
│                      │  Disease reports this week: 7         │
│                      │  ──────────────────────────           │
│                      │  [Download Aggregate JSON]            │
└──────────────────────┴───────────────────────────────────────┘
```

---

## 6. Mobile Responsiveness

- All screens must be fully functional on 375px wide viewport (iPhone SE / budget Android)
- Farmer dashboard: Single column, full-width status cards (stacked 2x2)
- Chat widget: Full-screen overlay on mobile
- Map: Full-width, 40vh height on mobile
- Navigation: Bottom tab bar on mobile (Dashboard, Diagnose, Chat, Profile)
- Touch targets: Minimum 48x48px for all interactive elements

---

## 7. Accessibility

| Requirement | Implementation |
|---|---|
| Language support | All strings via i18n JSON files; switch language anytime |
| Voice input | Mic button on every text input; works with WhatsApp voice notes |
| Colour-blind safe | All status colours have text labels + icons (not colour alone) |
| Low-bandwidth | Images lazy loaded; chat uses text-only mode as fallback |
| Screen reader | All icons have aria-labels; all images have alt text |
| Font size | Base 16px; user can increase via browser settings |

---

## 8. i18n (Internationalisation) Structure

```
/src/locales/
  en.json   ← English (default)
  hi.json   ← Hindi
  mr.json   ← Marathi
  pt.json   ← Portuguese (demo)
  zh.json   ← Mandarin (demo)
```

**Sample i18n key structure:**
```json
{
  "dashboard.crop_health": "Crop Health",
  "dashboard.water_today": "Water Today?",
  "status.healthy": "Healthy",
  "status.caution": "Watch",
  "status.alert": "Alert",
  "advisory.recommended_crop": "Recommended Crop",
  "advisory.sowing_window": "Best Sowing Window",
  "disease.result_title": "Disease Detected",
  "chat.placeholder": "Ask me anything about your farm...",
  "onboarding.draw_boundary": "Draw your farm on the map"
}
```

---

## 9. BRICS Branding

- App name: **AgriSetu** (Sanskrit: "bridge" — a bridge between farmers and data)
- Tagline: "Kheti ka saathi — हर BRICS kisan ka" (Farmer's companion for every BRICS farmer)
- Logo: Wheat stalk + network nodes forming a bridge shape; gold (#C9A84C) and green (#2D6A4F)
- BRICS flag colours: subtly referenced in the dashboard header gradient
- Footer: "Aligned with BRICS AgriN & BRICS Network on Digital Agriculture | Indore Declaration 2026"

---

## 10. Design Delivery Checklist

- [ ] Landing / language selection screen
- [ ] Farm onboarding + map screen
- [ ] Farmer dashboard (simple view) — web + mobile
- [ ] FPO dashboard (analytical view)
- [ ] Disease diagnosis result screen
- [ ] Advisory card component
- [ ] Chat widget (web floating)
- [ ] Voice recording UI (mic button + waveform indicator)
- [ ] WhatsApp bot message templates (text-based, no rich cards for sandbox)
- [ ] BRICS API documentation page (FastAPI /docs auto-generated)

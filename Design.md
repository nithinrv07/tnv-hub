# TNV Hub Design System Specification

> **Document Version**: 1.0.0  
> **Target Application**: Tamil Nadu Volunteers (TNV) Hub Portal & Volunteer Lifecycle Ecosystem  
> **Status**: Living Design System & Frontend Architecture Reference  
> **Source Directories Audited**:
> - React/Vite Client: [`frontend/client`](file:///d:/TNV%20PHASE%201/frontend/client)
> - Reference Portal: [`frontend/frontend reference`](file:///d:/TNV%20PHASE%201/frontend/frontend%20reference)
> - Next.js Selection Portal: [`tnv-selection-next-master`](file:///d:/TNV%20PHASE%201/tnv-selection-next-master)

---

## 1. Design System Overview & Tech Stack

### 1.1 Philosophy & Visual Direction
The TNV Hub frontend architecture implements a purposeful, high-contrast, civic-first design philosophy. Rather than utilizing generic component frameworks or heavy runtime abstraction layers, the system emphasizes:
1. **Civic Trust & Authority**: Grounded in official Tamil Nadu civic greens (`#1B6B3A`, `#124D29`) paired with energetic volunteer yellow (`#F2B705`), balancing governmental dignity with grassroots warmth.
2. **Accessibility-First & Low-Bandwidth Resilience**: Strict WCAG 2.1 AA/AAA compliance, explicit minimum 44px touch targets across all interactive elements, system font fallbacks, zero external runtime animation libraries, and progressive enhancement for unreliable mobile connections.
3. **Bilingual Harmony (Tamil + English)**: Native bilingual typography pairings with `Anek Tamil` variable font and Latin system typography, paired with Google Translate DOM crash guards (`facebook/react#11538`).
4. **Dual-Environment Architecture**:
   - **Production Public Web Client** ([`frontend/client`](file:///d:/TNV%20PHASE%201/frontend/client)): Light, clean civic theme with modern Tailwind CSS utility structure, React 18, React Hook Form, and Zod.
   - **Admin & Verification Portal Reference** ([`frontend/frontend reference`](file:///d:/TNV%20PHASE%201/frontend/frontend%20reference)): High-density dark glassmorphism system optimized for data scanning, Aadhaar verification, telephone logging, and leadership scoring.

---

### 1.2 Technology & Dependency Matrix

| Category | Tool / Library | Version | File Reference | Purpose / Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Framework** | React / React DOM | `18.3.1` | [`package.json`](file:///d:/TNV%20PHASE%201/frontend/client/package.json#L13-L14) | Core component model & concurrent UI rendering |
| **Bundler & Server** | Vite | `5.4.11` | [`package.json`](file:///d:/TNV%20PHASE%201/frontend/client/package.json#L24) | High-speed ESM dev server & optimized Rollup build |
| **Styling Engine** | Tailwind CSS | `3.4.17` | [`tailwind.config.js`](file:///d:/TNV%20PHASE%201/frontend/client/tailwind.config.js#L5) | Utility-first styling engine with custom semantic tokens |
| **Post-processing** | PostCSS + Autoprefixer | `8.4.49` / `10.4.20` | [`postcss.config.js`](file:///d:/TNV%20PHASE%201/frontend/client/postcss.config.js) | Vendor prefixing and CSS layer compilation |
| **Routing** | React Router DOM | `6.28.0` | [`App.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/App.jsx#L1) | Client-side routing with hash scroll restoration |
| **Form Management** | React Hook Form | `7.53.2` | [`Register.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/pages/Register.jsx#L3) | Uncontrolled, high-performance form state & validation |
| **Schema Validation** | Zod + Hookform Resolver | `3.23.8` / `3.9.1` | [`registerSchema.js`](file:///d:/TNV%20PHASE%201/frontend/client/src/lib/registerSchema.js#L1) | Strict type-safe runtime validation and regex enforcement |
| **Iconography** | Inline SVGs + Component | Custom | [`SocialIcon.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/SocialIcon.jsx) | Zero-dependency, 0KB-overhead vector icons |
| **Animation Engine** | Native Web APIs | Custom | [`motion.js`](file:///d:/TNV%20PHASE%201/frontend/client/src/lib/motion.js) | IntersectionObserver + requestAnimationFrame motion |
| **Typography Engine** | Google Fonts (`Anek Tamil`) | Variable | [`index.html`](file:///d:/TNV%20PHASE%201/frontend/client/index.html#L10-L13) | Variable width/weight bilingual font family |

---

### 1.3 Directory Structure & Architectural Footprint

```
d:/TNV PHASE 1/
├── frontend/
│   ├── client/                          # Production Vite + React + Tailwind App
│   │   ├── index.html                   # HTML entry point, font preconnects, meta theme-color
│   │   ├── package.json                 # Dependencies & scripts
│   │   ├── tailwind.config.js           # Design tokens, color scales, keyframes, tap targets
│   │   ├── postcss.config.js            # PostCSS plugin registration
│   │   ├── vite.config.js               # Vite build & react plugin config
│   │   ├── public/                      # Static assets (/tnv-logo.png, manifest)
│   │   └── src/
│   │       ├── main.jsx                 # React root, Google Translate DOM monkey-patch
│   │       ├── App.jsx                  # Route definitions & layout wrappers
│   │       ├── index.css                # @tailwind directives, component classes, a11y overrides
│   │       ├── components/              # UI Component Library
│   │       │   ├── AppShell.jsx         # Root layout shell with skip link & scroll restoration
│   │       │   ├── Header.jsx           # Responsive sticky header, branding, compact mode
│   │       │   ├── TopBar.jsx           # Ticker, social icons, emergency numbers
│   │       │   ├── Footer.jsx           # 4-column responsive civic footer
│   │       │   ├── Gallery.jsx          # Accessible full-bleed carousel with touch gestures
│   │       │   ├── LanguageMenu.jsx     # Dropdown menu for Google Translate switching
│   │       │   ├── Logo.jsx             # Official TNV brand emblem and title lockup
│   │       │   ├── Reveal.jsx           # Scroll-triggered text & heading reveal wrappers
│   │       │   ├── SocialIcon.jsx       # Handcrafted SVG social channel icons
│   │       │   ├── Spinner.jsx          # Circular loading spinner primitive
│   │       │   └── form/                # Form-specific primitives
│   │       │       ├── FormField.jsx    # Accessible field wrapper (label, hint, error, aria)
│   │       │       ├── PasswordInput.jsx# Password & Aadhaar masked field with show/hide toggle
│   │       │       └── DistrictSelect.jsx# Dynamic Tamil Nadu district dropdown with async retry
│   │       ├── pages/                   # Application Page Views
│   │       │   ├── Landing.jsx          # Official landing page (Hero, About, Impact, Programs, etc.)
│   │       │   ├── Register.jsx         # 2-column volunteer onboarding form
│   │       │   ├── Policy.jsx           # Dynamic legal policies renderer (Terms, Privacy, Refund)
│   │       │   ├── ComingSoon.jsx       # Fallback page for staged Phase 2 features
│   │       │   └── NotFound.jsx         # 404 handler
│   │       ├── lib/                     # Utilities & Logic
│   │       │   ├── api.js               # Fetch wrapper with timeout and JSON formatting
│   │       │   ├── format.js            # Phone and localized number formatters
│   │       │   ├── motion.js            # prefers-reduced-motion, in-view, RAF hooks
│   │       │   ├── registerSchema.js    # Zod registration schema & regular expressions
│   │       │   ├── session.js           # Auth token storage & retrieval
│   │       │   └── translate.js         # Google Translate element lifecycle controller
│   │       └── data/                    # Hardcoded Civic & Portal Datasets
│   │           ├── site.js              # Zones, 38 districts, impact numbers, programs, team
│   │           └── policies.js          # Official terms, privacy, and refund texts
│   │
│   └── frontend reference/              # Canonical HTML5/CSS3/JS Reference Portal
│       ├── index.html                   # Monolithic portal views (Hero, Form, Dash, Admin)
│       ├── style.css                    # Dark glassmorphic stylesheet & verification tokens
│       ├── app.js                       # Comprehensive client-side state machine
│       └── public/                      # Static distribution bundle
```

---

## 2. Design Tokens (Single Source of Truth)

### 2.1 Color System

The application uses two distinct color token sets: the **Civic Light Theme** for public volunteers (defined in [`frontend/client/tailwind.config.js`](file:///d:/TNV%20PHASE%201/frontend/client/tailwind.config.js#L9-L29)) and the **Dark Glassmorphic Theme** for administrative verification (defined in [`frontend/frontend reference/style.css`](file:///d:/TNV%20PHASE%201/frontend/frontend%20reference/style.css#L3-L27)).

#### Civic Light Theme Tokens (`frontend/client`)

| Token Name | Hex Code | HSL Representation | Tailwind Class | Semantic Usage & Context |
| :--- | :--- | :--- | :--- | :--- |
| `brand.green` | `#1B6B3A` | `hsl(143, 60%, 26%)` | `bg-brand-green`, `text-brand-green`, `border-brand-green` | Primary brand green. Used on primary buttons, success text, and section accents. |
| `brand.green-dark`| `#124D29` | `hsl(144, 61%, 19%)` | `bg-brand-green-dark`, `text-brand-green-dark` | Deep forest green. Header backgrounds, hero section canvas, primary headings. |
| `brand.green-tint`| `#E8F3EC` | `hsl(141, 33%, 93%)` | `bg-brand-green-tint`, `border-brand-green-tint` | Mint background wash for impact section, dividers, subtle card borders. |
| `brand.yellow` | `#F2B705` | `hsl(45, 96%, 48%)` | `bg-brand-yellow`, `text-brand-yellow`, `border-brand-yellow` | Warm golden yellow. Volunteer registration CTA, ticker bar, focus ring indicator. |
| `brand.yellow-tint`| `#FFF6D6`| `hsl(48, 100%, 92%)` | `bg-brand-yellow-tint` | Pale warm card background, values cards, contact section container. |
| `neutral.white` | `#FFFFFF` | `hsl(0, 0%, 100%)` | `bg-white`, `text-white` | Card backgrounds, top header background, high-contrast text on dark green. |
| `neutral.bg` | `#F7F9F7` | `hsl(120, 11%, 97%)` | `bg-neutral-bg` | Off-white canvas background for form views, program lists, and join steps. |
| `neutral.ink` | `#222222` | `hsl(0, 0%, 13%)` | `text-neutral-ink` | Primary body copy color; ensures WCAG AAA contrast ratio on white/light-gray. |
| `neutral.muted` | `#555555` | `hsl(0, 0%, 33%)` | `text-neutral-muted` | Secondary copy, metadata, input placeholders (`#555555b3`), and breadcrumbs. |
| `status.approved` | `#1B6B3A` | `hsl(143, 60%, 26%)` | `text-status-approved` | Verified membership badge, successful field validation message. |
| `status.pending` | `#F2B705` | `hsl(45, 96%, 48%)` | `text-status-pending` | Under-review badge, awaiting telephone call verification. |
| `status.no-answer`| `#C62828` | `hsl(0, 66%, 47%)` | `text-status-no-answer`, `border-status-no-answer` | Validation error text, form alert boxes, negative telephone outcomes. |
| `status.scheduled`| `#E08A00` | `hsl(37, 100%, 44%)` | `text-status-scheduled` | Callback requested, interview postponement status badge. |

#### Dark Glassmorphism Theme Tokens (`frontend/frontend reference`)

| CSS Variable | Exact Value | Tailwind Equivalent | Role in Interface |
| :--- | :--- | :--- | :--- |
| `--bg-main` | `#0B1120` | `bg-slate-950` | Root background for admin queues and preview portal |
| `--bg-card` | `rgba(17, 24, 39, 0.90)` | `bg-gray-900/90` | Glassmorphic card surface with backdrop blur |
| `--bg-card-sub` | `rgba(30, 41, 59, 0.60)` | `bg-slate-800/60` | Secondary nested container, table rows, pill wrappers |
| `--border-color` | `rgba(255, 255, 255, 0.08)`| `border-white/10` | 1px translucent border outlining cards and input groups |
| `--border-focus` | `#38bdf8` | `focus:border-sky-400` | Glowing bright cyan active outline on input focus |
| `--primary` | `#0284c7` | `bg-sky-600` | Admin action buttons, primary table headers |
| `--primary-hover`| `#0369a1` | `hover:bg-sky-700` | Hover state for interactive primary actions |
| `--primary-glow` | `rgba(56, 189, 248, 0.25)` | `shadow-[0_0_15px_rgba(56,189,248,0.25)]` | Glowing halo around key registration & approval buttons |
| `--text-main` | `#f8fafc` | `text-slate-50` | Primary white text for dark canvas |
| `--text-muted` | `#94a3b8` | `text-slate-400` | Secondary slate labels, table subtext |
| `--text-dim` | `#64748b` | `text-slate-500` | Minor captions, disabled button copy |
| `--success` | `#10b981` | `text-emerald-500` | Real-time backend status pulse indicator, approved status |
| `--success-bg` | `rgba(16, 185, 129, 0.12)` | `bg-emerald-500/10` | Background pill for verified members |
| `--danger` | `#ef4444` | `text-red-500` | Aadhaar decryption warnings, rejected badge |
| `--danger-bg` | `rgba(239, 68, 68, 0.12)` | `bg-red-500/10` | Background for negative validation warnings |
| `--warning` | `#f59e0b` | `text-amber-500` | Pending verification status, telephone call warnings |
| `--warning-bg` | `rgba(245, 158, 11, 0.12)` | `bg-amber-500/10` | Under review banner background |

---

### 2.2 Typography System

#### Font Families & Loading Mechanism
- **Display Typography (`font-display`)**:
  - Declaration: `['"Anek Tamil"', 'system-ui', 'sans-serif']` ([`tailwind.config.js`](file:///d:/TNV%20PHASE%201/frontend/client/tailwind.config.js#L32)).
  - Source: Loaded via Google Fonts preconnect CDN in [`index.html`](file:///d:/TNV%20PHASE%201/frontend/client/index.html#L8-L13):
    `https://fonts.googleapis.com/css2?family=Anek+Tamil:wdth,wght@75..125,500..800&display=swap`
  - Purpose: Variable-width, variable-weight font used for the Tamil motto (`"இயன்றதை இணைந்து செய்வோம்!"`), official logo, hero titles, statistics numerals, and section titles.
- **Body & Interface Typography (`font-sans`)**:
  - Declaration: `['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Noto Sans', 'Noto Sans Tamil', 'sans-serif']` ([`tailwind.config.js`](file:///d:/TNV%20PHASE%201/frontend/client/tailwind.config.js#L33-L41)).
  - Purpose: Zero-network-latency system stack providing clean legibility across Android, iOS, Windows, and Linux devices.
- **Monospace Typography (`font-mono`)**:
  - Declaration: `'JetBrains Mono', monospace` ([`style.css`](file:///d:/TNV%20PHASE%201/frontend/frontend%20reference/style.css#L22)) and `var(--font-geist-mono)` ([`globals.css`](file:///d:/TNV%20PHASE%201/tnv-selection-next-master/tnv-selection-next-master/app/globals.css#L12)).
  - Purpose: Formatted Aadhaar masks, registration receipt numbers (`TNV-R-2026-XXXX`), and telephone dial numbers.

#### Type Scale & Hierarchy

| Role / Element | Font Size | Line Height | Font Weight | Letter Spacing | CSS Classes / Inline Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display Headline** | `44px` / `72px` (`2.6rem` - `4.5rem`) | `1.02` | `800` (ExtraBold) | `-0.02em` (`fontStretch: 88%`) | `font-display text-[2.6rem] sm:text-6xl lg:text-7xl font-extrabold` |
| **Step Large Counter** | `96px` (`6rem`) | `1.0` | `800` (ExtraBold) | `normal` (`tabular-nums`) | `font-display text-8xl font-extrabold leading-none tabular-nums` |
| **Section Title (h2)** | `36px` / `48px` (`2.25rem` - `3rem`) | `1.2` (`tight`) | `700` (Bold) | `-0.01em` | `font-display text-4xl font-bold sm:text-5xl` |
| **Impact Numeric Stat** | `28px` / `44px` (`1.75rem` - `2.75rem`)| `1.0` | `800` (ExtraBold) | `-0.02em` (`fontStretch: 85%`) | `font-display text-[1.75rem] font-extrabold sm:text-4xl xl:text-[2.75rem]` |
| **Card / Program Title** | `24px` / `30px` (`1.5rem` - `1.875rem`)| `1.25` (`tight`) | `700` (Bold) | `-0.01em` (`fontStretch: 92%`) | `font-display text-2xl font-bold sm:text-3xl` |
| **Form Section Legend** | `18px` (`1.125rem`) | `1.4` | `700` (Bold) | `normal` | `text-lg font-bold text-brand-green-dark` |
| **Body Large (Intro)** | `18px` (`1.125rem`) | `1.625` (`relaxed`) | `400` / `500` | `normal` | `text-lg leading-relaxed text-neutral-muted` |
| **Body Standard** | `16px` (`1.0rem`) | `1.6` | `400` (Normal) | `-0.011em` | `text-base text-neutral-ink` ([`index.css`](file:///d:/TNV%20PHASE%201/frontend/client/src/index.css#L10)) |
| **Input & Form Label** | `16px` (`1.0rem`) | `1.5` | `600` (SemiBold) | `normal` | `font-semibold text-neutral-ink mb-1.5 block` |
| **Micro Caption / Hint** | `14px` (`0.875rem`) | `1.4` | `400` / `500` | `normal` | `text-sm text-neutral-muted` |
| **Badge / Legal Meta** | `12px` (`0.75rem`) | `1.3` | `600` / `700` | `0.5px` (Uppercase) | `text-xs uppercase tracking-wider font-bold` |

---

### 2.3 Spacing, Radius, Tap Targets & Elevation

#### Spacing Scale Patterns
The interface is structured along a consistent 4px/8px incremental grid with responsive layout spacing:
- **Form Row Spacing**: `space-y-8` (32px vertical separation between form sections).
- **Field Gap**: `grid gap-5` (20px separation between inputs on desktop grid).
- **Section Padding**: `py-14 sm:py-20` (56px to 80px) and `py-16 sm:py-24` (64px to 96px) for major landing sections.
- **Card Padding**: `p-5 sm:p-8` (20px mobile to 32px desktop interior card padding).

#### Tap Target Standard (WCAG 2.5.5)
In [`frontend/client/tailwind.config.js`](file:///d:/TNV%20PHASE%201/frontend/client/tailwind.config.js#L53-L54):
```javascript
minHeight: { tap: '44px' },
minWidth: { tap: '44px' }
```
**Mandatory Enforcement**: Every button, input field, language menu toggle, mobile hamburger toggle, carousel chevron, and navigation anchor adheres to `min-h-tap` and `min-w-tap` (`44px × 44px`).

#### Border Radius Scale

| Token | Value | Tailwind Class | Applied To |
| :--- | :--- | :--- | :--- |
| `--radius-sm` | `6px` | `rounded-md` | Ticker pills, badge labels, social icon wrappers |
| Standard Button | `8px` | `rounded-lg` | Primary and outline action buttons, input text fields |
| `--radius-md` | `10px` | `rounded-lg` / `rounded-xl`| Dropdown containers, hero primary buttons |
| Card Container | `12px` / `16px` | `rounded-xl` | Form cards, values cards, contact information box |
| Pill / Circular | `9999px` | `rounded-full` | Registration CTAs, social buttons, carousel arrows, status dots |

#### Box Shadow & Elevation Tokens

| Level | Elevation CSS Value | Tailwind Utility Class | Usage |
| :--- | :--- | :--- | :--- |
| **Subtle Border Ring** | `0 0 0 1px rgba(232,243,236,1)` | `ring-1 ring-brand-green-tint` | Registration form container border |
| **Card Floating** | `0 1px 3px rgba(0,0,0,0.1)` | `shadow-sm` | Form card background elevation |
| **Sticky Header** | `0 2px 14px rgba(18, 77, 41, 0.15)` | `shadow-[0_2px_14px_rgba(18,77,41,0.15)]` | Triggered dynamically on scroll (`y > 0`) |
| **Dropdown Popup** | `0 10px 15px -3px rgba(0,0,0,0.1)`| `shadow-lg ring-1 ring-black/10` | Language dropdown, carousel arrow chevrons |
| **Admin Glass Card** | `0 10px 25px -5px rgba(0,0,0,0.3)` | `--shadow-card` (CSS variable) | Reference portal modal cards, review sheets |
| **Primary Cyan Glow** | `0 0 15px rgba(56, 189, 248, 0.25)` | `--primary-glow` (CSS variable) | Admin action buttons, status dot pulse |

#### Z-Index Layering Conventions

| Z-Index | Class / Variable | Elements Assigned |
| :--- | :--- | :--- |
| `z-50` | `z-50` | `LanguageMenu` dropdown list, Skip-to-content focus ring, modal backdrops |
| `z-40` | `z-40` | Sticky `<header>` navigation container |
| `z-10` | `z-10` | Carousel navigation arrows, active step numbers, sticky step counter |
| `z-0` | Default | Regular content stream and background decorative gradients |

---

## 3. Layout & Responsive Architecture

### 3.1 Breakpoint Scale

| Breakpoint | Minimum Width | Architectural Behavior |
| :--- | :--- | :--- |
| `base` | `< 640px` | Single-column form, collapsed mobile navigation, stacked buttons, horizontal swipe carousel |
| `sm` | `640px` | 2-column form field layouts, expanded credential badges, 2-column impact stats |
| `md` | `768px` | Top bar social links appear, sticky step counter on How Joining, tablet grid alignment |
| `lg` | `1024px` | Main horizontal desktop navigation bar appears, 5-column impact grid, hero 2-column split |
| `xl` | `1280px` | Expanded container margins, full statistical font sizes (`2.75rem`) |
| `2xl` | `1536px` | Max container bound constraint |

---

### 3.2 Containers & Page Shell Layout

#### Universal Container Pattern (`.container-page`)
Defined in [`frontend/client/src/index.css`](file:///d:/TNV%20PHASE%201/frontend/client/src/index.css#L63-L65):
```css
@layer components {
  .container-page {
    @apply mx-auto w-full max-w-6xl px-4 sm:px-6;
  }
}
```
- **Max Width**: `max-w-6xl` (`1152px`), ensuring optimal line length and comfortable readability without horizontal stretching.
- **Narrow Container**: `max-w-3xl` (`768px`), utilized for focused task-based flows:
  - Volunteer Registration Form ([`Register.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/pages/Register.jsx#L154))
  - Legal Policy Reading Pages ([`Policy.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/pages/Policy.jsx#L33))

#### Root Application Shell Structure
Implemented in [`frontend/client/src/components/AppShell.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/AppShell.jsx#L34-L52):
```jsx
<div className="flex min-h-screen flex-col">
  {/* 1. Accessible Screen Reader Skip Anchor */}
  <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2">
    Skip to content
  </a>
  {/* 2. TopBar + Sticky Navigation */}
  <Header />
  {/* 3. Main Dynamic Content Outlet */}
  <main id="main" className="flex-1">
    <Outlet />
  </main>
  {/* 4. Full-bleed Multi-column Footer */}
  <Footer />
</div>
```

#### The Dynamic 2-Column Responsive Form Pattern
Implemented in [`Register.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/pages/Register.jsx#L34-L43) and [`frontend reference/style.css`](file:///d:/TNV%20PHASE%201/frontend/frontend%20reference/style.css#L305-L330):
```jsx
function Section({ title, children }) {
  return (
    <fieldset className="grid gap-5 border-t border-brand-green-tint pt-6 sm:grid-cols-2">
      <legend className="float-left mb-1 w-full text-lg font-bold text-brand-green-dark sm:col-span-2">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
```
- Full-width span controls: Inputs such as `full_name`, `address`, and `username` utilize `sm:col-span-2`.
- Paired controls: Mobile number and Email, or Password and Confirm Password, sit side-by-side on screens `≥ 640px` and stack automatically on mobile screens `< 640px`.

---

## 4. Component Library & Implementation Patterns

### 4.1 Component Inventory

```
UI Component Hierarchy
├── Atoms / Primitives
│   ├── Button (.btn, .btn-primary, .btn-register, .btn-outline)
│   ├── FormField (Accessible label, hint, error, aria-describedby)
│   ├── PasswordInput (Masked input with reveal button & Aadhaar support)
│   ├── Spinner (Circular SVG loader)
│   ├── SocialIcon (Accessible handcrafted SVG channels)
│   └── Logo (Emblem & bilingual organization lockup)
├── Molecules / Composites
│   ├── DistrictSelect (Async-loaded dropdown with retry boundary)
│   ├── LanguageMenu (Accessible dropdown with Google Translate integration)
│   ├── TopBar (News ticker, phone hotline, and social list)
│   ├── RevealHeading & RevealText (Scroll-linked motion wrappers)
│   └── CountUp (Smooth cubic-bezier statistical number counter)
└── Organisms / Page Sections
    ├── AppShell (Application wrapper, skip-link, scroll restoration)
    ├── Header (Sticky desktop navigation + mobile expandable drawer)
    ├── Hero (Bilingual motto, primary CTA, and ZoneWall)
    ├── Gallery (Accessible full-width carousel with touch & keyboard handling)
    ├── HowJoining (Interactive scroll-linked progress line)
    └── Footer (4-column navigation, credential summary, copyright)
```

---

### 4.2 Form Primitives & Accessibility Wrapper Pattern

The design system implements a render-prop architecture in [`frontend/client/src/components/form/FormField.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/form/FormField.jsx#L3-L38). This completely decouples styling from form registration while guaranteeing 100% WCAG compliance (`aria-invalid`, `aria-describedby`, `role="alert"`, and `aria-live="polite"`).

#### Real Code Implementation ([`FormField.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/form/FormField.jsx)):
```jsx
export const inputClass = invalid =>
  `block w-full min-h-tap rounded-lg border bg-white px-3 py-2.5 text-base text-neutral-ink placeholder:text-neutral-muted/70 focus:outline-none focus:ring-2 ${
    invalid
      ? 'border-status-no-answer focus:ring-status-no-answer/40'
      : 'border-neutral-muted/40 focus:border-brand-green focus:ring-brand-green/30'
  }`;

export default function FormField({ id, label, hint, error, status, children, className = '' }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-semibold text-neutral-ink">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-neutral-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-status-no-answer" role="alert">
          {error}
        </p>
      )}
      {status && !error && (
        <p className="mt-1.5 text-sm font-medium text-brand-green" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}
```

---

### 4.3 Masked Input with Show/Hide Toggle Pattern

Implemented in [`frontend/client/src/components/form/PasswordInput.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/form/PasswordInput.jsx#L5-L27). Used for both sensitive password fields and 12-digit Aadhaar identity verification:
```jsx
const PasswordInput = forwardRef(function PasswordInput({ invalid, showLabel = 'Show', ...props }, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`${inputClass(invalid)} pr-20`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute inset-y-0 right-0 min-w-tap px-3 text-sm font-semibold text-brand-green hover:text-brand-green-dark"
        aria-pressed={visible}
        aria-controls={props.id}
      >
        {visible ? 'Hide' : showLabel}
      </button>
    </div>
  );
});
```

---

### 4.4 Button Variant Specifications

Defined in [`frontend/client/src/index.css`](file:///d:/TNV%20PHASE%201/frontend/client/src/index.css#L51-L62):

```css
@layer components {
  /* Base Primitive */
  .btn {
    @apply inline-flex min-h-tap items-center justify-center rounded-lg px-5 font-semibold transition-colors;
  }
  
  /* Primary Action Button (Yellow CTA) */
  .btn-register {
    @apply btn bg-brand-yellow text-neutral-ink hover:bg-[#dba604] disabled:cursor-not-allowed disabled:opacity-70;
  }
  
  /* Brand Green Action */
  .btn-primary {
    @apply btn bg-brand-green text-white hover:bg-brand-green-dark;
  }
  
  /* Secondary Outline Action */
  .btn-outline {
    @apply btn border-2 border-brand-green text-brand-green hover:bg-brand-green-tint;
  }
}
```

---

## 5. Motion, Micro-interactions & Asset Specifications

### 5.1 Motion Philosophy & Native Hooks
The design system avoids heavy external animation libraries (`framer-motion`, `gsap`) to minimize bundle size and ensure smooth 60fps performance on low-tier mobile devices. All motion is orchestrated through native Web APIs in [`frontend/client/src/lib/motion.js`](file:///d:/TNV%20PHASE%201/frontend/client/src/lib/motion.js):

1. **`usePrefersReducedMotion()`**: Subscribes to the browser's `(prefers-reduced-motion: reduce)` media query. Automatically freezes autoplay and converts animations into static presentations.
2. **`useInViewOnce(ref, rootMargin)`**: Lightweight `IntersectionObserver` wrapper that triggers reveal animations once an element crosses into the viewport (`0px 0px -15% 0px`), immediately disconnecting the observer.
3. **`useScrollFrame(onFrame, deps)`**: Schedules scroll and resize calculations inside `requestAnimationFrame`, executing at most once per display refresh cycle.

### 5.2 Transition & Keyframe Catalog

| Name / Pattern | Duration | Timing Function | Keyframe / Transform Behavior | Citing File |
| :--- | :--- | :--- | :--- | :--- |
| **Marquee News Ticker** | `40s` (dynamic) | `linear infinite` | `translateX(0) → translateX(-50%)`. Pauses on `:hover` or `:focus-within`. | [`tailwind.config.js`](file:///d:/TNV%20PHASE%201/frontend/client/tailwind.config.js#L46-L52) |
| **Mask Heading Slide** | `700ms` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Slides from `translateY(105%)` to `translateY(0)` behind an `overflow-hidden` container. | [`Reveal.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/Reveal.jsx#L48-L55) |
| **Word-by-Word Reveal**| `150ms` (staggered)| Scroll-linked RAF | Word opacity scales linearly from `0.18` to `1.0` as the block travels between 85% and 45% viewport height. | [`Reveal.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/Reveal.jsx#L19-L23) |
| **Zone Wall Cascade** | `500ms` | Transition delay: `i * 40ms` | Staggered illumination of all 38 districts grouped by 9 zones on page load. | [`Landing.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/pages/Landing.jsx#L84) |
| **Joining Progress Rail** | Dynamic | Scroll-linked RAF | Yellow guide rail scales down via `transform: scaleY(progress)` with `origin-top`. | [`Landing.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/pages/Landing.jsx#L285) |
| **Gallery Crossfade** | `700ms` | `ease` | Slide image opacity transitions between `opacity-0` and `opacity-100`. | [`Gallery.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/Gallery.jsx#L85) |
| **Spinner Rotation** | Standard | `linear infinite` | Infinite spin via `animate-spin` with transparent right border. | [`Spinner.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/Spinner.jsx#L4) |

---

### 5.3 Iconography & Media Asset Conventions

- **Vector Icons**: All icons are rendered as inline SVGs with standard 24×24 viewBox (`viewBox="0 0 24 24"`) and semantic `strokeWidth="2"` or `strokeWidth="2.5"`.
- **Accessibility Safeguards**: Decorative SVGs are strictly marked with `aria-hidden="true"`. Interactive icon triggers include `<span className="sr-only">Label</span>` or explicit `aria-label`.
- **Image Optimization & Async Decoding**:
  - Image assets specify `decoding="async"` and responsive `srcSet` (e.g., `800w` and `1600w` in [`Gallery.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/Gallery.jsx#L90)).
  - Priority hint: Current slides utilize `fetchPriority="high"`; upcoming neighbors utilize `fetchPriority="low"`.

---

## 6. Accessibility (a11y) & Developer Guidelines

### 6.1 Accessibility Standards & Implementation

1. **Global Keyboard Focus Ring**:
   Configured in [`frontend/client/src/index.css`](file:///d:/TNV%20PHASE%201/frontend/client/src/index.css#L12-L14):
   ```css
   :focus-visible {
     @apply outline outline-[3px] outline-offset-2 outline-brand-yellow;
   }
   ```
   Ensures mouse clicks remain visually undisturbed while keyboard tab-navigation provides high-contrast, 3px golden outlines.
2. **Screen Reader Skip Link**:
   Always the first DOM element rendered inside `AppShell` ([`AppShell.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/components/AppShell.jsx#L39-L44)), jumping directly to `<main id="main">`.
3. **Google Translate DOM Resilience**:
   In [`frontend/client/src/main.jsx`](file:///d:/TNV%20PHASE%201/frontend/client/src/main.jsx#L10-L21), `Node.prototype.removeChild` and `insertBefore` are defensively monkey-patched so Google Translate's injected `<font>` tags cannot crash React DOM reconciliation (`facebook/react#11538`).
4. **Reduced Motion Adaptation**:
   Global CSS override ensures all animations and transitions are completely nullified when requested by the operating system:
   ```css
   @media (prefers-reduced-motion: reduce) {
     html { scroll-behavior: auto; }
     *, *::before, *::after {
       animation: none !important;
       transition: none !important;
     }
   }
   ```

---

### 6.2 Strict Developer Do's and Don'ts

To maintain 100% architectural and aesthetic consistency across all future pull requests and features, engineers and AI coding agents **must** adhere to the following rules:

#### ✅ DO
1. **Always Use Established Brand Tokens**: Use `brand-green`, `brand-green-dark`, `brand-yellow`, `brand-green-tint`, `brand-yellow-tint`, and `neutral-ink`. Do not introduce ad-hoc hex colors.
2. **Enforce 44px Minimum Touch Targets**: Always attach `min-h-tap` and `min-w-tap` to all interactive buttons, links, inputs, and custom dropdown triggers.
3. **Use the `FormField` Primitive**: Always construct form inputs using `FormField` to ensure `label`, `id`, `hint`, `error`, `aria-describedby`, and `aria-invalid` stay synchronized.
4. **Respect Reduced Motion**: Always wrap any new CSS keyframe or custom scroll listener with `usePrefersReducedMotion()` or CSS `@media (prefers-reduced-motion: reduce)`.
5. **Protect Tamil & Dynamic Strings**: Apply `translate="no"` and `className="notranslate"` to organization mottos, Tamil emblems, and names to prevent automatic translation corruption.
6. **Support Keyboard Navigation**: Ensure custom modals and dropdowns listen for the `Escape` key, trap focus, and close on outside click.

#### ❌ DON'T
1. **DO NOT Install External Component UI Frameworks**: Do not install Radix, Shadcn, MUI, or Chakra. The repository strictly uses handcrafted, zero-dependency Tailwind primitives.
2. **DO NOT Install Runtime Animation Libraries**: Do not add `framer-motion` or `gsap`. Use [`motion.js`](file:///d:/TNV%20PHASE%201/frontend/client/src/lib/motion.js) and CSS keyframe utilities.
3. **DO NOT Use Bare Inputs Without Labels**: Never render an `<input>` without an associated `<label htmlFor={id}>` or `aria-label`.
4. **DO NOT Suppress Focus Outlines**: Never apply `outline-none` without immediately providing a visible `focus:ring-2` or relying on `:focus-visible`.
5. **DO NOT Hardcode District / Location Lists**: Always consume district datasets from [`frontend/client/src/data/site.js`](file:///d:/TNV%20PHASE%201/frontend/client/src/data/site.js) or dynamic API endpoints (`/api/districts`).
6. **DO NOT Use Generic Alert Colors**: Avoid saturated pure red (`#ff0000`) or green (`#00ff00`). Use `status-no-answer` (`#C62828`) and `status-approved` (`#1B6B3A`).

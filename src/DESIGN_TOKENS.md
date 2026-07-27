# RandomeriaFlix Color Palette & Design Tokens

## 🎨 Primary Colors

### Background Colors
```css
--background: #050304;      /* Deep Obsidian - Main background */
--card: #120A0B;           /* Rich Dark Brown - Card backgrounds */
--muted: #1F1113;          /* Muted Dark - Subtle backgrounds */
```

### Accent Colors
```css
--primary: #8B0000;        /* Velvet Crimson - Primary actions */
--primary-hover: #a80000;  /* Bright Crimson - Hover state */
--accent: #2A181A;         /* Deep Rose - Accent elements */
```

### Text Colors
```css
--foreground: #FDFBF7;     /* Warm White - Primary text */
--muted-text: #A39294;     /* Subtle Mauve - Secondary text */
--border: #2A181A;         /* Dark Rose - Borders */
```

---

## 📐 Spacing Scale

```
4px   → gap-1
8px   → gap-2, p-2
12px  → gap-3, p-3
16px  → gap-4, p-4 (base spacing)
24px  → gap-6, p-6 (mobile padding)
32px  → gap-8, p-8
48px  → gap-12, p-12 (desktop padding)
64px  → gap-16, p-16 (large sections)
```

---

## 🔘 Border Radius

```
4px  → rounded      (small elements)
6px  → rounded-md   (inputs, small cards)
8px  → rounded-lg   (cards, images - PRIMARY)
12px → rounded-xl   (buttons, inputs)
16px → rounded-2xl  (large cards, modals)
9999px → rounded-full (circles, pills)
```

---

## 🌑 Shadow System

### Standard Shadows
```css
shadow-sm   → 0 1px 2px rgba(0,0,0,0.05)
shadow      → 0 1px 3px rgba(0,0,0,0.1)
shadow-md   → 0 4px 6px rgba(0,0,0,0.1)
shadow-lg   → 0 10px 15px rgba(0,0,0,0.1)
shadow-xl   → 0 20px 25px rgba(0,0,0,0.1)
shadow-2xl  → 0 25px 50px rgba(0,0,0,0.25)
```

### Custom Glows (Netflix Effect)
```css
/* Crimson glow on hover */
shadow-[0_0_30px_rgba(139,0,0,0.5)]

/* Red card hover */
shadow-[0_20px_60px_rgba(139,0,0,0.4)]

/* Subtle indicator glow */
shadow-[0_0_12px_rgba(139,0,0,0.8)]
```

---

## ⏱️ Animation Durations

```
100ms → duration-100  (instant feedback)
200ms → duration-200  (very fast)
300ms → duration-300  (quick interactions - DEFAULT for hover)
500ms → duration-500  (medium transitions - card scaling)
700ms → duration-700  (slow transitions - row navigation)
1000ms → duration-1000 (dramatic entrances)
```

### Timing Functions (Easing)
```css
ease-out           → Standard (default)
ease-in-out        → Symmetrical
ease-[cubic-bezier(.22,.61,.36,1)]  → Cinematic (RECOMMENDED)
```

---

## 📝 Typography

### Font Families
```css
font-['Playfair_Display']  → Headings, titles, cinematic text
font-['Outfit']            → Body text, UI elements, descriptions
```

### Font Sizes (Mobile → Desktop)
```
text-xs     → 12px        (small labels)
text-sm     → 14px        (secondary text)
text-base   → 16px        (body text - DEFAULT)
text-lg     → 18px        (large body)
text-xl     → 20px        (small headings)
text-2xl    → 24px        (headings)
text-3xl    → 30px        (large headings)
text-4xl    → 36px → 48px (hero mobile)
text-5xl    → 48px → 64px (hero tablet)
text-6xl    → 60px → 80px (hero desktop)
text-7xl    → 72px → 96px (dramatic hero)
text-8xl    → 96px → 128px (massive hero)
```

### Font Weights
```
font-light     → 300  (delicate text)
font-normal    → 400  (body text)
font-medium    → 500  (emphasized)
font-semibold  → 600  (strong emphasis)
font-bold      → 700  (headings - DEFAULT)
```

### Letter Spacing
```
tracking-tighter  → -0.05em  (cinematic titles)
tracking-tight    → -0.025em (large headings)
tracking-normal   → 0em      (body text - DEFAULT)
tracking-wide     → 0.025em  (spaced text)
tracking-widest   → 0.1em    (labels)
tracking-[0.3em]  → 0.3em    (subtitle labels)
```

---

## 🎭 Component-Specific Tokens

### Buttons

#### Primary Button (Crimson)
```css
bg-[#8B0000]
hover:bg-[#a80000]
hover:shadow-[0_0_30px_rgba(139,0,0,0.5)]
px-6 py-3
rounded-xl
font-['Outfit'] font-semibold
transition-all duration-300
```

#### Secondary Button (Glass)
```css
border border-white/20
bg-white/10
hover:bg-white/20
backdrop-blur-md
px-6 py-3
rounded-xl
font-['Outfit'] font-semibold
transition-all duration-300
```

### Cards

#### Movie Card
```css
aspect-video
rounded-lg
bg-[#120A0B]
hover:scale-105
hover:shadow-[0_20px_60px_rgba(139,0,0,0.4)]
transition-all duration-500
cursor-pointer
```

#### Profile Card
```css
h-44 w-44
rounded-2xl
bg-gradient-to-br from-[#8B0000] to-[#a80000]
hover:scale-105
hover:ring-4 ring-white/20
shadow-xl
transition-all duration-500
```

### Navigation

#### Top Nav (Scrolled)
```css
bg-[#050304]/80
backdrop-blur-xl
border-b border-white/10
px-12 py-4
fixed top-0 z-50
transition-all duration-500
```

#### Active Tab Indicator
```css
h-0.5
bg-[#8B0000]
shadow-[0_0_8px_rgba(139,0,0,0.8)]
transition-all duration-300
```

---

## 🌈 Gradient Recipes

### Background Gradients
```css
/* Main background */
bg-gradient-to-br from-[#050304] via-[#120A0B] to-[#8B0000]/20

/* Hero overlay (bottom) */
bg-gradient-to-t from-[#050304] via-[#050304]/60 to-transparent

/* Hero overlay (left) */
bg-gradient-to-r from-[#050304]/90 via-[#050304]/40 to-transparent

/* Card overlay */
bg-gradient-to-t from-[#050304] via-[#050304]/40 to-transparent
```

### Button Gradients
```css
/* Crimson button */
bg-gradient-to-br from-[#8B0000] to-[#a80000]

/* Profile card */
bg-gradient-to-br from-[#8B0000] to-[#a80000]
```

### Radial Glow (Background decoration)
```css
/* Centered glow */
<div class=\"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
     h-[600px] w-[600px] rounded-full
     bg-[#8B0000]/10 blur-[120px]\" />
```

---

## ✨ Special Effects

### Film Grain (Body pseudo-element)
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,...");
  opacity: 0.025;
  pointer-events: none;
  z-index: 9999;
}
```

### Glassmorphism
```css
bg-[#050304]/80
backdrop-blur-xl
border border-white/10
```

### Shimmer Loading
```css
.shimmer {
  background: linear-gradient(
    90deg,
    rgba(18,10,11,0.5) 0%,
    rgba(42,24,26,0.8) 50%,
    rgba(18,10,11,0.5) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

---

## 🎬 Animation Patterns

### Card Entrance (Staggered)
```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.8, y: 20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  transition={{
    duration: 0.5,
    delay: index * 0.15,
    ease: [0.22, 1, 0.36, 1]
  }}
>
```

### Hero Text Entrance
```jsx
<motion.h1
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.8,
    ease: [0.22, 1, 0.36, 1]
  }}
>
```

### Hover Scale (Cards)
```css
transition-all duration-500 ease-out
hover:scale-105
```

---

## 📱 Responsive Breakpoints

```
sm:   640px   (small tablets)
md:   768px   (tablets)
lg:   1024px  (laptops)
xl:   1280px  (desktops)
2xl:  1536px  (large desktops)
```

### Common Responsive Patterns
```jsx
{/* Mobile → Desktop */}
className=\"text-4xl sm:text-5xl lg:text-7xl\"
className=\"px-6 sm:px-12 lg:px-24\"
className=\"gap-4 sm:gap-6 lg:gap-8\"
```

---

## 🎯 Usage Guidelines

### DO:
✅ Use `font-['Playfair_Display']` for all headings
✅ Use `font-['Outfit']` for all body text
✅ Use `duration-500` for card scaling
✅ Use `ease-[cubic-bezier(.22,.61,.36,1)]` for cinematic feel
✅ Add `backdrop-blur-xl` to overlays
✅ Use crimson (#8B0000) for primary actions

### DON'T:
❌ Use generic fonts (Arial, Helvetica)
❌ Use bright red (#e5093f) - too harsh
❌ Use pure black (#000000) - too stark  
❌ Use `transition: all` - be specific
❌ Forget hover states on interactive elements
❌ Use white (#ffffff) for text - use warm white (#FDFBF7)

---

## 🔍 Quick Reference: Most Used Classes

```css
/* Container */
relative min-h-screen bg-[#050304] px-6 py-12

/* Card */
rounded-lg bg-[#120A0B] p-4 transition-all duration-500 hover:scale-105

/* Button Primary */
bg-[#8B0000] px-6 py-3 rounded-xl font-['Outfit'] font-semibold text-white

/* Button Secondary */
border border-white/20 bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl

/* Heading */
font-['Playfair_Display'] text-4xl font-bold text-white

/* Body Text */
font-['Outfit'] text-base text-[#FDFBF7]

/* Muted Text */
font-['Outfit'] text-sm text-[#A39294]
```

---

This design system ensures consistency across the entire app while maintaining the luxury, romantic Netflix aesthetic. Use this as your reference when making any future modifications or additions to the design.

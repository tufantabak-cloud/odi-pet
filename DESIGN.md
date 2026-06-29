# Odi.Pet Design System

## Brand Identity
Odi.Pet is a premium pet care ecosystem app 
for cat and dog owners. The visual language 
should feel warm, trustworthy, and vibrant — 
like a caring friend, not a cold medical app.

## Color Palette

### Primary Brand Colors
- Primary Purple: #4726AF
- Primary Dark: #3E1EA2
- Primary Light: #6B4ECC

### Accent Colors
- Vibrant Green: #29B906 (nutrition, growth, success)
- Gold Yellow: #FFD76F (alerts, premium, matching)
- Orange Yellow: #FFC734 (activity, energy, warnings)
- Light Yellow: #F7E27C (soft highlights)

### Semantic Colors
- Danger/Emergency: #EF4444 (lost pets, SOS)
- Success: #29B906
- Warning: #FFC734

### Category Color System (60-30-10 rule)
Each module has its own color. Only 10% of 
screen uses color — on icons and left borders.
White card backgrounds always.

| Category | Icon Color | Light BG |
|---|---|---|
| Health/Medical | #4726AF | #f5f3fe |
| Vaccination | #27500A | #eef8ea |
| Parasite | #075985 | #e0f2fe |
| Grooming | #854d0e | #fefce8 |
| Nutrition | #27500A | #eef8ea |
| Hygiene | #075985 | #e0f2fe |
| Activity | #9a3412 | #fff7ed |
| Social/Adoption | #4726AF | #f5f3fe |
| Matching | #92400e | #fefce8 |
| Lost/Emergency | #b91c1c | #fef2f2 |
| Budget | #0f766e | #f0fdfa |
| Gallery | #7e22ce | #faf5ff |
| Vet/Clinic | #1d4ed8 | #eff6ff |
| Premium | #1E1145 + #FFD76F | dark card |

## Typography
- Font: System default (SF Pro / Roboto)
- Headings: 500 weight
- Body: 400 weight, 16px, line-height 1.7
- Captions: 11-12px, text-muted color
- Sentence case everywhere

## Layout Principles
- 60% neutral (white/light gray backgrounds)
- 30% structure (dark text, borders, passive icons)
- 10% color (category icons, left borders, badges)

## Component Patterns

### Cards
- Background: white (#ffffff)
- Border: 0.5px solid #e5e7eb
- Border radius: 12px
- Left accent: 3px solid [category color]
- Icon background: category light bg
- Icon color: category dark color

### Buttons
- Primary CTA: bg-primary (#4726AF), white text
- Secondary: white bg, primary border
- Danger: red background, white text

### Navigation
- Bottom nav: 4 slots + fixed center (+) button
- Active state: pill highlight with primary color
- Icons: Tabler outline style

### Status Badges
- Active/Success: green (#29B906) background
- Warning: gold (#FFD76F) background  
- Error/Urgent: red (#EF4444) background

## Platform
- Mobile-first (375px base)
- iOS and Android
- PWA (Progressive Web App)
- Light mode primary

## App Sections
1. Dashboard (home)
2. Pet Detail (5 tabs: Overview, Health, Care, Calendar, Extra)
3. Social (Adoption, Lost Reports, Matching)
4. Plan Yap (routine planning wizard)
5. AI Vet (premium feature)
6. Profile & Settings

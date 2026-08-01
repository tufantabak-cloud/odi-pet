# OPOS Motion Companion & Interaction Specifications

## Standard Interactions
- **Hover:** Elastic scale lift (`hover:scale-[1.05]`, 300ms transition).
- **Press / Click:** Squishy feedback (`active:scale-[0.98]`).
- **Breathing / Pulse:** Floating SOS ring pulse (`animate-pulse`, 2000ms duration).
- **Reduce Motion:** Respect `prefers-reduced-motion: reduce` by falling back to static 1.0 scale.

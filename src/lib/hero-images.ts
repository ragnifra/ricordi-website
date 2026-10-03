// Editorial brand photos for the homepage hero carousel, shown in this order.
// They are NOT catalog product photos. public/hero/ holds processed copies
// produced by `npm run hero:process` (scripts/process-hero.mjs) from the
// untouched originals kept outside the repo — never edit public/hero/ by hand.
// A NEW filename must also be added here; the carousel shows exactly this list.
//
// Every photo is portrait, so the crop differs by viewport shape:
// - `position` applies to portrait viewports (phones, tablets held upright).
//   On phones the photo is cropped at the sides (x matters); on a 768×1024
//   tablet the narrower photos are cropped top/bottom instead (y matters).
//   Default "50% 50%".
// - `landscapePosition` applies to landscape viewports (desktop), where only a
//   horizontal band of roughly 35–50% of the photo's height survives — pick the
//   band that keeps the face and the garment. Falls back to `position`.
// Values are CSS object-position strings.

export type HeroImage = {
  src: string;
  position?: string;
  landscapePosition?: string;
};

export const HERO_IMAGES: readonly HeroImage[] = [
  { src: "/hero/hero-01.jpg", landscapePosition: "50% 40%" },
  { src: "/hero/hero-02.jpg", landscapePosition: "50% 32%" },
  { src: "/hero/hero-03.jpg", landscapePosition: "50% 40%" },
  { src: "/hero/hero-04.jpeg", landscapePosition: "50% 14%" },
  { src: "/hero/hero-05.jpeg", landscapePosition: "50% 38%" },
  { src: "/hero/hero-06.jpeg", position: "50% 25%", landscapePosition: "50% 13%" },
  { src: "/hero/hero-07.jpeg", position: "40% 20%", landscapePosition: "50% 6%" },
  { src: "/hero/hero-08.jpg", position: "50% 20%", landscapePosition: "50% 22%" },
  { src: "/hero/hero-09.jpg", position: "20% 50%", landscapePosition: "50% 45%" },
  { src: "/hero/hero-10.jpg", landscapePosition: "50% 40%" },
  { src: "/hero/hero-11.jpg", position: "50% 30%", landscapePosition: "50% 24%" },
  { src: "/hero/hero-12.jpg", position: "62% 50%", landscapePosition: "50% 50%" },
];

# Raid design direction: Campaign Map

A light, printed wargame map: 1970s hex-and-counter board games, Ordnance Survey sheets, Europa Universalis political maps. Two other vocabularies are borrowed:
- the leaderboard uses sports broadcast grammar (the F1 timing tower)
- Proof of Fees reads like a printed receipt from a Bloomberg-style terminal

## Tokens
- Paper `#EDE6D6`, paper-2 `#E2D9C4`, ink `#1B1A17`, contour `#B9AE97`
- Army inks, each paired with a hatch pattern so colour is never the only signal:
  - vermilion `#D2361F`
  - ultramarine `#2347A6`
  - ochre `#C8901C`
  - field green `#3F6B3A`
  - plum `#6B2E5F`
- Verified stamp `#1F5C4A`. Gain and loss always carry a sign or an arrow.
- Type, three families at most:
  - Big Shoulders Display (800–900) for display
  - Schibsted Grotesk for text
  - IBM Plex Mono for every number (tabular, slashed zero)
- Corners are square. Hairline rules (1px ink at 25%) replace cards. Rotated stamps appear only on verified states.

## Rules
- The map is the page. Tiles come from an authored coordinate table, not grid auto-flow.
- A tile shows three things: owner (ink fill), contest (interleaved hatch), activity (counter strength).
- Motion only explains a change of state:
  - counters slide between tiles
  - a captured tile inks in with about a 400ms wipe
  - a changed cell flashes for 150ms
- Every metric has a unit, a time window and its provenance (source endpoint plus timestamp).
- Empty, loading, stale and error states are designed.
- Mobile is a redesign: the map pans and zooms, the tower is the default tab, and the ticket is a bottom sheet.
- Share cards (1200x630) keep everything inside the central 1200x600 and must read at 500px wide.

## Avoid
- **First-generation AI tells:**
  - purple or blue gradients, gradient text, glow, glass
  - Inter, Space Grotesk, JetBrains Mono
  - rounded-2xl with uniform padding on everything
  - a centred hero followed by three feature cards
  - emoji icons, vanity stat strips, fade-up-everything motion
- **Second-generation tells:**
  - near-black with a single acid-green accent
  - tracked mono "template chrome" eyebrows and `01 / 02 / 03` numbering
  - bento grids of identical tiles

## Design judge checklist (23 points)
1. With the logo swapped it could not be another product.
2. No gradient, glow or glass.
3. Deliberate typefaces, at most 3 families, none of the banned ones.
4. Corner radius is a decision.
5. One dominant hue, and each accent means one thing.
6. Clear hierarchy, not uniform padding.
7. Tabular, right-aligned numbers with consistent decimals.
8. Gains and losses carry a sign or arrow.
9. Every metric has a unit and a window.
10. Provenance (source, timestamp, verify link) is shown.
11. Empty, loading, stale and error states exist.
12. The map reads with colour turned off.
13. Army identity is consistent across every surface.
14. No emoji icons, and icons share a grid.
15. Copy is specific and in-world.
16. No three-card hero and no vanity stats.
17. Motion explains state.
18. Density fits the task.
19. The trade ticket shows fees, size, leverage and liquidation price before confirm.
20. Alignment follows a visible grid.
21. Mobile is a redesign.
22. The share card reads at 500px.
23. Hit targets are 44px or larger, and contrast meets AA.

Sources: github.com/funboy322/avoid-ai-design, mania.design "Spot the slop", 925studios "AI slop tells", uxdesign.cc on F1 graphics, uxmag.com on the Bloomberg terminal, the Paradox EU4 dev diary.

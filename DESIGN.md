---
version: alpha
name: TC2 Industrial Tierboard
description: A dark, game-adjacent design system for the Typical Colors 2 tier list maker, combining utilitarian metal panels, blueprint-grid backgrounds, compact controls, and vivid rank colors.
colors:
  background: "#414254"
  background-grid-line: "#575767"
  surface: "#30313C"
  surface-dark: "#2B2C35"
  surface-deep: "#26262F"
  edge: "#28202B"
  border: "#8E8A75"
  text-primary: "#FFFFFF"
  text-secondary: "#B0B0B0"
  text-dark: "#1A1A1A"
  focus: "#7FBFFF"
  danger: "#8B3535"
  danger-dark: "#5D2222"
  active: "#3D5A80"
  active-dark: "#293241"
  tier-s: "#FF7F7E"
  tier-a: "#FFBF7F"
  tier-b: "#FFDF80"
  tier-c: "#FEFF7F"
  tier-d: "#BEFF7F"
  tier-e: "#7EFF80"
  tier-f: "#7FFFFF"
typography:
  display:
    fontFamily: Oswald
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: 0.08em
  heading-lg:
    fontFamily: Oswald
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.08em
  heading-md:
    fontFamily: Oswald
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.08em
  body:
    fontFamily: Oswald
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Oswald
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Oswald
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.08em
rounded:
  none: 0px
  sm: 2px
  md: 4px
  full: 9999px
spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  page-max: 1400px
components:
  panel:
    background: "linear-gradient(to bottom, {colors.surface-dark}, {colors.surface}, {colors.surface-deep})"
    borderColor: "{colors.border}"
    borderWidth: "1px"
    rounded: "{rounded.sm}"
  button:
    typography: "{typography.label}"
    textColor: "{colors.text-primary}"
    background: "linear-gradient(to bottom, {colors.surface-dark}, {colors.surface}, {colors.surface-deep})"
    borderColor: "{colors.border}"
    rounded: "{rounded.sm}"
    paddingBlock: "{spacing.md}"
    paddingInline: "{spacing.lg}"
  button-danger:
    textColor: "{colors.text-primary}"
    background: "linear-gradient(to bottom, {colors.danger-dark}, {colors.danger}, {colors.danger-dark})"
    borderColor: "{colors.border}"
  input:
    typography: "{typography.body}"
    textColor: "{colors.text-primary}"
    backgroundColor: "transparent"
    borderColor: "{colors.border}"
    rounded: "{rounded.sm}"
  modal:
    background: "linear-gradient(to bottom, {colors.surface-dark}, {colors.surface}, {colors.surface-deep})"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  focus-ring:
    color: "{colors.focus}"
    width: "3px"
    offset: "3px"
---

# TC2 Tierlist Maker Design System

## Overview

TC2 Tierlist Maker should feel like a purpose-built utility from inside the Typical Colors 2 universe: sturdy, direct, slightly militaristic, and immediately readable. The visual language is inspired by painted steel, equipment panels, tactical menus, and workshop interfaces rather than glossy consumer software.

The interface is intentionally dense enough to support large weapon, map, cosmetic, taunt, and unusual-effect collections without feeling cramped. Decoration should reinforce function. Metallic gradients indicate interactive or structural surfaces, the grid background establishes the game-tool atmosphere, and bright rank colors provide the primary visual contrast.

The product voice is:

- **Industrial, not ornamental.** Surfaces may resemble metal, but avoid texture noise that compromises clarity.
- **Game-adjacent, not imitative.** Reference TC2 through shape, typography, color, and rhythm without reproducing unrelated in-game HUD elements.
- **Compact, not crowded.** Controls should be efficient while maintaining clear grouping and usable hit targets.
- **Responsive and tactile.** Dragging, hovering, filtering, editing, and exporting should provide immediate visual feedback.

The default experience is dark. Light-theme variants are outside the current visual identity and should not be introduced without a deliberate redesign of the entire system.

## Colors

The palette is built from cool charcoal-violet neutrals with muted brass borders. Bright color is reserved for rank labels, focus indication, active states, and destructive actions.

- **Background (`#414254`):** The page-level field behind all content. It should usually be paired with the animated or static grid treatment.
- **Grid line (`#575767`):** A low-contrast line color used to build the blueprint-like background. It must remain subordinate to content.
- **Metal surfaces (`#2B2C35`, `#30313C`, `#26262F`):** Used together in vertical gradients for headers, buttons, rows, dialogs, and other structural panels.
- **Border (`#8E8A75`):** A desaturated brass-gray edge that separates metal surfaces from the background.
- **Primary text (`#FFFFFF`):** Used for headings, labels, button text, and important content.
- **Secondary text (`#B0B0B0`):** Used for subtitles, metadata, helper text, and subdued icons.
- **Focus (`#7FBFFF`):** The sole keyboard-focus color. It should not be reused decoratively.
- **Danger (`#8B3535` / `#5D2222`):** Used for back, delete, reset, or destructive actions where red meaning is appropriate.
- **Active (`#3D5A80` / `#293241`):** Used for selected editing modes and other persistent active states.

Tier colors are semantic data colors and must remain visually distinct:

- **S:** `#FF7F7E`
- **A:** `#FFBF7F`
- **B:** `#FFDF80`
- **C:** `#FEFF7F`
- **D:** `#BEFF7F`
- **E:** `#7EFF80`
- **F:** `#7FFFFF`

Tier colors normally appear behind dark text. Do not use them as large page backgrounds, general-purpose accents, or arbitrary status colors.

Maintain sufficient contrast for all text and controls. When a custom tier color is user-selected, choose label text color from either `text-dark` or `text-primary` according to measured contrast rather than assumption.

## Typography

**Oswald** is the sole product typeface. Its condensed construction gives the interface a sturdy menu-board character while preserving horizontal space for labels and controls.

- **Display:** 48px, 700 weight, uppercase, with wide tracking. Reserved for the main landing title.
- **Large headings:** 24px, 700 weight, uppercase. Used for major page or dialog headings.
- **Medium headings:** 20px, 700 weight, uppercase. Used for tier-list titles and section headers.
- **Body:** 16px, 400 weight. Used for descriptions, helper text, and ordinary readable copy.
- **Labels:** 16px, 600 weight, uppercase, with moderate tracking. Used for buttons, field labels, tier names, and navigation.
- **Small labels:** 12px, 600 weight, uppercase. Used for compact controls, filters, metadata, and secondary actions.

Uppercase is a core part of the interface voice, but should be limited to short labels and headings. Longer explanatory text should use normal capitalization to protect readability.

Do not introduce a second display face, monospace face, or decorative game font unless a concrete feature requires it. Native system fonts may be used only as a temporary fallback while Oswald loads.

## Layout

The app uses a full-viewport shell with a centered content column. The tier-list workspace may grow vertically and must support very large item pools without changing the visual hierarchy.

- The desktop content width is capped at **1400px**.
- Page and workspace padding is generally **24px**.
- Modal padding is **24px** with a width near 90% of the viewport and a sensible fixed maximum.
- The base spacing rhythm is **4px**, with primary steps at 4, 8, 16, 24, and 32px.
- Related controls use 8px gaps; separate groups use 16–24px gaps.
- Tier rows have a minimum height of roughly 80px and should expand with their contents.
- Landing-page choices form a single vertical stack, approximately 300–400px wide on desktop.

On narrow screens:

- Reduce outer padding before reducing control hit areas.
- Allow header actions to wrap or collapse into a menu rather than overlap the centered title.
- Keep tier labels readable and stable while item grids reflow.
- Preserve drag-and-drop affordances for coarse pointers, including sufficient touch targets and scroll behavior.
- Avoid horizontal page scrolling; only intentionally scrollable internal regions may overflow.

The grid background is atmospheric, not structural. Never align content to its lines or rely on the grid to communicate layout boundaries.

## Elevation & Depth

Depth is communicated through layered color, borders, and restrained overlays rather than soft card shadows.

Primary panels use a three-stop vertical metallic gradient:

1. dark top edge,
2. slightly lighter center,
3. deeper bottom edge.

This produces a pressed-metal appearance while keeping the interface flat enough for dense information. A 1px brass-gray border defines the outer edge.

Shadows are reserved for floating layers:

- Dialogs may use a deep, broad shadow such as `0 20px 50px rgba(0, 0, 0, 0.5)`.
- Dragged items may use a compact shadow to separate them from drop targets.
- Standard buttons, rows, and cards should not receive large ambient shadows.

Modal backdrops use near-black transparency and a subtle blur. The background should remain recognizable but clearly inactive.

## Shapes

The shape language is engineered and nearly square.

- Small controls and panels use a **2px** radius.
- Dialogs and larger floating containers may use a **4px** radius.
- Circular geometry is limited to spinners, color indicators, or controls whose meaning is inherently circular.
- Tier items should read as compact tiles rather than soft cards.

Avoid large rounded rectangles, pill-shaped buttons, exaggerated blobs, or friendly consumer-app curves. These conflict with the industrial character.

Borders should normally be 1px. Use 2px only for compact swatches, selected drop targets, or other states that need extra emphasis.

## Components

### Background grid

The background uses `background` and `background-grid-line` to create a low-contrast technical grid. The existing WebGL implementation is preferred, but a CSS fallback is acceptable. It must be fixed, non-interactive, and placed behind all content.

Motion should be slow and atmospheric. Never animate the grid rapidly or at a contrast level that competes with item imagery.

### Buttons

Buttons use Oswald Semibold, uppercase lettering, metallic vertical gradients, a 1px border, and a 2px radius.

- **Primary/default:** Neutral metal gradient.
- **Hover:** Slightly brighten all gradient stops. Do not change shape or add glow.
- **Pressed:** Darken or compress the gradient and provide immediate tactile feedback.
- **Active/toggled:** Use the blue active gradient and maintain the state after pointer release.
- **Danger/back:** Use the restrained red gradient.
- **Disabled:** Lower opacity to approximately 60% and remove the pointer cursor.

Icon buttons use Lucide icons at about 16–18px with 2–2.5px strokes. Icons should reinforce a text label whenever space allows. Icon-only buttons require an accessible name and visible tooltip.

### Header

The tier-list header is a full-width metal panel with a bottom border. It contains back navigation, a centered title, and editing/export actions.

The title may be absolutely centered on wide screens, but responsive behavior must prevent collisions with side actions. On compact layouts, switch to a grid or wrapping arrangement rather than shrinking text excessively.

### Menu choices

Landing and folder choices are full-width metal buttons in a narrow vertical column. Folder entries may include a chevron that shifts slightly on hover. The movement should be subtle and should not affect layout.

### Tier rows

A tier row consists of:

- a fixed or minimum-width colored label region,
- a flexible item drop region,
- an outer metal panel and border.

The label color is semantic and should dominate the row identifier without tinting the item area. The drop region must clearly reveal empty, hover, chosen, ghost, and active drag states.

Rows are separated by 4px. This small gap helps the tier board read as one continuous ranking structure.

### Tier items

Tier items are image-first square or near-square tiles. Images should use `object-fit: contain` unless the source category explicitly benefits from cropping.

Interaction states:

- **Hover:** Small brightness or border increase.
- **Chosen:** Clear focus/selection edge.
- **Ghost:** Reduced opacity while retaining dimensions.
- **Dragging:** Raised above surrounding content with a compact shadow and grabbing cursor.
- **Dropped:** Brief, restrained confirmation animation.

Do not apply decorative frames that obscure weapon, map, cosmetic, or effect imagery.

### Item pool

The unranked pool is a distinct panel beneath the tiers. It may contain category filters and progressively rendered items. The visual treatment should remain consistent while performance optimizations load additional chunks.

Empty, filtered-empty, and loading states should use secondary text and clear actions. Do not make an empty pool look like a broken drop zone.

### Filters

Filters should use compact selects, segmented controls, or button groups. Active filters use the blue active treatment. Labels remain uppercase and concise.

Filtering must not silently alter ranking data. It only changes which unranked items are visible.

### Inputs

Inputs use transparent or deep-metal backgrounds, white text, a 1px border, and a 2px radius. They should inherit Oswald.

Focused inputs use the shared blue focus ring or border. Placeholder and helper text use secondary gray. Errors use restrained red text and borders without shaking or flashing.

### Edit-tier rows

Tier editing uses compact horizontal rows containing:

- a drag handle,
- a color control,
- a tier-label input,
- a delete action.

Each row sits on the deepest metal surface. The handle must remain easy to grab on touch devices. Delete actions should become red only on hover, focus, or confirmed destructive state; they should not overpower the rest of the row at rest.

### Modals and overlays

Modals are centered over a dark translucent backdrop with subtle blur. The panel uses the primary metallic treatment, a 4px radius, 24px padding, and a strong shadow.

Dialog headings are uppercase and separated from content by a border. Actions should be grouped at the bottom, with the primary action last in left-to-right layouts.

Transitions should combine opacity with a small scale and vertical movement. Respect reduced-motion preferences by removing the transform animation.

### Loading state

The loading overlay covers the viewport with near-opaque dark gray. The spinner uses a deep metal track and brass-gray active segment. Supporting text is uppercase, small, tracked, and secondary gray.

For partial loading, prefer local skeletons or progress feedback over the global overlay.

### Export preview

Exported tier-list images should preserve the board’s colors, typography, spacing, and clear item boundaries. Do not include transient UI such as hover states, drag ghosts, editing handles, focus rings, or modal backdrops.

Use a stable background and embed required font styles so exported output matches the visible composition.

### Focus and keyboard interaction

All interactive elements must display a 3px `focus` outline with a 3px offset when reached by keyboard. Never remove the focus indicator without replacing it with an equally visible alternative.

Keyboard interaction should support navigation, modal dismissal, action activation, and non-pointer alternatives for any critical drag-only workflow.

### Motion

Motion is brief and functional:

- View entrances: 300–400ms.
- Stagger between menu options or tier rows: approximately 50–60ms.
- Hover feedback: approximately 150ms.
- Dialog transitions: approximately 250ms.
- Drop confirmation: approximately 200ms.

Use ease-out curves for entrances and direct, responsive curves for manipulation. Avoid elastic motion except for the very slight dialog settling already established by the product.

Always honor `prefers-reduced-motion` by reducing transitions and animations to effectively instantaneous changes.

## Do's and Don'ts

### Do

- Use the defined dark metal surfaces, grid background, and Oswald typography consistently.
- Reserve bright colors for tier data, focus, selected state, and destructive feedback.
- Keep controls compact while preserving accessible pointer and touch targets.
- Use borders, tonal shifts, and spacing to establish hierarchy before adding shadows.
- Preserve user-created tier colors and labels in both the workspace and exported image.
- Test large data sets, filtered item pools, coarse pointers, keyboard navigation, and narrow screens.
- Keep animation short, purposeful, and optional under reduced-motion settings.

### Don't

- Do not introduce glassmorphism, neon cyberpunk glows, soft pastel cards, or large pill controls.
- Do not use tier colors as generic branding accents or page backgrounds.
- Do not add heavy textures that reduce image or text clarity.
- Do not use low-contrast gray text for primary actions.
- Do not communicate state through color alone; pair it with text, iconography, position, or border treatment.
- Do not let centered header titles overlap navigation or actions on smaller screens.
- Do not include editing chrome or transient interaction states in exported tier-list images.
- Do not add animation that delays dragging, sorting, filtering, or navigation.

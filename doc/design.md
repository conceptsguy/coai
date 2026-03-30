# Coai Design System

Coai is a canvas tool, not a chat app or a dashboard. The UI should feel like **Figma or Spline** — a workspace where the canvas is the hero and everything else is quiet chrome that stays out of the way.

**Inspiration references:** Linear (minimalism, clarity), Granola.ai (warm dark palette, content-forward), Figma/Spline (canvas + floating toolbars + collapsible panes).

---

## Principles

1. **Canvas is the hero.** Every pixel of chrome competes with the workspace. Toolbars, sidebars, and controls should recede until needed.
2. **Light mode default, dark mode available.** Light is the professional default for modern AI tools (Figma, Linear, Spline). Dark mode is a toggle away for those who prefer it. Both modes must be tested equally.
3. **Quiet chrome, loud content.** Borders should be barely visible. Backgrounds should differ by 1-2 lightness steps, not by color. Reserve color for meaning: connection state, presence, model identity.
4. **Density over decoration.** Show more nodes on screen, not bigger cards. Compact is a feature. Information density beats empty space — but spacing must be precise.
5. **Tool-grade, not consumer-grade.** No rounded-everything, no gradient buttons, no playful bouncy animations. Sharp, precise, utilitarian. Think instrument panel, not landing page.

---

## Color

### Color palettes

Built on OKLCH for perceptual uniformity. The palette is **warm neutral** — all grays carry a very subtle warm tint at hue 75 with minimal chroma (0.004–0.006). This keeps the palette clean and light (closer to Claude Code's feel) while avoiding the clinical coldness of pure achromatic grays. Intentional color is reserved for interactive state. Both modes are defined in `globals.css` — `:root` for light, `.dark` for dark.

**Light mode (default):**

| Token | Value | Role |
|-------|-------|------|
| `--background` | `oklch(0.985 0.005 75)` | Canvas and page background (light warm gray, ~`#fafaf8`) |
| `--card` | `oklch(0.98 0.004 75)` | Floating panels, sidebar (~`#f8f8f6`) |
| `--border` | `oklch(0.912 0.005 75)` | Borders — neutral gray, structural (~`#e6e5e3`) |

**Dark mode:**

| Token | Value | Role |
|-------|-------|------|
| `--background` | `oklch(0.16 0.01 75)` | Canvas and page background (warm charcoal, ~`#100d09`) |
| `--card` | `oklch(0.22 0.01 75)` | Floating panels, node cards, sidebar (~`#1d1a16`) |
| `--border` | `oklch(1 0 0 / 10%)` | Borders — barely visible, structural only |

### Semantic color

Color means something. Don't use it for decoration.

| Color | Meaning |
|-------|---------|
| **Blue** (`--primary`) | Interactive state: selected node, focus ring, active tab |
| **Orange** `#f97316` | Source handle (outgoing context) |
| **Blue** `#3b82f6` | Target handle (incoming context), edges |
| **Green** `#22c55e` | Online/active presence indicator |
| **Red** (`--destructive`) | Destructive actions only — delete node, error state |
| **Model colors** | Subtle badge backgrounds to distinguish Claude vs GPT — use `secondary` variant, never loud |
| **Collaborator colors** | Assigned per-user from a curated palette. Used for cursor dots, node selection rings, avatar borders |

### What NOT to color

- Backgrounds of sections or cards — use lightness steps, not hue
- Text — only `foreground` and `muted-foreground`, never colored body text
- Borders — always `--border`, never colored borders except for selected/presence state on nodes

---

## Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Interface text | Geist Sans | `text-sm` (14px) | `font-normal` (400) |
| Section headers | Geist Sans | `text-sm` (14px) | `font-semibold` (600) |
| Node titles | Geist Sans | `text-sm` (14px) | `font-medium` (500) |
| Tiny labels (handle labels, badge text) | Geist Sans | `text-[10px]` | `font-medium` (500) |
| Code, IDs, model names, timestamps | Geist Mono | `text-xs` (12px) | `font-normal` (400) |
| Chat messages | Geist Sans | `text-sm` (14px) | `font-normal` (400) |

### Rules

- **No large text on the canvas.** The largest text in the app is `text-sm` on node cards. The canvas is not a page — it's a workspace.
- **Geist Mono for data.** Model IDs, timestamps, token counts, node IDs — anything machine-generated gets the mono treatment.
- **Truncate aggressively.** Node titles, summaries, model names — always `truncate` with `max-w-` constraints. The user can hover or click for details.

---

## Spacing

Base unit: `4px` (Tailwind default).

| Context | Pattern | Rationale |
|---------|---------|-----------|
| Card interior | `px-3 py-2` (12px / 8px) | Compact but readable |
| Section gaps | `space-y-2` (8px) | Tight vertical rhythm |
| Sidebar header | `px-4 py-3` (16px / 12px) | Slightly more breathing room for panel chrome |
| Between nodes (canvas grid) | 20px dot grid | Visual rhythm without clutter |
| Message bubbles | `px-3 py-2` with `gap-2` between messages | Conversation density — more history visible |

### Density philosophy

- Prefer `gap-2` over `gap-4`. This is a tool, not a marketing site.
- Node cards should be as small as possible while remaining scannable. Current `min-w-[180px]` is good.
- The sidebar at `w-[420px]` is appropriate — wide enough for chat, narrow enough to keep the canvas visible.

---

## Surfaces & Elevation

Three surface levels, distinguished by lightness, not shadow:

| Level | Token | Use |
|-------|-------|-----|
| **Ground** | `--background` | Canvas, page background |
| **Raised** | `--card` | Node cards, sidebar, floating panels, popovers |
| **Inset** | `--muted` | Input fields, code blocks, nested containers |

### Shadow policy

- `shadow-sm` on node cards — just enough to lift them off the canvas
- `shadow-lg` on the sidebar — it floats over the canvas
- `shadow-md` on hover for node cards — subtle depth change on interaction
- **No shadow on buttons, badges, or inline elements.** Flat is correct for tool chrome.

### Border policy

- Borders are structural, not decorative. They separate regions, not decorate them.
- `border-border` (1px) is the only border weight for most elements.
- `border-2` only on node cards (React Flow needs the weight for visibility at zoom levels).
- No colored borders except: node selection ring (collaborator color), connection handles (blue/orange).

---

## Components

### Node cards (canvas)

The most important visual element. Must be:
- **Compact.** Title, model badge, message count, summary snippet. Nothing else.
- **Scannable at small zoom levels.** No detail that becomes illegible at 50% zoom.
- **State-communicating.** Border changes for selection/presence. Handle dots change color when connected.

```
┌─────────────────────────┐
│ Chat Title         ⋯    │  ← text-sm font-medium, truncate
│ claude-sonnet  3 msgs   │  ← badge (secondary) + muted-foreground
│ Brief summary text...   │  ← text-xs muted-foreground, 2 lines max
│ ● ─────────────── ●     │  ← handles: blue (target), orange (source)
└─────────────────────────┘
```

### Chat panel (floating)

- Absolute-positioned floating panel, not a docked sidebar
- Normal mode: `absolute right-3 top-3 bottom-3 w-[420px] rounded-xl border border-border bg-card shadow-lg z-20`
- Fullscreen mode: `absolute inset-0 bg-card z-20` — no rounding, no margin
- Header: node title (editable), expand/collapse button (Maximize2/Minimize2), close button
- Body: scrollable message list (max-w-2xl centered in fullscreen)
- Footer: input area, model dropdown (compact, opens upward), connected context footer (collapsible)
- Model selector: dropdown trigger showing current model + chevron, not a button group
- Connected contexts ("Informed by"): collapsible footer at the bottom, `text-[10px] text-muted-foreground`, small blue dot indicator. No colored background.
- **No animation on open/close** — instant. Tool-grade response.

### Toolbar / controls

Follow the Figma/Spline pattern: **floating, minimal, translucent.**

- ReactFlow controls: position bottom-left, `bg-card/80 backdrop-blur-sm rounded-md border-border/50`
- Any future toolbars: float over the canvas, don't dock to edges
- Minimap: bottom-right, same floating chrome style
- Theme toggle: top-right, `ThemeToggle` component in a floating pill, cycles light/dark via `next-themes`
- All floating chrome uses: `bg-card/80 backdrop-blur-sm rounded-md border border-border/50 shadow-sm`

### Message bubbles

- User: `bg-primary text-primary-foreground` — right-aligned feel via `ml-8`
- Assistant: `bg-muted text-foreground` — left-aligned feel via `mr-8`
- Keep `text-sm`, `rounded-lg`, `px-3 py-2`
- No avatars in the message list — this is a focused tool, not Slack

### Buttons

- Default to `ghost` variant for toolbar actions
- `outline` for secondary actions in panels
- `default` (primary blue) only for primary actions: "Send", "Create", "Connect"
- `destructive` only for delete/disconnect
- **Never use `lg` size inside the canvas or sidebar.** `sm` or `default` only. Large buttons are for auth pages.

### Badges

- Model identity: `secondary` variant with `text-[10px]`
- Connection indicators: `outline` variant with semantic color (blue for target, orange for source)
- Keep them tiny. Badges are metadata, not features.

---

## Canvas-specific patterns

### Grid

- Dot pattern, `gap={20}`, `size={1}`, `color="var(--border)"`
- Subtle enough to provide spatial reference without visual noise
- Disappears at low zoom levels naturally

### Edges

- Stroke: `#3b82f6` (blue), width `2px`
- Arrow marker at target end
- No labels on edges. The connection itself is the meaning.
- On hover: increase opacity or width slightly

### Handles

- **Inactive:** `bg-muted-foreground/30` — barely visible when not in use
- **Active/connected:** Blue (target) or Orange (source) — immediately visible
- Position: top/bottom or left/right depending on node orientation
- Size: small (`w-2 h-2`) — don't compete with node content

### Presence

- Remote cursors: colored dot + name label, `text-[10px]`, fades after 3s of inactivity
- Node selection ring: `border-2` in collaborator's assigned color
- Avatar stack: top-right corner of canvas, `w-7 h-7`, ring in collaborator color

---

## Motion

Minimal. This is a tool, not a presentation.

| Interaction | Animation |
|-------------|-----------|
| Node hover | `transition-shadow` — `shadow-sm` to `shadow-md`, 150ms |
| Sidebar open/close | None — instant |
| Hover preview | Appear after 400ms delay, no transition |
| Button hover | `transition-colors`, 150ms |
| Streaming text | Characters appear as received — no fade, no typewriter |
| Cursor movement | Smooth interpolation for remote cursors (presence) |

**No spring animations. No bounces. No scale transforms.** These belong in consumer apps, not tools.

---

## Anti-patterns

Things we explicitly reject:

1. **Purple/violet gradients** — the universal sign of "AI product starter kit"
2. **Glassmorphism everywhere** — one `backdrop-blur-sm` on the project header is enough
3. **Rounded-full on cards or panels** — pills are for badges and avatars only
4. **Colored section backgrounds** — no `bg-blue-50` sections. Use lightness steps.
5. **Large hero text on tool surfaces** — nothing above `text-sm` on the canvas
6. **Bouncy/spring animations** — tool-grade means instant or linear
7. **Excessive empty state illustrations** — a single line of muted text is sufficient
8. **Chat-app aesthetics** — no typing indicators with bouncing dots, no read receipts, no avatar next to every message
9. **Dashboard card grids** — the canvas IS the layout. Don't impose a grid on it.
10. **Decorative icons** — icons communicate function (close, send, connect). No ornamental icons.

---

## Theme switching

Light mode is the default. Dark mode is available via the `ThemeToggle` component (top-right of canvas).

- **Mechanism:** `next-themes` with `attribute="class"`, `defaultTheme="light"`, `enableSystem`
- **Provider:** `src/components/providers/ThemeProvider.tsx` wraps the app in `layout.tsx`
- **Toggle:** `src/components/canvas/ThemeToggle.tsx` — lucide Sun/Moon icons, `Button ghost icon-xs`
- Both modes use the same semantic color mapping (blue interactive, orange/blue handles, green presence)
- No colored section backgrounds in either mode
- Test every component in both modes before shipping

---

## File reference

| File | Role |
|------|------|
| `src/app/globals.css` | CSS variables, dark/light tokens, base styles |
| `src/app/layout.tsx` | Geist font loading, `<html>` class for dark mode |
| `src/components/ui/` | shadcn/ui primitives (button, badge, input, etc.) |
| `src/components/canvas/ChatNode.tsx` | Node card styling |
| `src/components/canvas/CanvasEditor.tsx` | ReactFlow wrapper, grid, controls |
| `src/components/chat/ChatSidebar.tsx` | Sidebar drawer |
| `components.json` | shadcn/ui config |
| `doc/design.md` | This file |

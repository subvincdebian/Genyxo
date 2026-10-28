---
version: alpha
name: Genyxo
description: One workspace for choosing and using AI models, with an expressive marketing page and a restrained product interface.
colors:
  primary: "#39a994"
  ink: "#0a110f"
  forest: "#0b302b"
  teal: "#39a994"
  mint: "#c8efd2"
  paper: "#deeee5"
  muted: "#9fb6a9"
  error: "#ffe1d8"
typography:
  sans:
    fontFamily: "Inter Tight, Inter, Segoe UI, Arial, sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
rounded:
  sm: "0.625rem"
  md: "0.875rem"
  lg: "1.75rem"
spacing:
  page-max: "96rem"
  section-gap: "5rem"
components:
  button: {}
  card: {}
  input: {}
  navigation: {}
---

# Genyxo design context

## Overview

Genyxo joins a bright, fluid marketing world with a quiet dark workspace. The marketing page can stage the product through scroll; task pages must prioritise clear content, controls and feedback. The auth screen bridges them: a contained brand panel beside a calm form. The visual reference is an illuminated pane of sea glass next to a precise work surface, not a floating gradient template.

The audience chooses among AI models, starts conversations and buys a finite credit balance. English, Ukrainian, Spanish, German and French are supported through `apps/web/public/locales/*.json`; English is the fallback. Do not infer user geography from locale. Keep product claims specific and avoid unsupported promises about model availability or “unlimited” use.

## Runtime ownership

The existing CSS files are authoritative runtime tokens: `apps/web/src/fsd/shared/styles/home-premium.css` for the landing page, `chat.css` for chat, and `auth-page.css` for authentication. This file records the intended relationships; it does not generate CSS. When changing a durable color, type or shape rule, update the corresponding CSS and this document together.

The authenticated workspace extends chat through `workspace.css` and the shared Dialog, Menu, Tooltip and Icon in `shared/ui/workspace.tsx`. Its persistent `(workspace)` layout owns navigation, mobile scroll locking and the original mounted composer. Sidebar and catalog CSS own local geometry only. `UX-CONTRACT.md` records interaction owners and regression evidence. Project files are reference data; project instructions and explicit memory are separate editable resources.

The workspace navigation follows the supplied ChatGPT reference: black sidebar, transparent 40px desktop rows (44px on phones), one gray selected surface, 20px outline icons, aligned icon/text columns, borderless New chat and a plain Menu footer. Workspace type uses Inter (Inter Tight for display headings) through `--ws-font`/`--gx-font`; sidebar, page and dialog descendants inherit it explicitly to prevent legacy universal font rules from changing metrics. Marketing retains its existing display typography. Catalog actions use monochrome pills. Text navigation does not scale on press. Legacy chat header rules are scoped to the direct main toolbar, including media rules, so they cannot replace catalog grid or sidebar layout.

`.design-rules` is the user-requested Apple Design Skill submodule. For this browser application its layout, consistent icon weight, typography and accessibility principles apply; the supplied ChatGPT screenshots remain the visual authority.

## Color and typography

Use dark ink for product work, teal for the landing atmosphere and pale mint for primary actions on dark surfaces. Preserve clear text contrast and visible focus. Inter Tight is the main typeface with locale-capable fallbacks. Large marketing headings may be tightly tracked; labels, prices, form text and buttons need open tracking and stable line-height. Do not shrink essential text to fit a mockup.

## Layout and depth

Desktop marketing compositions can be wide and cinematic. Forms stay within a readable measure around 450–520px. At narrow widths the brand scene becomes a brief heading above the form. Layout must not create horizontal overflow. Depth comes from tonal layers and fine borders; blur belongs behind content, never on the text or UI preview itself.

## Components and states

Buttons use clear action verbs, an aligned arrow when navigation is implied, a stable busy state and a visible focus ring. Inputs keep persistent labels, adequate tap size and an inline error tied to the attempted action. Account creation requests only email and password; verification is a separate explicit state. Recovery never discloses whether an email exists. Social provider controls appear only when configured. Do not create a second screen-local variant of a shared navigation or product control unless its task differs.

## Motion and content

Motion should explain progression: reveal a section, direct attention to a selected model or confirm an action. Use transform and opacity where possible; respect reduced motion. Auth actions should be immediate and quiet. Use direct, human copy: what action the user takes, what happens next and how to recover. Avoid placeholder success, invented AI responses and decorative animation around security-critical fields.

## Chat workspace

The composer is the primary action on an empty chat: one compact line at rest, growing only with entered lines or attachments. Icon controls share one optical center and use legible light strokes on the dark surface. The turquoise glass accent belongs to active selection and sending, while the surrounding shell stays subdued. Model choice is organized by task first, then provider; compact provider groups keep the full catalog discoverable without putting every model in one flat list. The sidebar gives projects their own expandable chat hierarchy and keeps unassigned conversations under Recent. Dark and light themes must preserve text contrast in the model menu, project selection, and credit balance.

`workspace-premium.css` (loaded last by the workspace layout) owns the visual system: `--gx-*` tokens for both themes, glass menus, mint primary actions, teal accent for active selection, card hover lift, staggered entrance motion and the animated composer focus rim. Genyxo's own outline icons live in `shared/ui/genyxo-icons.tsx`; `WorkspaceIcon` prefers them and falls back to the sprite. Each icon names its moving parts (`gi-*`), and `genyxo-icons.css` plays a one-shot motion while the owning control is hovered or focused; reduced motion disables it.

Workspace controls without a Genyxo icon use the local ChatGPT SVG subset in `public/images/workspace-icons.svg` (source recorded alongside it). Overview opens beside its trigger on desktop and fits inside the viewport on phones, with a restrained graphite glass surface. Icon motion plays a short local sequence at the start of each eight-second hover cycle; it stops on leave and is disabled for reduced motion. Shared tooltips use a measured, viewport-clamped pill and 140ms entry/exit, support keyboard focus and Escape, and label icon-only controls throughout the workspace. Expanded text navigation does not duplicate its label in a tooltip.

## Plugins catalog

`pages/workspace/ui/plugins-page.tsx` and `plugins-page.css` mirror ChatGPT's plugins page on Genyxo tokens: a 30px Inter Tight title with a `--gx-text-2` subtitle, a 52px pill search on `--gx-surface` that gains a teal focus ring, 19px section headings whose chevron nudges right on hover, and two-column rows (70px tall, 14px radius, `--gx-hover` on hover) instead of cards. Brand logos are the official full-colour marks in `apps/web/public/images/plugins` (from theSVG, `@thesvg/icons`, MIT; Xmind, Mobbin, Higgsfield and Zoom ("zm") from their own site icons; Superpowers uses its publisher Prime Radiant's mark), drawn by `shared/ui/plugin-logos.tsx` on 44px `--gx-elevated` tiles. Dark-glyph brands (GitHub, Vercel, Railway, Render, CoinMarketCap, Bybit, Tripo, Superpowers) have a `-light` file: the main file is light-on-dark and the `-light` one shows under `[data-theme="light"]`. Stripe and Kahoot! use their app-icon form (white mark on the brand tile). The Add control is a solid inverted pill; Public / Personal is a rounded segmented control; the row menu is the shared glass `WorkspaceMenu` with a divider and a red Delete. Sections rise in with a short stagger; the + action turns 90° on hover; installed tiles lift 2px.

Plugin and settings pages (`plugin-pages.tsx`, `plugin-pages.css`, max 960px) follow ChatGPT's app page: breadcrumbs at the top, a 72px tile with a 26px title and "By Genyxo • description", pill actions (inverted primary, outlined secondary, red-outlined Remove). The banner is a 24px-radius block tinted with each plugin's brand colour over a deep indigo gradient, with a blurred glow drifting over 18 seconds; its three prompt cards are dark glass (78% black, 18px blur) with the plugin mark, white 16.5px text and a round arrow that slides on hover. Settings uses bordered `--gx-surface` cards: Allow with a policy menu, connected account with a gradient avatar, Uses, Tools (Read-only / Asks first chips) and a two-column Data table. Light theme keeps the banner deep so the white prompt text stays readable. Reduced motion stops the drift, stagger and hover motion; below 760px headers wrap, the primary action fills the row and tables stack.

Plugin action cards in the chat (`widgets/chat/ui/action-card.css`) carry the brand tint as a thin ring while pending, a status pill (Needs your confirmation, Running, Done, Failed, Cancelled), label/value rows for recipients and targets, and the exact body in a scrollable block. Confirm is the mint primary; it shows a spinner while running. Cards stack their buttons full width below 520px.

## Library

`library-page.css` mirrors ChatGPT's library on Genyxo tokens: a 28px title, 40px round ghost icons for filter and the grid/list switch, a 44px outlined search pill and a solid inverted Create pill. Tabs are 40px pills; the selected one sits on `--gx-active`. Media tiles have an 18px radius, no border or caption, and a 16px gutter. Images keep their own aspect ratio and dim slightly and scale by 2.5% on hover, while glass favorite and actions buttons slide in. Audio tiles show a mint-to-violet waveform that moves on hover; documents show a faded text excerpt.

The viewer is a full-screen `<dialog>` (near-black in the dark theme, near-white in light) with pill controls on `--lb-viewer-chip`. Media sits centered with a deep shadow. The prompt line, a bordered glass dock and a 56px "Ask about this file" pill with the mint gradient send button sit at the bottom. Below 640px the dock and Share collapse to icons, and the title hides. Reduced motion stops tile rise, zoom-in and waveform motion.

## Account settings

`/profile` is a React settings centre with seven linked sections. `pages/profile/ui/ProfilePage.module.css` adapts the existing `theme.css` tokens: 232px desktop navigation, a 760px mobile breakpoint, 14px grouped surfaces, and mint primary actions. Profile content replaces the legacy DOM scripts and fabricated payment/analytics data. Display and body type retain Inter Tight and Inter; locally served OFL font subsets avoid blocking account rendering on a remote stylesheet.

Motion responds to actions: 180–350ms section/dialog entry, a spring in switches and theme selection, an avatar dropzone focus halo, and a real-data chart reveal. Busy buttons preserve their width; reduced motion keeps the same completed content. Appearance follows the existing browser theme preference. Shared WorkspaceIcon and WorkspaceDialog own icon geometry, focus containment, Escape and focus restoration; the account CSS supplies their settings variant.

The settings navigation is deliberately inside the centred 1280px page, unlike the chat's edge-to-edge sidebar. Auto margins anchor Back to chat and the account footer. The viewport-height sidebar scrolls independently with a discreet scrollbar; active rows use a neutral surface and consistent 24-unit outline icons. There is no duplicate sidebar balance. Personal settings and account activity have a larger group separation; stats receive their content inset from their child controls. These are intentional layout relationships, not a repeated equal-gap grid. Controls retain at least 44px primary hit areas.

Profile editing is contextual: the avatar opens the native file picker and then a photo preview; the pencil beside the name opens a name-only dialog. Email is read-only and internal account IDs are not displayed. The top-right avatar opens the keyboard-accessible account menu. Preferences keep save and cancel within reach in a sticky action bar.

All navbar account controls use `shared/ui/AvatarNavbar.tsx` and `shared/ui/account-dropdown.tsx`, connected through `entities/session/AvatarNavbar.tsx`. `shared/ui/Avatar.tsx` owns image/fallback rendering without decorative rings. The account menu has one glass surface and identical links on every page; pointer clicks do not draw a ring, while keyboard focus remains visible. Legacy platform code owns only guest authentication, not signed-in menus.

Account polish: controlled Select listboxes provide keyboard selection and search for long lists. AnimatedNumber animates statistics once per mount in 760ms and respects reduced motion. ModelLogo uses locally served theSVG assets with provenance and a textual fallback for unrecognized model families. The usage chart has labeled values, pointer/touch inspection and keyboard navigation; no scrubber is rendered.

AppearanceSync applies validated browser preferences only while the workspace or account page is mounted, then removes its variables. Presets, custom foreground/background/accent, UI/code sizes, reduced motion, per-mode palettes, contrast and diff markers have working consumers. The marketing home page does not consume these overrides.

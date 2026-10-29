import type { ReactNode } from "react";

// Genyxo's own 20px outline icon set. Every icon names its moving parts with
// gi-* classes; genyxo-icons.css plays a short one-shot motion when the
// surrounding control is hovered or focused, and nothing under reduced motion.
const icons: Record<string, ReactNode> = {
  new: <>
    <path d="M9 3.5H5.5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V11" />
    <path className="gi-pen" d="M14.3 3.2a1.6 1.6 0 0 1 2.3 2.3L10 12.1l-3 .8.8-3 6.5-6.7Z" />
  </>,
  search: <g className="gi-lens">
    <circle cx="8.75" cy="8.75" r="5.25" />
    <path d="m12.6 12.6 3.9 3.9" />
  </g>,
  panel: <>
    <rect x="2.75" y="3.5" width="14.5" height="13" rx="2.75" />
    <path className="gi-divider" d="M7.75 3.5v13" />
  </>,
  clock: <>
    <circle cx="10" cy="10" r="7" />
    <path className="gi-hand" d="M10 10V6.2" />
    <path className="gi-hand-short" d="m10 10 2.6 1.6" />
  </>,
  calendar: <>
    <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" />
    <path d="M3 8.5h14M7 2.75V6M13 2.75V6" />
    <circle className="gi-pop" cx="10" cy="12.75" r="1" fill="currentColor" stroke="none" />
  </>,
  library: <>
    <rect x="3" y="3.5" width="3.5" height="13" rx="1" />
    <rect className="gi-book" x="7.75" y="3.5" width="3.5" height="13" rx="1" />
    <path className="gi-book-tilt" d="m12.7 4.7 3.2-.9 2.6 11.5-3.2.9-2.6-11.5Z" />
  </>,
  plugins: <>
    <path className="gi-prongs" d="M7.25 2.5v3.75M12.75 2.5v3.75" />
    <path d="M4.75 6.25h10.5v3a5.25 5.25 0 0 1-10.5 0v-3Z" />
    <path className="gi-cord" d="M10 14.5v3" />
  </>,
  more: <>
    <circle className="gi-dot gi-dot-1" cx="4.75" cy="10" r="1.3" fill="currentColor" stroke="none" />
    <circle className="gi-dot gi-dot-2" cx="10" cy="10" r="1.3" fill="currentColor" stroke="none" />
    <circle className="gi-dot gi-dot-3" cx="15.25" cy="10" r="1.3" fill="currentColor" stroke="none" />
  </>,
  menu: <>
    <path className="gi-line gi-line-1" d="M3.5 5.5h13" />
    <path className="gi-line gi-line-2" d="M3.5 10h13" />
    <path className="gi-line gi-line-3" d="M3.5 14.5h13" />
  </>,
  sparkles: <>
    <path className="gi-star" d="M9 2.5c.6 3.4 2.1 4.9 5.5 5.5-3.4.6-4.9 2.1-5.5 5.5-.6-3.4-2.1-4.9-5.5-5.5 3.4-.6 4.9-2.1 5.5-5.5Z" />
    <path className="gi-star-small" d="M15 12.5c.3 1.5.9 2.1 2.4 2.4-1.5.3-2.1.9-2.4 2.4-.3-1.5-.9-2.1-2.4-2.4 1.5-.3 2.1-.9 2.4-2.4Z" />
  </>,
  gem: <>
    <path className="gi-star" d="M10 2.75c.7 3.9 2.4 5.6 6.25 6.25-3.85.65-5.55 2.35-6.25 6.25-.7-3.9-2.4-5.6-6.25-6.25C7.6 8.35 9.3 6.65 10 2.75Z" />
  </>,
  plus: <path className="gi-spin" d="M10 4v12M4 10h12" />,
  close: <path className="gi-spin" d="m5.25 5.25 9.5 9.5m0-9.5-9.5 9.5" />,
  check: <path className="gi-draw" pathLength={1} d="m4.5 10.5 3.5 3.5 7.5-8" />,
  chevron: <path className="gi-nudge" d="m8 5 5 5-5 5" />,
  arrow: <path className="gi-nudge" d="M4 10h12m-5-5 5 5-5 5" />,
  "arrow-left": <path className="gi-nudge-back" d="M16 10H4m5-5-5 5 5 5" />,
  "arrow-up": <path className="gi-fly" d="M10 16V4M5 9l5-5 5 5" />,
  "arrow-down": <path className="gi-drop" d="M10 4v12m-5-5 5 5 5-5" />,
  image: <>
    <rect x="2.5" y="3.5" width="15" height="13" rx="2.75" />
    <circle className="gi-sun" cx="7.25" cy="8" r="1.5" />
    <path className="gi-hills" d="m2.9 14.6 4.3-4 3 2.8 2.7-2.4 4.4 3.9" />
  </>,
  video: <>
    <rect x="2.5" y="5" width="11" height="10" rx="2.5" />
    <path className="gi-lens" d="m13.5 8.6 4-2.35v7.5l-4-2.35" />
    <circle className="gi-rec" cx="6" cy="8.25" r=".9" fill="currentColor" stroke="none" />
  </>,
  code: <>
    <path className="gi-bracket-l" d="M7 6 3 10l4 4" />
    <path className="gi-bracket-r" d="m13 6 4 4-4 4" />
    <path className="gi-slash" d="M11.2 4.5 8.8 15.5" />
  </>,
  chart: <>
    <path d="M3.5 16.5h13" />
    <path className="gi-bar gi-bar-1" d="M6 13.5v-3" />
    <path className="gi-bar gi-bar-2" d="M10 13.5v-7.5" />
    <path className="gi-bar gi-bar-3" d="M14 13.5V9" />
  </>,
  folder: <>
    <path d="M2.5 6a2 2 0 0 1 2-2h3.2l1.8 2h6a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V6Z" />
    <path className="gi-flap" d="M2.5 8.75h15" />
  </>,
  file: <>
    <path d="M5.5 2.5h6l3.5 3.5v10a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 16V4a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M11.5 2.5V6H15" />
    <path className="gi-text" d="M7 10.25h6M7 13.25h4" />
  </>,
  user: <>
    <circle className="gi-head" cx="10" cy="7" r="3" />
    <path d="M4 17c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" />
  </>,
  settings: <g className="gi-gear">
    <path d="m10 2.5 1.35 1.85 2.25-.55.45 2.3 2.1.95-.95 2.05.95 2.05-2.1.95-.45 2.3-2.25-.55L10 17.5l-1.35-1.85-2.25.55-.45-2.3-2.1-.95.95-2.05-.95-2.05 2.1-.95.45-2.3 2.25.55L10 2.5Z" />
    <circle cx="10" cy="10" r="2.4" />
  </g>,
  trash: <>
    <path className="gi-lid" d="M3.5 5.5h13M8 5.5V4h4v1.5" />
    <path d="m5 5.5.8 10.2A1.5 1.5 0 0 0 7.3 17h5.4a1.5 1.5 0 0 0 1.5-1.3L15 5.5M8.5 9v4.5M11.5 9v4.5" />
  </>,
  pin: <g className="gi-bounce">
    <path d="M7.5 3h5l-1 4.5 3 3h-9l3-3-1-4.5Z" />
    <path d="M10 10.5V17" />
  </g>,
  edit: <>
    <path className="gi-pen" d="M12.8 3.7a1.8 1.8 0 0 1 2.5 2.5L7 14.5l-3.5 1 1-3.5 8.3-8.3Z" />
    <path className="gi-underline" pathLength={1} d="M10.5 16.5h6" />
  </>,
  mic: <>
    <rect className="gi-capsule" x="7.5" y="2.5" width="5" height="9.5" rx="2.5" />
    <path d="M4.75 9.5a5.25 5.25 0 0 0 10.5 0M10 14.75v2.75" />
  </>,
  "mic-off": <>
    <path d="M12.5 8.5V5a2.5 2.5 0 0 0-4.8-1M7.5 7.5V9.5a2.5 2.5 0 0 0 4.1 1.9" />
    <path d="M4.75 9.5a5.25 5.25 0 0 0 8.4 4.2M15.25 9.5c0 .5-.07 1-.2 1.45M10 14.75v2.75" />
    <path className="gi-draw" pathLength={1} d="m3.5 3.5 13 13" />
  </>,
  camera: <>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h2l1.3-1.5h4.4L13.5 5h2A1.5 1.5 0 0 1 17 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-8Z" />
    <circle className="gi-pop" cx="10" cy="10.5" r="2.75" />
  </>,
  draw: <>
    <path className="gi-draw" pathLength={1} d="M3 15c2-1 3-4 5-4s1.5 3 3.5 3 2.5-5 5.5-6" />
  </>,
  canvas: <>
    <rect x="2.75" y="3.5" width="14.5" height="13" rx="2.5" />
    <path className="gi-divider" d="M11 3.5v13" />
    <path className="gi-text" d="M5.5 7.5h3M5.5 10h3M5.5 12.5h2" />
  </>,
  copy: <>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path className="gi-back" d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
  </>,
  download: <>
    <path className="gi-drop" d="M10 3v10m-4-4 4 4 4-4" />
    <path d="M4 16.5h12" />
  </>,
  upload: <>
    <path className="gi-fly" d="M10 13V3M6 7l4-4 4 4" />
    <path d="M4 16.5h12" />
  </>,
  share: <>
    <path className="gi-fly" d="M10 12.5V3M6.5 6.5 10 3l3.5 3.5" />
    <path d="M5 10v5.5A1.5 1.5 0 0 0 6.5 17h7a1.5 1.5 0 0 0 1.5-1.5V10" />
  </>,
  external: <>
    <path className="gi-nudge-diag" d="M11 3.5h5.5V9m0-5.5L9 11" />
    <path d="M14 12v3a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 15V7.5A1.5 1.5 0 0 1 5 6h3" />
  </>,
  link: <g className="gi-tilt">
    <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.5-2.5a3 3 0 0 0-4.2-4.2l-1 1" />
    <path d="M11.5 8.5a3 3 0 0 0-4.2 0L4.8 11a3 3 0 0 0 4.2 4.2l1-1" />
  </g>,
  heart: <path className="gi-beat" d="M10 16.5s-6.5-3.8-6.5-8.3A3.5 3.5 0 0 1 10 6a3.5 3.5 0 0 1 6.5 2.2c0 4.5-6.5 8.3-6.5 8.3Z" />,
  play: <path className="gi-pop" d="M6.5 4.5v11l9-5.5-9-5.5Z" />,
  info: <>
    <circle cx="10" cy="10" r="7" />
    <path className="gi-rise" d="M10 9v4.5" />
    <circle className="gi-rise" cx="10" cy="6.5" r=".8" fill="currentColor" stroke="none" />
  </>,
  help: <>
    <circle cx="10" cy="10" r="7" />
    <path className="gi-tilt" d="M7.8 7.8a2.3 2.3 0 0 1 4.4.9c0 1.5-2.2 1.9-2.2 3.3" />
    <circle cx="10" cy="14.3" r=".8" fill="currentColor" stroke="none" />
  </>,
  grid: <>
    <rect className="gi-tile gi-tile-1" x="3" y="3" width="5.75" height="5.75" rx="1.5" />
    <rect className="gi-tile gi-tile-2" x="11.25" y="3" width="5.75" height="5.75" rx="1.5" />
    <rect className="gi-tile gi-tile-3" x="3" y="11.25" width="5.75" height="5.75" rx="1.5" />
    <rect className="gi-tile gi-tile-4" x="11.25" y="11.25" width="5.75" height="5.75" rx="1.5" />
  </>,
  list: <>
    <path className="gi-line gi-line-1" d="M7.5 5.5h9" />
    <path className="gi-line gi-line-2" d="M7.5 10h9" />
    <path className="gi-line gi-line-3" d="M7.5 14.5h9" />
    <path d="M3.75 5.5h.01M3.75 10h.01M3.75 14.5h.01" strokeWidth="2" />
  </>,
  sort: <>
    <path d="M3.5 6.5h13M3.5 13.5h13" />
    <circle className="gi-knob-1" cx="7" cy="6.5" r="1.9" fill="var(--gi-fill, #0d0f0f)" />
    <circle className="gi-knob-2" cx="13" cy="13.5" r="1.9" fill="var(--gi-fill, #0d0f0f)" />
  </>,
  archive: <>
    <rect className="gi-lid" x="2.5" y="3.5" width="15" height="4" rx="1.2" />
    <path d="M4 7.5v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7M8 11h4" />
  </>,
  maps: <>
    <path className="gi-bounce" d="M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.5 5.5 9.5 5.5 9.5Z" />
    <circle className="gi-bounce" cx="10" cy="8" r="2" />
  </>,
  cube: <g className="gi-turn">
    <path d="m10 2.5 6.5 3.7v7.6L10 17.5l-6.5-3.7V6.2L10 2.5Z" />
    <path d="M3.5 6.2 10 10l6.5-3.8M10 10v7.5" />
  </g>,
  sites: <>
    <circle cx="10" cy="10" r="7" />
    <path d="M3 10h14" />
    <path className="gi-meridian" d="M10 3c1.9 2 2.8 4.5 2.8 7s-.9 5-2.8 7c-1.9-2-2.8-4.5-2.8-7S8.1 5 10 3Z" />
  </>,
  mail: <>
    <rect x="3" y="4.5" width="14" height="11" rx="2" />
    <path d="m3.5 5.5 6.5 5 6.5-5" />
  </>,
  bell: <>
    <path className="gi-ring" d="M5 13.5V9a5 5 0 0 1 10 0v4.5l1.5 2h-13l1.5-2Z" />
    <path d="M8.3 17.5a1.8 1.8 0 0 0 3.4 0" />
  </>,
  logout: <>
    <path d="M8 3.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h3" />
    <path className="gi-nudge" d="M8 10h8.5m-3.5-3.5 3.5 3.5-3.5 3.5" />
  </>,
  globe: <>
    <circle cx="10" cy="10" r="7" />
    <path d="M3 10h14" />
    <path className="gi-meridian" d="M10 3c1.9 2 2.8 4.5 2.8 7s-.9 5-2.8 7c-1.9-2-2.8-4.5-2.8-7S8.1 5 10 3Z" />
  </>,
  wallet: <>
    <path d="M15.5 6.5V5A1.5 1.5 0 0 0 14 3.5H5A2 2 0 0 0 3 5.5v9A2 2 0 0 0 5 16.5h10a1.5 1.5 0 0 0 1.5-1.5V8A1.5 1.5 0 0 0 15 6.5H5" />
    <circle className="gi-pop" cx="13.25" cy="11.5" r="1" fill="currentColor" stroke="none" />
  </>,
  lock: <>
    <rect x="4" y="8.5" width="12" height="8.5" rx="2" />
    <path className="gi-shackle" d="M6.75 8.5V6.25a3.25 3.25 0 0 1 6.5 0V8.5" />
  </>,
  bolt: <path className="gi-pop" d="M11 2.5 4.5 11h5l-1 6.5L15.5 9h-5l.5-6.5Z" />,
  branch: <>
    <circle cx="6" cy="4.75" r="1.75" />
    <circle cx="6" cy="15.25" r="1.75" />
    <circle className="gi-pop" cx="14" cy="7.25" r="1.75" />
    <path d="M6 6.5v7" />
    <path className="gi-draw" pathLength={1} d="M14 9c0 3-3.5 3-6.6 5.2" />
  </>,
  drive: <>
    <path d="M7.4 3.5h5.2l4.9 8.5-2.6 4.5H5.1L2.5 12l4.9-8.5Z" />
    <path className="gi-flap" d="M2.5 12h15M7.4 3.5l5.1 8.5M12.6 3.5 7.5 12" />
  </>,
  api: <>
    <path className="gi-bracket-l" d="M6.5 5.5 3 10l3.5 4.5" />
    <path className="gi-bracket-r" d="m13.5 5.5 3.5 4.5-3.5 4.5" />
    <circle className="gi-dot gi-dot-1" cx="7.75" cy="10" r=".9" fill="currentColor" stroke="none" />
    <circle className="gi-dot gi-dot-2" cx="10" cy="10" r=".9" fill="currentColor" stroke="none" />
    <circle className="gi-dot gi-dot-3" cx="12.25" cy="10" r=".9" fill="currentColor" stroke="none" />
  </>,
  stop: <rect className="gi-pop" x="5.5" y="5.5" width="9" height="9" rx="2" fill="currentColor" stroke="none" />,
};

export const genyxoIconNames = Object.keys(icons);

export function GenyxoIcon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const body = icons[name];
  if (!body) return null;
  return <svg className={`ws-icon gi ${className}`} data-icon={name} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{body}</svg>;
}

export function hasGenyxoIcon(name: string) {
  return name in icons;
}

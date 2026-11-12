"use client";
import type { TravelMode } from "../model/maps";

const MODES: { mode: TravelMode; label: string; path: string }[] = [
  { mode: "driving", label: "Drive", path: "M5 9l1.5-4h7L15 9h1v6h-2v1.5h-2V15H8v1.5H6V15H4V9h1Zm1.6 0h6.8l-.9-2.5H7.5L6.6 9ZM6.5 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm7 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" },
  { mode: "walking", label: "Walk", path: "M11 2.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2ZM9 7h2.6l2 3.2 2.2.8-.5 1.4-2.8-1-1-1.6-.6 2.6 2 2.2V18h-1.6v-3.6L9.6 12.7 8.7 18H7l1.4-7.6-1.5.7v2.4H5.3V10l3.7-3Z" },
  { mode: "transit", label: "Transit", path: "M5 3h10a2 2 0 0 1 2 2v9a2 2 0 0 1-1 1.7V18h-2v-2H6v2H4v-2.3A2 2 0 0 1 3 14V5a2 2 0 0 1 2-2Zm0 2v5h10V5H5Zm1 7.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" },
  { mode: "cycling", label: "Cycle", path: "M5 10.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 1.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10-1.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 1.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM12 3.5h2.5V5h-1.4l1.6 4.6-1.4.5-.5-1.4-3.6 5.3H5.6l.8-1.5h2.4l-1.3-3.2H6V7.8h3.4v1.5h-.6l1 2.4 2.2-3.3L12 3.5Z" },
];

/** Apple's segmented travel mode switch. */
export function TravelModes({ value, onChange }: { value: TravelMode; onChange: (mode: TravelMode) => void }) {
  return <div className="gx-map-modes" role="radiogroup" aria-label="Travel mode">
    {MODES.map((item) => <button key={item.mode} type="button" role="radio" aria-checked={value === item.mode} aria-label={item.label} title={item.label} onClick={() => value !== item.mode && onChange(item.mode)}>
      <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d={item.path} /></svg>
    </button>)}
  </div>;
}

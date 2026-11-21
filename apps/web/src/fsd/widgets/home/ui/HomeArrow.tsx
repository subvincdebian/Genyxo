export function HomeArrow({ direction = "up-right" }: { direction?: "up-right" | "down" }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {direction === "down" ? <path d="M10 3.5v12m-4.5-4.5 4.5 4.5 4.5-4.5" /> : <path d="M5 15 15 5M6.5 5H15v8.5" />}
    </svg>
  );
}

export function deviceDetails(agent: string) {
  const os = /iPad/i.test(agent)
    ? "iPadOS"
    : /iPhone/i.test(agent)
      ? "iOS"
      : /Android/i.test(agent)
        ? "Android"
        : /Windows/i.test(agent)
          ? "Windows"
          : /Macintosh|Mac OS/i.test(agent)
            ? "macOS"
            : /Linux/i.test(agent)
              ? "Linux"
              : "Unknown system";
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /OPR\//.test(agent)
      ? "Opera"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Chrome\//.test(agent)
          ? "Chrome"
          : /Safari\//.test(agent)
            ? "Safari"
            : "Browser";
  const kind = /iPad|Tablet|Android(?!.*Mobile)/i.test(agent)
    ? "tablet"
    : /Mobile|iPhone/i.test(agent)
      ? "phone"
      : /Laptop|Notebook|MacBook/i.test(agent)
        ? "laptop"
        : "computer";
  return { os, browser, kind, name: `${browser} · ${os}` };
}

export function DeviceIcon({ agent }: { agent: string }) {
  const { kind } = deviceDetails(agent);
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "phone" ? (
        <>
          <rect x="6" y="2" width="12" height="20" rx="3" />
          <path d="M10 5h4m-3 14h2" />
        </>
      ) : kind === "tablet" ? (
        <>
          <rect x="3" y="2" width="18" height="20" rx="3" />
          <path d="M11 19h2" />
        </>
      ) : kind === "laptop" ? (
        <>
          <rect x="4" y="3" width="16" height="13" rx="2" />
          <path d="m4 16-2 4h20l-2-4M9 20h6" />
        </>
      ) : (
        <>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M12 17v4m-5 0h10" />
        </>
      )}
    </svg>
  );
}

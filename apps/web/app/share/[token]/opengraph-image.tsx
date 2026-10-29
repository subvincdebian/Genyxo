import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadSharedChat, plainText } from "./data";

export const alt = "A chat shared from Genyxo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Inter with the glyphs this card needs (Cyrillic included); the default font has Latin only. */
async function font(text: string, weight: number) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&text=${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(4000) })).text();
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    return url ? await (await fetch(url, { signal: AbortSignal.timeout(4000) })).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** The link preview in messengers and social networks: the chat's title and the start of its answer. */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const chat = await loadSharedChat(token);
  const title = (chat?.title || "Shared chat").slice(0, 90);
  const question = plainText(chat?.messages.find((message) => message.role === "user")?.content || "").slice(0, 110);
  const answer = plainText(chat?.messages.find((message) => message.role === "assistant")?.content || "").slice(0, 190);
  const logo = await readFile(join(process.cwd(), "public/images/logo.svg")).then((file) => `data:image/svg+xml;base64,${file.toString("base64")}`).catch(() => null);
  const glyphs = `${title}${question}${answer}Genyxo·Shared chat…`;
  const [regular, bold] = await Promise.all([font(glyphs, 500), font(glyphs, 700)]);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", color: "#f5f5f7", background: "radial-gradient(circle at 85% 0%, rgba(94,224,196,0.28), transparent 46%), radial-gradient(circle at 0% 100%, rgba(76,120,255,0.22), transparent 50%), #0d0e10", fontFamily: "Inter" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {logo && <img src={logo} width={46} height={46} alt="" />}
        <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Genyxo</span>
        <span style={{ marginLeft: 8, padding: "6px 16px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: "#c7c7cc", fontSize: 20, fontWeight: 500 }}>Shared chat</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 1000 }}>{title}</div>
        {question && <div style={{ display: "flex", alignSelf: "flex-start", maxWidth: 900, padding: "14px 24px", borderRadius: 28, background: "rgba(255,255,255,0.1)", fontSize: 26, fontWeight: 500, color: "#e5e5ea" }}>{question}</div>}
        {answer && <div style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.4, color: "#a1a1a6", maxWidth: 1000 }}>{answer}</div>}
      </div>
    </div>,
    {
      ...size,
      fonts: [regular && { name: "Inter", data: regular, weight: 500 as const }, bold && { name: "Inter", data: bold, weight: 700 as const }].filter((value): value is { name: string; data: ArrayBuffer; weight: 500 | 700 } => Boolean(value)),
    },
  );
}

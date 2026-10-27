import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Marked, type Tokens } from "marked";
import { loadSharedChat, plainText, splitSources } from "./data";
import "./share.css";

type Props = { params: Promise<{ token: string }> };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const safeUrl = (href: string, image = false) => /^https:\/\//i.test(href) || (!image && /^(http:|mailto:)/i.test(href)) || href.startsWith("/api/chat/media/") ? href : "";

/** Answers are Markdown; raw HTML is shown as text and only web links survive. */
const markdown = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html(token: Tokens.HTML | Tokens.Tag) { return escapeHtml(token.text); },
    link(this: { parser: { parseInline: (tokens: Tokens.Generic[]) => string } }, token: Tokens.Link) {
      const href = safeUrl(token.href);
      const text = this.parser.parseInline(token.tokens);
      if (!href) return text;
      const cite = /^\[?\d{1,2}\]?$/.test(token.text) ? ` class="cite"` : "";
      const label = cite ? escapeHtml(new URL(href, "https://x").hostname.replace(/^www\./, "")) : text;
      return `<a href="${escapeHtml(href)}"${cite} target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
    },
    image(token: Tokens.Image) {
      const src = safeUrl(token.href, true);
      return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(token.text)}" loading="lazy">` : "";
    },
  },
});

async function origin() {
  const list = await headers();
  const host = list.get("x-forwarded-host") || list.get("host") || "localhost:3001";
  const proto = list.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const chat = await loadSharedChat(token);
  if (!chat) return { title: "Shared chat not found · Genyxo", robots: { index: false } };
  const answer = chat.messages.find((message) => message.role === "assistant");
  const description = plainText(answer?.content || chat.messages[0]?.content || "").slice(0, 180) || "A conversation shared from Genyxo.";
  return {
    metadataBase: new URL(await origin()),
    title: `${chat.title} · Genyxo`,
    description,
    robots: { index: false, follow: false },
    openGraph: { type: "article", siteName: "Genyxo", title: chat.title, description, url: `/share/${token}` },
    twitter: { card: "summary_large_image", title: chat.title, description },
  };
}

export default async function SharedChatPage({ params }: Props) {
  const { token } = await params;
  const chat = await loadSharedChat(token);
  if (!chat) notFound();
  const shared = new Date(chat.sharedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return <div className="gx-share">
    <header className="gx-share-bar">
      <Link href="/" className="gx-share-brand" aria-label="Genyxo home"><img src="/images/logo.svg" alt="" width={26} height={26} /><span>Genyxo</span></Link>
      <Link href="/chat" className="gx-share-cta">Try Genyxo</Link>
    </header>
    <main className="gx-share-main">
      <div className="gx-share-intro">
        <h1>{chat.title}</h1>
        <p>Shared on {shared}</p>
      </div>
      <ol className="gx-share-thread">
        {chat.messages.map((message) => {
          if (message.role === "user") return <li key={message.id} className="gx-share-user">
            {message.attachments.length > 0 && <div className="gx-share-files">{message.attachments.map((name) => <span key={name}>{name}</span>)}</div>}
            {message.content && <p>{message.content}</p>}
          </li>;
          const { text, sources } = splitSources(message.content);
          return <li key={message.id} className="gx-share-answer">
            <div className="gx-share-md" dangerouslySetInnerHTML={{ __html: markdown.parse(text) as string }} />
            {sources.length > 0 && <details className="gx-share-sources"><summary>Sources · {sources.length}</summary><ul>{sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer nofollow"><strong>{source.title}</strong><small>{new URL(source.url).hostname.replace(/^www\./, "")}</small></a></li>)}</ul></details>}
          </li>;
        })}
      </ol>
      <footer className="gx-share-foot">
        <p>This is a copy of a conversation shared from Genyxo. Messages added after sharing are not included.</p>
        <Link href="/chat" className="gx-share-cta is-large">Start your own chat</Link>
      </footer>
    </main>
  </div>;
}

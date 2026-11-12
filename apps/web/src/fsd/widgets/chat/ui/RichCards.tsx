"use client";
import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { TaskCard } from "./TaskPanel";

type Source = { title: string; url: string };
const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };
/** "en.cppreference.com" → "cppreference", the way ChatGPT names a citation. */
const siteName = (url: string) => {
  const parts = hostOf(url).split(".").filter((part) => !/^(www|en|m|mobile|amp)$/.test(part));
  const generic = /^(com|org|net|io|dev|gov|edu|co|ac|uk|ua|ru|de|fr|info|app)$/;
  while (parts.length > 1 && generic.test(parts[parts.length - 1])) parts.pop();
  return parts[parts.length - 1] || hostOf(url);
};
const favicon = (url: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=64`;

function Favicon({ url, size = 16 }: { url: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="gx-src-letter" style={{ width: size, height: size }}>{siteName(url).charAt(0).toUpperCase()}</span>;
  return <img className="gx-src-favicon" src={favicon(url)} width={size} height={size} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

/**
 * The pages an answer used, like ChatGPT's Sources button: overlapping site
 * icons that open into a list. Numbered links in the answer ([1](url)) become
 * small pills with the site's name.
 */
function SourcesCard({ sources, element }: { sources: Source[]; element: HTMLElement }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const message = element.closest(".message-content") || element.parentElement;
    message?.querySelectorAll<HTMLAnchorElement>("a[href^='http']").forEach((link) => {
      if (link.classList.contains("gx-cite") || !/^\[?\d{1,2}\]?$/.test(link.textContent?.trim() || "")) return;
      link.classList.add("gx-cite");
      link.dataset.index = link.textContent!.replace(/\D/g, "");
      link.textContent = siteName(link.href);
      link.title = sources.find((source) => source.url === link.href)?.title || hostOf(link.href);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
  }, [element, sources]);
  const shown = sources.slice(0, 3);
  return <div className="gx-src">
    <button type="button" className="gx-src-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="gx-src-stack" aria-hidden="true">{shown.map((source) => <Favicon key={source.url} url={source.url} size={18} />)}</span>
      <span>Sources</span>
      <span className="gx-src-count">{sources.length}</span>
    </button>
    {open && <ul className="gx-src-list">
      {sources.map((source) => <li key={source.url}>
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          <span className="gx-src-tile"><Favicon url={source.url} size={18} /></span>
          <span className="gx-src-copy"><strong>{source.title || siteName(source.url)}</strong><small>{hostOf(source.url)}</small></span>
        </a>
      </li>)}
    </ul>}
  </div>;
}

/** "Memory updated" under an answer, as in ChatGPT; opens Settings → Memory. */
function MemoryPill({ action, fact }: { action: "saved" | "forgotten"; fact: string }) {
  return <button type="button" className="gx-memory-pill" title={fact} onClick={() => document.dispatchEvent(new CustomEvent("genyxo:open-memory"))}>
    <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.5h7.5L15.5 6.5V16a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z M7.5 9h5M7.5 12h3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <span>{action === "saved" ? "Memory updated" : "Memory forgotten"}</span>
    <WorkspaceIcon name="chevron" size={12} />
  </button>;
}

type Weather = {
  place: string; temperature: number; feelsLike: number; code: number; condition: string; isDay: boolean;
  wind: number; humidity: number; high: number; low: number; rainChance: number; sunrise: string; sunset: string;
  hours: { time: string; temperature: number; code: number; rainChance: number }[];
};
/** Line icons for WMO weather codes. */
function WeatherIcon({ code, day = true, size = 22 }: { code: number; day?: boolean; size?: number }) {
  const cloud = "M6.5 15.5h8a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.6 1.2 2.4 2.4 0 0 0 .3 4.8Z";
  const kind = code === 0 ? "clear" : code <= 2 ? "partly" : code === 3 ? "cloud" : code === 45 || code === 48 ? "fog" : code >= 95 ? "storm" : (code >= 71 && code <= 77) || code === 85 || code === 86 ? "snow" : code >= 51 ? "rain" : "cloud";
  return <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className={`gx-wx-icon is-${kind}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {kind === "clear" && (day ? <><circle cx="10" cy="10" r="3.6" className="gx-wx-sun" /><path className="gx-wx-sun" d="M10 2.5v1.6M10 15.9v1.6M2.5 10h1.6M15.9 10h1.6M4.7 4.7l1.1 1.1M14.2 14.2l1.1 1.1M4.7 15.3l1.1-1.1M14.2 5.8l1.1-1.1" /></> : <path className="gx-wx-moon" d="M15.5 12.5A6 6 0 0 1 7.5 4.5a6 6 0 1 0 8 8Z" />)}
    {kind === "partly" && <><path className={day ? "gx-wx-sun" : "gx-wx-moon"} d={day ? "M8 3v1.2M3.6 4.8l.9.9M2.5 9h1.2M11.6 4.8l-.9.9M5.6 9.4a2.8 2.8 0 0 1 5-2.4" : "M10.5 7A4.5 4.5 0 0 1 4.6 4a4.5 4.5 0 1 0 5.9 3Z"} /><path d={cloud} /></>}
    {(kind === "cloud" || kind === "fog") && <path d={cloud} />}
    {kind === "fog" && <path d="M4 18h12" />}
    {kind === "rain" && <><path d="M6.5 13h8a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.6 1.2 2.4 2.4 0 0 0 .3 4.8Z" /><path className="gx-wx-rain" d="M7.5 15.5 7 17.5M10.5 15.5l-.5 2M13.5 15.5l-.5 2" /></>}
    {kind === "snow" && <><path d="M6.5 13h8a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.6 1.2 2.4 2.4 0 0 0 .3 4.8Z" /><path d="M7.5 16.5h.01M10.5 17.5h.01M13.5 16.5h.01" strokeWidth="2.2" /></>}
    {kind === "storm" && <><path d="M6.5 13h8a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.6 1.2 2.4 2.4 0 0 0 .3 4.8Z" /><path className="gx-wx-sun" d="m10.5 13.5-1.5 2.5h2.5l-1.5 2.5" /></>}
  </svg>;
}

/** Weather like Apple Weather's widget: the sky's colour, now, today's range and the next hours. */
function WeatherCard({ data }: { data: Weather }) {
  const sky = !data.isDay ? "night" : data.code === 0 || data.code <= 2 ? "clear" : data.code >= 51 ? "rain" : "cloud";
  return <section className="gx-wx" data-sky={sky} aria-label={`Weather${data.place ? ` in ${data.place}` : ""}`}>
    <header className="gx-wx-now">
      <div>
        <p className="gx-wx-place">{data.place || "Your location"}<WorkspaceIcon name="maps" size={12} /></p>
        <p className="gx-wx-temp">{data.temperature}°</p>
      </div>
      <div className="gx-wx-side">
        <WeatherIcon code={data.code} day={data.isDay} size={26} />
        <p>{data.condition}</p>
        <p>H:{data.high}° L:{data.low}°</p>
      </div>
    </header>
    <ol className="gx-wx-hours">
      {data.hours.slice(0, 8).map((hour, index) => <li key={hour.time}>
        <span>{index === 0 ? "Now" : hour.time}</span>
        <WeatherIcon code={hour.code} day={hour.time >= data.sunrise && hour.time < data.sunset} size={20} />
        {hour.rainChance >= 30 && <small>{hour.rainChance}%</small>}
        <strong>{hour.temperature}°</strong>
      </li>)}
    </ol>
    <footer className="gx-wx-facts"><span>Feels like {data.feelsLike}°</span><span>Wind {data.wind} km/h</span><span>Humidity {data.humidity}%</span>{data.rainChance > 0 && <span>Rain {data.rainChance}%</span>}</footer>
  </section>;
}

type CardData = { sources?: Source[]; action?: string; fact?: string; id?: number; title?: string } & Partial<Weather>;

/** Mounts the Sources, Memory, Task and Weather cards the chat controller announces. */
export function RichCardsHost() {
  useEffect(() => {
    const roots = new Map<HTMLElement, Root>();
    // History renders cards before their message is on the page, so only a
    // card that was shown and then left the page is unmounted.
    const shown = new WeakSet<HTMLElement>();
    const sweep = () => roots.forEach((root, element) => {
      if (element.isConnected) shown.add(element);
      else if (shown.has(element)) { root.unmount(); roots.delete(element); }
    });
    const mount = (event: Event) => {
      const { kind, element, data } = (event as CustomEvent<{ kind: string; element: HTMLElement; data: CardData }>).detail;
      if (roots.has(element)) return;
      const root = createRoot(element);
      if (kind === "sources" && Array.isArray(data.sources) && data.sources.length) root.render(<SourcesCard sources={data.sources} element={element} />);
      else if (kind === "memory") root.render(<MemoryPill action={data.action === "forgotten" ? "forgotten" : "saved"} fact={String(data.fact || "")} />);
      else if (kind === "task" && Number.isFinite(data.id)) root.render(<TaskCard id={Number(data.id)} title={String(data.title || "")} />);
      else if (kind === "weather" && Number.isFinite(data.temperature) && Array.isArray(data.hours)) root.render(<WeatherCard data={data as Weather} />);
      else return;
      roots.set(element, root);
      sweep();
    };
    document.addEventListener("genyxo:rich-card", mount);
    const timer = window.setInterval(sweep, 15_000);
    return () => { document.removeEventListener("genyxo:rich-card", mount); window.clearInterval(timer); roots.forEach((root) => root.unmount()); };
  }, []);
  return null;
}

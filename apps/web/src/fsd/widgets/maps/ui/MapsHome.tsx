"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { fetchAddress, useUserLocation } from "../model/maps";
import { MapView } from "./MapView";
import "./maps.css";

const SUGGESTIONS = ["Coffee nearby", "Nearest pharmacy", "Supermarkets open now", "Bus stops around me", "Where can I eat within a 10-minute walk?"];

declare global {
  interface Window {
    /** Read by the chat controller: the location sent with Maps questions. */
    genyxoMaps?: { location: () => { lat: number; lng: number; accuracy?: number } | null };
  }
}

function send(text: string) {
  const input = document.getElementById("userInput") as HTMLTextAreaElement | null;
  const form = document.getElementById("chatForm") as HTMLFormElement | null;
  if (!input || !form || input.disabled) return;
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  form.requestSubmit();
}

/**
 * The Maps page: the chat composer with a location prompt above it and, once
 * the location is on, a live map under it that slides open. Questions sent
 * from here carry the location, which gives the model real map tools.
 */
export function MapsHome() {
  const { status, location, request } = useUserLocation();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [near, setNear] = useState("");
  const [bannerClosed, setBannerClosed] = useState(false);
  const user = useMemo(() => (location ? { lat: location.lat, lng: location.lng, accuracy: location.accuracy } : null), [location]);
  const rounded = location ? `${location.lat.toFixed(3)},${location.lng.toFixed(3)}` : "";

  useEffect(() => {
    document.documentElement.dataset.gxRoute = "maps";
    const chat = document.getElementById("chatContainer");
    queueMicrotask(() => setContainer(chat));
    // Maps always opens on a fresh question, not on the chat that was open.
    if (chat && !chat.querySelector(":scope > #welcomeScreen:not(.hidden)")) document.dispatchEvent(new CustomEvent("genyxo:workspace-new", { detail: { projectId: null } }));
    return () => { delete document.documentElement.dataset.gxRoute; delete window.genyxoMaps; };
  }, []);

  useEffect(() => {
    window.genyxoMaps = { location: () => (location ? { lat: Number(location.lat.toFixed(6)), lng: Number(location.lng.toFixed(6)), accuracy: location.accuracy ? Math.round(location.accuracy) : undefined } : null) };
  }, [location]);

  // "Near Khreshchatyk 22": looked up again only after moving about 100 m.
  useEffect(() => {
    if (!rounded) return;
    const [lat, lng] = rounded.split(",").map(Number);
    let live = true;
    void fetchAddress({ lat, lng }, navigator.language?.split("-")[0]).then((label) => { if (live) setNear(label); });
    return () => { live = false; };
  }, [rounded]);

  if (!container) return null;
  const granted = status === "granted" && user;
  return <>
    {createPortal(<header className="gx-maps-head">
      {!granted && !bannerClosed && <div className="gx-map-glass gx-maps-banner" role="status">
        <WorkspaceIcon name="info" size={15} />
        <span>{status === "denied" ? "Location is blocked in this browser" : status === "locating" ? "Finding your location…" : "Location is off"}</span>
        {status !== "denied" && status !== "locating" && <button type="button" onClick={request}>Turn on</button>}
        <button type="button" className="gx-maps-banner-close" aria-label="Dismiss" onClick={() => setBannerClosed(true)}><WorkspaceIcon name="close" size={13} /></button>
      </div>}
      <h1>Maps</h1>
    </header>, container)}
    {createPortal(<section className={`gx-maps-stage${granted ? " is-live" : ""}`} aria-label="Map around you">
      {granted ? <>
        <div className="gx-maps-map">
          <MapView user={user} label="Map around you" />
          {near && <div className="gx-map-glass gx-maps-near"><span className="gx-maps-near-dot" />Near {near}</div>}
        </div>
        <div className="gx-maps-suggestions">
          {SUGGESTIONS.map((text) => <button key={text} type="button" onClick={() => send(text)}>{text}</button>)}
        </div>
        <p className="gx-maps-privacy">Your location is sent only with questions you ask here and is used to search OpenStreetMap.</p>
      </> : <div className="gx-maps-intro">
        <span className="gx-maps-intro-icon" aria-hidden="true"><svg viewBox="0 0 48 48" width="44" height="44"><defs><linearGradient id="gxMapsIcon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5ee0c4" /><stop offset=".55" stopColor="#4cc3ff" /><stop offset="1" stopColor="#bf5af2" /></linearGradient></defs><rect width="48" height="48" rx="13" fill="url(#gxMapsIcon)" /><path d="M24 11a9 9 0 0 1 9 9c0 6.7-9 16-9 16s-9-9.3-9-16a9 9 0 0 1 9-9Zm0 5.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="#fff" /></svg></span>
        <h2>A new way to discover places</h2>
        <p>Share your location to ask what is nearby, which places are open, how far they are and how to get there.</p>
        {status === "denied"
          ? <p className="gx-maps-blocked">Allow location for this site in your browser&apos;s address bar, then reload the page.</p>
          : <button type="button" className="gx-maps-cta" onClick={request} disabled={status === "locating"}>{status === "locating" ? "Finding you…" : "Turn on"}</button>}
      </div>}
    </section>, container)}
  </>;
}

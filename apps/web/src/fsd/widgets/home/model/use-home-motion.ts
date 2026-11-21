"use client";
import { useEffect, type RefObject } from "react";

type Particle = { x: number; y: number; born: number; glyph: string; drift: number };
export function useHomeMotion(root: RefObject<HTMLElement | null>, canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const element = root.current, canvas = canvasRef.current;
    if (!element || !canvas) return;
    const hero: HTMLElement = element;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const page = hero.closest<HTMLElement>(".gx-home")!;
    const nav = page.querySelector<HTMLElement>(".navbar .nav-links")!;
    const bubble = nav.querySelector<HTMLElement>(".gx-nav-bubble")!;
    const navLinks = [...nav.querySelectorAll<HTMLAnchorElement>("a")];
    const moveBubble = (link: HTMLElement) => { bubble.style.width = `${link.offsetWidth}px`; bubble.style.transform = `translateX(${link.offsetLeft}px)`; };
    const enterNav = (event: Event) => { const link = (event.target as HTMLElement).closest("a"); if (link && nav.contains(link)) moveBubble(link); };
    const leaveNav = () => moveBubble(nav.querySelector<HTMLElement>(".active") || navLinks[0]);
    nav.addEventListener("pointerover", enterNav); nav.addEventListener("focusin", enterNav); nav.addEventListener("pointerleave", leaveNav);
    const navSize = new ResizeObserver(leaveNav); navSize.observe(nav);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(pointer: fine)");
    let particles: Particle[] = [], paint = 0, scrollFrame = 0, last = 0, onScreen = true;
    let width = 0, height = 0;
    const glyphs = ["_", ">", "/", "{", "}", "+", ";"];
    const clear = () => { cancelAnimationFrame(paint); paint = 0; particles = []; ctx.clearRect(0, 0, width, height); };
    const enabled = () => !reduced.matches && !document.hidden && onScreen;
    const sync = () => { hero.classList.toggle("gx-motion-still", !enabled()); if (!enabled()) clear(); updateScroll(); };
    function updateScroll() {
      scrollFrame = 0;
      const y = window.scrollY;
      page.style.setProperty("--nav-progress", String(Math.min(1, y / 150)));
      page.classList.toggle("gx-nav-compact", y > 35);
      const about = page.querySelector<HTMLElement>("#about");
      const products = page.querySelector<HTMLElement>("#products");
      const activeHref = about && y >= about.offsetTop - innerHeight * .35 ? "#about" : products && y >= products.offsetTop - innerHeight * .35 ? "#products" : "#home";
      for (const link of navLinks) {
        const active = link.getAttribute("href") === activeHref;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
      }
      const activeLink = navLinks.find(link => link.getAttribute("href") === activeHref);
      if (activeLink) moveBubble(activeLink);
    }
    const scroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); };
    const resize = () => { const r = hero.getBoundingClientRect(); width = r.width; height = Math.min(r.height, innerHeight * 1.4); const dpr = Math.min(devicePixelRatio, 1.5); canvas.width = width * dpr; canvas.height = height * dpr; canvas.style.height = `${height}px`; ctx.setTransform(dpr,0,0,dpr,0,0); updateScroll(); };
    const draw = (now: number) => {
      paint = 0; ctx.clearRect(0, 0, width, height);
      if (!enabled()) return;
      particles = particles.filter(p => now - p.born < 1050);
      ctx.font = "13px ui-monospace, Consolas, monospace";
      for (const p of particles) { const age = (now - p.born) / 1050; ctx.fillStyle = `rgba(232,255,246,${Math.min(age * 7, 1) * (1-age) * .62})`; ctx.fillText(p.glyph, p.x + p.drift * age * 12, p.y - age * 10); }
      if (particles.length) paint = requestAnimationFrame(draw);
    };
    const pointer = (e: PointerEvent) => {
      if (!enabled() || !fine.matches || e.pointerType === "touch" || (e.target as HTMLElement).closest("a,button,input,nav")) return;
      const now = performance.now(); if (now-last < 55) return; last = now;
      const r = hero.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
      if (y > height-30) return;
      const protectedAreas = [...hero.querySelectorAll(".gx-hero-copy h1,.gx-hero-copy p,.gx-hero-copy a,.gx-hero-copy button,.gx-workspace-frame")].map(el=>el.getBoundingClientRect());
      for (let col=0;col<2;col++) {
        const px=Math.round((x-16-col*18)/16)*16, py=Math.round((y+col*12)/16)*16;
        if (protectedAreas.some(area=>px+r.left>area.left-14&&px+r.left<area.right+14&&py+r.top>area.top-14&&py+r.top<area.bottom+14)) continue;
        particles.push({x:px,y:py,born:now-col*90,glyph:glyphs[Math.floor(Math.random()*glyphs.length)],drift:Math.random()-.5});
      }
      particles=particles.slice(-48); if (!paint) paint=requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(entries => { onScreen=entries[0].isIntersecting; sync(); }); observer.observe(hero);
    const size = new ResizeObserver(resize); size.observe(hero);
    hero.addEventListener("pointermove",pointer,{passive:true}); window.addEventListener("scroll",scroll,{passive:true}); window.addEventListener("resize",resize); document.addEventListener("visibilitychange",sync); reduced.addEventListener("change",sync);
    resize(); sync();
    return () => { navSize.disconnect(); nav.removeEventListener("pointerover", enterNav); nav.removeEventListener("focusin", enterNav); nav.removeEventListener("pointerleave", leaveNav); clear(); cancelAnimationFrame(scrollFrame); observer.disconnect(); size.disconnect(); hero.removeEventListener("pointermove",pointer); window.removeEventListener("scroll",scroll); window.removeEventListener("resize",resize); document.removeEventListener("visibilitychange",sync); reduced.removeEventListener("change",sync); page.classList.remove("gx-nav-compact"); page.style.removeProperty("--nav-progress"); };
  }, [root, canvasRef]);
}

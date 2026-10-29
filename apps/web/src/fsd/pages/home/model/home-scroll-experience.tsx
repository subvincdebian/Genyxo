"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function HomeScrollExperience() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".gx-home");
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 600px)");
    let cleanupExperience = () => {};

    const setup = () => {
      cleanupExperience();
      if (reduced.matches) {
        root.classList.remove("gx-scroll-ready");
        return;
      }

      const desktop = !narrow.matches;
      const lenis = desktop ? new Lenis({
        duration: 1.15,
        smoothWheel: true,
        anchors: true,
        prevent: node => Boolean(node.closest(".modal-overlay,.menu-overlay,.demo-modal-overlay,[data-lenis-prevent]")),
      }) : null;
      const ticker = (time: number) => lenis?.raf(time * 1000);
      if (lenis) {
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(ticker);
        gsap.ticker.lagSmoothing(0);
      }

      const context = gsap.context(() => {
        const fadeUp = (selector: string, y = 40, stagger = 0) => {
          const nodes = gsap.utils.toArray<HTMLElement>(selector);
          if (!nodes.length) return;
          gsap.fromTo(nodes, { y, opacity: 0 }, {
            y: 0, opacity: 1, duration: 1, stagger, ease: "power3.out",
            scrollTrigger: { trigger: nodes[0], start: "top 85%", toggleActions: "play reverse play reverse" },
          });
        };

        gsap.fromTo(".gx-hero-copy .gx-brain, .gx-hero-copy .gx-eyebrow", { y: 24, opacity: 0 }, {
          y: 0, opacity: 1, duration: .9, stagger: .12, ease: "power3.out", delay: .08,
          scrollTrigger: { trigger: ".gx-hero-copy", start: "top 85%", toggleActions: "play reverse play reverse" },
        });
        gsap.fromTo(".gx-title-line > span", { yPercent: 110, opacity: 0 }, {
          yPercent: 0, opacity: 1, duration: 1.25, stagger: .13, ease: "power3.out", delay: .16,
          scrollTrigger: { trigger: ".gx-hero-copy", start: "top 85%", toggleActions: "play reverse play reverse" },
        });
        gsap.fromTo(".gx-hero-copy .gx-intro, .gx-hero-copy .gx-actions", { y: 28, opacity: 0 }, {
          y: 0, opacity: 1, duration: 1, stagger: .12, ease: "power3.out", delay: .35,
          scrollTrigger: { trigger: ".gx-hero-copy", start: "top 85%", toggleActions: "play reverse play reverse" },
        });

        gsap.fromTo(".gx-scene-heading .gx-eyebrow", { x: -52, opacity: 0 }, {
          x: 0, opacity: 1, duration: 1.05, ease: "power3.out",
          scrollTrigger: { trigger: ".gx-scene-heading", start: "top 85%", toggleActions: "play reverse play reverse" },
        });
        gsap.fromTo(".gx-scene-heading .gx-scroll-cue", { x: 52, opacity: 0 }, {
          x: 0, opacity: 1, duration: 1.05, ease: "power3.out",
          scrollTrigger: { trigger: ".gx-scene-heading", start: "top 85%", toggleActions: "play reverse play reverse" },
        });
        fadeUp(".gx-product-statement .gx-eyebrow", 25);
        fadeUp(".gx-statement-detail", 30);
        gsap.fromTo(".gx-product-statement h2", { y: 65, scale: .94, opacity: 0 }, {
          y: 0, scale: 1, opacity: 1, duration: 1.3, ease: "power3.out",
          scrollTrigger: { trigger: ".gx-product-statement", start: "top 85%", toggleActions: "play reverse play reverse" },
        });
        fadeUp(".products .section-title", 40);
        fadeUp(".products .search-container", 30);
        gsap.fromTo(".gx-about-intro .gx-eyebrow, .gx-about-intro h2, .gx-about-intro p, .gx-about-link", { x: desktop ? -55 : 0, y: desktop ? 0 : 35, opacity: 0 }, {
          x: 0, y: 0, opacity: 1, duration: 1.05, stagger: .11, ease: "power3.out",
          scrollTrigger: { trigger: ".gx-about-intro", start: "top 85%", toggleActions: "play reverse play reverse" },
        });
        gsap.fromTo(".gx-about-step", { x: desktop ? 55 : 0, y: desktop ? 0 : 35, opacity: 0 }, {
          x: 0, y: 0, opacity: 1, duration: 1.05, stagger: .13, ease: "power3.out",
          scrollTrigger: { trigger: ".gx-about-flow", start: "top 85%", toggleActions: "play reverse play reverse" },
        });
        fadeUp(".gx-footer-identity, .gx-footer-nav", 35, .1);
        fadeUp(".gx-footer-bottom", 24);
        gsap.fromTo(".gx-footer-wordmark", { y: 50, opacity: 0 }, {
          y: 0, opacity: 1, duration: 1.2, ease: "power3.out",
          scrollTrigger: { trigger: ".gx-footer-bottom", start: "top 95%", toggleActions: "play reverse play reverse" },
        });

        if (desktop) {
          const workspace = root.querySelector<HTMLElement>(".gx-workspace-scene")!;
          const sticky = root.querySelector<HTMLElement>(".gx-workspace-sticky")!;
          const stage = root.querySelector<HTMLElement>(".gx-scene-stage")!;
          const frame = root.querySelector<HTMLElement>(".gx-workspace-frame")!;
          const card = root.querySelector<HTMLElement>(".gx-story-one")!;
          const chapterScale = () => Math.min(.94, (stage.clientWidth - card.offsetWidth - 28) / frame.offsetWidth);
          const shift = () => (stage.clientWidth - frame.offsetWidth * chapterScale()) / 2;
          const scene = gsap.timeline({
            scrollTrigger: {
              trigger: workspace, start: "top 85%",
              end: () => workspace.getBoundingClientRect().top + window.scrollY + workspace.offsetHeight
                - sticky.offsetHeight - parseFloat(getComputedStyle(sticky).top) - 180,
              scrub: .7, invalidateOnRefresh: true,
            },
          });
          scene.fromTo(".gx-workspace-frame", { scale: .78, y: 110, x: 0 }, {
            scale: 1.04, y: 0, x: 0, duration: .8, ease: "power2.out",
          })
            .to(".gx-workspace-frame", { scale: chapterScale, x: shift, y: -32, duration: .8, ease: "power2.inOut" })
            .fromTo(".gx-story-one", { x: -48, opacity: 0 }, { x: 0, opacity: 1, duration: .4, ease: "power3.out" }, "<+.25")
            .fromTo(".gx-focus-model", { opacity: 0 }, { opacity: 1, duration: .35 }, "<")
            .to(".gx-story-one", { opacity: 1, duration: .55 })
            .to(".gx-story-one", { x: -42, opacity: 0, duration: .3, ease: "power2.in" })
            .to(".gx-focus-model", { opacity: 0, duration: .2 }, "<")
            .to(".gx-workspace-frame", { scale: chapterScale, x: () => -shift(), y: -32, duration: .8, ease: "power2.inOut" })
            .fromTo(".gx-story-two", { x: 48, opacity: 0 }, { x: 0, opacity: 1, duration: .4, ease: "power3.out" }, "<+.25")
            .fromTo(".gx-focus-composer", { opacity: 0 }, { opacity: 1, duration: .35 }, "<")
            .to(".gx-story-two", { opacity: 1, duration: .55 })
            .to(".gx-story-two", { x: 42, opacity: 0, duration: .3, ease: "power2.in" })
            .to(".gx-focus-composer", { opacity: 0, duration: .2 }, "<")
            .to(".gx-workspace-frame", { scale: 1.14, x: 0, y: -20, duration: .85, ease: "power2.inOut" });
        } else {
          gsap.fromTo(".gx-workspace-frame", { scale: .94, y: 35 }, {
            scale: 1, y: 0, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: ".gx-workspace-frame", start: "top 85%", toggleActions: "play reverse play reverse" },
          });
          fadeUp(".gx-story-one", 32);
          fadeUp(".gx-story-two", 32);
        }
      }, root);

      const grid = root.querySelector<HTMLElement>("#productsGrid");
      let cardsTween: gsap.core.Tween | null = null;
      const animateCards = () => {
        if (!grid) return;
        const cards = [...grid.querySelectorAll<HTMLElement>(".product-card")];
        if (!cards.length || cards.every(card => card.dataset.gxRevealed === "true")) return;
        cardsTween?.scrollTrigger?.kill();
        cardsTween?.revert();
        cards.forEach(card => { card.dataset.gxRevealed = "true"; });
        cardsTween = gsap.fromTo(cards, { y: 65, rotationX: desktop ? 7 : 0, scale: .97, opacity: 0 }, {
          y: 0, rotationX: 0, scale: 1, opacity: 1, duration: 1.05, stagger: .13, ease: "power3.out",
          scrollTrigger: { trigger: grid, start: "top 85%", toggleActions: "play reverse play reverse" },
        });
        ScrollTrigger.refresh();
      };
      const cardsObserver = grid ? new MutationObserver(animateCards) : null;
      if (grid && cardsObserver) cardsObserver.observe(grid, { childList: true });
      animateCards();

      const refresh = () => ScrollTrigger.refresh();
      const preview = root.querySelector<HTMLImageElement>(".gx-workspace-frame img");
      preview?.addEventListener("load", refresh);
      window.addEventListener("load", refresh);
      const resizeObserver = new ResizeObserver(refresh);
      const scene = root.querySelector(".gx-workspace-scene");
      if (scene) resizeObserver.observe(scene);
      const footer = root.querySelector(".gx-footer");
      if (footer) resizeObserver.observe(footer);
      root.classList.add("gx-scroll-ready");
      requestAnimationFrame(refresh);

      cleanupExperience = () => {
        root.classList.remove("gx-scroll-ready");
        cardsObserver?.disconnect();
        cardsTween?.scrollTrigger?.kill();
        cardsTween?.revert();
        grid?.querySelectorAll<HTMLElement>(".product-card").forEach(card => {
          delete card.dataset.gxRevealed;
        });
        resizeObserver.disconnect();
        preview?.removeEventListener("load", refresh);
        window.removeEventListener("load", refresh);
        context.revert();
        if (lenis) {
          lenis.off("scroll", ScrollTrigger.update);
          gsap.ticker.remove(ticker);
          lenis.destroy();
        }
      };
    };

    setup();
    reduced.addEventListener("change", setup);
    narrow.addEventListener("change", setup);
    return () => {
      reduced.removeEventListener("change", setup);
      narrow.removeEventListener("change", setup);
      cleanupExperience();
    };
  }, []);

  return null;
}

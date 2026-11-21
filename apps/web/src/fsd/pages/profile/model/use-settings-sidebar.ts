"use client";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type PointerEvent,
  type KeyboardEvent,
} from "react";

const store = (key: string, value: string) =>
  localStorage.setItem(`genyxo.settings.${key}`, value);
const clamp = (width: number) =>
  Math.round(Math.max(200, Math.min(360, innerWidth - 720, width)));
export function useSettingsSidebar(
  collapsed: boolean,
  setCollapsed: Dispatch<SetStateAction<boolean>>,
) {
  const [width, setWidth] = useState(232);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{
    x: number;
    start: number;
    width: number;
    collapsed: boolean;
  } | null>(null);
  const frame = useRef(0);
  useEffect(() => {
    const stored = Number(localStorage.getItem("genyxo.settings.sidebarWidth"));
    if (stored) queueMicrotask(() => setWidth(clamp(stored)));
    return () => cancelAnimationFrame(frame.current);
  }, []);
  const commit = (nextWidth: number, rail: boolean) => {
    setWidth(nextWidth);
    setCollapsed(rail);
    store("sidebarWidth", String(nextWidth));
    store("sidebarCollapsed", String(rail));
  };
  const finish = () => {
    const value = drag.current;
    if (!value) return;
    cancelAnimationFrame(frame.current);
    commit(value.width, value.collapsed);
    drag.current = null;
    setResizing(false);
  };
  return {
    width,
    resizing,
    resizeProps: {
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          x: event.clientX,
          start: collapsed ? 64 : width,
          width,
          collapsed,
        };
        setResizing(true);
      },
      onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
        const value = drag.current;
        if (!value) return;
        const raw = value.start + event.clientX - value.x;
        value.collapsed = raw < 150;
        if (!value.collapsed) value.width = clamp(raw);
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          setWidth(value.width);
          setCollapsed(value.collapsed);
        });
      },
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
      onDoubleClick: () => commit(232, false),
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        if (event.key === "Home" || (event.key === "ArrowLeft" && width <= 200))
          commit(width, true);
        else if (collapsed) commit(width, false);
        else
          commit(
            event.key === "End"
              ? clamp(360)
              : clamp(width + (event.key === "ArrowLeft" ? -16 : 16)),
            false,
          );
      },
    },
  };
}

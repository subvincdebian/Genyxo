"use client";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import styles from "./PetComposer.module.css";

const COLORS = ["#101614", "#ffffff", "#5ee0c4", "#4cc3ff", "#ff7a6b", "#f6d36b"];
const WIDTH = 960;
const HEIGHT = 600;

/** A drawing pad in glass; the drawing is attached to the pet message as a PNG. */
export function PetSketch({ accent, onClose, onAttach }: { accent: string; onClose: () => void; onAttach: (file: File) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const history = useRef<ImageData[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[2]);
  const [size, setSize] = useState(5);
  const [eraser, setEraser] = useState(false);
  const [steps, setSteps] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.fillStyle = "#16191a";
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }, []);
  const close = () => {
    setClosing(true);
    setTimeout(onClose, 180);
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        close();
      }
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  });

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * WIDTH, y: ((event.clientY - box.top) / box.height) * HEIGHT };
  };
  const draw = (to: { x: number; y: number }) => {
    const context = canvas.current?.getContext("2d");
    if (!context || !last.current) return;
    context.strokeStyle = eraser ? "#16191a" : color;
    context.lineWidth = eraser ? size * 4 : size;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(last.current.x, last.current.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    last.current = to;
  };
  const undo = () => {
    const context = canvas.current?.getContext("2d");
    const previous = history.current.pop();
    if (context && previous) context.putImageData(previous, 0, 0);
    setSteps(history.current.length);
  };
  const clear = () => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    history.current.push(context.getImageData(0, 0, WIDTH, HEIGHT));
    context.fillStyle = "#16191a";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    setSteps(history.current.length);
  };
  const attach = () =>
    canvas.current?.toBlob((blob) => {
      if (blob) onAttach(new File([blob], `sketch-${Date.now()}.png`, { type: "image/png" }));
    }, "image/png");

  return createPortal(
    <div className={styles.sketchScrim} data-pet-layer="" data-state={closing ? "closing" : "open"} onPointerDown={(event) => event.target === event.currentTarget && close()}>
      <div className={styles.sketch} role="dialog" aria-modal="true" aria-label="Draw a sketch" style={{ "--pet-accent": accent } as CSSProperties}>
        <header>
          <strong>Draw a sketch</strong>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={close}>
            <WorkspaceIcon name="close" size={16} />
          </button>
        </header>
        <div className={styles.sketchTools}>
          <div className={styles.swatches} role="radiogroup" aria-label="Colour">
            {COLORS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={!eraser && color === value}
                aria-label={value}
                style={{ background: value }}
                onClick={() => {
                  setColor(value);
                  setEraser(false);
                }}
              />
            ))}
          </div>
          <input type="range" min={2} max={24} value={size} aria-label="Brush size" onChange={(event) => setSize(Number(event.target.value))} />
          <button type="button" className={styles.toolButton} aria-pressed={eraser} onClick={() => setEraser((value) => !value)}>
            Eraser
          </button>
          <button type="button" className={styles.toolButton} disabled={!steps} onClick={undo}>
            Undo
          </button>
          <button type="button" className={styles.toolButton} onClick={clear}>
            Clear
          </button>
        </div>
        <canvas
          ref={canvas}
          width={WIDTH}
          height={HEIGHT}
          className={styles.canvas}
          onPointerDown={(event) => {
            const context = canvas.current?.getContext("2d");
            if (context) history.current.push(context.getImageData(0, 0, WIDTH, HEIGHT));
            if (history.current.length > 30) history.current.shift();
            setSteps(history.current.length);
            event.currentTarget.setPointerCapture(event.pointerId);
            last.current = point(event);
            draw({ ...last.current, x: last.current.x + 0.01 });
          }}
          onPointerMove={(event) => last.current && draw(point(event))}
          onPointerUp={() => (last.current = null)}
          onPointerCancel={() => (last.current = null)}
        />
        <footer>
          <button type="button" className={styles.toolButton} onClick={close}>
            Cancel
          </button>
          <button type="button" className={styles.primary} onClick={attach}>
            Attach drawing
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

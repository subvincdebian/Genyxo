"use client";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceTooltip } from "@/shared/ui/workspace";

const COLORS = ["#101614", "#ffffff", "#5ee0c4", "#4cc3ff", "#ff7a6b", "#f6d36b"];
const WIDTH = 960;
const HEIGHT = 560;

/** A small drawing surface whose result is attached to the message as a PNG. */
export function SketchDialog({ onClose, onAttach }: { onClose: () => void; onAttach: (file: File) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const history = useRef<ImageData[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [eraser, setEraser] = useState(false);
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }, []);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * WIDTH, y: ((event.clientY - box.top) / box.height) * HEIGHT };
  };
  const down = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    history.current = [...history.current.slice(-24), context.getImageData(0, 0, WIDTH, HEIGHT)];
    setSteps(history.current.length);
    last.current = point(event);
    context.beginPath();
    context.arc(last.current.x, last.current.y, (eraser ? size * 3 : size) / 2, 0, Math.PI * 2);
    context.fillStyle = eraser ? "#ffffff" : color;
    context.fill();
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const context = canvas.current?.getContext("2d");
    if (!context || !last.current) return;
    // Coalesced events keep fast strokes smooth instead of segmented.
    const events = event.nativeEvent.getCoalescedEvents?.() || [event.nativeEvent];
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = eraser ? "#ffffff" : color;
    context.lineWidth = eraser ? size * 3 : size * (0.7 + (event.pressure || 0.5) * 0.6);
    for (const item of events) {
      const box = event.currentTarget.getBoundingClientRect();
      const next = { x: ((item.clientX - box.left) / box.width) * WIDTH, y: ((item.clientY - box.top) / box.height) * HEIGHT };
      context.beginPath();
      context.moveTo(last.current.x, last.current.y);
      context.lineTo(next.x, next.y);
      context.stroke();
      last.current = next;
    }
  };
  const up = () => { last.current = null; };
  const undo = () => {
    const context = canvas.current?.getContext("2d");
    const previous = history.current.pop();
    if (context && previous) context.putImageData(previous, 0, 0);
    setSteps(history.current.length);
  };
  const clear = () => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    history.current = [...history.current.slice(-24), context.getImageData(0, 0, WIDTH, HEIGHT)];
    setSteps(history.current.length);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, WIDTH, HEIGHT);
  };
  const attach = () => canvas.current?.toBlob((blob) => { if (blob) onAttach(new File([blob], `sketch-${Date.now()}.png`, { type: "image/png" })); }, "image/png");

  return <WorkspaceDialog title="Draw a sketch" onClose={onClose} wide className="gx-sketch-dialog">
    <div className="gx-sketch-tools">
      <div className="gx-sketch-colors" role="radiogroup" aria-label="Pen color">
        {COLORS.map((value) => <button key={value} type="button" role="radio" aria-checked={!eraser && color === value} aria-label={`Color ${value}`} style={{ background: value }} onClick={() => { setColor(value); setEraser(false); }} />)}
      </div>
      <label className="gx-sketch-size">Size<input type="range" min={1} max={24} value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
      <WorkspaceTooltip label="Eraser" side="bottom"><button type="button" className={`ws-icon-btn${eraser ? " is-active" : ""}`} aria-pressed={eraser} aria-label="Eraser" onClick={() => setEraser(!eraser)}><WorkspaceIcon name="edit" size={17} /></button></WorkspaceTooltip>
      <WorkspaceTooltip label="Undo" side="bottom"><button type="button" className="ws-icon-btn" aria-label="Undo" disabled={!steps} onClick={undo}><WorkspaceIcon name="arrow-left" size={17} /></button></WorkspaceTooltip>
      <WorkspaceTooltip label="Clear" side="bottom"><button type="button" className="ws-icon-btn" aria-label="Clear" onClick={clear}><WorkspaceIcon name="trash" size={17} /></button></WorkspaceTooltip>
    </div>
    <canvas ref={canvas} className="gx-sketch-canvas" width={WIDTH} height={HEIGHT} aria-label="Drawing surface" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
    <div className="ws-form-actions"><button type="button" className="ws-btn" onClick={onClose}>Cancel</button><button type="button" className="ws-btn ws-btn-primary" onClick={attach}>Attach sketch</button></div>
  </WorkspaceDialog>;
}

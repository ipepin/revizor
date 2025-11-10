// src/components/LpsSketchCanvas.tsx
import React from "react";
import { useRevisionForm } from "../context/RevisionFormContext";

type Point = { x: number; y: number };
type StrokeStyle = "solid" | "dashed" | "rect" | "rect_square";
type Stroke = { color: string; width: number; style: StrokeStyle; points: Point[] };
type IconKind = "earth" | "air" | "antenna" | "text";
type IconItem = { type: IconKind; x: number; y: number; label?: string; rotation?: number; text?: string };
type Tool =
  | "solid"
  | "dashed"
  | "rect"
  | "rect_square"
  | "icon_earth"
  | "icon_air"
  | "icon_antenna"
  | "text"
  | "select";

const EARTH_RADIUS = 18;
const ICON_HITBOX = 24;
const GRID = 20;
const PX_PER_METER = 50;

export default function LpsSketchCanvas() {
  const { form, setForm } = useRevisionForm();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const [color, setColor] = React.useState("#0f172a");
  const [lineWidth, setLineWidth] = React.useState(2);
  const [grid, setGrid] = React.useState(true);
  const [tool, setTool] = React.useState<Tool>("select");
  const [earthCounter, setEarthCounter] = React.useState(1);
  const [earthRotationPreset, setEarthRotationPreset] = React.useState(0);
  const [selectedIcons, setSelectedIcons] = React.useState<number[]>([]);
  const [selectedStrokes, setSelectedStrokes] = React.useState<number[]>([]);
  const [cursor, setCursor] = React.useState("crosshair");
  const [pointerPx, setPointerPx] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isCanvasFocused, setIsCanvasFocused] = React.useState(false);
  const [ghostIcon, setGhostIcon] = React.useState<IconItem | null>(null);
  const [toast, setToast] = React.useState<{ id: number; text: string } | null>(null);

  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const earthMeasurementRows = React.useMemo(() => {
    const lpsData = ((form as any)?.lps) || {};
    if (Array.isArray(lpsData.earthResistance)) return [...lpsData.earthResistance];
    if (Array.isArray(lpsData.downConductorsMeasurements)) return [...lpsData.downConductorsMeasurements];
    if (Array.isArray(lpsData.continuity)) return [...lpsData.continuity];
    return [];
  }, [form]);

  const earthMeasurementLabels = React.useMemo(() => {
    return earthMeasurementRows.map((row, index) => {
      let candidate: string | undefined;
      if (row && typeof row === "object") {
        const raw =
          row.label ??
          row.conductor ??
          row.path ??
          row.name ??
          row.title ??
          row.location ??
          (typeof row.text === "string" ? row.text : undefined);
        if (typeof raw === "string") candidate = raw.trim();
      } else if (typeof row === "string") {
        candidate = row.trim();
      }
      if (candidate && candidate.length) return candidate;
      return `Zemnič ${index + 1}`;
    });
  }, [earthMeasurementRows]);

  const earthLabelsKey = React.useMemo(() => earthMeasurementLabels.join("||"), [earthMeasurementLabels]);
  const earthMeasurementLimit = earthMeasurementLabels.length;

  const selectedIconsRef = React.useRef<number[]>([]);
  const selectedStrokesRef = React.useRef<number[]>([]);
  const redrawAllRef = React.useRef<() => void>(() => {});
  const saveToFormRef = React.useRef<() => void>(() => {});

  const strokesRef = React.useRef<Stroke[]>([]);
  const iconsRef = React.useRef<IconItem[]>([]);
  const drawingRef = React.useRef<{ down: boolean; stroke?: Stroke; start?: Point }>({ down: false });
  const dragSelectionRef = React.useRef<{
    indices: number[];
    startPx: { x: number; y: number };
    originals: Record<number, Point>;
  } | null>(null);
  const selectionRectRef = React.useRef<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);

  const countEarthIcons = React.useCallback(() => iconsRef.current.filter((icon) => icon.type === "earth").length, []);

  const showToast = React.useCallback(
    (text: string) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      const id = Date.now();
      setToast({ id, text });
      toastTimerRef.current = setTimeout(() => {
        setToast((current) => (current && current.id === id ? null : current));
      }, 4000);
    },
    [setToast]
  );

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    const savedStrokes = (form as any)?.lps?.sketchJson;
    const savedIcons = (form as any)?.lps?.sketchIcons;
    if (Array.isArray(savedStrokes)) strokesRef.current = savedStrokes as Stroke[];
    if (Array.isArray(savedIcons)) iconsRef.current = savedIcons as IconItem[];
    const nextIdx = (iconsRef.current.filter((i) => i.type === "earth").length || 0) + 1;
    setEarthCounter(nextIdx);
    redrawAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resizeCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = containerRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = Math.max(320, Math.floor(rect.width));
    const cssH = Math.max(280, Math.floor(rect.height));
    canvas.width = Math.floor(cssW * ratio);
    canvas.height = Math.floor(cssH * ratio);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    redrawAll();
  }, []);

  React.useEffect(() => {
    resizeCanvas();
    const handler = () => resizeCanvas();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [resizeCanvas]);

  React.useEffect(() => {
    setCursor(tool === "select" ? "grab" : "crosshair");
  }, [tool]);

  React.useEffect(() => {
    selectedIconsRef.current = selectedIcons;
  }, [selectedIcons]);

  React.useEffect(() => {
    selectedStrokesRef.current = selectedStrokes;
  }, [selectedStrokes]);

  React.useEffect(() => {
    if (!earthMeasurementLabels.length) return;
    const icons = iconsRef.current;
    let changed = false;
    let order = 0;
    const nextIcons = icons.map((icon) => {
      if (icon.type !== "earth") return icon;
      const desired = earthMeasurementLabels[order];
      order += 1;
      if (!desired || icon.label === desired) return icon;
      changed = true;
      return { ...icon, label: desired };
    });
    if (changed) {
      iconsRef.current = nextIcons;
      redrawAll();
      saveToForm();
    }
  }, [earthLabelsKey]);

  React.useEffect(() => {
    setGhostIcon((prev) => {
      if (!prev || prev.type !== "earth" || tool !== "icon_earth") return prev;
      return { ...prev, label: String(earthCounter), rotation: earthRotationPreset };
    });
  }, [earthCounter, earthRotationPreset, tool]);

  React.useEffect(() => {
    if (!(tool === "text" || tool.startsWith("icon_"))) {
      setGhostIcon(null);
    }
  }, [tool]);

  const getCtx = () => canvasRef.current?.getContext("2d");
  const getRatio = () => Math.max(window.devicePixelRatio || 1, 1);
  const toPx = (point: Point) => {
    const c = canvasRef.current!;
    return { x: point.x * c.width, y: point.y * c.height };
  };
  const toNorm = (px: number, py: number): Point => {
    const c = canvasRef.current!;
    return { x: Math.max(0, Math.min(1, px / c.width)), y: Math.max(0, Math.min(1, py / c.height)) };
  };
  const gridPx = () => GRID * getRatio();
  const snapToGridPx = (x: number, y: number) => {
    const g = gridPx();
    return { x: Math.round(x / g) * g, y: Math.round(y / g) * g };
  };
  const snapAnglePx = (sx: number, sy: number, cx: number, cy: number) => {
    const dx = cx - sx;
    const dy = cy - sy;
    const ang = Math.atan2(dy, dx);
    const step = Math.PI / 4;
    const snappedAng = Math.round(ang / step) * step;
    const len = Math.hypot(dx, dy);
    const g = gridPx();
    const lenSnap = Math.max(g, Math.round(len / g) * g);
    const ex = sx + Math.cos(snappedAng) * lenSnap;
    const ey = sy + Math.sin(snappedAng) * lenSnap;
    return snapToGridPx(ex, ey);
  };

  const clearCanvas = () => {
    const ctx = getCtx();
    const c = canvasRef.current;
    if (!ctx || !c) return;
    ctx.clearRect(0, 0, c.width, c.height);
  };

  const drawStrokes = () => {
    const ctx = getCtx();
    const c = canvasRef.current;
    if (!ctx || !c) return;
    const ratio = getRatio();
    strokesRef.current.forEach((stroke, index) => {
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * ratio;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash(stroke.style === "dashed" ? [6 * ratio, 6 * ratio] : []);
      ctx.beginPath();
      let drewRect = false;
      if (stroke.style.startsWith("rect")) {
        const p0 = toPx(stroke.points[0]);
        const p1 = toPx(stroke.points[1] || stroke.points[0]);
        let x0 = p0.x;
        let y0 = p0.y;
        let x1 = p1.x;
        let y1 = p1.y;
        if (stroke.style === "rect_square") {
          const w = Math.abs(x1 - x0);
          const h = Math.abs(y1 - y0);
          const size = Math.max(w, h);
          x1 = x0 + Math.sign(x1 - x0) * size;
          y1 = y0 + Math.sign(y1 - y0) * size;
        }
        const tl = snapToGridPx(Math.min(x0, x1), Math.min(y0, y1));
        const br = snapToGridPx(Math.max(x0, x1), Math.max(y0, y1));
        ctx.rect(tl.x, tl.y, Math.max(1, br.x - tl.x), Math.max(1, br.y - tl.y));
        drewRect = true;
      }
      if (!drewRect) {
        const start = toPx(stroke.points[0]);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < stroke.points.length; i++) {
          const p = toPx(stroke.points[i]);
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
      if (selectedStrokesRef.current.includes(index)) {
        ctx.setLineDash([6 * ratio, 4 * ratio]);
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = Math.max(ctx.lineWidth, 2 * ratio);
        ctx.stroke();
      }
      ctx.restore();
    });
  };

  const paintIcon = (
    ctx: CanvasRenderingContext2D,
    icon: IconItem,
    ratio: number,
    options?: { ghost?: boolean }
  ) => {
    const pos = toPx({ x: icon.x, y: icon.y });
    ctx.save();
    ctx.translate(pos.x, pos.y);
    if (options?.ghost) {
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([4 * ratio, 4 * ratio]);
    }
    if (icon.type === "earth") {
      const radius = EARTH_RADIUS * ratio;
      const rawDeg = icon.rotation ?? earthRotationPreset;
      const rotationRadians = (rawDeg * Math.PI) / 180;
      const rotationDeg = ((rawDeg % 360) + 360) % 360;
      ctx.rotate(rotationRadians);
      ctx.strokeStyle = options?.ghost ? "#16a34a90" : "#16a34a";
      ctx.lineWidth = 2 * ratio;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.85);
      ctx.lineTo(0, -radius * 0.1);
      ctx.stroke();
      const y1 = radius * 0.05;
      const y2 = radius * 0.35;
      const y3 = radius * 0.62;
      const w1 = radius * 1.4;
      const w2 = radius * 1.0;
      const w3 = radius * 0.6;
      ctx.beginPath();
      ctx.moveTo(-w1 / 2, y1);
      ctx.lineTo(w1 / 2, y1);
      ctx.moveTo(-w2 / 2, y2);
      ctx.lineTo(w2 / 2, y2);
      ctx.moveTo(-w3 / 2, y3);
      ctx.lineTo(w3 / 2, y3);
      ctx.stroke();
      if (icon.label) {
        ctx.save();
        ctx.rotate(-rotationRadians);
        ctx.font = `${16 * ratio}px ui-sans-serif, system-ui, Segoe UI`;
        ctx.fillStyle = options?.ghost ? "rgba(15,23,42,0.7)" : "#0f172a";
        ctx.textAlign = "center";
        const flipped = rotationDeg > 90 && rotationDeg < 270;
        if (flipped) {
          ctx.textBaseline = "bottom";
          ctx.fillText(icon.label, 0, -radius - 12 * ratio);
        } else {
          ctx.textBaseline = "top";
          ctx.fillText(icon.label, 0, radius + 12 * ratio);
        }
        ctx.restore();
      }
    } else if (icon.type === "air") {
      const s = 16 * ratio;
      ctx.strokeStyle = options?.ghost ? "#0f172a88" : "#0f172a";
      ctx.lineWidth = 1.5 * ratio;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, s);
      ctx.lineTo(-s, s);
      ctx.closePath();
      ctx.stroke();
      const labelText = typeof icon.label === "string" ? icon.label.trim() : "";
      if (labelText) {
        ctx.font = `${(options?.ghost ? 14 : 18) * ratio}px ui-sans-serif, system-ui, Segoe UI`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = options?.ghost ? "rgba(15,23,42,0.65)" : "#0f172a";
        ctx.fillText(labelText, 0, s + 6 * ratio);
      }
    } else if (icon.type === "antenna") {
      const h = 22 * ratio;
      const w = 12 * ratio;
      ctx.strokeStyle = options?.ghost ? "#0f172a88" : "#0f172a";
      ctx.lineWidth = 1.5 * ratio;
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.lineTo(0, h);
      ctx.moveTo(-w, -h + 5 * ratio);
      ctx.lineTo(w, -h + 5 * ratio);
      ctx.stroke();
    } else if (icon.type === "text") {
      const txt = (icon.text || "").trim();
      if (txt) {
        ctx.font = `${12 * ratio}px ui-sans-serif, system-ui, Segoe UI`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.lineWidth = 4 * ratio;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.strokeText(txt, 0, 0);
        ctx.fillStyle = options?.ghost ? "rgba(15,23,42,0.6)" : "#0f172a";
        ctx.fillText(txt, 0, 0);
      }
    }
    ctx.restore();
    return pos;
  };

  const drawIcons = () => {
    const ctx = getCtx();
    const c = canvasRef.current;
    if (!ctx || !c) return;
    const ratio = getRatio();
    iconsRef.current.forEach((icon, index) => {
      const pos = paintIcon(ctx, icon, ratio);
      if (selectedIconsRef.current.includes(index)) {
        ctx.save();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 1 * ratio;
        ctx.setLineDash([4 * ratio, 4 * ratio]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ICON_HITBOX * ratio, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });
    if (ghostIcon) {
      paintIcon(ctx, ghostIcon, ratio, { ghost: true });
    }
  };

  const drawSelectionBox = () => {
    const ctx = getCtx();
    const c = canvasRef.current;
    const rect = selectionRectRef.current;
    if (!ctx || !c || !rect) return;
    const ratio = getRatio();
    const x = Math.min(rect.start.x, rect.current.x);
    const y = Math.min(rect.start.y, rect.current.y);
    const w = Math.abs(rect.start.x - rect.current.x);
    const h = Math.abs(rect.start.y - rect.current.y);
    ctx.save();
    ctx.strokeStyle = "rgba(59,130,246,0.9)";
    ctx.fillStyle = "rgba(59,130,246,0.12)";
    ctx.lineWidth = Math.max(1, 1 * ratio);
    ctx.setLineDash([6 * ratio, 4 * ratio]);
    ctx.strokeRect(x, y, w, h);
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };

  const redrawAll = () => {
    clearCanvas();
    drawStrokes();
    drawIcons();
    drawSelectionBox();
  };

  const saveToForm = () => {
    setForm((prev: any) => ({
      ...prev,
      lps: {
        ...(((prev || {}) as any).lps || {}),
        sketchJson: strokesRef.current,
        sketchIcons: iconsRef.current,
        sketchPng: canvasRef.current?.toDataURL("image/png") || "",
      },
    }));
  };

  React.useEffect(() => {
    redrawAllRef.current = redrawAll;
    saveToFormRef.current = saveToForm;
  }, [redrawAll, saveToForm]);

  const pointerToCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const hitTestIcon = (px: number, py: number) => {
    const ratio = getRatio();
    for (let i = iconsRef.current.length - 1; i >= 0; i -= 1) {
      const icon = iconsRef.current[i];
      const pos = toPx({ x: icon.x, y: icon.y });
      const size = icon.type === "earth" ? EARTH_RADIUS * ratio + 8 : ICON_HITBOX * ratio;
      if (Math.abs(px - pos.x) <= size && Math.abs(py - pos.y) <= size) return i;
    }
    return null;
  };

  const pointLineDistance = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  };

  const hitTestStroke = (px: number, py: number) => {
    const ratio = getRatio();
    for (let i = strokesRef.current.length - 1; i >= 0; i -= 1) {
      const stroke = strokesRef.current[i];
      if (stroke.style.startsWith("rect")) {
        const p0 = toPx(stroke.points[0]);
        const p1 = toPx(stroke.points[1] || stroke.points[0]);
        let x0 = p0.x;
        let y0 = p0.y;
        let x1 = p1.x;
        let y1 = p1.y;
        if (stroke.style === "rect_square") {
          const w = Math.abs(x1 - x0);
          const h = Math.abs(y1 - y0);
          const size = Math.max(w, h);
          x1 = x0 + Math.sign(x1 - x0 || 1) * size;
          y1 = y0 + Math.sign(y1 - y0 || 1) * size;
        }
        const xMin = Math.min(x0, x1) - 8 * ratio;
        const xMax = Math.max(x0, x1) + 8 * ratio;
        const yMin = Math.min(y0, y1) - 8 * ratio;
        const yMax = Math.max(y0, y1) + 8 * ratio;
        if (px >= xMin && px <= xMax && py >= yMin && py <= yMax) return i;
        continue;
      }
      const start = toPx(stroke.points[0]);
      const end = toPx(stroke.points[1] || stroke.points[0]);
      const dist = pointLineDistance(px, py, start.x, start.y, end.x, end.y);
      const threshold = Math.max(10, stroke.width * ratio * 1.5);
      if (dist <= threshold) return i;
    }
    return null;
  };

  const getStrokeBoundsPx = (stroke: Stroke) => {
    const ratio = getRatio();
    if (stroke.style.startsWith("rect")) {
      const p0 = toPx(stroke.points[0]);
      const p1 = toPx(stroke.points[1] || stroke.points[0]);
      let x0 = p0.x;
      let y0 = p0.y;
      let x1 = p1.x;
      let y1 = p1.y;
      if (stroke.style === "rect_square") {
        const w = Math.abs(x1 - x0);
        const h = Math.abs(y1 - y0);
        const size = Math.max(w, h);
        x1 = x0 + Math.sign(x1 - x0 || 1) * size;
        y1 = y0 + Math.sign(y1 - y0 || 1) * size;
      }
      const pad = 6 * ratio;
      return {
        x1: Math.min(x0, x1) - pad,
        x2: Math.max(x0, x1) + pad,
        y1: Math.min(y0, y1) - pad,
        y2: Math.max(y0, y1) + pad,
      };
    }
    const pts = stroke.points.map((pt) => toPx(pt));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = Math.max(6 * ratio, stroke.width * ratio * 1.5);
    return {
      x1: Math.min(...xs) - pad,
      x2: Math.max(...xs) + pad,
      y1: Math.min(...ys) - pad,
      y2: Math.max(...ys) + pad,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const posPx = pointerToCanvas(e);
    const snapped = snapToGridPx(posPx.x, posPx.y);
    setPointerPx(snapped);
    const norm = toNorm(snapped.x, snapped.y);
    canvas.setPointerCapture(e.pointerId);
    canvas.focus();
    setIsCanvasFocused(true);

    if (tool === "select") {
      const multiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      const hit = hitTestIcon(posPx.x, posPx.y);
      if (hit !== null) {
        const currentSelection = selectedIconsRef.current;
        if (multiSelect) {
          const exists = currentSelection.includes(hit);
          const nextSelection = exists ? currentSelection.filter((idx) => idx !== hit) : [...currentSelection, hit];
          selectedIconsRef.current = nextSelection;
          setSelectedIcons(nextSelection);
          if (!nextSelection.length && !selectedStrokesRef.current.length) setCursor("crosshair");
          return;
        }
        const nextSelection = currentSelection.includes(hit) ? currentSelection : [hit];
        if (!currentSelection.includes(hit)) {
          setSelectedIcons(nextSelection);
          selectedIconsRef.current = nextSelection;
          setSelectedStrokes([]);
          selectedStrokesRef.current = [];
        }
        const originals: Record<number, Point> = {};
        nextSelection.forEach((idx) => {
          const icon = iconsRef.current[idx];
          if (icon) originals[idx] = { x: icon.x, y: icon.y };
        });
        dragSelectionRef.current = { indices: [...nextSelection], startPx: posPx, originals };
        selectionRectRef.current = null;
        setCursor("grabbing");
      } else {
        const strokeHit = hitTestStroke(posPx.x, posPx.y);
        if (strokeHit !== null) {
          if (multiSelect) {
            const currentStrokes = selectedStrokesRef.current;
            const exists = currentStrokes.includes(strokeHit);
            const nextStrokes = exists ? currentStrokes.filter((idx) => idx !== strokeHit) : [...currentStrokes, strokeHit];
            selectedStrokesRef.current = nextStrokes;
            setSelectedStrokes(nextStrokes);
            if (!nextStrokes.length && !selectedIconsRef.current.length) setCursor("crosshair");
            return;
          }
          setSelectedIcons([]);
          selectedIconsRef.current = [];
          setSelectedStrokes([strokeHit]);
          selectedStrokesRef.current = [strokeHit];
          dragSelectionRef.current = null;
          selectionRectRef.current = null;
          setCursor("crosshair");
        } else {
          dragSelectionRef.current = null;
          selectionRectRef.current = { start: posPx, current: posPx };
          if (selectedIconsRef.current.length) {
            selectedIconsRef.current = [];
            setSelectedIcons([]);
          }
          if (selectedStrokesRef.current.length) {
            selectedStrokesRef.current = [];
            setSelectedStrokes([]);
          }
          setCursor("crosshair");
        }
      }
      return;
    }

    if (tool === "text") {
      const value = window.prompt("Zadejte text", "Text");
      if (value && value.trim()) {
        const icon: IconItem = { type: "text", x: norm.x, y: norm.y, text: value.trim() };
        iconsRef.current = [...iconsRef.current, icon];
        const index = iconsRef.current.length - 1;
        setSelectedIcons([index]);
        selectedIconsRef.current = [index];
        setSelectedStrokes([]);
        selectedStrokesRef.current = [];
        redrawAll();
        saveToForm();
      }
      return;
    }

    if (tool.startsWith("icon_")) {
      const kind: IconKind = tool === "icon_earth" ? "earth" : tool === "icon_air" ? "air" : "antenna";
      if (kind === "earth") {
        const existingEarth = countEarthIcons();
        if (!earthMeasurementLimit) {
          showToast("Pro zemniče zatím nemáte žádné záznamy v tabulce měření. Nejprve je doplňte.");
          setGhostIcon(null);
          return;
        }
        if (existingEarth >= earthMeasurementLimit) {
          showToast("Pro tento zemnič nemáte měření. Přidejte ho do tabulky a zkuste to znovu.");
          setGhostIcon(null);
          return;
        }
      }
      const icon: IconItem = { type: kind, x: norm.x, y: norm.y };
      if (kind === "earth") {
        const existingEarth = countEarthIcons();
        icon.label = earthMeasurementLabels[existingEarth] || `Zemnič ${existingEarth + 1}`;
        icon.rotation = earthRotationPreset;
        setEarthCounter((v) => v + 1);
      }
      iconsRef.current = [...iconsRef.current, icon];
      const index = iconsRef.current.length - 1;
      setSelectedIcons([index]);
      selectedIconsRef.current = [index];
      setSelectedStrokes([]);
      selectedStrokesRef.current = [];
      setGhostIcon(null);
      redrawAll();
      saveToForm();
      return;
    }

    const style: StrokeStyle =
      tool === "solid" ? "solid" : tool === "dashed" ? "dashed" : tool === "rect" ? "rect" : "rect_square";
    const stroke: Stroke = { color, width: lineWidth, style, points: [norm, norm] };
    drawingRef.current = { down: true, stroke, start: norm };
    strokesRef.current = [...strokesRef.current, stroke];
    const strokeIndex = strokesRef.current.length - 1;
    setSelectedStrokes([strokeIndex]);
    selectedStrokesRef.current = [strokeIndex];
    setSelectedIcons([]);
    selectedIconsRef.current = [];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const posPx = pointerToCanvas(e);
    const snapped = snapToGridPx(posPx.x, posPx.y);
    setPointerPx(snapped);
    if (tool === "text" || tool.startsWith("icon_")) {
      const normPreview = toNorm(snapped.x, snapped.y);
      if (tool === "text") {
        setGhostIcon({ type: "text", x: normPreview.x, y: normPreview.y, text: "Text" });
      } else {
        const kind: IconKind = tool === "icon_earth" ? "earth" : tool === "icon_air" ? "air" : "antenna";
        if (kind === "earth") {
          const existingEarth = countEarthIcons();
          if (!earthMeasurementLimit || existingEarth >= earthMeasurementLimit) {
            setGhostIcon(null);
          } else {
            const preview: IconItem = {
              type: kind,
              x: normPreview.x,
              y: normPreview.y,
              label: earthMeasurementLabels[existingEarth] || `Zemnič ${existingEarth + 1}`,
              rotation: earthRotationPreset,
            };
            setGhostIcon(preview);
          }
        } else {
          const preview: IconItem = { type: kind, x: normPreview.x, y: normPreview.y };
          setGhostIcon(preview);
        }
      }
    } else if (!drawingRef.current.down && !dragSelectionRef.current && !selectionRectRef.current) {
      setGhostIcon(null);
    }
    if (dragSelectionRef.current) {
      const canvas = canvasRef.current!;
      const delta = {
        x: (posPx.x - dragSelectionRef.current.startPx.x) / canvas.width,
        y: (posPx.y - dragSelectionRef.current.startPx.y) / canvas.height,
      };
      const next = [...iconsRef.current];
      dragSelectionRef.current.indices.forEach((idx) => {
        const base = dragSelectionRef.current?.originals[idx];
        const currentIcon = next[idx];
        if (!base || !currentIcon) return;
        next[idx] = {
          ...currentIcon,
          x: Math.max(0, Math.min(1, base.x + delta.x)),
          y: Math.max(0, Math.min(1, base.y + delta.y)),
        };
      });
      iconsRef.current = next;
      redrawAll();
      return;
    }
    if (selectionRectRef.current) {
      const currentRect = selectionRectRef.current;
      selectionRectRef.current = { start: currentRect.start, current: posPx };
      redrawAll();
      return;
    }
    if (drawingRef.current.down && drawingRef.current.stroke && drawingRef.current.start) {
      const start = drawingRef.current.start;
      const startPx = toPx(start);
      const endPx = drawingRef.current.stroke.style.startsWith("rect")
        ? snapToGridPx(snapped.x, snapped.y)
        : snapAnglePx(startPx.x, startPx.y, snapped.x, snapped.y);
      const end = toNorm(endPx.x, endPx.y);
      drawingRef.current.stroke.points = [start, end];
      redrawAll();
    }
  };

  const finalizeSelectionBox = () => {
    if (!selectionRectRef.current) return;
    const rect = selectionRectRef.current;
    selectionRectRef.current = null;
    type Rect = { x1: number; x2: number; y1: number; y2: number };
    const bounds: Rect = {
      x1: Math.min(rect.start.x, rect.current.x),
      x2: Math.max(rect.start.x, rect.current.x),
      y1: Math.min(rect.start.y, rect.current.y),
      y2: Math.max(rect.start.y, rect.current.y),
    };
    const overlap = (a: Rect, b: Rect) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
    const ratio = getRatio();
    const selectedIconsList = iconsRef.current
      .map((icon, idx) => {
        if (!icon) return null;
        const pos = toPx({ x: icon.x, y: icon.y });
        const size = icon.type === "earth" ? EARTH_RADIUS * ratio + 8 : ICON_HITBOX * ratio;
        const iconBounds = {
          x1: pos.x - size,
          x2: pos.x + size,
          y1: pos.y - size,
          y2: pos.y + size,
        };
        return overlap(iconBounds, bounds) ? idx : null;
      })
      .filter((idx): idx is number => idx !== null);
    const selectedStrokeList = strokesRef.current
      .map((stroke, idx) => {
        const sb = getStrokeBoundsPx(stroke);
        return overlap(sb, bounds) ? idx : null;
      })
      .filter((idx): idx is number => idx !== null);
    selectedIconsRef.current = selectedIconsList;
    selectedStrokesRef.current = selectedStrokeList;
    setSelectedIcons(selectedIconsList);
    setSelectedStrokes(selectedStrokeList);
    setCursor(selectedIconsList.length || selectedStrokeList.length ? "grab" : "crosshair");
    redrawAll();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (dragSelectionRef.current) {
      dragSelectionRef.current = null;
      if (tool === "select") setCursor("grab");
      redrawAll();
      saveToForm();
      return;
    }
    if (selectionRectRef.current) {
      finalizeSelectionBox();
      return;
    }
    if (drawingRef.current.down) {
      drawingRef.current = { down: false };
      redrawAll();
      saveToForm();
    }
  };

  const handlePointerLeaveCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerUp(e);
    setGhostIcon(null);
  };

  React.useEffect(() => {
    if (!isCanvasFocused) return;
    const handleKey = (event: KeyboardEvent) => {
      const selection = selectedIconsRef.current;
      const strokeSelection = selectedStrokesRef.current;
      if (event.key === "Escape") {
        event.preventDefault();
        selectionRectRef.current = null;
        dragSelectionRef.current = null;
        setTool("select");
        setCursor(selection.length || strokeSelection.length ? "grab" : "crosshair");
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && (selection.length || strokeSelection.length)) {
        event.preventDefault();
        if (selection.length) {
          const toRemove = new Set(selection);
          iconsRef.current = iconsRef.current.filter((_, idx) => !toRemove.has(idx));
        }
        if (strokeSelection.length) {
          const toRemoveStrokes = new Set(strokeSelection);
          strokesRef.current = strokesRef.current.filter((_, idx) => !toRemoveStrokes.has(idx));
        }
        selectedIconsRef.current = [];
        selectedStrokesRef.current = [];
        setSelectedIcons([]);
        setSelectedStrokes([]);
        redrawAllRef.current();
        saveToFormRef.current();
        return;
      }
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        const delta = event.shiftKey ? 0.02 : 0.01;
        const dx = event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0;
        const dy = event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0;
        if (selection.length) {
          event.preventDefault();
          const next = [...iconsRef.current];
          selection.forEach((idx) => {
            const icon = next[idx];
            if (!icon) return;
            next[idx] = {
              ...icon,
              x: Math.max(0, Math.min(1, icon.x + dx)),
              y: Math.max(0, Math.min(1, icon.y + dy)),
            };
          });
          iconsRef.current = next;
          redrawAllRef.current();
          saveToFormRef.current();
          return;
        }
        if (strokeSelection.length) {
          event.preventDefault();
          const nextStrokes = [...strokesRef.current];
          strokeSelection.forEach((idx) => {
            const stroke = nextStrokes[idx];
            if (!stroke) return;
            const movedPoints = stroke.points.map((pt) => ({
              x: Math.max(0, Math.min(1, pt.x + dx)),
              y: Math.max(0, Math.min(1, pt.y + dy)),
            }));
            nextStrokes[idx] = { ...stroke, points: movedPoints };
          });
          strokesRef.current = nextStrokes;
          redrawAllRef.current();
          saveToFormRef.current();
          return;
        }
      }
      if ((event.key === "r" || event.key === "R") && selection.length) {
        let rotated = false;
        const next = [...iconsRef.current];
        selection.forEach((idx) => {
          const icon = next[idx];
          if (icon && icon.type === "earth") {
            next[idx] = { ...icon, rotation: (((icon.rotation ?? 0) + 90) % 360 + 360) % 360 };
            rotated = true;
          }
        });
        if (rotated) {
          event.preventDefault();
          iconsRef.current = next;
          redrawAllRef.current();
          saveToFormRef.current();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isCanvasFocused, setSelectedIcons, setSelectedStrokes, setTool]);

  const rotateSelectedIcons = () => {
    if (!selectedIconsRef.current.length) return;
    const next = [...iconsRef.current];
    let touched = false;
    selectedIconsRef.current.forEach((index) => {
      const icon = next[index];
      if (icon && icon.type === "earth") {
        next[index] = {
          ...icon,
          rotation: (((icon.rotation ?? 0) + 90) % 360 + 360) % 360,
        };
        touched = true;
      }
    });
    if (!touched) return;
    iconsRef.current = next;
    redrawAll();
    saveToForm();
  };

  const editSelectedText = () => {
    if (selectedIconsRef.current.length !== 1) return;
    const index = selectedIconsRef.current[0];
    const icon = iconsRef.current[index];
    if (!icon || icon.type !== "text") return;
    const value = window.prompt("Upravit text", icon.text || "");
    if (value == null) return;
    const next = [...iconsRef.current];
    next[index] = { ...icon, text: value.trim() };
    iconsRef.current = next;
    redrawAll();
    saveToForm();
  };

  const deleteSelectedItems = () => {
    const iconSet = new Set(selectedIconsRef.current);
    const strokeSet = new Set(selectedStrokesRef.current);
    if (!iconSet.size && !strokeSet.size) return;
    if (iconSet.size) {
      iconsRef.current = iconsRef.current.filter((_, idx) => !iconSet.has(idx));
    }
    if (strokeSet.size) {
      strokesRef.current = strokesRef.current.filter((_, idx) => !strokeSet.has(idx));
    }
    selectedIconsRef.current = [];
    selectedStrokesRef.current = [];
    setSelectedIcons([]);
    setSelectedStrokes([]);
    redrawAll();
    saveToForm();
  };

  const undo = () => {
    if (iconsRef.current.length > 0) {
      iconsRef.current = iconsRef.current.slice(0, -1);
      const filtered = selectedIconsRef.current.filter((idx) => idx < iconsRef.current.length);
      if (filtered.length !== selectedIconsRef.current.length) {
        selectedIconsRef.current = filtered;
        setSelectedIcons(filtered);
      }
      redrawAll();
      saveToForm();
      return;
    }
    if (strokesRef.current.length > 0) {
      strokesRef.current = strokesRef.current.slice(0, -1);
      const filteredStrokes = selectedStrokesRef.current.filter((idx) => idx < strokesRef.current.length);
      if (filteredStrokes.length !== selectedStrokesRef.current.length) {
        selectedStrokesRef.current = filteredStrokes;
        setSelectedStrokes(filteredStrokes);
      }
      redrawAll();
      saveToForm();
    }
  };

  const clearAll = () => {
    strokesRef.current = [];
    iconsRef.current = [];
    dragSelectionRef.current = null;
    selectionRectRef.current = null;
    drawingRef.current = { down: false };
    setEarthCounter(1);
    setSelectedIcons([]);
    selectedIconsRef.current = [];
    setSelectedStrokes([]);
    selectedStrokesRef.current = [];
    setGhostIcon(null);
    redrawAll();
    saveToForm();
  };

  const buttonClass = (active: boolean, variant: "primary" | "green" | "purple" = "primary") => {
    const base = "px-3 py-1.5 text-sm border border-slate-200 first:rounded-l-lg last:rounded-r-lg -ml-px";
    if (active) {
      if (variant === "green") return `${base} bg-emerald-600 text-white`;
      if (variant === "purple") return `${base} bg-purple-600 text-white`;
      return `${base} bg-slate-900 text-white`;
    }
    const hover = variant === "green" ? "hover:bg-emerald-50" : variant === "purple" ? "hover:bg-purple-50" : "hover:bg-slate-50";
    return `${base} bg-white text-slate-700 ${hover}`;
  };

  const renderSelectedToolbar = () => {
    if (!selectedIcons.length && !selectedStrokes.length) return null;
    const selectedItems = selectedIcons
      .map((idx) => ({ idx, icon: iconsRef.current[idx] }))
      .filter((item): item is { idx: number; icon: IconItem } => !!item.icon);
    if (!selectedItems.length && !selectedStrokes.length) return null;
    const hasEarth = selectedItems.some((item) => item.icon.type === "earth");
    const canEditText = selectedItems.length === 1 && selectedItems[0].icon.type === "text";
    return (
      <div className="inline-flex items-center bg-white border rounded-xl overflow-hidden shadow-sm">
        {hasEarth && (
          <button className="px-3 py-1.5 hover:bg-slate-50" onClick={rotateSelectedIcons}>
            Otočit 90°
          </button>
        )}
        {canEditText && (
          <button className="px-3 py-1.5 hover:bg-slate-50" onClick={editSelectedText}>
            Upravit text
          </button>
        )}
        <button className="px-3 py-1.5 text-red-600 hover:bg-red-50" onClick={deleteSelectedItems}>
          Smazat
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="max-w-xs bg-white/95 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl shadow-xl flex items-start gap-3">
            <span className="text-xl leading-none pt-0.5">⚠️</span>
            <div className="text-sm font-medium flex-1">{toast.text}</div>
            <button
              type="button"
              className="text-amber-600 hover:text-amber-800"
              onClick={() => setToast(null)}
              aria-label="Zavřít upozornění"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="flex gap-4">
        <aside className="w-60 bg-white/80 backdrop-blur border rounded-2xl shadow-sm p-4 space-y-6">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500 tracking-wide">Kreslím</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className={buttonClass(tool === "solid")} onClick={() => setTool("solid")}>Půdorys</button>
              <button className={buttonClass(tool === "dashed")} onClick={() => setTool("dashed")}>Vodič (čárkovaný)</button>
              <button className={buttonClass(tool === "rect")} onClick={() => setTool("rect")}>Obdélník</button>
              <button className={buttonClass(tool === "rect_square")} onClick={() => setTool("rect_square")}>Čtverec</button>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500 tracking-wide">Ikony</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button className={`rounded-2xl border p-3 text-center ${tool === "icon_earth" ? "bg-emerald-100 border-emerald-400" : "hover:bg-slate-50"}`} onClick={() => setTool("icon_earth")}>
                <div className="text-lg font-semibold">⏚</div>
                <div className="text-[11px] text-slate-500">Zemnič</div>
              </button>
              <button className={`rounded-2xl border p-3 text-center ${tool === "icon_air" ? "bg-emerald-100 border-emerald-400" : "hover:bg-slate-50"}`} onClick={() => setTool("icon_air")}>
                <div className="text-lg">⚡</div>
                <div className="text-[11px] text-slate-500">Jímač / svod</div>
              </button>
              <button className={`rounded-2xl border p-3 text-center ${tool === "icon_antenna" ? "bg-emerald-100 border-emerald-400" : "hover:bg-slate-50"}`} onClick={() => setTool("icon_antenna")}>
                <div className="text-lg">📡</div>
                <div className="text-[11px] text-slate-500">Anténa</div>
              </button>
              <button className={`rounded-2xl border p-3 text-center ${tool === "text" ? "bg-purple-100 border-purple-300" : "hover:bg-slate-50"}`} onClick={() => setTool("text")}>
                <div className="text-lg font-semibold">T</div>
                <div className="text-[11px] text-slate-500">Popisky</div>
              </button>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-500 uppercase tracking-wide text-xs">Informace</div>
            <div className="rounded-xl border p-3 bg-slate-50 text-xs leading-5 space-y-1">
              <div>Měřítko: 1 m = 50 px</div>
              <div>Výchozí rotace zemniče: {earthRotationPreset}°</div>
              <div>Zemnič #{earthCounter}</div>
            </div>
            <button className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setEarthRotationPreset((deg) => (deg + 90) % 360)}>
              ↻ Otočit nový zemnič
            </button>
            <button className={`w-full rounded-xl border px-3 py-2 text-sm ${tool === "select" ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`} onClick={() => setTool("select")}>
              🖐 Výběr a přesun
            </button>
          </div>
        </aside>

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 bg-white/80 backdrop-blur border rounded-2xl shadow-sm px-4 py-2">
            {renderSelectedToolbar()}
            <button className="px-3 py-1.5 rounded-xl border hover:bg-slate-50" onClick={undo}>↶ Undo</button>
            <button className="px-3 py-1.5 rounded-xl border hover:bg-slate-50" onClick={clearAll}>✕ Vymazat vše</button>
            <label className="flex items-center gap-2 text-sm text-slate-600 ml-auto">
              Barva
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 p-0 border rounded" />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Šířka
              <input type="range" min={1} max={8} step={1} value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value, 10) || 2)} />
              <span className="text-xs text-slate-500 w-12 text-right">{lineWidth}px</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> Mřížka
            </label>
          </div>
          <div
            ref={containerRef}
            className="relative rounded-2xl border bg-white overflow-hidden shadow-sm"
            style={
              grid
                ? {
                    backgroundImage:
                      "repeating-linear-gradient(0deg, #e5e7eb 0, #e5e7eb 1px, transparent 1px, transparent 20px),repeating-linear-gradient(90deg, #e5e7eb 0, #e5e7eb 1px, transparent 1px, transparent 20px)",
                    backgroundSize: "20px 20px",
                    height: "480px",
                  }
                : { height: "480px" }
            }
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeaveCanvas}
              onFocus={() => setIsCanvasFocused(true)}
              onBlur={() => setIsCanvasFocused(false)}
              className="absolute inset-0 touch-none"
              tabIndex={0}
              style={{ cursor }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Mřížtko: 1 m = 50 px</span>
            <span>
              1 m = 50 px · X: {pointerPx.x.toFixed(0)} px · Y: {pointerPx.y.toFixed(0)} px
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}






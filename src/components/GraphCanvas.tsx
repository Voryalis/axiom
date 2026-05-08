import { useEffect, useRef } from "react";

const X_MIN = -10;
const X_MAX = 10;
const Y_MIN = -10;
const Y_MAX = 10;

function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, rect.width, rect.height);
    });

    resizeObserver.observe(parent);

    return () => resizeObserver.disconnect();
  }, []);

  return <canvas ref={canvasRef} className="graph-canvas" />;
}

function draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);

  drawBackground(ctx, width, height);
  drawGrid(ctx, width, height);
  drawAxes(ctx, width, height);
  drawParabola(ctx, width, height);
}

function toScreenX(x: number, width: number) {
  return ((x - X_MIN) / (X_MAX - X_MIN)) * width;
}

function toScreenY(y: number, height: number) {
  return height - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * height;
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#1d1e21";
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.lineWidth = 1;

  for (let x = Math.ceil(X_MIN); x <= Math.floor(X_MAX); x++) {
    const sx = toScreenX(x, width);
    ctx.beginPath();
    ctx.strokeStyle = x === 0 ? "#555963" : "#2a2c31";
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
    ctx.stroke();
  }

  for (let y = Math.ceil(Y_MIN); y <= Math.floor(Y_MAX); y++) {
    const sy = toScreenY(y, height);
    ctx.beginPath();
    ctx.strokeStyle = y === 0 ? "#555963" : "#2a2c31";
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
    ctx.stroke();
  }
}

function drawAxes(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#8b909b";
  ctx.font = "12px system-ui, sans-serif";

  for (let x = Math.ceil(X_MIN); x <= Math.floor(X_MAX); x++) {
    if (x === 0) continue;
    const sx = toScreenX(x, width);
    const sy = toScreenY(0, height);
    ctx.fillText(String(x), sx + 4, sy + 16);
  }

  for (let y = Math.ceil(Y_MIN); y <= Math.floor(Y_MAX); y++) {
    if (y === 0) continue;
    const sx = toScreenX(0, width);
    const sy = toScreenY(y, height);
    ctx.fillText(String(y), sx + 6, sy - 4);
  }
}

function drawParabola(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.beginPath();
  ctx.strokeStyle = "#8ab4f8";
  ctx.lineWidth = 2.5;

  let started = false;

  for (let px = 0; px <= width; px++) {
    const x = X_MIN + (px / width) * (X_MAX - X_MIN);
    const y = x * x;

    if (y < Y_MIN || y > Y_MAX) {
      started = false;
      continue;
    }

    const sx = toScreenX(x, width);
    const sy = toScreenY(y, height);

    if (!started) {
      ctx.moveTo(sx, sy);
      started = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }

  ctx.stroke();
}

export default GraphCanvas;

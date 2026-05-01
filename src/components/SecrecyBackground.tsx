import { useEffect, useRef } from "react";
import bg from "@/assets/secrecy-bg.png";

/**
 * Dark-mode only animated background:
 *  - Hooded hacker image (fixed, low opacity, blurred)
 *  - Falling matrix-style code rain on canvas
 *  - Scanning horizontal line + vignette
 * Renders nothing in light mode (relies on `.dark` class on <html>).
 */
export function SecrecyBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const fontSize = 14;
    let columns = 0;
    let drops: number[] = [];

    const chars =
      "アイウエオカキクケコサシスセソタチツテトナニヌネノ01010101{}[]<>/*=+-_$#@&%".split("");

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(0).map(() => Math.random() * -50);
    }

    let last = 0;
    function draw(t: number) {
      // throttle ~24fps
      if (t - last < 42) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = t;

      // fade trail
      ctx.fillStyle = "rgba(8, 12, 20, 0.18)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      for (let i = 0; i < columns; i++) {
        const ch = chars[(Math.random() * chars.length) | 0];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        // head: bright primary; tail handled by fade above
        ctx.fillStyle = Math.random() > 0.975 ? "rgba(255,170,90,0.85)" : "rgba(96,165,250,0.55)";
        ctx.fillText(ch, x, y);

        if (y > height && Math.random() > 0.97) drops[i] = 0;
        drops[i] += 1;
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="hidden dark:block pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Hooded silhouette image */}
      <div
        className="absolute inset-0 bg-center bg-cover opacity-[0.18] blur-[2px] animate-secrecy-pulse"
        style={{ backgroundImage: `url(${bg})` }}
      />
      {/* Color wash to keep design system harmony */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />

      {/* Matrix code rain */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-40" />

      {/* Scanning line */}
      <div className="absolute inset-x-0 h-[2px] bg-primary/30 blur-[2px] animate-secrecy-scan" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(var(--background))_95%)]" />
    </div>
  );
}

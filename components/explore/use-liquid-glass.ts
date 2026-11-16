"use client";
// Liquid glass lens for floating layers over the 탐색 graph (DESIGN.md Elevation → Floating layers; decisions 2026-11-16 option A).
// Real Liquid Glass reads as glass because what is behind it bends at the rim, not because it is blurred everywhere.
// So each glass element gets its own SVG filter, used inside backdrop-filter (Chromium only):
//   map  = per-size displacement image: neutral in the middle, pushes the sample point inward inside a rim band (bezel),
//          strongest at the edge; its blue channel is the frost mask (1 in the middle, 0 at the rim).
//   lens = only ink-coloured content bends (vertices, labels; user 2026-11-16 "검은 컬러에서만 휘는"; inverted in dark mode): the dot grid and the
//          gray lines cross the rim straight, a dark vertex bends at the rim without leaving an unbent ghost.
//   frost = lens blurred, shown in the middle only. No prism (removed 2026-11-16, user).
// Other engines, reduced transparency and more contrast keep the CSS fallbacks in styles/glass.css.
import { useEffect, type RefObject } from "react";

export type Lens = {
  bezel: number; // rim band width in px where the backdrop bends
  scale: number; // displacement scale in px (max inward shift = scale / 2)
  frost: number; // blur in px for the middle (0 = clear)
};

const NS = "http://www.w3.org/2000/svg";
let host: SVGSVGElement | null = null;
let seq = 0;

function svgHost() {
  if (host && host.isConnected) return host;
  host = document.createElementNS(NS, "svg");
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("width", "0");
  host.setAttribute("height", "0");
  host.style.position = "absolute";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);
  return host;
}

// Software rendering (no GPU, or acceleration turned off: SwiftShader / llvmpipe / Basic Render) makes every backdrop
// filter cost whole frames (fps probe 2026-11-16: 6-7 fps while panning). Such machines get solid layers instead.
let software: boolean | null = null;
export function softwareRendering() {
  if (software !== null) return software;
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer = gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    software = !gl || /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  } catch {
    software = true;
  }
  return software;
}

export function lensSupported() {
  if (typeof window === "undefined") return false;
  const ua = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData;
  if (!ua?.brands.some((b) => b.brand === "Chromium")) return false;
  if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return false;
  if (window.matchMedia("(prefers-contrast: more), (forced-colors: active)").matches) return false;
  if (softwareRendering()) return false;
  return true;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Displacement map for a rounded rectangle w x h with corner radius r: R/G = inward shift, B = frost mask. */
export function lensMap(w: number, h: number, r: number, bezel: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.max(0, Math.min(r, hw, hh));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const qx = Math.abs(px) - (hw - rr);
      const qy = Math.abs(py) - (hh - rr);
      let sd: number, nx: number, ny: number;
      if (qx > 0 && qy > 0) {
        const L = Math.hypot(qx, qy) || 1;
        sd = L - rr;
        nx = (qx / L) * Math.sign(px);
        ny = (qy / L) * Math.sign(py);
      } else if (qx > qy) {
        sd = qx - rr;
        nx = Math.sign(px);
        ny = 0;
      } else {
        sd = qy - rr;
        nx = 0;
        ny = Math.sign(py);
      }
      const dist = Math.max(0, -sd); // distance from the edge, inside
      const t = dist < bezel ? 1 - dist / bezel : 0; // 1 at the edge, 0 at the inner end of the rim
      const m = t * t; // lens profile: bends most at the very edge
      const i = (y * w + x) * 4;
      d[i] = 128 - 127 * nx * m; // sample inward (n points outward)
      d[i + 1] = 128 - 127 * ny * m;
      d[i + 2] = 255 * (1 - smooth(Math.min(1, t * 1.15))); // frost mask
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

function el<K extends string>(tag: K, attrs: Record<string, string | number>) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

// ink test for the bend mask: only content in the ink colour bends (vertices, labels). Light mode: alpha = 1 - luminance
// (near-black); dark mode, where ink is light: alpha = luminance (near-white). A steep ramp (slope 5, intercept -3) keeps
// mid grays (lines, the dot grid, the canvas) out; a small dilation lets the light circle around a dark industry icon bend
// with its icon instead of splitting from it.
const INK_ON_LIGHT = "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.2126 -0.7152 -0.0722 0 1";
const INK_ON_DARK = "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.2126 0.7152 0.0722 0 0";
const isDark = () => document.documentElement.classList.contains("dark");

function lensFilter(id: string, map: SVGElement, scale: number, frost: number) {
  const filter = el("filter", { id, x: 0, y: 0, width: "100%", height: "100%", "color-interpolation-filters": "sRGB" });
  const ramp = (input: string, result: string) => {
    const t = el("feComponentTransfer", { in: input, result });
    t.append(el("feFuncA", { type: "linear", slope: 5, intercept: -3 }));
    return t;
  };
  const inkBent = el("feColorMatrix", { in: "bent", type: "matrix", values: INK_ON_LIGHT, result: "bentInkRaw" });
  const inkSrc = el("feColorMatrix", { in: "SourceGraphic", type: "matrix", values: INK_ON_LIGHT, result: "srcInkRaw" });
  filter.append(
    map,
    el("feDisplacementMap", { in: "SourceGraphic", in2: "map", scale, xChannelSelector: "R", yChannelSelector: "G", result: "bent" }),
    // where the bent or the original pixel is ink, show the bent backdrop (the vertex bends, its unbent original does not
    // stay behind as a ghost); everywhere else the plain backdrop, so lines and the dot grid cross the rim straight
    inkBent,
    ramp("bentInkRaw", "bentInk"),
    inkSrc,
    ramp("srcInkRaw", "srcInk"),
    el("feComposite", { in: "bentInk", in2: "srcInk", operator: "over", result: "inkMaskTight" }),
    el("feMorphology", { in: "inkMaskTight", operator: "dilate", radius: 8, result: "inkMask" }),
    el("feComposite", { in: "bent", in2: "inkMask", operator: "in", result: "bentInkOnly" }),
    el("feComposite", { in: "bentInkOnly", in2: "SourceGraphic", operator: "over", result: "lens" }),
    el("feGaussianBlur", { in: "lens", stdDeviation: frost, result: "frost" }),
    el("feColorMatrix", { in: "map", type: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0", result: "mask" }),
    el("feComposite", { in: "frost", in2: "mask", operator: "in", result: "middle" }),
    el("feComposite", { in: "middle", in2: "lens", operator: "over" }),
  );
  const setInk = (dark: boolean) => {
    for (const m of [inkBent, inkSrc]) m.setAttribute("values", dark ? INK_ON_DARK : INK_ON_LIGHT);
  };
  return { filter, setInk };
}

/** Turns the element into a lens-glass layer on Chromium; no-op elsewhere (CSS frosted fallback stays). */
export function useLiquidGlass(ref: RefObject<HTMLElement | null>, { bezel, scale, frost }: Lens, enabled = true) {
  useEffect(() => {
    const node = ref.current;
    if (softwareRendering()) document.documentElement.dataset.glass = "solid"; // styles/glass.css: solid layers
    if (!node || !enabled || !lensSupported()) return;
    const id = `lg-lens-${++seq}`;
    const map = el("feImage", { x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: "none", result: "map" });
    const { filter, setInk } = lensFilter(id, map, scale, frost);
    setInk(isDark());
    svgHost().appendChild(filter);
    // the theme is a class on <html> (next-themes): follow it so the ink test flips with the canvas
    const theme = new MutationObserver(() => setInk(isDark()));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let last = "";
    let raf = 0;
    const draw = () => {
      const w = Math.round(node.offsetWidth);
      const h = Math.round(node.offsetHeight);
      if (!w || !h) return;
      const r = parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0;
      const key = `${w}x${h}x${r}`;
      if (key === last) return;
      last = key;
      map.setAttribute("width", String(w));
      map.setAttribute("height", String(h));
      map.setAttribute("href", lensMap(w, h, r, bezel));
    };
    draw();
    const value = `url(#${id}) saturate(1.5)`;
    node.dataset.lens = "on";
    node.style.setProperty("backdrop-filter", value);
    node.style.setProperty("-webkit-backdrop-filter", value);
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    });
    ro.observe(node);
    return () => {
      ro.disconnect();
      theme.disconnect();
      cancelAnimationFrame(raf);
      filter.remove();
      delete node.dataset.lens;
      node.style.removeProperty("backdrop-filter");
      node.style.removeProperty("-webkit-backdrop-filter");
    };
  }, [ref, bezel, scale, frost, enabled]);
}

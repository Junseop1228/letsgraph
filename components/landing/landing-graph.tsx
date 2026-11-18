// 첫 화면의 예시 그래프 (D 2026-11-18 landing option 나): what 탐색 does, played once on load. The job appears, its
// industries come out on thin lines, then 식품 opens: its companies fan out behind it on a gray plane and the other
// industries dim, the same moves as the real graph (specs/explore FR-MAP-03). Shapes and lines are one SVG that scales
// with the box; labels are HTML on top so they stay readable at 12px on a phone. Decorative: the figure caption says
// what it shows. With reduced motion the finished picture shows at once (styles/landing.css).
import type { CSSProperties } from "react";
import { Atom, Car, Cpu, FlaskConical, SprayCan, UtensilsCrossed, type LucideIcon } from "lucide-react";

const W = 440;
const H = 360;
const JOB = { x: 150, y: 180, r: 40, name: "품질관리" };
// one star: same icons as the real graph (components/explore/industry-icon.tsx)
const INDUSTRIES: { name: string; icon: LucideIcon; x: number; y: number }[] = [
  { name: "식품", icon: UtensilsCrossed, x: 262, y: 180 },
  { name: "바이오·제약", icon: FlaskConical, x: 206, y: 83 },
  { name: "화장품", icon: SprayCan, x: 78, y: 94 },
  { name: "화학", icon: Atom, x: 45, y: 218 },
  { name: "반도체", icon: Cpu, x: 131, y: 290 },
  { name: "자동차", icon: Car, x: 206, y: 277 },
];
const IND_R = 22;
// 식품 opened: companies behind it, circle size by revenue (illustrative sizes, no figures shown)
const COMPANIES = [
  { name: "CJ제일제당", x: 330, y: 135, r: 20 },
  { name: "대상", x: 397, y: 118, r: 13 },
  { name: "농심", x: 345, y: 214, r: 16 },
  { name: "오뚜기", x: 405, y: 188, r: 14 },
  { name: "동원F&B", x: 398, y: 262, r: 12 },
];
const OPEN_AT = 1400; // ms

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
const at = (x: number, y: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

export function LandingGraph() {
  const [food, ...others] = INDUSTRIES;
  return (
    <figure className="w-full space-y-3">
      <div className="lp-canvas relative aspect-11/9 w-full overflow-hidden rounded-container" aria-hidden>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full">
          {/* gray plane behind the opened industry and its companies */}
          <ellipse className="lp-plane lp-fade" cx={340} cy={196} rx={108} ry={100} style={delay(OPEN_AT + 50)} />
          {INDUSTRIES.map((ind, k) => (
            <line key={ind.name} className="lp-edge" x1={JOB.x} y1={JOB.y} x2={ind.x} y2={ind.y} pathLength={1} style={delay(250 + k * 70)} />
          ))}
          {COMPANIES.map((c, k) => (
            <line key={c.name} className="lp-edge" x1={food.x} y1={food.y} x2={c.x} y2={c.y} pathLength={1} style={delay(OPEN_AT + 150 + k * 70)} />
          ))}
          <g className="lp-pop" style={delay(0)}>
            <circle className="lp-job" cx={JOB.x} cy={JOB.y} r={JOB.r} />
          </g>
          <g className="lp-pop text-text-primary" style={delay(450)}>
            <circle className="lp-ind" cx={food.x} cy={food.y} r={IND_R} />
            <food.icon x={food.x - 10} y={food.y - 10} width={20} height={20} strokeWidth={1.75} />
          </g>
          <circle className="lp-open lp-fade" cx={food.x} cy={food.y} r={IND_R + 6} style={delay(OPEN_AT)} />
          <g className="lp-dim">
            {others.map((ind, k) => (
              <g key={ind.name} className="lp-pop text-text-primary" style={delay(520 + k * 70)}>
                <circle className="lp-ind" cx={ind.x} cy={ind.y} r={IND_R} />
                <ind.icon x={ind.x - 10} y={ind.y - 10} width={20} height={20} strokeWidth={1.75} />
              </g>
            ))}
          </g>
          {COMPANIES.map((c, k) => (
            <g key={c.name} className="lp-pop" style={delay(OPEN_AT + 250 + k * 70)}>
              <circle className="lp-co" cx={c.x} cy={c.y} r={c.r} />
            </g>
          ))}
        </svg>
        <span className="lp-label lp-job-label lp-fade" style={{ ...at(JOB.x, JOB.y), ...delay(200) }}>
          {JOB.name}
        </span>
        <span className="lp-label lp-fade" style={{ ...at(food.x, food.y + IND_R + 4), ...delay(600) }}>
          {food.name}
        </span>
        <span className="lp-dim absolute inset-0">
          {others.map((ind, k) => (
            <span key={ind.name} className="lp-label lp-fade" style={{ ...at(ind.x, ind.y + IND_R + 4), ...delay(670 + k * 70) }}>
              {ind.name}
            </span>
          ))}
        </span>
        {COMPANIES.map((c, k) => (
          <span key={c.name} className="lp-label lp-fade" style={{ ...at(c.x, c.y + c.r + 3), ...delay(OPEN_AT + 350 + k * 70) }}>
            {c.name}
          </span>
        ))}
      </div>
      <figcaption className="text-caption text-text-secondary">예시: 품질관리 직무에서 식품 산업을 연 그래프</figcaption>
    </figure>
  );
}

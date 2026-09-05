import { useId } from "react";

export type DartboardRing = "single" | "double" | "treble" | "bull" | "outer";
export type DartboardHighlight = { segment: number; ring: DartboardRing };

const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

const R = 200;
const RING = {
  doubleOuter: R,
  doubleInner: R * 0.95,
  outerSingleInner: R * 0.63,
  trebleOuter: R * 0.63,
  trebleInner: R * 0.58,
  innerSingleInner: R * 0.094,
  bullOuter: R * 0.094,
  bullInner: R * 0.037,
};

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)] as const;
}

function annulusPath(cx: number, cy: number, r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = polar(cx, cy, r2, a1);
  const [x2, y2] = polar(cx, cy, r2, a2);
  const [x3, y3] = polar(cx, cy, r1, a2);
  const [x4, y4] = polar(cx, cy, r1, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}

/**
 * Regulation-style SVG dartboard: 20 numbered segments in the correct clockwise
 * order, alternating black/cream singles, red/green doubles & trebles, and a
 * green outer / red inner bull — with wire lines, shading and drop shadow.
 */
export function Dartboard({
  size = 320,
  highlight = [],
  onPick,
  lastHit,
  impactKey = 0,
  className = "",
}: {
  size?: number;
  highlight?: DartboardHighlight[];
  onPick?: ((h: DartboardHighlight) => void) | undefined;
  lastHit?: DartboardHighlight | null;
  impactKey?: number;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const cx = 240;
  const cy = 240;
  const isHighlighted = (segment: number, ring: DartboardRing) =>
    highlight.some((h) => h.segment === segment && h.ring === ring);
  const isLast = (segment: number, ring: DartboardRing) =>
    lastHit?.segment === segment && lastHit.ring === ring;

  const beds: React.ReactNode[] = [];
  const wires: string[] = [];

  ORDER.forEach((num, i) => {
    const a1 = i * 18 - 9;
    const a2 = i * 18 + 9;
    const even = i % 2 === 0;
    const singleFill = even ? "var(--dart-black)" : "var(--dart-cream)";
    const dtFill = even ? "var(--dart-red)" : "var(--dart-green)";

    const makeBed = (ring: DartboardRing, r1: number, r2: number, fill: string) => {
      const hi = isHighlighted(num, ring);
      const hit = isLast(num, ring);
      const d = annulusPath(cx, cy, r1, r2, a1, a2);
      return (
        <path
          key={`${ring}-${num}`}
          d={d}
          fill={fill}
          stroke={hi ? "var(--color-gold)" : "transparent"}
          strokeWidth={hi ? 3 : 0}
          data-segment={num}
          data-ring={ring}
          onClick={onPick && hi ? () => onPick({ segment: num, ring }) : undefined}
          className={[
            hi && onPick ? "cursor-pointer" : "",
            hi ? "dartbed-glow" : "",
            hit ? "dartbed-hit" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={hi ? { filter: `drop-shadow(0 0 6px var(--color-gold))` } : undefined}
        />
      );
    };

    beds.push(makeBed("double", RING.doubleInner, RING.doubleOuter, dtFill));
    beds.push(makeBed("single", RING.outerSingleInner, RING.doubleInner, singleFill));
    beds.push(makeBed("treble", RING.trebleInner, RING.trebleOuter, dtFill));
    beds.push(makeBed("single", RING.innerSingleInner, RING.trebleInner, singleFill));

    const [wx1, wy1] = polar(cx, cy, RING.innerSingleInner, a1);
    const [wx2, wy2] = polar(cx, cy, RING.doubleOuter, a1);
    wires.push(`M ${wx1} ${wy1} L ${wx2} ${wy2}`);
  });

  const outerBullHi = isHighlighted(25, "outer");
  const outerBullHit = isLast(25, "outer");
  const bullHi = isHighlighted(50, "bull");
  const bullHit = isLast(50, "bull");

  return (
    <svg
      viewBox="0 0 480 480"
      width={size}
      height={size}
      className={`overflow-visible ${className}`}
      role="img"
      aria-label="Dartboard"
    >
      <defs>
        <radialGradient id={`${uid}-surround`} cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="var(--wood-light)" />
          <stop offset="100%" stopColor="var(--wood-dark)" />
        </radialGradient>
        <radialGradient id={`${uid}-sheen`} cx="42%" cy="30%" r="70%">
          <stop offset="0%" stopColor="oklch(1 0 0 / 0.16)" />
          <stop offset="55%" stopColor="oklch(1 0 0 / 0.03)" />
          <stop offset="100%" stopColor="oklch(0 0 0 / 0.25)" />
        </radialGradient>
        <filter id={`${uid}-shadow`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodOpacity="0.55" />
        </filter>
      </defs>

      <g filter={`url(#${uid}-shadow)`}>
        {/* wooden surround / cabinet */}
        <circle
          cx={cx}
          cy={cy}
          r={230}
          fill={`url(#${uid}-surround)`}
          stroke="var(--wood-edge)"
          strokeWidth={6}
        />
        <circle cx={cx} cy={cy} r={222} fill="none" stroke="oklch(0 0 0 / 0.25)" strokeWidth={2} />

        {/* number ring */}
        <circle cx={cx} cy={cy} r={214} fill="var(--dart-black)" />
        {ORDER.map((num, i) => {
          const [nx, ny] = polar(cx, cy, 200, i * 18);
          return (
            <text
              key={`num-${num}`}
              x={nx}
              y={ny}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={20}
              fontWeight={800}
              fill="var(--dart-cream)"
              fontFamily="var(--font-display, sans-serif)"
            >
              {num}
            </text>
          );
        })}

        {/* playing surface */}
        <g transform="translate(-1, -1)">
          <circle cx={cx} cy={cy} r={RING.doubleOuter} fill="var(--dart-black)" />
          {beds}
          {/* bull */}
          <circle
            cx={cx}
            cy={cy}
            r={RING.bullOuter}
            fill="var(--dart-green)"
            stroke={outerBullHi ? "var(--color-gold)" : "transparent"}
            strokeWidth={outerBullHi ? 3 : 0}
            data-segment={25}
            data-ring="outer"
            onClick={
              onPick && outerBullHi ? () => onPick({ segment: 25, ring: "outer" }) : undefined
            }
            className={[
              outerBullHi && onPick ? "cursor-pointer" : "",
              outerBullHi ? "dartbed-glow" : "",
              outerBullHit ? "dartbed-hit" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={outerBullHi ? { filter: `drop-shadow(0 0 6px var(--color-gold))` } : undefined}
          />
          <circle
            cx={cx}
            cy={cy}
            r={RING.bullInner}
            fill="var(--dart-red)"
            stroke={bullHi ? "var(--color-gold)" : "transparent"}
            strokeWidth={bullHi ? 3 : 0}
            data-segment={50}
            data-ring="bull"
            onClick={onPick && bullHi ? () => onPick({ segment: 50, ring: "bull" }) : undefined}
            className={[
              bullHi && onPick ? "cursor-pointer" : "",
              bullHi ? "dartbed-glow" : "",
              bullHit ? "dartbed-hit" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={bullHi ? { filter: `drop-shadow(0 0 6px var(--color-gold))` } : undefined}
          />

          {/* wire lines */}
          <g stroke="var(--dart-wire)" strokeWidth={1.4} opacity={0.85}>
            {wires.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <circle
            cx={cx}
            cy={cy}
            r={RING.doubleOuter}
            fill="none"
            stroke="var(--dart-wire)"
            strokeWidth={1.6}
          />
          <circle
            cx={cx}
            cy={cy}
            r={RING.doubleInner}
            fill="none"
            stroke="var(--dart-wire)"
            strokeWidth={1.2}
          />
          <circle
            cx={cx}
            cy={cy}
            r={RING.trebleOuter}
            fill="none"
            stroke="var(--dart-wire)"
            strokeWidth={1.2}
          />
          <circle
            cx={cx}
            cy={cy}
            r={RING.trebleInner}
            fill="none"
            stroke="var(--dart-wire)"
            strokeWidth={1.2}
          />
          <circle
            cx={cx}
            cy={cy}
            r={RING.bullOuter}
            fill="none"
            stroke="var(--dart-wire)"
            strokeWidth={1.2}
          />
        </g>

        {/* sisal sheen + radial shading */}
        <circle
          cx={cx}
          cy={cy}
          r={RING.doubleOuter}
          fill={`url(#${uid}-sheen)`}
          pointerEvents="none"
        />

        {lastHit && (
          <DartMarker
            key={`${lastHit.segment}-${lastHit.ring}-${impactKey}`}
            cx={cx}
            cy={cy}
            segment={lastHit.segment}
            ring={lastHit.ring}
            order={ORDER}
          />
        )}
      </g>
    </svg>
  );
}

function DartMarker({
  cx,
  cy,
  segment,
  ring,
  order,
}: {
  cx: number;
  cy: number;
  segment: number;
  ring: DartboardRing;
  order: number[];
}) {
  let r = RING.trebleInner * 0.6;
  let angle = 0;
  if (segment === 25 || ring === "outer") r = RING.bullOuter * 0.6;
  else if (segment === 50 || ring === "bull") r = 0;
  else {
    const i = order.indexOf(segment);
    angle = i >= 0 ? i * 18 : 0;
    if (ring === "double") r = (RING.doubleInner + RING.doubleOuter) / 2;
    else if (ring === "treble") r = (RING.trebleInner + RING.trebleOuter) / 2;
    else r = (RING.outerSingleInner + RING.doubleInner) / 2;
  }
  const [x, y] = polar(cx, cy, r, angle);
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="dart-flight-pop">
        <line
          x1={0}
          y1={0}
          x2={-14}
          y2={-30}
          stroke="oklch(0.2 0.01 260)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={0} cy={0} r={3.5} fill="oklch(0.75 0.02 260)" />
        <path
          d="M -14 -30 l -6 -10 l 10 3 z"
          fill="var(--dart-red)"
          stroke="oklch(0.15 0 0)"
          strokeWidth={0.6}
        />
      </g>
    </g>
  );
}

const WIDTH = 1440;
const HEIGHT = 170;

interface Puff {
  cx: number;
  cy: number;
  r: number;
}

const rand = (seed: number) => {
  const value = Math.sin(seed * 91.17) * 43758.5453;
  return value - Math.floor(value);
};

/** One row of overlapping circles. The seed keeps the outline identical on every load. */
function puffRow(seed: number, step: number, floor: number, radius: number) {
  const puffs: Puff[] = [];
  for (let index = 0, x = -80; x < WIDTH + 80; index++, x += step) {
    puffs.push({
      cx: x + rand(seed + index) * step * 0.6,
      cy: floor + rand(seed + index + 50) * 24,
      r: radius * (0.7 + rand(seed + index + 90) * 0.6),
    });
  }
  return puffs;
}

// Back to front: each layer is lower and more solid, so the last one becomes the colour beneath it.
const LAYERS = [
  { floor: 92, opacity: 0.45, puffs: puffRow(3, 124, 92, 62) },
  { floor: 114, opacity: 0.75, puffs: puffRow(11, 98, 114, 52) },
  { floor: 136, opacity: 1, puffs: puffRow(29, 80, 136, 42) },
];

/** Static SVG, painted once, so it adds no work per frame even on top of the 3D scene. Colour comes from `color`. */
export function CloudBank() {
  return (
    <svg className="cloud-bank" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" focusable="false">
      <defs>
        <filter id="cloud-soft" x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {LAYERS.map(({ floor, opacity, puffs }) => (
        <g key={floor} fill="currentColor" opacity={opacity} filter="url(#cloud-soft)">
          {/* Runs past the edges so the blur never softens the sides or the bottom. */}
          <rect x={-100} y={floor} width={WIDTH + 200} height={HEIGHT} />
          {puffs.map(({ cx, cy, r }) => (
            <circle key={cx} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      ))}
    </svg>
  );
}

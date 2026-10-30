const COLUMNS = 13;
const ROWS = 11;
const LIT_CELLS: Record<string, string> = {
  '3:2': '#E84C66',
  '4:3': '#F59A2C',
  '3:3': '#F59A2C',
  '7:5': '#F7E48C',
  '8:5': '#4FC3A1',
  '2:8': '#F7E48C',
  '9:8': '#4FC3A1',
  '10:2': '#F7E48C',
};

const hexagonPoints = (cx: number, cy: number) =>
  [0, 60, 120, 180, 240, 300]
    .map((degrees) => {
      const radians = ((degrees - 90) * Math.PI) / 180;
      return `${(cx + 10 * Math.cos(radians)).toFixed(2)},${(cy + 10 * Math.sin(radians)).toFixed(2)}`;
    })
    .join(' ');

/** The sign-in screen's picture of the town: a quiet grid with a few problems lit up. */
export function Honeycomb() {
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const cx = column * 17.32 + (row % 2 ? 8.66 : 0);
      const cy = row * 15;
      cells.push(
        <polygon
          key={`${column}:${row}`}
          points={hexagonPoints(cx, cy)}
          fill={LIT_CELLS[`${column}:${row}`] ?? 'none'}
          stroke="#7FD0C6"
          strokeOpacity={0.22}
          strokeWidth={0.5}
        />,
      );
    }
  }
  return (
    <svg className="honeycomb" viewBox="0 0 210 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {cells}
    </svg>
  );
}

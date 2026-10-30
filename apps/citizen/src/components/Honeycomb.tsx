import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { color } from '@/theme';

const COLUMNS = 8;
const ROWS = 12;
const LIT_CELLS: Record<string, string> = {
  '5:2': '#E84C66',
  '6:3': '#F59A2C',
  '5:3': '#F59A2C',
  '2:5': '#F7E48C',
  '3:5': '#4FC3A1',
  '6:8': '#F7E48C',
  '1:9': '#4FC3A1',
};

const hexagonPoints = (cx: number, cy: number) =>
  [0, 60, 120, 180, 240, 300]
    .map((degrees) => {
      const radians = ((degrees - 90) * Math.PI) / 180;
      return `${(cx + 10 * Math.cos(radians)).toFixed(2)},${(cy + 10 * Math.sin(radians)).toFixed(2)}`;
    })
    .join(' ');

/** A quiet grid of the town with a few problems lit up. */
export function Honeycomb() {
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const key = `${column}:${row}`;
      cells.push(
        <Polygon
          key={key}
          points={hexagonPoints(column * 17.32 + (row % 2 ? 8.66 : 0), row * 15)}
          fill={LIT_CELLS[key] ?? 'none'}
          stroke={color.mint}
          strokeOpacity={0.22}
          strokeWidth={0.5}
        />,
      );
    }
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 125 160" preserveAspectRatio="xMidYMin slice">
        {cells}
      </Svg>
    </View>
  );
}

// Renders the Awaaz hexagon mark to the PNG sizes Expo needs, with no image library.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUTPUT = path.join(__dirname, '..', 'assets');
const BRAND = [0x0a, 0x3d, 0x3b];
const MINT = [0x7f, 0xd0, 0xc6];
const WHITE = [0xff, 0xff, 0xff];
const HEXAGON = [
  [50, 3],
  [91, 26.5],
  [91, 73.5],
  [50, 97],
  [9, 73.5],
  [9, 26.5],
];

function insideHexagon(x, y) {
  let inside = false;
  for (let i = 0, j = HEXAGON.length - 1; i < HEXAGON.length; j = i++) {
    const [xi, yi] = HEXAGON[i];
    const [xj, yj] = HEXAGON[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** `scale` is the share of the canvas the hexagon fills. A null background leaves it transparent. */
function render(file, size, { background, foreground, scale }) {
  const samples = 4;
  const rows = [];

  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (((px + (sx + 0.5) / samples) / size - 0.5) / scale + 0.5) * 100;
          const y = (((py + (sy + 0.5) / samples) / size - 0.5) / scale + 0.5) * 100;
          if (insideHexagon(x, y)) hits++;
        }
      }
      const coverage = hits / samples ** 2;
      const offset = 1 + px * 4;
      for (let c = 0; c < 3; c++) {
        const base = background ? background[c] : foreground[c];
        row[offset + c] = Math.round(base + (foreground[c] - base) * coverage);
      }
      row[offset + 3] = background ? 255 : Math.round(coverage * 255);
    }
    rows.push(row);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path.join(OUTPUT, file), png);
}

render('icon.png', 1024, { background: BRAND, foreground: MINT, scale: 0.62 });
render('favicon.png', 48, { background: BRAND, foreground: MINT, scale: 0.72 });
render('android-icon-foreground.png', 1024, { background: null, foreground: MINT, scale: 0.46 });
render('android-icon-monochrome.png', 1024, { background: null, foreground: WHITE, scale: 0.46 });

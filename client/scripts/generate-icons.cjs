// One-off script to generate the PWA app icons as flat PNGs (no native
// image libs — pngjs is pure JS, so this runs anywhere without a native
// build step). Re-run with `node scripts/generate-icons.js` if the design
// ever needs to change; the output PNGs are committed to public/.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const BG = [26, 28, 34]; // matches the app's dark background
const BALL = [52, 211, 153]; // matches the app's green accent
const SEAM = [17, 46, 36]; // darker green for the seam lines

function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, ax + t * dx, ay + t * dy);
}

function generateIcon(size, maskable) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  // Maskable icons need extra padding so OS masks don't crop the artwork
  // (the "safe zone" is the inner ~80% of the canvas).
  const radius = size * (maskable ? 0.32 : 0.4);
  const cornerRadius = size * 0.18;

  // Seam lines (three chords through the ball at 60° apart) for a
  // recognisable volleyball look without needing real bezier curves.
  const seams = [0, 60, 120].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const ax = cx + radius * Math.cos(rad);
    const ay = cy + radius * Math.sin(rad);
    const bx = cx - radius * Math.cos(rad);
    const by = cy - radius * Math.sin(rad);
    return [ax, ay, bx, by];
  });
  const seamWidth = Math.max(1, size * 0.012);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Rounded-square background clip (outside the rounded corners is transparent).
      const inCorner =
        (x < cornerRadius && y < cornerRadius && dist(x, y, cornerRadius, cornerRadius) > cornerRadius) ||
        (x > size - cornerRadius && y < cornerRadius && dist(x, y, size - cornerRadius, cornerRadius) > cornerRadius) ||
        (x < cornerRadius && y > size - cornerRadius && dist(x, y, cornerRadius, size - cornerRadius) > cornerRadius) ||
        (x > size - cornerRadius && y > size - cornerRadius && dist(x, y, size - cornerRadius, size - cornerRadius) > cornerRadius);

      if (inCorner && !maskable) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      let [r, g, b] = BG;
      const d = dist(x, y, cx, cy);
      if (d <= radius) {
        [r, g, b] = BALL;
        for (const [ax, ay, bx, by] of seams) {
          if (distToSegment(x, y, ax, ay, bx, by) <= seamWidth) {
            [r, g, b] = SEAM;
            break;
          }
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }

  return png;
}

const outDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'favicon.png', size: 64, maskable: false },
];

for (const { file, size, maskable } of targets) {
  const png = generateIcon(size, maskable);
  png.pack().pipe(fs.createWriteStream(path.join(outDir, file))).on('finish', () => {
    console.log('wrote', file);
  });
}

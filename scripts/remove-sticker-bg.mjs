import sharp from 'sharp';
import fs from 'fs';

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  console.error('Usage: node remove-sticker-bg.mjs <input> <output>');
  process.exit(1);
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const visited = new Uint8Array(width * height);
const queue = [];

function pixelIndex(x, y) {
  return y * width + x;
}

function isBackground(idx) {
  const base = idx * channels;
  const r = data[base];
  const g = data[base + 1];
  const b = data[base + 2];
  return r > 232 && g > 232 && b > 232;
}

for (let x = 0; x < width; x += 1) {
  queue.push(pixelIndex(x, 0), pixelIndex(x, height - 1));
}
for (let y = 0; y < height; y += 1) {
  queue.push(pixelIndex(0, y), pixelIndex(width - 1, y));
}

while (queue.length) {
  const idx = queue.pop();
  if (visited[idx] || !isBackground(idx)) continue;
  visited[idx] = 1;
  data[idx * channels + 3] = 0;

  const x = idx % width;
  const y = Math.floor(idx / width);
  if (x > 0) queue.push(pixelIndex(x - 1, y));
  if (x < width - 1) queue.push(pixelIndex(x + 1, y));
  if (y > 0) queue.push(pixelIndex(x, y - 1));
  if (y < height - 1) queue.push(pixelIndex(x, y + 1));
}

await sharp(data, { raw: { width, height, channels } }).png().toFile(output);
console.log(`Saved ${output}`);

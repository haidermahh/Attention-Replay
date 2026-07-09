const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure icons folder exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[i] = c;
  }
  
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcInput);
  
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateGradientClockIcon(width, height) {
  const rowSize = width * 4 + 1;
  const buffer = Buffer.alloc(rowSize * height);
  
  const cx = width / 2;
  const cy = height / 2;
  
  // Color specifications
  const purple = { r: 168, g: 85, b: 247 };
  const blue = { r: 59, g: 130, b: 246 };
  
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    buffer[offset] = 0; // Filter type 0 (None)
    
    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 4;
      
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Determine base gradient background
      const t = (x + y) / (width + height);
      let r = Math.round(purple.r + t * (blue.r - purple.r));
      let g = Math.round(purple.g + t * (blue.g - purple.g));
      let b = Math.round(purple.b + t * (blue.b - purple.b));
      let a = 255;
      
      // Clock outer ring
      const outerR = width * 0.4;
      const innerR = width * 0.34;
      const dotR = width * 0.07;
      
      let isClockElement = false;
      
      // Clock outline
      if (dist >= innerR && dist <= outerR) {
        isClockElement = true;
      }
      // Center dot
      if (dist <= dotR) {
        isClockElement = true;
      }
      // Clock hands: Minute (upward) and Hour (rightward-upward at ~2 o'clock)
      // Minute hand
      if (dy <= 0 && dy >= -width * 0.28 && Math.abs(dx) <= Math.max(1, width * 0.03)) {
        isClockElement = true;
      }
      // Hour hand (approx 2 o'clock: dx > 0, dy < 0, dy = -0.58 * dx)
      // Let's define it by checking distance to line segment
      const handLength = width * 0.18;
      // angle for 2 o'clock is 30 degrees from horizontal, or cos=0.866, sin=-0.5
      const hx = width * 0.16 * 0.866;
      const hy = width * 0.16 * -0.5;
      
      // Distance from (dx, dy) to segment from (0,0) to (hx, hy)
      const l2 = hx * hx + hy * hy;
      let t_seg = (dx * hx + dy * hy) / l2;
      t_seg = Math.max(0, Math.min(1, t_seg));
      const projX = t_seg * hx;
      const projY = t_seg * hy;
      const distToSeg = Math.sqrt((dx - projX) * (dx - projX) + (dy - projY) * (dy - projY));
      
      if (distToSeg <= Math.max(1, width * 0.03)) {
        isClockElement = true;
      }
      
      if (isClockElement) {
        r = 255;
        g = 255;
        b = 255;
        a = 255;
      }
      
      buffer[pixelOffset] = r;
      buffer[pixelOffset + 1] = g;
      buffer[pixelOffset + 2] = b;
      buffer[pixelOffset + 3] = a;
    }
  }
  
  const compressed = zlib.deflateSync(buffer);
  
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate the three icons
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const iconData = generateGradientClockIcon(size, size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), iconData);
  console.log(`Generated icon-${size}.png`);
});

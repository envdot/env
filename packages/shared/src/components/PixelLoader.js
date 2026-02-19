import React, { useState, useEffect, useRef } from 'react';

const PIXEL_SIZE = 3;
const GRID = 3; // 3x3 grid
const GAP = 1;

// Three color palettes
const PALETTES = {
  blue: ['#00d4ff', '#0099cc', '#3399ff', '#66ccff', '#006688'],
  warm: ['#ffcc66', '#ff9933', '#ffffff', '#ccaa44', '#886622'],
  red: ['#ff3366', '#cc0033', '#ff6688', '#ff0044', '#990022'],
};

// All pattern shapes that can appear in a 3x3 grid (from the reference)
const SHAPES = {
  // scorners - two diagonal corners
  scorners: [[0,0],[0,1],[1,2]],
  // triangle - 3 pixels in triangle
  triangle: [[0,0],[0,1],[1,1]],
  // tl-br - top-left and bottom-right diagonal
  tlBr: [[0,0],[1,1]],
  // left-right - two pixels side by side
  leftRight: [[0,1],[0,2],[1,2]],
  // l-tl - L shape top-left
  lTl: [[0,1],[1,0],[1,1]],
  // l-left - single tall pixel (vertical bar left)
  lLeft: [[0,0],[1,0]],
  // plusRed - plus/cross shape
  plus: [[0,1],[1,0],[1,1],[1,2],[2,1]],
  // striangle - staircase triangle (bigger L)
  striangle: [[0,0],[0,1],[0,2],[1,0],[1,1],[2,0]],
  // wave-lr - vertical bar (2 stacked)
  waveLr: [[0,0],[1,0],[2,0]],
  // wave-tb - horizontal bar wide
  waveTb: [[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]],
  // wave-rl - vertical bar right side
  waveRl: [[0,2],[1,2],[2,2]],
  // full block
  block: [[0,0],[0,1],[1,0],[1,1]],
  // single pixel
  dot: [[1,1]],
  // two horizontal
  hPair: [[1,0],[1,1]],
  // two vertical
  vPair: [[0,1],[1,1]],
  // diagonal line
  diag: [[0,0],[1,1],[2,2]],
  // anti-diagonal
  antiDiag: [[0,2],[1,1],[2,0]],
  // top row
  topRow: [[0,0],[0,1],[0,2]],
  // bottom row
  bottomRow: [[2,0],[2,1],[2,2]],
  // middle row
  midRow: [[1,0],[1,1],[1,2]],
  // left col
  leftCol: [[0,0],[1,0],[2,0]],
  // right col
  rightCol: [[0,2],[1,2],[2,2]],
  // center col
  midCol: [[0,1],[1,1],[2,1]],
  // L bottom-right
  lBr: [[0,2],[1,1],[1,2]],
  // L bottom-left
  lBl: [[0,0],[1,0],[1,1]],
  // T shape
  tShape: [[0,0],[0,1],[0,2],[1,1]],
  // inverted T
  tInv: [[1,1],[2,0],[2,1],[2,2]],
  // corner quad
  cornerQuad: [[0,0],[0,2],[2,0],[2,2]],
  // checkerboard sparse
  checker: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  // 3x3 full
  full: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]],
  // U shape
  uShape: [[0,0],[1,0],[2,0],[2,1],[2,2],[1,2],[0,2]],
  // S/Z shape
  sShape: [[0,1],[0,2],[1,1],[2,0],[2,1]],
  // reverse S
  zShape: [[0,0],[0,1],[1,1],[2,1],[2,2]],
};

const SHAPE_KEYS = Object.keys(SHAPES);

// Build a random sequence of frames from the shape pool
function buildSequence(length) {
  const seq = [];
  const used = new Set();
  while (seq.length < length) {
    const idx = Math.floor(Math.random() * SHAPE_KEYS.length);
    const key = SHAPE_KEYS[idx];
    if (!used.has(key)) {
      used.add(key);
      seq.push(SHAPES[key]);
    }
    // If we've used all shapes, allow repeats
    if (used.size >= SHAPE_KEYS.length) used.clear();
  }
  return seq;
}

function PixelLoader() {
  const [palette] = useState(() => {
    const keys = Object.keys(PALETTES);
    return keys[Math.floor(Math.random() * keys.length)];
  });

  const [frames] = useState(() => buildSequence(8));
  const [frameIndex, setFrameIndex] = useState(0);
  const canvasRef = useRef(null);

  const colors = PALETTES[palette];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % frames.length);
    }, 200);
    return () => clearInterval(interval);
  }, [frames.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = GRID * (PIXEL_SIZE + GAP);
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    const pixels = frames[frameIndex];
    pixels.forEach(([r, c], i) => {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(
        c * (PIXEL_SIZE + GAP),
        r * (PIXEL_SIZE + GAP),
        PIXEL_SIZE,
        PIXEL_SIZE
      );
    });
  }, [frameIndex, frames, colors]);

  const totalSize = GRID * (PIXEL_SIZE + GAP);

  return (
    <canvas
      ref={canvasRef}
      width={totalSize}
      height={totalSize}
      className="pixel-loader"
      style={{
        width: totalSize * 1.5,
        height: totalSize * 1.5,
        imageRendering: 'pixelated',
      }}
    />
  );
}

export default PixelLoader;

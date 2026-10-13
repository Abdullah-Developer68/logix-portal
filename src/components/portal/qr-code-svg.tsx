"use client";

import React from "react";

/**
 * Generates a deterministic 25x25 QR-style matrix with standard QR finder patterns,
 * timing patterns, alignment pattern, and hash-derived data bits for the verification payload.
 */
function buildQrMatrix(payload: string): boolean[][] {
  const size = 25;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );

  const placeFinder = (r0: number, c0: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
          reserved[rr][cc] = true;
          const isOuterBorder =
            r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6);
          const isInnerBox = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[rr][cc] = isOuterBorder || isInnerBox;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Alignment pattern at (16, 16)
  for (let r = 16; r <= 20; r++) {
    for (let c = 16; c <= 20; c++) {
      reserved[r][c] = true;
      const isBorder = r === 16 || r === 20 || c === 16 || c === 20;
      const isCenter = r === 18 && c === 18;
      grid[r][c] = isBorder || isCenter;
    }
  }

  // Deterministic hash stream from payload
  let seed = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    seed ^= payload.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c]) {
        seed ^= (r * 31 + c * 17) & 0xff;
        seed = Math.imul(seed, 16777619);
        grid[r][c] = ((seed >>> 3) & 1) === 1;
      }
    }
  }

  return grid;
}

export function QrCodeSvg({
  value,
  size = 112,
  className = "",
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const matrix = buildQrMatrix(value || "LOGIX-VERIFY");
  const n = matrix.length;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${n + 2} ${n + 2}`}
      className={className}
      role="img"
      aria-label={`QR Code for ${value}`}
    >
      <rect width={n + 2} height={n + 2} rx="1.5" fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c + 1}
              y={r + 1}
              width={0.96}
              height={0.96}
              rx={0.12}
              fill="#0b1f3a"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}


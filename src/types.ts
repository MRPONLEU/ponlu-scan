export interface Point {
  /** Normalized 0..1 X coordinate */
  x: number;
  /** Normalized 0..1 Y coordinate */
  y: number;
}

/** Ordered [topLeft, topRight, bottomRight, bottomLeft] */
export type Quad = [Point, Point, Point, Point];

export type FilterId = 'original' | 'magic' | 'lighten' | 'bw' | 'grayscale';

export type RotationDeg = 0 | 90 | 180 | 270;

export interface ScanPage {
  id: string;
  originalDataUrl: string;
  processedDataUrl: string;
  corners: Quad;
  filter: FilterId;
  brightness: number;
  contrast: number;
  rotation: RotationDeg;
  width: number;
  height: number;
  createdAt: number;
}

export interface ScanDocument {
  id: string;
  title: string;
  pages: ScanPage[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export const DEFAULT_QUAD: Quad = [
  { x: 0.08, y: 0.08 },
  { x: 0.92, y: 0.08 },
  { x: 0.92, y: 0.92 },
  { x: 0.08, y: 0.92 },
];

export const FULL_QUAD: Quad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

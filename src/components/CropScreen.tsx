import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Maximize2, RotateCcw, Scan, X } from 'lucide-react';
import { DEFAULT_QUAD, FULL_QUAD, type Point, type Quad, type RotationDeg } from '../types';
import { detectDocumentCorners } from '../lib/imageProcessing';

interface CropScreenProps {
  imageDataUrl: string;
  initialCorners: Quad;
  initialRotation: RotationDeg;
  pageLabel?: string;
  onCancel: () => void;
  onConfirm: (corners: Quad, rotation: RotationDeg) => void;
}

export const CropScreen: React.FC<CropScreenProps> = ({
  imageDataUrl,
  initialCorners,
  initialRotation,
  pageLabel,
  onCancel,
  onConfirm,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [corners, setCorners] = useState<Quad>(initialCorners);
  const [rotation] = useState<RotationDeg>(initialRotation);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [imgBox, setImgBox] = useState({ left: 0, top: 0, width: 1, height: 1 });
  const [detecting, setDetecting] = useState(false);

  const updateImgBox = () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const cRect = container.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    setImgBox({
      left: iRect.left - cRect.left,
      top: iRect.top - cRect.top,
      width: Math.max(1, iRect.width),
      height: Math.max(1, iRect.height),
    });
  };

  useEffect(() => {
    window.addEventListener('resize', updateImgBox);
    return () => window.removeEventListener('resize', updateImgBox);
  }, []);

  // Draw magnifying loupe when dragging a corner
  useEffect(() => {
    if (activeIndex === null) return;
    const img = imgRef.current;
    const canvas = loupeCanvasRef.current;
    if (!img || !canvas || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const pt = corners[activeIndex];
    const srcX = pt.x * img.naturalWidth;
    const srcY = pt.y * img.naturalHeight;
    const cropRadius = Math.max(30, Math.min(img.naturalWidth, img.naturalHeight) * 0.08);

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, size, size);

    ctx.drawImage(
      img,
      srcX - cropRadius,
      srcY - cropRadius,
      cropRadius * 2,
      cropRadius * 2,
      0,
      0,
      size,
      size
    );

    // Crosshair inside loupe
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }, [activeIndex, corners]);

  const clientToNormalized = (clientX: number, clientY: number): Point => {
    const container = containerRef.current;
    if (!container) return { x: 0.5, y: 0.5 };
    const cRect = container.getBoundingClientRect();
    const x = (clientX - cRect.left - imgBox.left) / imgBox.width;
    const y = (clientY - cRect.top - imgBox.top) / imgBox.height;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeIndex === null) return;
    e.preventDefault();
    const pt = clientToNormalized(e.clientX, e.clientY);
    setCorners((prev) => {
      const next: Quad = [...prev] as Quad;
      next[activeIndex] = pt;
      return next;
    });
  };

  const handleAutoDetect = async () => {
    setDetecting(true);
    try {
      const detected = await detectDocumentCorners(imageDataUrl);
      setCorners(detected);
    } finally {
      setDetecting(false);
    }
  };

  const polygonPoints = corners
    .map((p) => `${imgBox.left + p.x * imgBox.width},${imgBox.top + p.y * imgBox.height}`)
    .join(' ');

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-white select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={() => setActiveIndex(null)}
      onPointerCancel={() => setActiveIndex(null)}
    >
      {/* Top Bar */}
      <header className="safe-top flex items-center justify-between border-b border-slate-800/80 px-4 pb-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-slate-300 hover:text-white"
          aria-label="ត្រឡប់ក្រោយ"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h2 className="text-sm font-semibold text-white">កាត់តម្រង់ជ្រុងឯកសារ</h2>
          {pageLabel && <p className="text-[11px] text-teal-400">{pageLabel}</p>}
        </div>

        <button
          type="button"
          onClick={() => onConfirm(corners, rotation)}
          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-teal-900/40 hover:bg-teal-500 active:scale-95"
        >
          <span>បន្ទាប់</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      {/* Crop Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-950 p-4 touch-none"
      >
        <img
          ref={imgRef}
          src={imageDataUrl}
          alt="ឯកសារត្រូវកាត់"
          onLoad={updateImgBox}
          draggable={false}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />

        {/* SVG Darkened Mask & Quad Lines */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <mask id="crop-hole-mask">
              <rect width="100%" height="100%" fill="white" />
              <polygon points={polygonPoints} fill="black" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(2, 6, 23, 0.58)"
            mask="url(#crop-hole-mask)"
          />
          <polygon
            points={polygonPoints}
            fill="rgba(20, 184, 166, 0.08)"
            stroke="#14b8a6"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>

        {/* Draggable 4 Corner Handles */}
        {corners.map((pt, idx) => {
          const left = imgBox.left + pt.x * imgBox.width;
          const top = imgBox.top + pt.y * imgBox.height;
          const isActive = activeIndex === idx;
          return (
            <button
              key={idx}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                setActiveIndex(idx);
              }}
              style={{ left: `${left}px`, top: `${top}px` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full touch-none transition-transform ${
                isActive ? 'scale-125' : ''
              }`}
              aria-label={`ជ្រុងទី ${idx + 1}`}
            >
              <span
                className={`h-6 w-6 rounded-full border-2 border-white shadow-lg ${
                  isActive ? 'bg-amber-400' : 'bg-teal-500'
                }`}
              />
            </button>
          );
        })}

        {/* Magnifying Loupe while dragging */}
        {activeIndex !== null && (
          <div className="pointer-events-none absolute left-4 top-4 overflow-hidden rounded-full border-2 border-teal-400 bg-slate-950 shadow-2xl">
            <canvas ref={loupeCanvasRef} width={116} height={116} className="block h-[116px] w-[116px]" />
          </div>
        )}
      </div>

      {/* Bottom Tools */}
      <footer className="safe-bottom flex items-center justify-around border-t border-slate-800/80 bg-slate-900/90 px-4 pt-3">
        <button
          type="button"
          onClick={handleAutoDetect}
          disabled={detecting}
          className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-xs text-slate-200 hover:text-teal-400 active:scale-95 disabled:opacity-50"
        >
          <Scan className="h-5 w-5 text-teal-400" />
          <span>{detecting ? 'កំពុងស្វែងរក...' : 'ស្វ័យប្រវត្តិ'}</span>
        </button>

        <button
          type="button"
          onClick={() => setCorners(FULL_QUAD)}
          className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-xs text-slate-200 hover:text-teal-400 active:scale-95"
        >
          <Maximize2 className="h-5 w-5" />
          <span>ពេញទំព័រ</span>
        </button>

        <button
          type="button"
          onClick={() => setCorners(DEFAULT_QUAD)}
          className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-xs text-slate-200 hover:text-teal-400 active:scale-95"
        >
          <RotateCcw className="h-5 w-5" />
          <span>កំណត់ឡើងវិញ</span>
        </button>
      </footer>
    </div>
  );
};

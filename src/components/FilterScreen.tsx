import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Crop,
  Loader2,
  RotateCw,
  SlidersHorizontal,
} from 'lucide-react';
import type { FilterId, Quad, RotationDeg } from '../types';
import { FILTER_OPTIONS, renderScannedPage } from '../lib/imageProcessing';

interface FilterScreenProps {
  originalDataUrl: string;
  corners: Quad;
  initialFilter: FilterId;
  initialBrightness: number;
  initialContrast: number;
  initialRotation: RotationDeg;
  pageLabel?: string;
  onBackToCrop: (state: {
    filter: FilterId;
    brightness: number;
    contrast: number;
    rotation: RotationDeg;
  }) => void;
  onSave: (result: {
    processedDataUrl: string;
    width: number;
    height: number;
    filter: FilterId;
    brightness: number;
    contrast: number;
    rotation: RotationDeg;
  }) => void;
}

export const FilterScreen: React.FC<FilterScreenProps> = ({
  originalDataUrl,
  corners,
  initialFilter,
  initialBrightness,
  initialContrast,
  initialRotation,
  pageLabel,
  onBackToCrop,
  onSave,
}) => {
  const [filter, setFilter] = useState<FilterId>(initialFilter);
  const [brightness, setBrightness] = useState(initialBrightness);
  const [contrast, setContrast] = useState(initialContrast);
  const [rotation, setRotation] = useState<RotationDeg>(initialRotation);
  const [showAdjust, setShowAdjust] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Partial<Record<FilterId, string>>>({});
  const [rendering, setRendering] = useState(true);
  const [saving, setSaving] = useState(false);

  // Generate mini thumbnails for all 5 filters once when corners/rotation change
  useEffect(() => {
    let cancelled = false;
    async function buildThumbs() {
      const results: Partial<Record<FilterId, string>> = {};
      for (const opt of FILTER_OPTIONS) {
        if (cancelled) return;
        try {
          const r = await renderScannedPage({
            originalDataUrl,
            corners,
            filter: opt.id,
            brightness: 0,
            contrast: 0,
            rotation,
            maxSide: 180,
          });
          results[opt.id] = r.dataUrl;
        } catch {
          // ignore thumb failure
        }
      }
      if (!cancelled) setThumbs(results);
    }
    buildThumbs();
    return () => {
      cancelled = true;
    };
  }, [originalDataUrl, corners, rotation]);

  // Render medium-res preview whenever filter/sliders/rotation change
  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    const timer = setTimeout(async () => {
      try {
        const res = await renderScannedPage({
          originalDataUrl,
          corners,
          filter,
          brightness,
          contrast,
          rotation,
          maxSide: 960,
        });
        if (!cancelled) {
          setPreviewUrl(res.dataUrl);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [originalDataUrl, corners, filter, brightness, contrast, rotation]);

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      const finalRes = await renderScannedPage({
        originalDataUrl,
        corners,
        filter,
        brightness,
        contrast,
        rotation,
        maxSide: 1600,
      });
      onSave({
        processedDataUrl: finalRes.dataUrl,
        width: finalRes.width,
        height: finalRes.height,
        filter,
        brightness,
        contrast,
        rotation,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <header className="safe-top flex items-center justify-between border-b border-slate-800/80 px-4 pb-3">
        <button
          type="button"
          onClick={() => onBackToCrop({ filter, brightness, contrast, rotation })}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-medium text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>កាត់ម្តងទៀត</span>
        </button>

        <div className="text-center">
          <h2 className="text-sm font-semibold text-white">កែលម្អពណ៌ឯកសារ</h2>
          {pageLabel && <p className="text-[11px] text-teal-400">{pageLabel}</p>}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleConfirmSave}
          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-teal-900/40 hover:bg-teal-500 active:scale-95 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          <span>{saving ? 'កំពុងរក្សា...' : 'រក្សាទុក'}</span>
        </button>
      </header>

      {/* Live Warped Preview */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-950 p-4">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="លទ្ធផលស្កេន"
            className="max-h-full max-w-full rounded-xl bg-white object-contain shadow-2xl"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            <span className="text-xs">កំពុងដំណើរការកាត់តម្រង់...</span>
          </div>
        )}

        {rendering && previewUrl && (
          <div className="absolute right-6 top-6 flex items-center gap-1.5 rounded-full bg-slate-900/85 px-3 py-1.5 text-[11px] text-teal-300 backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>កំពុងអនុវត្ត...</span>
          </div>
        )}
      </div>

      {/* Adjust Sliders Panel */}
      {showAdjust && (
        <div className="border-t border-slate-800 bg-slate-900/95 px-5 py-3.5">
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs text-slate-300">ពន្លឺ ({brightness > 0 ? `+${brightness}` : brightness})</span>
              <input
                type="range"
                min={-40}
                max={40}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="pscan-slider flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs text-slate-300">កម្រិតពណ៌ ({contrast > 0 ? `+${contrast}` : contrast})</span>
              <input
                type="range"
                min={-40}
                max={40}
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="pscan-slider flex-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter Strip + Quick Actions */}
      <footer className="safe-bottom border-t border-slate-800/80 bg-slate-900/95 pt-3">
        <div className="flex items-center gap-2.5 overflow-x-auto px-4 pb-3">
          {FILTER_OPTIONS.map((opt) => {
            const active = filter === opt.id;
            const thumb = thumbs[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-1.5 transition ${
                  active
                    ? 'border-teal-400 bg-teal-500/15'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="h-14 w-12 overflow-hidden rounded-xl bg-slate-800">
                  {thumb ? (
                    <img src={thumb} alt={opt.labelKm} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-slate-800" />
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    active ? 'text-teal-300' : 'text-slate-300'
                  }`}
                >
                  {opt.labelKm}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-around border-t border-slate-800/60 px-4 pt-2.5">
          <button
            type="button"
            onClick={() => setShowAdjust((s) => !s)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs ${
              showAdjust ? 'bg-teal-600/20 text-teal-300' : 'text-slate-300 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>កែសម្រួលពន្លឺ</span>
          </button>

          <button
            type="button"
            onClick={() => setRotation((r) => (((r + 90) % 360) as RotationDeg))}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            <RotateCw className="h-4 w-4" />
            <span>បង្វិល 90°</span>
          </button>

          <button
            type="button"
            onClick={() => onBackToCrop({ filter, brightness, contrast, rotation })}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            <Crop className="h-4 w-4" />
            <span>កាត់ជ្រុង</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

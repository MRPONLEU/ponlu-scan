import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Flashlight,
  FlashlightOff,
  Grid3X3,
  ImagePlus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';

interface CameraScreenProps {
  onClose: () => void;
  onCaptureBatch: (dataUrls: string[]) => void;
  onPickFromGallery: (files: FileList) => void;
  onUseSample: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onClose,
  onCaptureBatch,
  onPickFromGallery,
  onUseSample,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedList, setCapturedList] = useState<string[]>([]);
  const [flashEffect, setFlashEffect] = useState(false);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      setErrorMsg(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('ឧបករណ៍ ឬ Browser នេះមិនគាំទ្រការបើកកាមេរ៉ាដោយផ្ទាល់ទេ');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setHasTorch(Boolean(caps?.torch));
        setTorchOn(false);
      } catch {
        setErrorMsg('មិនអាចបើកកាមេរ៉ាបានទេ។ សូមអនុញ្ញាតសិទ្ធិកាមេរ៉ា ឬជ្រើសរើសរូបភាពពីទូរសព្ទ។');
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      // Ignore if device rejects torch constraint
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 140);

    setCapturedList((prev) => [...prev, dataUrl]);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black text-white">
      {/* Top Camera Bar */}
      <div className="safe-top z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 pb-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70"
          aria-label="បិទកាមេរ៉ា"
        >
          <X className="h-5 w-5" />
        </button>

        <span className="rounded-full bg-black/50 px-3.5 py-1 text-xs font-medium text-teal-300 backdrop-blur-md">
          តម្រង់ឯកសារឱ្យចូលក្នុងស៊ុម
        </span>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
              aria-label="បើកឬបិទភ្លើង"
            >
              {torchOn ? <Flashlight className="h-5 w-5 text-amber-400" /> : <FlashlightOff className="h-5 w-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md ${
              showGrid ? 'bg-teal-600/80 text-white' : 'bg-black/50 text-slate-300'
            }`}
            aria-label="បង្ហាញឬលាក់ក្រឡាចត្រង្គ"
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden bg-slate-950">
        {errorMsg ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="max-w-xs text-sm leading-relaxed text-slate-300">{errorMsg}</p>
            <div className="mt-5 flex flex-col gap-2.5 w-full max-w-xs">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white">
                <ImagePlus className="h-4 w-4" />
                ជ្រើសរើសរូបភាពពីទូរសព្ទ
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) onPickFromGallery(e.target.files);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={onUseSample}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-teal-300"
              >
                <Sparkles className="h-4 w-4" />
                សាកល្បងឯកសារគំរូ
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />

            {/* Grid overlay */}
            {showGrid && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
                {/* Document guide frame */}
                <div className="absolute inset-8 rounded-2xl border border-dashed border-teal-400/50" />
              </div>
            )}

            {/* Shutter flash */}
            {flashEffect && <div className="pointer-events-none absolute inset-0 bg-white/75" />}
          </>
        )}
      </div>

      {/* Bottom Camera Controls */}
      <div className="safe-bottom z-20 flex items-center justify-between bg-black/90 px-6 pt-4">
        {/* Gallery / Switch camera */}
        <div className="flex items-center gap-3">
          <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-200 hover:border-teal-500">
            <ImagePlus className="h-5 w-5" />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) onPickFromGallery(e.target.files);
              }}
            />
          </label>
          {!errorMsg && (
            <button
              type="button"
              onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-200"
              aria-label="ប្តូរកាមេរ៉ា"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Shutter button */}
        <button
          type="button"
          disabled={Boolean(errorMsg)}
          onClick={handleCapture}
          className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white p-1 transition active:scale-90 disabled:opacity-40"
          aria-label="ថតរូប"
        >
          <div className="h-full w-full rounded-full bg-teal-500" />
        </button>

        {/* Batch finish button */}
        <div className="flex min-w-[96px] justify-end">
          {capturedList.length > 0 ? (
            <button
              type="button"
              onClick={() => onCaptureBatch(capturedList)}
              className="flex items-center gap-2 rounded-2xl bg-teal-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-teal-900/50 active:scale-95"
            >
              <img
                src={capturedList[capturedList.length - 1]}
                alt="ទំព័រដែលថត"
                className="h-7 w-7 rounded-lg object-cover ring-1 ring-white/40"
              />
              <span>បន្ទាប់ ({capturedList.length})</span>
              <Check className="h-4 w-4" />
            </button>
          ) : (
            <div className="w-12" />
          )}
        </div>
      </div>
    </div>
  );
};

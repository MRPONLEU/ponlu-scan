import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  ExternalLink,
  Flashlight,
  FlashlightOff,
  ImagePlus,
  QrCode,
  RefreshCw,
  Wifi,
  X,
} from 'lucide-react';
import {
  decodeQrFromImageData,
  decodeQrFromImageSource,
  parseQrPayload,
  type ParsedQrPayload,
} from '../lib/qrScanner';

interface QrScannerScreenProps {
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const QrScannerScreen: React.FC<QrScannerScreenProps> = ({ onClose, onNotify }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanned, setScanned] = useState<ParsedQrPayload | null>(null);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      setErrorMsg(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('ឧបករណ៍ ឬ Browser នេះមិនគាំទ្រការបើកកាមេរ៉ាទេ សូមជ្រើសរើសរូបភាព QR ជំនួសវិញ');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
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
        setErrorMsg('មិនអាចបើកកាមេរ៉ាបានទេ។ សូមអនុញ្ញាតសិទ្ធិកាមេរ៉ា ឬជ្រើសរើសរូបភាព QR ពីទូរសព្ទ។');
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

  // Continuous QR frame scanner
  useEffect(() => {
    if (errorMsg || scanned) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      if (!scanCanvasRef.current) {
        scanCanvasRef.current = document.createElement('canvas');
      }
      const canvas = scanCanvasRef.current;
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      const w = Math.max(64, Math.round(video.videoWidth * scale));
      const h = Math.max(64, Math.round(video.videoHeight * scale));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const raw = decodeQrFromImageData(imgData.data, w, h);
      if (raw) {
        setScanned(parseQrPayload(raw));
        if (navigator.vibrate) navigator.vibrate(60);
      }
    }, 180);

    return () => clearInterval(interval);
  }, [errorMsg, scanned]);

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
      // ignore unsupported torch
    }
  };

  const handlePickQrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const raw = await decodeQrFromImageSource(file);
      if (raw) {
        setScanned(parseQrPayload(raw));
      } else {
        onNotify('រកមិនឃើញ QR Code នៅក្នុងរូបភាពនេះទេ');
      }
    } catch {
      onNotify('មិនអាចអានរូបភាព QR បានទេ');
    }
  };

  const copyText = async (val: string, msg = 'បានចម្លងទិន្នន័យ QR') => {
    try {
      await navigator.clipboard.writeText(val);
      onNotify(msg);
    } catch {
      onNotify('មិនអាចចម្លងបានទេ');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black text-white">
      {/* Top Bar */}
      <header className="safe-top z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 pb-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
          aria-label="បិទ"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1.5 rounded-full bg-black/55 px-3.5 py-1.5 text-xs font-medium text-teal-300 backdrop-blur-md">
          <QrCode className="h-4 w-4" />
          <span>តម្រង់កាមេរ៉ាទៅកាន់ QR Code</span>
        </div>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
              aria-label="ភ្លើង"
            >
              {torchOn ? <Flashlight className="h-5 w-5 text-amber-400" /> : <FlashlightOff className="h-5 w-5" />}
            </button>
          )}
        </div>
      </header>

      {/* Camera Viewfinder */}
      <div className="relative flex-1 overflow-hidden bg-slate-950">
        {errorMsg ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <QrCode className="mb-3 h-12 w-12 text-teal-400" />
            <p className="max-w-xs text-sm leading-relaxed text-slate-300">{errorMsg}</p>
            <label className="mt-5 flex cursor-pointer items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white">
              <ImagePlus className="h-4 w-4" />
              ជ្រើសរើសរូបភាព QR ពីទូរសព្ទ
              <input type="file" accept="image/*" className="hidden" onChange={handlePickQrImage} />
            </label>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />

            {/* QR Target Frame */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-64 w-64 rounded-3xl border-2 border-teal-400/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.52)]">
                <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-teal-400" />
                <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-teal-400" />
                <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-teal-400" />
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-teal-400" />
                <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Bar */}
      <footer className="safe-bottom z-20 flex items-center justify-around bg-black/90 px-6 pt-4">
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl px-4 py-1.5 text-slate-200 hover:text-teal-300">
          <ImagePlus className="h-5 w-5 text-teal-400" />
          <span className="text-[11px] font-medium">រើសរូបភាព QR</span>
          <input type="file" accept="image/*" className="hidden" onChange={handlePickQrImage} />
        </label>

        {!errorMsg && (
          <button
            type="button"
            onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
            className="flex flex-col items-center gap-1 rounded-2xl px-4 py-1.5 text-slate-200 hover:text-teal-300"
          >
            <RefreshCw className="h-5 w-5" />
            <span className="text-[11px] font-medium">ប្តូរកាមេរ៉ា</span>
          </button>
        )}
      </footer>

      {/* Scanned QR Result Modal */}
      {scanned && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="safe-bottom w-full max-w-md rounded-t-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-300">
                {scanned.labelKm}
              </span>
              <button
                type="button"
                onClick={() => setScanned(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {scanned.wifi ? (
              <div className="mt-4 space-y-2.5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm">
                <div className="flex items-center gap-2 text-teal-400">
                  <Wifi className="h-4 w-4" />
                  <span className="font-semibold">{scanned.wifi.ssid || '(គ្មានឈ្មោះ)'}</span>
                </div>
                <p className="text-xs text-slate-400">
                  ប្រភេទសុវត្ថិភាព៖ {scanned.wifi.encryption}
                </p>
                {scanned.wifi.password && (
                  <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2">
                    <span className="font-mono text-xs text-slate-200">
                      {scanned.wifi.password}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(scanned.wifi!.password, 'បានចម្លងពាក្យសម្ងាត់ Wi-Fi')
                      }
                      className="text-xs font-medium text-teal-400 hover:text-teal-300"
                    >
                      ចម្លង
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 max-h-44 overflow-y-auto break-all rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-sm leading-relaxed text-slate-100">
                {scanned.raw}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {scanned.type === 'url' && (
                <a
                  href={scanned.raw}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-500"
                >
                  <ExternalLink className="h-4 w-4" />
                  បើកតំណភ្ជាប់
                </a>
              )}

              {(scanned.type === 'tel' || scanned.type === 'email') && (
                <a
                  href={scanned.raw}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-500"
                >
                  <ExternalLink className="h-4 w-4" />
                  បើកកម្មវិធីពាក់ព័ន្ធ
                </a>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(scanned.raw)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 py-3 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  <Copy className="h-4 w-4 text-teal-400" />
                  ចម្លងទិន្នន័យ
                </button>
                <button
                  type="button"
                  onClick={() => setScanned(null)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-teal-500/40 bg-teal-500/10 py-3 text-xs font-semibold text-teal-300 hover:bg-teal-500/20"
                >
                  <QrCode className="h-4 w-4" />
                  ស្កេនបន្ត
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

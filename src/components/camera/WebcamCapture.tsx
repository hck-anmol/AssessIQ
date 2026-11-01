"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from "lucide-react";

interface WebcamCaptureProps {
  onCapture: (blob: Blob) => void;
  autoCapture?: boolean;
  label?: string;
  showPreview?: boolean;
}

export function WebcamCapture({
  onCapture,
  autoCapture = false,
  label = "Capture Photo",
  showPreview = true,
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCaptured, setIsCaptured] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setIsCameraReady(true);
      }
    } catch {
      setError("Camera permission denied. Please allow camera access in your browser to proceed.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraReady(false);
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setCapturedUrl(url);
        setIsCaptured(true);
        onCapture(blob);
        stopCamera();
      },
      "image/jpeg",
      0.85
    );
  }, [isCameraReady, onCapture, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (autoCapture && isCameraReady) {
      const timer = setTimeout(capture, 500);
      return () => clearTimeout(timer);
    }
  }, [autoCapture, isCameraReady, capture]);

  const handleRetake = () => {
    setIsCaptured(false);
    setCapturedUrl(null);
    startCamera();
  };

  if (error) {
    return (
      <div className="rounded-xl bg-rose-50 border border-rose-200 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <p className="text-rose-900 font-medium text-sm">{error}</p>
        <p className="text-rose-600 text-xs mt-1">Camera presence is required for identity audit compliance.</p>
        <button
          onClick={startCamera}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Grant Camera Permission</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video preview with framing guide */}
      {!isCaptured && (
        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 aspect-video shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover transform -scale-x-100"
          />

          {/* Framing target overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-dashed border-white/40 flex items-center justify-center">
              <span className="text-[11px] font-medium text-white/60 tracking-wider uppercase px-2 py-0.5 rounded bg-black/40">
                Align Face
              </span>
            </div>
          </div>

          {!isCameraReady && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs text-slate-300">Initializing biometric camera...</span>
            </div>
          )}
        </div>
      )}

      {/* Captured preview card */}
      {isCaptured && showPreview && capturedUrl && (
        <div className="rounded-xl overflow-hidden border border-emerald-200 bg-white shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capturedUrl}
            alt="Candidate Biometric Capture"
            className="w-full aspect-video object-cover transform -scale-x-100"
          />
          <div className="bg-emerald-50 px-4 py-3 flex items-center justify-between border-t border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Biometric Photo Verified</span>
            </div>
            <button
              onClick={handleRetake}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for snapshot rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Capture action button */}
      {!isCaptured && !autoCapture && (
        <button
          onClick={capture}
          disabled={!isCameraReady}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
        >
          <Camera className="w-4 h-4" />
          <span>{label}</span>
        </button>
      )}
    </div>
  );
}

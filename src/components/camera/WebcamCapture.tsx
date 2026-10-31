"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface WebcamCaptureProps {
  onCapture: (blob: Blob) => void;
  autoCapture?: boolean; // capture immediately on mount
  label?: string;
  showPreview?: boolean;
}

export function WebcamCapture({
  onCapture,
  autoCapture = false,
  label = "Take Photo",
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
      setError("Camera access denied. Please allow camera access to continue.");
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
      0.8
    );
  }, [isCameraReady, onCapture, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Auto-capture when camera is ready
  useEffect(() => {
    if (autoCapture && isCameraReady) {
      const timer = setTimeout(capture, 500);
      return () => clearTimeout(timer);
    }
  }, [autoCapture, isCameraReady, capture]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={startCamera}
          className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video preview */}
      {!isCaptured && (
        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video object-cover"
          />
          {!isCameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Captured preview */}
      {isCaptured && showPreview && capturedUrl && (
        <div className="rounded-xl overflow-hidden border border-green-500/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedUrl} alt="Captured" className="w-full aspect-video object-cover" />
          <div className="bg-green-500/10 px-4 py-2 text-center">
            <p className="text-green-400 text-sm font-medium">✅ Photo captured successfully</p>
          </div>
        </div>
      )}

      {/* Canvas (hidden, used for capture) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Capture button */}
      {!isCaptured && !autoCapture && (
        <button
          onClick={capture}
          disabled={!isCameraReady}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition"
        >
          📷 {label}
        </button>
      )}
    </div>
  );
}

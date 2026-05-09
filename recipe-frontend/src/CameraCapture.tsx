import { useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function CameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setReady(false);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (err) {
        const name = (err as Error).name;
        if (name === 'NotAllowedError') {
          setError('Camera permission denied. Allow camera access in your browser to use this feature.');
        } else if (name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(`Could not access camera: ${(err as Error).message}`);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [open]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !ready) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.9
    );
  };

  if (!open) return null;

  return (
    <div className="camera-overlay" onClick={onClose}>
      <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close camera">×</button>

        {error ? (
          <div className="camera-error">
            <p>{error}</p>
            <button className="add-btn" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="camera-video" playsInline muted />
            <div className="camera-controls">
              <button className="add-btn" onClick={onClose}>Cancel</button>
              <button className="search-btn camera-shutter" onClick={handleCapture} disabled={!ready}>
                {ready ? '📸 Capture' : 'Loading…'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

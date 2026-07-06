import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = 'qr-camera-element';

  useEffect(() => {
    // Start scanner
    const startScanner = async () => {
      try {
        scannerRef.current = new Html5Qrcode(regionId);
        await scannerRef.current.start(
          { facingMode: 'environment' }, // Rear camera
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            onScanSuccess(decodedText);
            stopScanner();
          },
          () => {
            // Silence verbose errors
          }
        );
      } catch (err) {
        console.error('Camera startup failed:', err);
      }
    };

    startScanner();

    // Clean up
    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md border border-white/10 rounded-3xl bg-slate-900 shadow-2xl overflow-hidden animate-scale-up text-white">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-lg">Scan Equipment QR Code</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          <p className="text-slate-400 text-sm text-center mb-6">
            Align the equipment QR code tag within the square frame below.
          </p>

          <div className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden border border-white/10 bg-black">
            <div id={regionId} className="w-full h-full"></div>
            {/* Laser scanning overlay line */}
            <div className="absolute inset-x-0 scan-laser pointer-events-none"></div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleClose}
              className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold border border-white/10 transition-colors"
            >
              Cancel Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

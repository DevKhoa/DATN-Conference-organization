import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import Button from "../components/ui/Button";

interface CheckinScannerProps {
  onNavigateBack: () => void;
  sessionIds: number[]; // Đã thay thế authToken bằng sessionIds
}

interface ScanResult {
  status: "success" | "error" | "loading" | "idle";
  message: string;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

const CheckinScanner: React.FC<CheckinScannerProps> = ({
  onNavigateBack,
  sessionIds,
}) => {
  const [scanResult, setScanResult] = useState<ScanResult>({
    status: "idle",
    message: "Point camera at a Check-in QR Code",
  });
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const audioCtx = new AudioContext();
      audioRef.current = {
        play: async () => {
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.00001,
            audioCtx.currentTime + 0.1,
          );
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.1);
        },
      } as any;
    }

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setHasCameraPermission(true);
        scannerRef.current = new Html5Qrcode("qr-reader");

        await scannerRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          onScanSuccess,
          onScanFailure,
        );
      } else {
        setHasCameraPermission(false);
      }
    } catch (err) {
      console.error("Error starting camera", err);
      setHasCameraPermission(false);
    }
  };

  const playSuccessSound = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .catch((e) => console.log("Audio play prevented", e));
    }
  };

  const processCheckin = async (registrationId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: registrationId,
          session_ids: sessionIds, // Truyền danh sách session_ids vào payload
        }),
      });

      const data = await response.json();

      if (response.ok) {
        playSuccessSound();
        setScanResult({
          status: "success",
          message: `Successfully checked in ID: ${registrationId}`,
        });
      } else {
        setScanResult({
          status: "error",
          message: data.detail || "Check-in failed",
        });
      }
    } catch (err) {
      setScanResult({
        status: "error",
        message: "Network error communicating with server",
      });
    } finally {
      setTimeout(() => {
        isScanningRef.current = false;
        setScanResult({
          status: "idle",
          message: "Point camera at a Check-in QR Code",
        });
      }, 2500);
    }
  };

  const onScanSuccess = (decodedText: string, decodedResult: any) => {
    console.log("1. Raw decoded text:", decodedText);

    if (isScanningRef.current) {
      return;
    }
    isScanningRef.current = true;

    setScanResult({ status: "loading", message: "Processing QR Code..." });

    const match =
      decodedText.match(/(?:code is|registration_id)[\s:]*(\d+)/i) ||
      decodedText.match(/(?:^|\D)(\d+)(?:\D|$)/);

    if (match && match[1]) {
      const registrationId = parseInt(match[1], 10);

      console.log("Registration ID:", registrationId);

      processCheckin(registrationId);
    } else {
      console.warn("Registration ID not found", decodedText);

      setScanResult({ status: "error", message: "Invalid QR Code Format" });
      setTimeout(() => {
        isScanningRef.current = false;
        setScanResult({
          status: "idle",
          message: "Point camera at a Check-in QR Code",
        });
      }, 2500);
    }
  };

  const onScanFailure = (error: any) => {};

  const getStatusColor = () => {
    switch (scanResult.status) {
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "error":
        return "bg-red-50 text-red-700 border-red-200";
      case "loading":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-white text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = () => {
    switch (scanResult.status) {
      case "success":
        return <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-500" />;
      case "error":
        return <XCircle className="w-6 h-6 shrink-0 text-red-500" />;
      case "loading":
        return (
          <Loader2 className="w-6 h-6 shrink-0 text-blue-500 animate-spin" />
        );
      default:
        return (
          <RefreshCcw className="w-6 h-6 shrink-0 text-slate-400 animate-spin-slow" />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="p-4 flex items-center justify-between shrink-0 bg-slate-900/90 backdrop-blur-sm z-10 border-b border-white/10">
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="bg-brand-600 text-white px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-lg border border-white/20">
          Scanner
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
        {/* Main Card */}
        <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          {/* Camera Feed Container */}
          <div className="relative aspect-square sm:aspect-[4/5] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-slate-900 m-4 rounded-2xl border-2 border-slate-800">
                <XCircle className="w-10 h-10 text-red-400 mb-3" />
                <p className="text-white font-bold mb-1">
                  Camera Access Denied
                </p>
                <p className="text-slate-400 text-xs sm:text-sm mb-4">
                  Please allow camera permissions in your browser to scan QR
                  codes.
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full justify-center"
                  variant="primary"
                >
                  Reload Page
                </Button>
              </div>
            )}

            <div
              id="qr-reader"
              className="w-full h-full [&>video]:object-cover"
              style={{ width: "100%", height: "100%", border: "none" }}
            ></div>

            {/* Scanning Overlay */}
            {hasCameraPermission !== false && scanResult.status === "idle" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 overflow-hidden">
                <div className="w-[65%] h-[65%] sm:w-[250px] sm:h-[250px] border-2 border-dashed border-white/70 animate-[pulse_2s_ease-in-out_infinite] rounded-xl shadow-[0_0_0_9999px_rgba(15,23,42,0.5)]"></div>
              </div>
            )}
          </div>

          {/* Scan Result Banner */}
          <div
            className={`p-4 sm:p-5 flex items-start sm:items-center gap-3 transition-all duration-300 border-t ${getStatusColor()}`}
          >
            <div className="shrink-0 bg-white p-2 sm:p-2.5 rounded-xl shadow-sm mt-0.5 sm:mt-0">
              {getStatusIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold text-sm sm:text-base ${scanResult.status === "success" ? "text-emerald-900" : scanResult.status === "error" ? "text-red-900" : "text-slate-900"}`}
              >
                {scanResult.status === "idle"
                  ? "Scanning..."
                  : scanResult.status === "success"
                    ? "Check-in Successful"
                    : scanResult.status === "loading"
                      ? "Processing"
                      : "Scan Failed"}
              </h3>
              <p className="text-xs sm:text-sm opacity-90 font-medium break-words mt-0.5">
                {scanResult.message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-slate-400 text-xs sm:text-sm mt-6 mb-2 font-medium max-w-xs text-center shrink-0">
          Position the QR code within the frame to automatically check in the
          attendee.
        </p>
      </div>
    </div>
  );
};

export default CheckinScanner;

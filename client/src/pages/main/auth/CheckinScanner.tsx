import { useEffect, useState, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCcw,
  QrCode,
} from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCheckinMutation } from "@/features/attendances/services/mutations";
import { Route } from "@/routes/(app)/checkin";
import { AuthLayout } from "@/layouts/AuthLayout";

type ScanStatus = "success" | "error" | "loading" | "idle";

interface ScanResult {
  status: ScanStatus;
  message: string;
}

const RESET_DELAY_MS = 2500;

const CheckinScannerPage = () => {
  const router = useRouter();
  const { sessionIds: sessionIdsParam } = Route.useSearch();

  // Parse sessionIds from comma-separated string to number array
  const sessionIds = sessionIdsParam
    ? sessionIdsParam
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id))
    : [];

  const [scanResult, setScanResult] = useState<ScanResult>({
    status: "idle",
    message: "Point camera at a Check-in QR Code",
  });
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const checkinMutation = useCheckinMutation();

  const playSuccessSound = useCallback(() => {
    if (!audioContextRef.current) return;

    const audioCtx = audioContextRef.current;
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
  }, []);

  const resetScanner = useCallback(() => {
    setTimeout(() => {
      isScanningRef.current = false;
      setScanResult({
        status: "idle",
        message: "Point camera at a Check-in QR Code",
      });
    }, RESET_DELAY_MS);
  }, []);

  const processCheckin = useCallback(
    async (registrationId: number) => {
      checkinMutation.mutate(
        {
          registration_id: registrationId,
          session_ids: sessionIds,
        },
        {
          onSuccess: () => {
            playSuccessSound();
            setScanResult({
              status: "success",
              message: `Successfully checked in ID: ${registrationId}`,
            });
            resetScanner();
          },
          onError: (error) => {
            setScanResult({
              status: "error",
              message:
                error instanceof Error ? error.message : "Check-in failed",
            });
            resetScanner();
          },
        },
      );
    },
    [checkinMutation, sessionIds, playSuccessSound, resetScanner],
  );

  const onScanSuccess = useCallback(
    (decodedText: string) => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;

      setScanResult({ status: "loading", message: "Processing QR Code..." });

      const match =
        decodedText.match(/(?:code is|registration_id)[\s:]*(\d+)/i) ||
        decodedText.match(/(?:^|\D)(\d+)(?:\D|$)/);

      if (match?.[1]) {
        const registrationId = parseInt(match[1], 10);
        processCheckin(registrationId);
      } else {
        setScanResult({ status: "error", message: "Invalid QR Code Format" });
        resetScanner();
      }
    },
    [processCheckin, resetScanner],
  );

  const startScanner = useCallback(async () => {
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
          () => {}, // onScanFailure - no action needed
        );
      } else {
        setHasCameraPermission(false);
      }
    } catch (err) {
      console.error("Error starting camera", err);
      setHasCameraPermission(false);
    }
  }, [onScanSuccess]);

  useEffect(() => {
    // Initialize audio context
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass();
    }

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [startScanner]);

  const getStatusStyles = (status: ScanStatus) => {
    const styles = {
      success: {
        container: "bg-emerald-50 text-emerald-700 border-emerald-200",
        title: "text-emerald-900",
        icon: <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-500" />,
        label: "Check-in Successful",
      },
      error: {
        container: "bg-red-50 text-red-700 border-red-200",
        title: "text-red-900",
        icon: <XCircle className="w-6 h-6 shrink-0 text-red-500" />,
        label: "Scan Failed",
      },
      loading: {
        container: "bg-blue-50 text-blue-700 border-blue-200",
        title: "text-slate-900",
        icon: (
          <Loader2 className="w-6 h-6 shrink-0 text-blue-500 animate-spin" />
        ),
        label: "Processing",
      },
      idle: {
        container: "bg-white text-slate-700 border-slate-200",
        title: "text-slate-900",
        icon: (
          <RefreshCcw
            className="w-6 h-6 shrink-0 text-slate-400 animate-spin"
            style={{ animationDuration: "3s" }}
          />
        ),
        label: "Scanning...",
      },
    };
    return styles[status];
  };

  const statusStyles = getStatusStyles(scanResult.status);

  return (
    <AuthLayout meta={{ title: "Check-in Scanner" }}>
      <div className="fixed inset-0 z-100 bg-background flex flex-col h-dvh text-foreground">
        {/* Header */}
        <header className="p-4 flex items-center justify-between shrink-0 bg-background/90 backdrop-blur-sm z-10 border-b border-border">
          <Button
            variant="ghost"
            onClick={() => router.history.back()}
            className="flex items-center gap-2 text-foreground/90 hover:text-foreground bg-accent/60 hover:bg-accent px-4 py-2 rounded-full transition-all border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Button>
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-lg border border-border">
            <QrCode className="w-3.5 h-3.5" />
            Scanner
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
          {/* Scanner Card */}
          <div className="w-full max-w-md bg-card rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-border">
            {/* Camera Feed Container */}
            <div className="relative aspect-square sm:aspect-4/5 w-full bg-muted flex items-center justify-center overflow-hidden">
              {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-background m-4 rounded-2xl border-2 border-border">
                  <XCircle className="w-10 h-10 text-destructive mb-3" />
                  <p className="text-foreground font-bold mb-1">
                    Camera Access Denied
                  </p>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-4">
                    Please allow camera permissions in your browser to scan QR
                    codes.
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full justify-center"
                  >
                    Reload Page
                  </Button>
                </div>
              )}

              <div
                id="qr-reader"
                className="w-full h-full [&>video]:object-cover"
                style={{ width: "100%", height: "100%", border: "none" }}
              />

              {/* Scanning Overlay */}
              {hasCameraPermission !== false &&
                scanResult.status === "idle" && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 overflow-hidden">
                    <div className="w-[65%] h-[65%] sm:w-62.5 sm:h-62.5 border-2 border-dashed border-background/70 animate-pulse rounded-xl shadow-[0_0_0_9999px_rgba(15,23,42,0.5)]" />
                  </div>
                )}
            </div>

            {/* Scan Result Banner */}
            <div
              className={`p-4 sm:p-5 flex items-start sm:items-center gap-3 transition-all duration-300 border-t ${statusStyles.container}`}
            >
              <div className="shrink-0 bg-background p-2 sm:p-2.5 rounded-xl shadow-sm mt-0.5 sm:mt-0 border border-border">
                {statusStyles.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-bold text-sm sm:text-base ${statusStyles.title}`}
                >
                  {statusStyles.label}
                </h3>
                <p className="text-xs sm:text-sm opacity-90 font-medium wrap-break-word mt-0.5">
                  {scanResult.message}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Text */}
          <p className="text-muted-foreground text-xs sm:text-sm mt-6 mb-2 font-medium max-w-xs text-center shrink-0">
            Position the QR code within the frame to automatically check in the
            attendee.
          </p>
        </main>
      </div>
    </AuthLayout>
  );
};

export default CheckinScannerPage;

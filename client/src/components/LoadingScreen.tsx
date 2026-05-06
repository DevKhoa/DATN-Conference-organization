import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface LoadingScreenProps {
  isLoading: boolean;
  minDisplayTime?: number;
  children: React.ReactNode;
}

/**
 * A loading screen component that prevents flickering by:
 * 1. Enforcing a minimum display time for the loading state
 * 2. Using fade animations for smooth transitions
 */
const LoadingScreen = ({
  isLoading,
  minDisplayTime = 800,
  children,
}: LoadingScreenProps) => {
  const [showLoading, setShowLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [loadingStartTime] = useState(() => Date.now());

  useEffect(() => {
    if (!isLoading) {
      const elapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);

      const timer = setTimeout(() => {
        setIsFadingOut(true);
        // Wait for fade-out animation to complete
        setTimeout(() => {
          setShowLoading(false);
        }, 300);
      }, remainingTime);

      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingStartTime, minDisplayTime]);

  if (!showLoading) {
    return <div className="animate-in fade-in duration-300">{children}</div>;
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 transition-opacity duration-300 ${
        isFadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-brand-500/20 blur-xl animate-pulse" />
          <Loader2 className="relative w-12 h-12 animate-spin text-brand-600" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg font-medium text-slate-700 animate-pulse">
            Loading...
          </span>
          <div className="flex gap-1">
            <span
              className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

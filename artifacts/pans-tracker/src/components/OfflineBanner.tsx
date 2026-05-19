import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[70] flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm font-medium shadow-sm">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>
        You&apos;re offline. Your data will sync when you reconnect.
      </span>
    </div>
  );
}

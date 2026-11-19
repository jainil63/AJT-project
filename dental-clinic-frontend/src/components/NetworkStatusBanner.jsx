import { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const NetworkStatusBanner = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showRestored, setShowRestored] = useState(false);
    const restoredTimer = useRef(null);

    useEffect(() => {
        const handleOffline = () => {
            setIsOnline(false);
            setShowRestored(false);
            clearTimeout(restoredTimer.current);
        };

        const handleOnline = () => {
            setIsOnline(true);
            setShowRestored(true);
            restoredTimer.current = setTimeout(() => setShowRestored(false), 4000);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            clearTimeout(restoredTimer.current);
        };
    }, []);

    if (isOnline && !showRestored) return null;

    return (
        <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all duration-500 ${
                isOnline
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-white'
            }`}
            style={{ minWidth: 280, maxWidth: 'calc(100vw - 32px)' }}
        >
            {isOnline ? (
                <>
                    <Wifi className="w-4 h-4 shrink-0 text-emerald-200" />
                    <span>Internet connection restored</span>
                    <span className="ml-auto text-emerald-300 text-xs font-normal">You&apos;re back online</span>
                </>
            ) : (
                <>
                    <WifiOff className="w-4 h-4 shrink-0 text-red-400 animate-pulse" />
                    <div className="flex flex-col">
                        <span>No internet connection</span>
                        <span className="text-xs font-normal text-slate-400">Please check your network and try again</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default NetworkStatusBanner;

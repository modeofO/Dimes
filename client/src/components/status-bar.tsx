interface StatusIndicatorProps {
    connected: boolean;
}

export function StatusIndicator({ connected }: StatusIndicatorProps) {
    return (
        <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium select-none">
                {connected ? 'Connected' : 'Disconnected'}
            </span>
        </div>
    );
}

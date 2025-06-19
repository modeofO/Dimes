interface StatusBarProps {
    status: {
        message: string;
        type: 'info' | 'success' | 'warning' | 'error';
    };
}

export function StatusBar({ status }: StatusBarProps) {
    const getStatusColor = () => {
        switch (status.type) {
            case 'success':
                return 'bg-green-500 text-white';
            case 'warning':
                return 'bg-orange-500 text-white';
            case 'error':
                return 'bg-red-500 text-white';
            default: // info
                return 'bg-blue-500 text-white';
        }
    };

    return (
        <div className={`px-4 py-2 text-sm font-medium ${getStatusColor()}`}>
            {status.message}
        </div>
    );
} 
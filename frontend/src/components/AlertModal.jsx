import { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function AlertModal({ isOpen, onClose, title, message, type = 'info' }) {
    if (!isOpen) return null;

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />;
            case 'error': return <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />;
            case 'warning': return <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />;
            default: return <Info className="h-12 w-12 text-blue-500 mx-auto" />;
        }
    };

    const getButtonClass = () => {
        switch (type) {
            case 'success': return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
            case 'error': return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
            case 'warning': return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
            default: return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className="mb-4">
                        {getIcon()}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {title}
                    </h3>
                    <div className="text-gray-600 mb-6 whitespace-pre-line text-sm">
                        {message}
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-full text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonClass()}`}
                    >
                        Okay
                    </button>
                </div>
            </div>
        </div>
    );
}

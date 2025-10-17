import React, { useState, useEffect } from 'react';

const UpdateNotification: React.FC = () => {
    const [show, setShow] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        const handleUpdate = (e: CustomEvent<ServiceWorkerRegistration>) => {
            if (e.detail.waiting) {
                setWaitingWorker(e.detail.waiting);
                setShow(true);
            }
        };

        window.addEventListener('swUpdate', handleUpdate as EventListener);

        return () => {
            window.removeEventListener('swUpdate', handleUpdate as EventListener);
        };
    }, []);

    const handleUpdateClick = () => {
        waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
        setShow(false);
    };

    if (!show) {
        return null;
    }

    return (
        <div 
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl p-4 flex items-center justify-between animate-fade-in-up"
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-teal-400">
                    <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m0 0a9 9 0 0 1 9-9m-9 9a9 9 0 0 0 9 9"/><path d="m3 12 4-4"/><path d="m3 12 4 4"/>
                </svg>
                <div>
                    <p className="font-bold text-zinc-900 dark:text-white">يتوفر تحديث جديد!</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">أعد تحميل التطبيق للحصول على آخر الميزات.</p>
                </div>
            </div>
            <button 
                onClick={handleUpdateClick}
                className="bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors flex-shrink-0"
            >
                تحديث
            </button>
        </div>
    );
};

// Add keyframes for animation
const style = document.createElement('style');
style.innerHTML = `
    @keyframes fade-in-up {
        0% {
            opacity: 0;
            transform: translate(-50%, 20px);
        }
        100% {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    .animate-fade-in-up {
        animation: fade-in-up 0.5s ease-out forwards;
    }
`;
document.head.appendChild(style);

export default UpdateNotification;

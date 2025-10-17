import React from 'react';

const StoreCardSkeleton: React.FC = () => {
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-4 animate-pulse">
            <div className="w-24 h-24 rounded-lg bg-slate-700 flex-shrink-0"></div>
            <div className="flex-1 min-w-0 space-y-3">
                <div className="h-5 bg-slate-700 rounded w-3/4"></div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-slate-700 rounded-full"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-slate-700 rounded w-1/3"></div>
            </div>
            <div className="w-20 h-10 bg-slate-700 rounded-md flex-shrink-0"></div>
        </div>
    );
};

export default StoreCardSkeleton;

import React from 'react';

const CommentCardSkeleton: React.FC = () => {
  return (
    <div className="flex items-start gap-3 animate-pulse">
        <div className="w-8 h-8 bg-slate-700 rounded-full flex-shrink-0"></div>
        <div className="flex-1 bg-slate-800 rounded-lg px-4 py-2 space-y-2">
            <div className="flex justify-between items-center">
                <div className="h-3 bg-slate-700 rounded w-20"></div>
                <div className="h-2 bg-slate-700 rounded w-12"></div>
            </div>
            <div className="h-3 bg-slate-700 rounded w-full"></div>
            <div className="h-3 bg-slate-700 rounded w-2/3"></div>
        </div>
    </div>
  );
};

export default CommentCardSkeleton;

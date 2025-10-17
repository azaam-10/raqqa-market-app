import React from 'react';

const PostCardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-slate-700 rounded-full mr-3"></div>
          <div>
            <div className="h-4 bg-slate-700 rounded w-24 mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-16"></div>
          </div>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-slate-700 rounded w-full"></div>
        <div className="h-4 bg-slate-700 rounded w-5/6"></div>
      </div>
      <div className="aspect-video bg-slate-700 rounded-lg mb-4"></div>
      <div className="flex items-center justify-between mt-4 border-t border-slate-700 pt-3">
        <div className="h-6 bg-slate-700 rounded w-24"></div>
        <div className="h-6 bg-slate-700 rounded w-28"></div>
      </div>
    </div>
  );
};

export default PostCardSkeleton;

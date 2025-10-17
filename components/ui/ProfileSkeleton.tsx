import React from 'react';

const ProfileSkeleton: React.FC = () => {
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mb-6 animate-pulse">
            <div className="relative">
                <div className="h-48 bg-slate-700"></div>
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                    <div className="w-32 h-32 bg-slate-600 rounded-full border-4 border-slate-800"></div>
                </div>
            </div>
            
            <div className="pt-20 p-6 text-center">
                <div className="h-6 bg-slate-700 rounded w-1/2 mx-auto"></div>
                <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto mt-3"></div>
            </div>

            <div className="px-6 pb-6 space-y-3 border-t border-slate-600 pt-6">
                <div className="flex items-center gap-4">
                    <div className="w-5 h-5 bg-slate-700 rounded"></div>
                    <div className="h-4 bg-slate-700 rounded w-2/3"></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-5 h-5 bg-slate-700 rounded"></div>
                    <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                </div>
            </div>

            <div className="flex justify-center gap-6 px-6 border-t border-slate-600">
                <div className="text-center py-4">
                    <div className="h-5 bg-slate-700 rounded w-8 mx-auto"></div>
                    <div className="h-3 bg-slate-700 rounded w-12 mx-auto mt-2"></div>
                </div>
                <div className="text-center py-4">
                    <div className="h-5 bg-slate-700 rounded w-8 mx-auto"></div>
                    <div className="h-3 bg-slate-700 rounded w-12 mx-auto mt-2"></div>
                </div>
                <div className="text-center py-4">
                    <div className="h-5 bg-slate-700 rounded w-8 mx-auto"></div>
                    <div className="h-3 bg-slate-700 rounded w-12 mx-auto mt-2"></div>
                </div>
            </div>

            <div className="p-6 border-t border-slate-600">
                <div className="h-12 bg-slate-700 rounded-md w-full"></div>
            </div>
        </div>
    );
};

export default ProfileSkeleton;
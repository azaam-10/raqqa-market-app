import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile } from '../types';
import Spinner from '../components/ui/Spinner';
import { getErrorMessage } from '../utils/errors';
import SuggestionCard from '../components/SuggestionCard';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

interface Suggestion extends Profile {
    mutuals: number;
}

const SuggestionsScreen: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSuggestions = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            // 1. Get who the current user follows
            const { data: myFollowsData, error: myFollowsError } = await supabase
                .from('followers')
                .select('following_id')
                .eq('follower_id', user.id);
            
            if (myFollowsError) throw myFollowsError;
            const myFollowsIds = myFollowsData.map(f => f.following_id);

            if (myFollowsIds.length === 0) {
                setSuggestions([]);
                setLoading(false);
                return;
            }

            // 2. Get who their follows are following (friends of friends)
            const { data: fofData, error: fofError } = await supabase
                .from('followers')
                .select('following_id')
                .in('follower_id', myFollowsIds);
            
            if (fofError) throw fofError;

            // 3. Count mutuals
            const mutualsCount: { [key: string]: number } = {};
            for (const item of fofData) {
                const suggestionId = item.following_id;
                // Exclude self and people already followed
                if (suggestionId !== user.id && !myFollowsIds.includes(suggestionId)) {
                    mutualsCount[suggestionId] = (mutualsCount[suggestionId] || 0) + 1;
                }
            }
            
            const suggestionIds = Object.keys(mutualsCount);
            if (suggestionIds.length === 0) {
                setSuggestions([]);
                setLoading(false);
                return;
            }

            // 4. Fetch profiles for suggestions
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', suggestionIds);

            if (profilesError) throw profilesError;

            // 5. Combine data and sort
            const finalSuggestions = (profilesData as Profile[])
                .map(profile => ({
                    ...profile,
                    mutuals: mutualsCount[profile.id],
                }))
                .sort((a, b) => b.mutuals - a.mutuals);

            setSuggestions(finalSuggestions);

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);
    
    const handleFollow = (followedUserId: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== followedUserId));
    };

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (suggestions.length === 0) {
            return (
                <div className="text-center text-zinc-500 dark:text-zinc-400 py-10">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">لا توجد اقتراحات جديدة</h3>
                    <p>تابع المزيد من الأشخاص للعثور على أصدقاء جدد.</p>
                </div>
            );
        }
        return (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg divide-y divide-gray-200 dark:divide-zinc-800">
                {suggestions.map(profile => (
                    <SuggestionCard 
                        key={profile.id} 
                        profile={profile} 
                        mutuals={profile.mutuals}
                        onFollow={handleFollow}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full px-12">أشخاص قد تعرفهم</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default SuggestionsScreen;
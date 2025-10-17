import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { getErrorMessage } from '../utils/errors';
import { Profile } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );

const BlockedUsersScreen: React.FC = () => {
    const navigate = useNavigate();
    const { profile, toggleBlock } = useAuth();
    const [blockedProfiles, setBlockedProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchBlockedProfiles = async () => {
            if (!profile || !profile.blocked_users || profile.blocked_users.length === 0) {
                setBlockedProfiles([]);
                setLoading(false);
                return;
            }
            
            setLoading(true);
            setError(null);
            
            try {
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', profile.blocked_users);

                if (fetchError) throw fetchError;
                
                setBlockedProfiles(data as Profile[]);

            } catch(err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchBlockedProfiles();
    }, [profile]);

    const handleUnblock = async (userId: string) => {
        setUnblockingId(userId);
        await toggleBlock(userId);
        // The profile context will update, which will trigger the useEffect to refetch.
        setUnblockingId(null);
    };

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (blockedProfiles.length === 0) {
            return <p className="text-center text-gray-500 dark:text-zinc-400 py-10">قائمة الحظر فارغة.</p>;
        }
        return (
            <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                {blockedProfiles.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3">
                        <Link to={`/user/${p.id}`} className="flex items-center gap-3">
                            <Avatar url={p.avatar_url} size={40} userId={p.id} showStatus={true} />
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{p.full_name}</span>
                        </Link>
                        <Button 
                            variant="secondary" 
                            className="!w-auto !py-1.5 !px-4 !text-sm"
                            onClick={() => handleUnblock(p.id)}
                            loading={unblockingId === p.id}
                        >
                            إلغاء الحظر
                        </Button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="absolute right-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">المستخدمون المحظورون</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
                       {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BlockedUsersScreen;

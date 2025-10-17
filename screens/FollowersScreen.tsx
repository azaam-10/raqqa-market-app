import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { getErrorMessage } from '../utils/errors';
import { Profile } from '../types';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );

const FollowersScreen: React.FC = () => {
    const { userId, followType } = useParams<{ userId: string; followType: 'followers' | 'following' }>();
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const title = followType === 'followers' ? 'المتابعون' : 'يتابع';

    useEffect(() => {
        if (!userId || !followType) {
            navigate(-1);
            return;
        }
        
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Fetch the user's name for the header
                const { data: userData, error: userError } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', userId)
                    .single();
                if (userError) throw userError;
                setUserName(userData.full_name || 'مستخدم');
                
                // 2. Fetch the list of IDs (followers or following)
                const fromTable = 'followers';
                const selectCol = followType === 'followers' ? 'follower_id' : 'following_id';
                const whereCol = followType === 'followers' ? 'following_id' : 'follower_id';
                
                const { data: idsData, error: idsError } = await supabase
                    .from(fromTable)
                    .select(`${selectCol}`)
                    .eq(whereCol, userId);
                
                if (idsError) throw idsError;

                // FIX: Handle case where idsData is null to prevent runtime error on .map()
                const profileIds = (idsData || []).map((item: any) => item[selectCol]);
                
                if (profileIds.length === 0) {
                    setProfiles([]);
                    setLoading(false);
                    return;
                }

                // 3. Fetch the profiles for those IDs
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', profileIds);
                
                if (profilesError) throw profilesError;
                
                setProfiles(profilesData as Profile[]);

            } catch (err: unknown) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, followType, navigate]);

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (profiles.length === 0) {
            const message = followType === 'followers' ? 'لا يوجد متابعون لهذا المستخدم بعد.' : 'هذا المستخدم لا يتابع أحداً بعد.';
            return <p className="text-center text-slate-400 py-10">{message}</p>;
        }
        return (
            <div className="divide-y divide-slate-700">
                {profiles.map(profile => (
                    <Link 
                        key={profile.id}
                        to={`/user/${profile.id}`} 
                        className="flex items-center gap-4 p-3 hover:bg-slate-800 transition-colors"
                    >
                        <Avatar url={profile.avatar_url} size={48} userId={profile.id} showStatus={true} />
                        <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-white truncate">{profile.full_name}</p>
                        </div>
                    </Link>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <div className="text-center w-full px-12">
                            <h1 className="text-xl font-bold truncate">{title}</h1>
                            <p className="text-sm text-slate-400">{userName}</p>
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto">
                <div className="max-w-2xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default FollowersScreen;
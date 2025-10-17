import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, Post, PrivacySetting } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import PostCard from '../components/PostCard';
import Button from '../components/ui/Button';
import { getErrorMessage } from '../utils/errors';
import ProfileSkeleton from '../components/ui/ProfileSkeleton';
import PostCardSkeleton from '../components/ui/PostCardSkeleton';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const BriefcaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const GenderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M12 12v9"/></svg>;

const PrivacyIcon: React.FC<{ privacy: PrivacySetting | null }> = ({ privacy }) => {
    switch (privacy) {
        case 'public': return <GlobeIcon />;
        case 'followers': return <UsersIcon />;
        case 'private': return <LockIcon />;
        default: return <GlobeIcon />;
    }
};

const DetailRow: React.FC<{ icon: React.ReactNode; text: string | React.ReactNode; privacy: PrivacySetting | null }> = ({ icon, text, privacy }) => (
    <div className="flex items-center gap-4 text-zinc-300">
        <div className="text-zinc-400">{icon}</div>
        <div className="flex-1">{text}</div>
        <div className="text-zinc-500" title={`الخصوصية: ${privacy}`}><PrivacyIcon privacy={privacy} /></div>
    </div>
);

const ProfileScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user: currentUser, profile: currentProfile } = useAuth();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser) return;

        const fetchUserData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [followersRes, followingRes] = await Promise.all([
                    supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', currentUser.id),
                    supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', currentUser.id)
                ]);
                
                if (followersRes.error) throw followersRes.error;
                if (followingRes.error) throw followingRes.error;
                
                setFollowerCount(followersRes.count || 0);
                setFollowingCount(followingRes.count || 0);

                const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });

                if (postsError) throw postsError;
                
                setPosts(postsData as Post[] || []);

            } catch (err: any) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [currentUser]);

    useEffect(() => {
        if (currentProfile?.cover_photo_url) {
            const { data } = supabase.storage.from('uploads').getPublicUrl(currentProfile.cover_photo_url);
            setCoverPhotoUrl(data.publicUrl);
        } else {
            setCoverPhotoUrl(null);
        }
    }, [currentProfile]);

    const handlePostDeleted = (postId: string) => {
        setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
    };

    const handlePostUpdated = (updatedPost: Post) => {
        setPosts(currentPosts => currentPosts.map(p => (p.id === updatedPost.id ? updatedPost : p)));
    };
    
    const details = [
        { icon: <HomeIcon />, value: currentProfile?.place_of_origin, text: `من ${currentProfile?.place_of_origin}`, privacy: currentProfile?.place_of_origin_privacy },
        { icon: <BriefcaseIcon />, value: currentProfile?.education_level, text: `درس في ${currentProfile?.education_level}`, privacy: currentProfile?.education_level_privacy },
        { icon: <LinkIcon />, value: currentProfile?.website, text: <a href={currentProfile?.website || ''} target="_blank" rel="noopener noreferrer" className="hover:underline text-teal-400">{currentProfile?.website}</a>, privacy: currentProfile?.website_privacy },
        { icon: <PhoneIcon />, value: currentProfile?.contact_info, text: currentProfile?.contact_info, privacy: currentProfile?.contact_info_privacy },
        { icon: <GenderIcon />, value: currentProfile?.gender, text: currentProfile?.gender === 'male' ? 'ذكر' : 'أنثى', privacy: currentProfile?.gender_privacy }
    ].filter(detail => detail.value);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-200">
            <header className="bg-zinc-950/70 backdrop-blur-lg sticky top-0 z-10 border-b border-zinc-800">
                <div className="container mx-auto px-4">
                     <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">
                           ملفي الشخصي
                        </h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {loading && (
                      <div>
                        <ProfileSkeleton />
                        <div className="h-5 bg-zinc-700 rounded w-1/3 mb-4 animate-pulse"></div>
                        <PostCardSkeleton />
                      </div>
                    )}
                    {!loading && error && <p className="text-center text-red-400 py-10">{error}</p>}
                    {!loading && currentProfile && (
                        <div>
                           <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
                                <div className="relative">
                                    <div className="h-48 bg-zinc-800">
                                        {coverPhotoUrl && (
                                            <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                                        <Avatar url={currentProfile.avatar_url} size={128} userId={currentProfile.id} showStatus={true} className="border-4 border-zinc-900"/>
                                    </div>
                                </div>
                                
                                <div className="pt-20 p-6 text-center">
                                    <h2 className="text-2xl font-bold">{currentProfile.full_name}</h2>
                                    <p className="text-zinc-400 mt-2">{currentProfile.bio || 'لا يوجد نبذة تعريفية.'}</p>
                                </div>
                                
                                {details.length > 0 && (
                                     <div className="px-6 pb-6 space-y-3 border-t border-zinc-800 pt-6">
                                        {details.map((detail, index) => (
                                            <DetailRow key={index} icon={detail.icon} text={detail.text} privacy={detail.privacy} />
                                        ))}
                                    </div>
                                )}


                                <div className="flex justify-center gap-6 px-6 border-t border-zinc-800">
                                    <div className="text-center py-4">
                                        <p className="font-bold text-lg">{posts.length}</p>
                                        <p className="text-sm text-zinc-400">منشورات</p>
                                    </div>
                                    <Link to={`/user/${currentUser?.id}/followers`} className="text-center py-4">
                                        <p className="font-bold text-lg">{followerCount}</p>
                                        <p className="text-sm text-zinc-400 hover:underline">متابعون</p>
                                    </Link>
                                    <Link to={`/user/${currentUser?.id}/following`} className="text-center py-4">
                                        <p className="font-bold text-lg">{followingCount}</p>
                                        <p className="text-sm text-zinc-400 hover:underline">يتابع</p>
                                    </Link>
                                </div>

                                <div className="p-6 border-t border-zinc-800">
                                    <Button variant="secondary" onClick={() => navigate('/profile/edit')}>
                                        تعديل الملف الشخصي
                                    </Button>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold mb-4">منشوراتي ({posts.length})</h3>
                            {posts.length > 0 ? (
                                posts.map(post => (
                                    <PostCard 
                                        key={post.id} 
                                        post={post} 
                                        onPostDeleted={handlePostDeleted}
                                        onPostUpdated={handlePostUpdated}
                                    />
                                ))
                            ) : (
                                !loading && <p className="text-center text-zinc-500 py-10 bg-zinc-900 rounded-2xl">
                                    لم تقم بنشر أي شيء بعد.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProfileScreen;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const BriefcaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const GenderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M12 12v9"/></svg>;

const DetailRow: React.FC<{ icon: React.ReactNode; text: string | React.ReactNode; }> = ({ icon, text }) => (
    <div className="flex items-center gap-4 text-slate-300">
        <div className="text-slate-400">{icon}</div>
        <div className="flex-1">{text}</div>
    </div>
);

const UserScreen: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);

    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        if (!userId) {
            setError("لم يتم تحديد المستخدم.");
            setLoading(false);
            return;
        }
        
        // Redirect to own profile page if viewing self
        if (currentUser?.id === userId) {
            navigate('/profile', { replace: true });
            return;
        }

        const fetchUserData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [profileRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', userId).single(),
                    supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
                    supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
                    currentUser ? supabase.from('followers').select('id').eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null })
                ]);
                
                const { data: profileData, error: profileError } = profileRes;
                if (profileError || !profileData) throw new Error("لم يتم العثور على المستخدم.");
                setProfile(profileData as Profile);
                if (profileData.cover_photo_url) {
                    const { data } = supabase.storage.from('uploads').getPublicUrl(profileData.cover_photo_url);
                    setCoverPhotoUrl(data.publicUrl);
                } else {
                    setCoverPhotoUrl(null);
                }
                
                if (followersRes.error) throw followersRes.error;
                if (followingRes.error) throw followingRes.error;
                if (isFollowingRes.error) throw isFollowingRes.error;
                
                setFollowerCount(followersRes.count || 0);
                setFollowingCount(followingRes.count || 0);
                setIsFollowing(!!isFollowingRes.data);

                const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

                if (postsError) throw postsError;
                setPosts(postsData as Post[] || []);

            } catch (err: any) {
                const errorMessage = getErrorMessage(err);
                console.error("Error fetching user data:", errorMessage);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [userId, currentUser, navigate]);
    
    const handleFollowToggle = async () => {
        if (!currentUser || !profile || followLoading) return;
        
        setFollowLoading(true);
        
        try {
            if (isFollowing) {
                const { error } = await supabase.from('followers').delete().match({ follower_id: currentUser.id, following_id: profile.id });
                if (error) throw error;
                setIsFollowing(false);
                setFollowerCount(prev => prev - 1);
            } else {
                const { error } = await supabase.from('followers').insert({ follower_id: currentUser.id, following_id: profile.id });
                if (error) throw error;
                setIsFollowing(true);
                setFollowerCount(prev => prev + 1);

                if (currentUser.id !== profile.id) {
                    await supabase.from('notifications').insert({
                        user_id: profile.id,
                        actor_id: currentUser.id,
                        type: 'new_follower',
                        entity_id: currentUser.id
                    });
                }
            }
        } catch (err) {
            const errorMessage = getErrorMessage(err);
            console.error("Error toggling follow:", errorMessage);
            alert(`حدث خطأ: ${errorMessage}`);
        } finally {
            setFollowLoading(false);
        }
    };


    const handlePostDeleted = (postId: string) => {
        setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
    };

    const handlePostUpdated = (updatedPost: Post) => {
        setPosts(currentPosts => currentPosts.map(p => (p.id === updatedPost.id ? updatedPost : p)));
    };

    const isOwnProfile = currentUser?.id === userId;

    const shouldShowDetail = (privacy: PrivacySetting | null) => {
        if (privacy === 'public') return true;
        if (privacy === 'followers' && isFollowing) return true;
        return false;
    };

    const details = profile ? [
        { icon: <HomeIcon />, value: profile.place_of_origin, text: `من ${profile.place_of_origin}`, privacy: profile.place_of_origin_privacy },
        { icon: <BriefcaseIcon />, value: profile.education_level, text: `درس في ${profile.education_level}`, privacy: profile.education_level_privacy },
        { icon: <LinkIcon />, value: profile.website, text: <a href={profile.website || ''} target="_blank" rel="noopener noreferrer" className="hover:underline text-cyan-400">{profile.website}</a>, privacy: profile.website_privacy },
        { icon: <PhoneIcon />, value: profile.contact_info, text: profile.contact_info, privacy: profile.contact_info_privacy },
        { icon: <GenderIcon />, value: profile.gender, text: profile.gender === 'male' ? 'ذكر' : 'أنثى', privacy: profile.gender_privacy }
    ].filter(detail => detail.value && shouldShowDetail(detail.privacy)) : [];


    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                     <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">
                           الملف الشخصي
                        </h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {loading && (
                      <div>
                        <ProfileSkeleton />
                        <div className="h-5 bg-slate-700 rounded w-1/3 mb-4 animate-pulse"></div>
                        <PostCardSkeleton />
                        <PostCardSkeleton />
                      </div>
                    )}
                    {!loading && error && <p className="text-center text-red-400 py-10">{error}</p>}
                    {!loading && profile && (
                        <div>
                           <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mb-6">
                                <div className="relative">
                                    <div className="h-48 bg-slate-700">
                                        {coverPhotoUrl && (
                                            <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                                        <Avatar url={profile.avatar_url} size={128} userId={profile.id} showStatus={true} className="border-4 border-slate-800"/>
                                    </div>
                                </div>
                                
                                <div className="pt-20 p-6 text-center">
                                    <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                                    <p className="text-slate-400 mt-2">{profile.bio || 'لا يوجد نبذة تعريفية.'}</p>
                                </div>
                                
                                {details.length > 0 && (
                                     <div className="px-6 pb-6 space-y-3 border-t border-slate-600 pt-6">
                                        {details.map((detail, index) => (
                                            <DetailRow key={index} icon={detail.icon} text={detail.text} />
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-center gap-6 px-6 border-t border-slate-600">
                                    <div className="text-center py-4">
                                        <p className="font-bold text-lg">{posts.length}</p>
                                        <p className="text-sm text-slate-400">منشورات</p>
                                    </div>
                                    <Link to={`/user/${userId}/followers`} className="text-center py-4">
                                        <p className="font-bold text-lg">{followerCount}</p>
                                        <p className="text-sm text-slate-400 hover:underline">متابعون</p>
                                    </Link>
                                    <Link to={`/user/${userId}/following`} className="text-center py-4">
                                        <p className="font-bold text-lg">{followingCount}</p>
                                        <p className="text-sm text-slate-400 hover:underline">يتابع</p>
                                    </Link>
                                </div>

                                <div className="p-6 border-t border-slate-600">
                                    {isOwnProfile ? (
                                        <Button variant="secondary" onClick={() => navigate('/profile')}>
                                            عرض ملفي الشخصي
                                        </Button>
                                    ) : (
                                        <div className="flex gap-4">
                                            <Button onClick={handleFollowToggle} loading={followLoading} variant={isFollowing ? 'secondary' : 'primary'} className="flex-1">
                                                {isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
                                            </Button>
                                            <Button onClick={() => navigate(`/chat/${userId}`)} variant="secondary" className="flex-1">
                                                مراسلة
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold mb-4">المنشورات ({posts.length})</h3>
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
                                !loading && <p className="text-center text-slate-400 py-10 bg-slate-800 rounded-lg">
                                    لم يقم هذا المستخدم بنشر أي شيء بعد.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserScreen;
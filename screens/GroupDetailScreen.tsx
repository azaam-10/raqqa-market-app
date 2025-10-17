import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Group, Post } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';
import { getErrorMessage } from '../utils/errors';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const MoreIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg> );


const GroupDetailScreen: React.FC = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [group, setGroup] = useState<Group | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isMember, setIsMember] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [joinLoading, setJoinLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const deleteTimeoutRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const isOwner = user?.id === group?.user_id;
    const isAdmin = user?.email === 'azaamazeez8877@gmail.com';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isMenuOpen) {
            setConfirmingDelete(false);
            if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        }
    }, [isMenuOpen]);

    const fetchGroupData = useCallback(async () => {
        if (!groupId || !user) return;
        setLoading(true);
        setError(null);
        try {
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .select('id, created_at, name, description, user_id, cover_image_url, is_private')
                .eq('id', groupId)
                .single();
            if (groupError) throw new Error("لم يتم العثور على المجموعة.");
            
            if(groupData.cover_image_url) {
                const { data } = supabase.storage.from('uploads').getPublicUrl(groupData.cover_image_url);
                setCoverImageUrl(data.publicUrl);
            }

            const { data: profileData, error: profileError } = await supabase
                .from('profiles').select('full_name, avatar_url').eq('id', groupData.user_id).single();
            if (profileError) console.warn("Could not fetch group owner profile");

            setGroup({ ...groupData, profiles: profileData } as Group);

            const { count } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', groupId);
            setMemberCount(count || 0);

            const { data: memberData } = await supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', user.id);
            const currentUserIsMember = memberData ? memberData.length > 0 : false;
            setIsMember(currentUserIsMember);
            
            if (groupData.is_private && !currentUserIsMember && groupData.user_id !== user.id) {
                 setPosts([]);
                 setLoading(false);
                 return;
            }

            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('id, content, image_url, video_url, created_at, user_id, group_id')
                .eq('group_id', groupId)
                .order('created_at', { ascending: false });
            if (postsError) throw new Error("فشل في تحميل منشورات المجموعة.");

            if (!postsData || postsData.length === 0) {
                setPosts([]); setLoading(false); return;
            }

            const postIds = postsData.map(p => p.id);
            const postUserIds = [...new Set(postsData.map(p => p.user_id))];

            const [likesResult, commentsResult, profilesResult] = await Promise.all([
                supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
                supabase.from('comments').select('post_id, id').in('post_id', postIds),
                supabase.from('profiles').select('id, full_name, avatar_url').in('id', postUserIds)
            ]);

            const likesByPost = new Map<string, any[]>();
            (likesResult.data || []).forEach(like => {
                if (!likesByPost.has(like.post_id)) likesByPost.set(like.post_id, []);
                likesByPost.get(like.post_id)!.push({ user_id: like.user_id });
            });
        
            const commentsByPost = new Map<string, number>();
            (commentsResult.data || []).forEach(comment => {
                commentsByPost.set(comment.post_id, (commentsByPost.get(comment.post_id) || 0) + 1);
            });
            
            const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p]));

            const augmentedPosts = postsData.map((post: any) => ({
                ...post,
                likes: likesByPost.get(post.id) || [],
                comments: [{ count: commentsByPost.get(post.id) || 0 }],
                profiles: profilesMap.get(post.user_id) || null,
                groups: { name: groupData.name }
            }));
            
            setPosts(augmentedPosts as any[]);

        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [groupId, user]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    const handleJoinLeave = async () => {
        if (!user || !groupId) return;
        setJoinLoading(true);
        if (isMember) {
            await supabase.from('group_members').delete().match({ group_id: groupId, user_id: user.id });
            setIsMember(false); setMemberCount(c => c - 1);
        } else {
            await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id });
            setIsMember(true); setMemberCount(c => c + 1);
            fetchGroupData();
        }
        setJoinLoading(false);
    };

     const handlePostDeleted = (postId: string) => {
        setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
    };

    const handlePostUpdated = (updatedPost: Post) => {
        setPosts(currentPosts => currentPosts.map(p => (p.id === updatedPost.id ? updatedPost : p)));
    };
    
    const handlePostCreated = (newPost: Post) => {
        setPosts(currentPosts => [newPost, ...currentPosts]);
    }

    const handleDeleteGroup = async () => {
        if (!group) return;
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        if (!confirmingDelete) {
            setConfirmingDelete(true);
            deleteTimeoutRef.current = window.setTimeout(() => setConfirmingDelete(false), 3000);
            return;
        }

        setIsMenuOpen(false);
        try {
            const { count, error } = await supabase.from('groups').delete({ count: 'exact' }).eq('id', group.id);
            if (error) throw error;
            if (count === 0 || count === null) throw new Error('لم يتم حذف المجموعة، قد لا تملك الصلاحية.');

            if (group.cover_image_url) {
                const { error: storageError } = await supabase.storage.from('uploads').remove([group.cover_image_url]);
                if (storageError) console.warn(`Group deleted, but failed to remove cover image: ${storageError.message}`);
            }
            navigate('/groups');
        } catch (err: unknown) {
            alert(`فشل حذف المجموعة: ${getErrorMessage(err)}`);
        } finally {
            setConfirmingDelete(false);
        }
    };

    const renderContent = () => {
        if (!group) return null;
        if (group.is_private && !isMember && !isOwner) {
            return (
                 <div className="text-center text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-8 rounded-lg border border-gray-200 dark:border-zinc-800">
                    <LockIcon />
                    <h3 className="text-lg font-bold mt-2">هذه مجموعة خاصة</h3>
                    <p>يجب عليك الانضمام للمجموعة لترى المنشورات وتشارك فيها.</p>
                </div>
            );
        }
        
        return (
             <div>
                {isMember && <CreatePostForm groupId={groupId} onPostCreated={handlePostCreated} profile={profile} />}
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
                    <p className="text-center text-gray-500 dark:text-zinc-400 py-10">
                        لا توجد منشورات في هذه المجموعة. كن أول من ينشر!
                    </p>
                )}
            </div>
        )
    };

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                     <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">
                           {loading ? '...' : group?.name || 'تفاصيل المجموعة'}
                        </h1>
                         {(isOwner || isAdmin) && (
                            <div className="absolute left-2" ref={menuRef}>
                                <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"><MoreIcon /></button>
                                {isMenuOpen && (
                                    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg z-10">
                                        <button onClick={handleDeleteGroup} className={`block w-full text-right px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors ${confirmingDelete ? 'bg-red-600 dark:bg-red-700 text-white' : ''}`}>
                                            {confirmingDelete ? 'تأكيد الحذف؟' : 'حذف المجموعة'}
                                        </button>
                                    </div>
                                )}
                            </div>
                         )}
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                 <div className="max-w-2xl mx-auto">
                     {loading && <div className="text-center py-10"><Spinner /></div>}
                     {!loading && error && <p className="text-center text-red-400 py-10">{error}</p>}
                     {group && (
                        <div>
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden mb-6">
                                <div className="relative aspect-[16/7] w-full bg-gray-100 dark:bg-zinc-800">
                                    {coverImageUrl ? (
                                        <img src={coverImageUrl} alt={`${group.name} cover`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-100 dark:from-zinc-800 dark:to-zinc-700"></div>
                                    )}
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold">{group.name}</h2>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 mt-1">
                                                {group.is_private ? <LockIcon /> : <GlobeIcon />}
                                                <span>{group.is_private ? 'مجموعة خاصة' : 'مجموعة عامة'}</span>
                                                <span>•</span>
                                                <Link to={`/group/${groupId}/members`} className="hover:underline">{memberCount} أعضاء</Link>
                                            </div>
                                        </div>
                                        {!isOwner && (
                                            <Button 
                                                onClick={handleJoinLeave}
                                                loading={joinLoading}
                                                variant={isMember ? 'secondary' : 'primary'}
                                                className="!w-auto px-4 !py-2 !text-sm flex-shrink-0"
                                            >
                                                {isMember ? 'مغادرة' : 'الانضمام'}
                                            </Button>
                                        )}
                                    </div>
                                    {group.description && (
                                        <p className="text-gray-700 dark:text-zinc-300 pt-4 border-t border-gray-200 dark:border-zinc-800">{group.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 pt-4 border-t border-gray-200 dark:border-zinc-800">
                                        <Avatar url={group.profiles?.avatar_url} size={24} />
                                        <span>أنشئت بواسطة {group.profiles?.full_name}</span>
                                    </div>
                                </div>
                            </div>

                           {renderContent()}
                        </div>
                     )}
                 </div>
            </main>
        </div>
    );
};

export default GroupDetailScreen;

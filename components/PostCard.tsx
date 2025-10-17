import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../types';
import Avatar from './ui/Avatar';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';
import Textarea from './ui/Textarea';
import Button from './ui/Button';
import { getErrorMessage, playLikeSound, triggerHapticFeedback, timeAgo } from '../utils/errors';
import ReportModal from './ReportModal';
import PromotePostModal from './PromotePostModal';

const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-6 w-6 transform transition-all duration-300 ease-out group-hover:scale-125 ${
        filled ? 'text-lime-400 scale-110' : 'text-gray-500 dark:text-zinc-400'
      }`}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const CommentIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

const ShareIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg> );

const MoreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
);

const FlagIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> );
const MegaphoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>;


const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24" fill="rgba(255,255,255,0.7)">
    <path d="M8 5v14l11-7z" />
  </svg>
);

interface PostCardProps {
    post: Post;
    onPostDeleted?: (postId: string) => void;
    onPostUpdated?: (updatedPost: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted, onPostUpdated }) => {
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes.length);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [postImageUrl, setPostImageUrl] = useState<string | null>(null);
    const [postVideoUrl, setPostVideoUrl] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [isPromoting, setIsPromoting] = useState(false);
    const deleteTimeoutRef = useRef<number | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const commentCount = post.comments[0]?.count || 0;
    const isOwner = user?.id === post.user_id;
    const isAdmin = user?.email === 'azaamazeez8877@gmail.com';

    const CONTENT_LIMIT = 250;
    const isLongPost = post.content.length > CONTENT_LIMIT;
    
    useEffect(() => {
        if (post.image_url) {
            const { data } = supabase.storage.from('uploads').getPublicUrl(post.image_url);
            setPostImageUrl(data.publicUrl);
            setPostVideoUrl(null);
        } else if (post.video_url) {
            const { data } = supabase.storage.from('uploads').getPublicUrl(post.video_url);
            setPostVideoUrl(data.publicUrl);
            setPostImageUrl(null);
        } else {
            setPostImageUrl(null);
            setPostVideoUrl(null);
        }
    }, [post.image_url, post.video_url]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Reset confirmation state when menu closes
        if (!isMenuOpen) {
            setConfirmingDelete(false);
            if (deleteTimeoutRef.current) {
                clearTimeout(deleteTimeoutRef.current);
                deleteTimeoutRef.current = null;
            }
        }
    }, [isMenuOpen]);

    useEffect(() => {
        if (user) {
            const liked = post.likes.some(like => like.user_id === user.id);
            setIsLiked(liked);
        } else {
            setIsLiked(false);
        }
        setLikeCount(post.likes.length);
    }, [post.likes, user]);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        (entry.target as HTMLVideoElement).play().catch(error => {
                            // Autoplay is often prevented, it's fine if the video is muted.
                        });
                    } else {
                        (entry.target as HTMLVideoElement).pause();
                    }
                });
            },
            {
                threshold: 0.6 // Trigger when 60% of the video is visible
            }
        );

        observer.observe(videoElement);

        return () => {
            if (videoElement) {
                observer.unobserve(videoElement);
            }
        };
    }, [postVideoUrl]);
    
    const handleLikeToggle = async () => {
        if (!user) {
            alert('يجب عليك تسجيل الدخول أولاً لتتمكن من الإعجاب بالمنشورات.');
            return;
        }

        playLikeSound();
        triggerHapticFeedback();

        const currentlyLiked = isLiked;
        setIsLiked(!currentlyLiked);

        if (currentlyLiked) {
            setLikeCount(prev => prev - 1);
            const { error } = await supabase.from('likes').delete().match({ post_id: post.id, user_id: user.id });
            if (error) {
                console.error('Error unliking post:', error);
                setIsLiked(true); // Revert UI on error
                setLikeCount(prev => prev + 1);
            }
        } else {
            setLikeCount(prev => prev + 1);
            const { error } = await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
            if (error) {
                console.error('Error liking post:', error);
                setIsLiked(false); // Revert UI on error
                setLikeCount(prev => prev - 1);
            } else {
                 // Send notification if not liking own post
                if (user.id !== post.user_id) {
                    await supabase.from('notifications').insert({
                        user_id: post.user_id, // Recipient
                        actor_id: user.id,     // Sender
                        type: 'like_post',
                        entity_id: post.id,
                    });
                }
            }
        }
    };

    const handleDelete = async () => {
        if (deleteTimeoutRef.current) {
            clearTimeout(deleteTimeoutRef.current);
            deleteTimeoutRef.current = null;
        }

        if (!confirmingDelete) {
            setConfirmingDelete(true);
            deleteTimeoutRef.current = window.setTimeout(() => {
                setConfirmingDelete(false);
                deleteTimeoutRef.current = null;
            }, 3000); // Reset after 3 seconds
            return;
        }

        setIsMenuOpen(false);
        setUpdateLoading(true); // Use for delete loading state
        try {
            const { count, error: dbError } = await supabase
                .from('posts')
                .delete({ count: 'exact' })
                .eq('id', post.id);

            if (dbError) throw dbError;
            if (count === 0 || count === null) throw new Error('فشل حذف المنشور. قد لا تملك الصلاحية.');

            const mediaPath = post.image_url || post.video_url;
            if (mediaPath) {
                const { error: storageError } = await supabase.storage.from('uploads').remove([mediaPath]);
                if (storageError) console.warn(`Post deleted, but failed to remove media: ${storageError.message}`);
            }
            
            onPostDeleted?.(post.id);

        } catch (err: unknown) {
            alert(`فشل حذف المنشور: ${getErrorMessage(err)}`);
        } finally {
            setUpdateLoading(false);
            setConfirmingDelete(false);
        }
    };

    const handleUpdate = async () => {
        if (!editedContent.trim()) return;
        setUpdateLoading(true);
        const { data: updatedPost, error } = await supabase
            .from('posts')
            .update({ content: editedContent.trim() })
            .eq('id', post.id)
            .select('id, content')
            .single();
        
        setUpdateLoading(false);
        if (error) {
             console.error('Error updating post:', error);
             alert(`فشل تحديث المنشور: ${getErrorMessage(error)}`);
        } else if (updatedPost) {
            // Reconstruct the full post object by merging the updated fields
            // with the existing post data.
            const fullUpdatedPost: Post = {
                ...post,
                ...updatedPost,
            };
            onPostUpdated?.(fullUpdatedPost);
            setIsEditing(false);
        }
    };

    const authorName = post.profiles?.full_name || 'مستخدم غير معروف';

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        const shareUrl = `${window.location.origin}/#/post/${post.id}`;
        const shareText = post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '');
        const shareData = { title: `منشور من ${authorName}`, text: shareText, url: shareUrl };
        try {
            if (navigator.share) await navigator.share(shareData);
            else alert('المشاركة غير مدعومة على هذا المتصفح.');
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };


    const authorAvatarUrl = post.profiles?.avatar_url;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 mb-4">
            {post.groups && post.group_id && (
                <div className="mb-2 text-xs text-gray-500 dark:text-zinc-400">
                    <Link to={`/group/${post.group_id}`} className="hover:underline flex items-center gap-1.5 font-semibold">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="7" height="5" x="7" y="7" rx="1"/><path d="M17 14v-1a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1"/><path d="M7 7v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7"/></svg>
                        <span>{post.groups.name}</span>
                    </Link>
                </div>
            )}
            <div className="flex items-start justify-between">
                <div className="flex items-center mb-3 flex-1">
                    <Link to={`/user/${post.user_id}`} className="ml-3 flex-shrink-0">
                        <Avatar url={authorAvatarUrl} size={40} userId={post.user_id} showStatus={true} />
                    </Link>
                    <div>
                        <Link to={`/user/${post.user_id}`} className="font-bold text-gray-900 dark:text-zinc-100 hover:underline">{authorName}</Link>
                        <p className="text-sm text-gray-500 dark:text-zinc-400">
                           <Link to={`/post/${post.id}`} className="hover:underline">{timeAgo(post.created_at)}</Link>
                        </p>
                    </div>
                </div>
                {!isEditing && (
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-500 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                            <MoreIcon />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg z-10 py-1">
                                {isOwner && <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); setConfirmingDelete(false); }} className="block w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">تعديل</button>}
                                {(isOwner || isAdmin) && <button onClick={handleDelete} disabled={updateLoading} className={`block w-full text-right px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors ${confirmingDelete ? 'bg-red-600 dark:bg-red-700 text-white' : 'text-red-500 dark:text-red-400'}`}>
                                    {updateLoading ? 'جاري الحذف...' : confirmingDelete ? 'تأكيد الحذف؟' : 'حذف'}
                                </button>}
                                {isAdmin && (
                                    <button onClick={() => { setIsPromoting(true); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                        <MegaphoneIcon />
                                        <span>ترويج المنشور</span>
                                    </button>
                                )}
                                {!isOwner && <button onClick={() => { setIsReporting(true); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                    <FlagIcon />
                                    <span>الإبلاغ عن المنشور</span>
                                </button>}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {isEditing ? (
                <div>
                    <Textarea 
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={4}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <Button onClick={() => setIsEditing(false)} variant="secondary" className="!w-auto px-4 !py-2 !text-sm">إلغاء</Button>
                        <Button onClick={handleUpdate} loading={updateLoading} className="!w-auto px-4 !py-2 !text-sm">حفظ</Button>
                    </div>
                </div>
            ) : (
                <div>
                    {post.content && (
                         <Link to={`/post/${post.id}`} className="block">
                            <p className="text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">
                                {isLongPost && !isExpanded
                                    ? `${post.content.substring(0, CONTENT_LIMIT)}...`
                                    : post.content}
                                
                                {isLongPost && (
                                    <>
                                        {' '}
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsExpanded(!isExpanded);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setIsExpanded(!isExpanded);
                                                }
                                            }}
                                            className="text-teal-500 hover:text-teal-600 font-medium cursor-pointer inline"
                                            aria-expanded={isExpanded}
                                        >
                                            {isExpanded ? 'عرض أقل' : 'اقرأ المزيد'}
                                        </span>
                                    </>
                                )}
                            </p>
                        </Link>
                    )}
                    {postImageUrl && (
                        <Link to={`/post/${post.id}`} className={`block ${post.content ? 'mt-3' : ''}`}>
                            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800">
                                <img src={postImageUrl} alt="" className="w-full h-auto" />
                            </div>
                        </Link>
                    )}
                    {postVideoUrl && (
                        <Link to={`/watch/${post.id}`} className={`block group relative ${post.content ? 'mt-3' : ''}`}>
                            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800">
                                <video
                                    ref={videoRef}
                                    src={postVideoUrl}
                                    playsInline
                                    muted
                                    loop
                                    className="w-full h-auto"
                                />
                            </div>
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <PlayIcon />
                            </div>
                        </Link>
                    )}
                </div>
            )}
            
            <div className="flex items-center justify-around mt-4 border-t border-gray-200 dark:border-zinc-800 pt-2 text-gray-500 dark:text-zinc-400">
                <button 
                  onClick={handleLikeToggle} 
                  className="flex items-center gap-2 group p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 transform transition-transform active:scale-125"
                  aria-label={isLiked ? 'إلغاء الإعجاب' : 'إعجاب'}
                  disabled={isEditing}
                >
                    <HeartIcon filled={isLiked} />
                    <span className="text-sm">{likeCount}</span>
                </button>
                <Link to={`/post/${post.id}`} className={`flex items-center gap-2 group hover:text-teal-400 text-sm transition-colors p-2 rounded-md ${isEditing ? 'pointer-events-none opacity-50' : ''}`}>
                    <CommentIcon />
                    <span>{commentCount}</span>
                </Link>
                <button onClick={handleShare} className="flex items-center gap-2 group hover:text-teal-400 text-sm transition-colors p-2 rounded-md" disabled={isEditing}>
                    <ShareIcon />
                    <span>مشاركة</span>
                </button>
            </div>
             {isReporting && (
                <ReportModal
                    isOpen={isReporting}
                    onClose={() => setIsReporting(false)}
                    entityId={post.id}
                    entityType="post"
                    reportedUserId={post.user_id}
                />
            )}
            {isPromoting && (
                <PromotePostModal
                    isOpen={isPromoting}
                    onClose={() => setIsPromoting(false)}
                    post={post}
                />
            )}
        </div>
    );
};

export default PostCard;
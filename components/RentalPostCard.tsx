import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RentalPost } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import Avatar from './ui/Avatar';
import { getErrorMessage, playLikeSound, triggerHapticFeedback, timeAgo } from '../utils/errors';

const HeartIcon = ({ filled }: { filled: boolean }) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transform transition-all duration-300 ease-out group-hover:scale-125 ${ filled ? 'text-lime-400 scale-110' : 'text-gray-500 dark:text-zinc-400' }`}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> );
const CommentIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> );
const ShareIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg> );
const BedIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16h20V4Z"/><path d="M2 10h20"/><path d="M12 4v6"/></svg>);
const MapPinIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>);
const MoreIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg> );

interface RentalPostCardProps {
  post: RentalPost;
  onPostDeleted: (postId: string) => void;
}

const RentalPostCard: React.FC<RentalPostCardProps> = ({ post, onPostDeleted }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.rental_post_likes.length);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const deleteTimeoutRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const commentCount = post.rental_post_comments[0]?.count || 0;
    const isOwner = user?.id === post.user_id;
    
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
        if (!isMenuOpen) {
            setConfirmingDelete(false);
            if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        }
    }, [isMenuOpen]);

    useEffect(() => {
        if (post.image_urls && post.image_urls.length > 0) {
            const { data } = supabase.storage.from('uploads').getPublicUrl(post.image_urls[0]);
            setImageUrl(data.publicUrl);
        }
    }, [post.image_urls]);

    useEffect(() => {
        setIsLiked(user ? post.rental_post_likes.some(like => like.user_id === user.id) : false);
        setLikeCount(post.rental_post_likes.length);
    }, [post.rental_post_likes, user]);

    const handleLikeToggle = async (e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        if (!user) return alert('يجب عليك تسجيل الدخول أولاً.');
        
        playLikeSound();
        triggerHapticFeedback();

        const currentlyLiked = isLiked;
        setIsLiked(!currentlyLiked);
        setLikeCount(prev => currentlyLiked ? prev - 1 : prev + 1);

        try {
            if (currentlyLiked) {
                await supabase.from('rental_post_likes').delete().match({ post_id: post.id, user_id: user.id });
            } else {
                await supabase.from('rental_post_likes').insert({ post_id: post.id, user_id: user.id });
                if (user.id !== post.user_id) {
                    await supabase.from('notifications').insert({ user_id: post.user_id, actor_id: user.id, type: 'like_rental_post', entity_id: post.id });
                }
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
            setIsLiked(currentlyLiked);
            setLikeCount(prev => currentlyLiked ? prev + 1 : prev - 1);
        }
    };
    
    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        if (!confirmingDelete) {
            setConfirmingDelete(true);
            deleteTimeoutRef.current = window.setTimeout(() => setConfirmingDelete(false), 3000);
            return;
        }

        setIsMenuOpen(false);
        try {
            const { count, error: deleteError } = await supabase.from('rental_posts').delete({ count: 'exact' }).eq('id', post.id);
            if (deleteError) throw deleteError;
            if (count === 0 || count === null) throw new Error('لم يتم حذف العرض، قد لا تملك الصلاحية.');

            if (post.image_urls && post.image_urls.length > 0) {
                const { error: storageError } = await supabase.storage.from('uploads').remove(post.image_urls);
                if (storageError) console.warn(`Post deleted, but failed to remove images: ${storageError.message}`);
            }
            onPostDeleted(post.id);
        } catch (err) {
            alert(`فشل حذف العرض: ${getErrorMessage(err)}`);
        } finally {
            setConfirmingDelete(false);
        }
    };
    
    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        const shareUrl = `${window.location.origin}/#/rental/${post.id}`;
        const shareData = { title: `منزل للإيجار في ${post.region}`, text: `شاهد هذا المنزل للإيجار بسعر ${post.rent_amount}$ شهرياً`, url: shareUrl };
        try {
            if (navigator.share) await navigator.share(shareData);
            else alert('المشاركة غير مدعومة على هذا المتصفح.');
        } catch (error) { console.error('Error sharing:', error); }
    };

    return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden group">
        <div className="p-4">
             <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 mb-2 flex-1">
                    <Avatar url={post.profiles?.avatar_url} size={40} userId={post.user_id} showStatus={true} />
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-zinc-100">{post.profiles?.full_name}</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{timeAgo(post.created_at)}</p>
                    </div>
                </div>
                 {isOwner && (
                    <div className="relative" ref={menuRef}>
                        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsMenuOpen(!isMenuOpen);}} className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                            <MoreIcon />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg z-10">
                                <Link to={`/rental/${post.id}/edit`} onClick={(e) => e.stopPropagation()} className="block w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">تعديل</Link>
                                <button onClick={handleDelete} className={`block w-full text-right px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors ${confirmingDelete ? 'bg-red-600 text-white' : ''}`}>
                                    {confirmingDelete ? 'تأكيد الحذف؟' : 'حذف'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        <Link to={`/rental/${post.id}`} className="block">
            <div className="relative w-full bg-gray-200 dark:bg-zinc-800">
                {imageUrl && <img src={imageUrl} alt="Rental property" className="w-full h-auto" />}
                 <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                     <p className="text-white text-xl font-bold">{post.rent_amount.toLocaleString()}$ / الشهر</p>
                 </div>
            </div>
            <div className="p-4">
                 <div className="flex items-center gap-4 text-gray-700 dark:text-zinc-300 text-sm">
                    <div className="flex items-center gap-1.5">
                        <MapPinIcon />
                        <span>{post.region}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <BedIcon />
                        <span>{post.room_count} غرف</span>
                    </div>
                 </div>
            </div>
        </Link>
        <div className="border-t border-gray-200 dark:border-zinc-800 pt-2 flex justify-around items-center text-gray-500 dark:text-zinc-400">
           <button 
              onClick={handleLikeToggle} 
              className="flex items-center gap-2 group p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 transform transition-transform active:scale-125"
              aria-label={isLiked ? 'إلغاء الإعجاب' : 'إعجاب'}
            >
                <HeartIcon filled={isLiked} />
                <span className="text-sm">{likeCount}</span>
            </button>
            <Link to={`/rental/${post.id}`} className="flex items-center gap-2 group hover:text-teal-400 text-sm transition-colors p-2 rounded-md">
               <CommentIcon />
                <span className="text-sm">{commentCount}</span>
           </Link>
            <button onClick={handleShare} className="flex items-center gap-2 group hover:text-teal-400 text-sm transition-colors p-2 rounded-md">
               <ShareIcon />
               <span className="text-sm">مشاركة</span>
           </button>
       </div>
    </div>
    );
};

export default RentalPostCard;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { RentalPost, RentalPostComment } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { getErrorMessage } from '../utils/errors';
import { useAuth } from '../hooks/useAuth';
import CreateRentalCommentForm from '../components/CreateRentalCommentForm';
import RentalCommentCard from '../components/RentalCommentCard';
import Button from '../components/ui/Button';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const ChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const MapPinIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>);
const BedIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16h20V4Z"/><path d="M2 10h20"/><path d="M12 4v6"/></svg>);
const MoreIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg> );


const RentalDetailScreen: React.FC = () => {
    const { rentalId } = useParams<{ rentalId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [post, setPost] = useState<RentalPost | null>(null);
    const [comments, setComments] = useState<RentalPostComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const deleteTimeoutRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const isOwner = user?.id === post?.user_id;
    const isAdmin = user?.email === 'azaamazeez8877@gmail.com';

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

    const fetchPostData = useCallback(async () => {
        if (!rentalId) return;
        setLoading(true);
        setError(null);
        try {
            // Fetch post
            const { data: postData, error: postError } = await supabase
                .from('rental_posts')
                .select('*')
                .eq('id', rentalId)
                .single();
            if (postError) throw postError;

            // Fetch owner profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', postData.user_id)
                .single();
            if (profileError) console.warn('Could not fetch owner profile');

            // Fetch comments
            const { data: commentsData, error: commentsError } = await supabase
                .from('rental_post_comments')
                .select('*, profiles(id, full_name, avatar_url)')
                .eq('post_id', rentalId)
                .order('created_at', { ascending: true });
            if (commentsError) throw commentsError;
            
            setPost({ ...postData, profiles: profileData });
            setComments(commentsData as any[]);
            
            const publicUrls = (postData.image_urls || []).map((url: string) => {
                return supabase.storage.from('uploads').getPublicUrl(url).data.publicUrl;
            });
            setImageUrls(publicUrls);

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [rentalId]);

    useEffect(() => {
        fetchPostData();
    }, [fetchPostData]);

    const handleCommentCreated = (newComment: RentalPostComment) => {
        setComments(current => [...current, newComment]);
    };
    const handleCommentDeleted = (commentId: string) => {
        setComments(current => current.filter(c => c.id !== commentId));
    };
    const handleCommentUpdated = (updatedComment: RentalPostComment) => {
        setComments(current => current.map(c => c.id === updatedComment.id ? updatedComment : c));
    };
    
    const handleDeletePost = async () => {
        if (!post) return;
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        if (!confirmingDelete) {
            setConfirmingDelete(true);
            deleteTimeoutRef.current = window.setTimeout(() => setConfirmingDelete(false), 3000);
            return;
        }

        setIsMenuOpen(false);
        try {
            const { count, error } = await supabase.from('rental_posts').delete({ count: 'exact' }).eq('id', post.id);
            if (error) throw error;
            if (count === 0 || count === null) throw new Error('لم يتم حذف العرض، قد لا تملك الصلاحية.');

            if (post.image_urls && post.image_urls.length > 0) {
                await supabase.storage.from('uploads').remove(post.image_urls);
            }
            navigate('/rentals');
        } catch (err) {
            alert(`فشل الحذف: ${getErrorMessage(err)}`);
        } finally {
            setConfirmingDelete(false);
        }
    };

    const nextImage = () => setCurrentImageIndex(i => (i + 1) % imageUrls.length);
    const prevImage = () => setCurrentImageIndex(i => (i - 1 + imageUrls.length) % imageUrls.length);
    
    const paymentTermText = {
        monthly: 'شهر',
        quarterly: '3 أشهر',
        semi_annually: '6 أشهر'
    };

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">تفاصيل العرض</h1>
                         {(isOwner || isAdmin) && (
                            <div className="absolute left-2" ref={menuRef}>
                                <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"><MoreIcon /></button>
                                {isMenuOpen && (
                                    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg z-10">
                                        <Link to={`/rental/${rentalId}/edit`} className="block w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">تعديل</Link>
                                        <button onClick={handleDeletePost} className={`block w-full text-right px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors ${confirmingDelete ? 'bg-red-600 text-white' : ''}`}>
                                            {confirmingDelete ? 'تأكيد الحذف؟' : 'حذف العرض'}
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
                    {error && <p className="text-center text-red-400 py-10">{error}</p>}
                    {post && (
                        <div>
                            {imageUrls.length > 0 && (
                                <div className="relative aspect-video w-full bg-gray-200 dark:bg-zinc-800 rounded-lg overflow-hidden mb-6 border border-gray-200 dark:border-zinc-700">
                                    <img src={imageUrls[currentImageIndex]} alt={`Rental property ${currentImageIndex + 1}`} className="w-full h-full object-contain" />
                                    {imageUrls.length > 1 && (
                                        <>
                                            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80"><ChevronLeft /></button>
                                            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80"><ChevronRight /></button>
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-sm text-white">{currentImageIndex + 1} / {imageUrls.length}</div>
                                        </>
                                    )}
                                </div>
                            )}
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 mb-6">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold">{post.address}</h2>
                                        <p className="text-gray-500 dark:text-zinc-400">{post.region}</p>
                                    </div>
                                    <div className="text-2xl font-bold text-teal-500 whitespace-nowrap">{post.rent_amount.toLocaleString()}$ / { paymentTermText[post.payment_term] }</div>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300">
                                    <div className="flex items-center gap-2"><BedIcon /> <span>{post.room_count} غرف</span></div>
                                    <div className="flex items-center gap-2"><MapPinIcon /> <span>{post.street_name}</span></div>
                                </div>
                                {post.map_link && <a href={post.map_link} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-teal-500 hover:text-teal-600 font-semibold">عرض على الخريطة &rarr;</a>}
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                                     <h3 className="text-md font-semibold text-gray-600 dark:text-zinc-300">مقدم من:</h3>
                                     <Link to={`/user/${post.user_id}`} className="flex items-center gap-3 mt-2">
                                        <Avatar url={post.profiles?.avatar_url} size={40} userId={post.user_id} showStatus={true} />
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-zinc-100 hover:underline">{post.profiles?.full_name}</p>
                                        </div>
                                     </Link>
                                </div>
                                {user && user.id !== post.user_id && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                                        <Button onClick={() => navigate(`/chat/${post.user_id}`)} className="w-full">مراسلة المالك</Button>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
                                <h3 className="text-xl font-bold mb-4">التعليقات</h3>
                                {user && <CreateRentalCommentForm postId={post.id} postOwnerId={post.user_id} onCommentCreated={handleCommentCreated} />}
                                <div className="space-y-4 mt-4">
                                    {comments.length > 0 ? (
                                        comments.map(comment => (
                                            <RentalCommentCard key={comment.id} comment={comment} onCommentDeleted={handleCommentDeleted} onCommentUpdated={handleCommentUpdated} />
                                        ))
                                    ) : (
                                        <p className="text-gray-500 dark:text-zinc-400 text-center py-4">لا توجد تعليقات. كن أول من يعلق!</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RentalDetailScreen;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Store, Product, StoreRating } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import ProductCard from '../components/ProductCard';
import { getErrorMessage } from '../utils/errors';
import StarRating from '../components/ui/StarRating';
import StarInput from '../components/ui/StarInput';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const MessageIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> );
const MoreIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg> );

const StoreDetailScreen: React.FC = () => {
    const { storeId } = useParams<{ storeId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [store, setStore] = useState<Store | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [storeImageUrl, setStoreImageUrl] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const deleteTimeoutRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // State for new features
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const [avgRating, setAvgRating] = useState(0);
    const [ratingCount, setRatingCount] = useState(0);
    const [actionLoading, setActionLoading] = useState({ follow: false, rate: false });

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

    const fetchStoreData = useCallback(async () => {
        if (!storeId) return;
        setLoading(true);
        setError(null);
        try {
            // Fetch store with followers and ratings
            const { data: storeData, error: storeError } = await supabase
                .from('stores')
                .select('id, created_at, name, description, user_id, image_url')
                .eq('id', storeId)
                .single();
            if (storeError) throw storeError;
            if (!storeData) throw new Error("لم يتم العثور على المتجر.");
            
            // Fetch profile separately
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', storeData.user_id)
                .single();

            if (profileError) console.error("Error fetching store owner profile:", profileError.message);
            
            // Fetch related data
            const [{ data: followersData }, { data: ratingsData }] = await Promise.all([
                supabase.from('store_followers').select('user_id').eq('store_id', storeId),
                supabase.from('store_ratings').select('user_id, rating').eq('store_id', storeId)
            ]);

            const completeStoreData: any = {
                ...storeData,
                profiles: profileError ? null : profileData,
                store_followers: followersData || [],
                store_ratings: ratingsData || [],
            };
            
            setStore(completeStoreData);

            if (storeData.image_url) {
                const { data } = supabase.storage.from('uploads').getPublicUrl(storeData.image_url);
                setStoreImageUrl(data.publicUrl);
            }

            const followers = completeStoreData.store_followers || [];
            setFollowersCount(followers.length);
            setIsFollowing(followers.some((f: any) => f.user_id === user?.id));

            const ratings: StoreRating[] = completeStoreData.store_ratings || [];
            setRatingCount(ratings.length);
            const currentUserRating = ratings.find((r) => r.user_id === user?.id);
            setUserRating(currentUserRating?.rating || 0);
            setAvgRating(ratings.length > 0 ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length : 0);
            
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('id, created_at, name, description, price, image_url, store_id, user_id')
                .eq('store_id', storeId)
                .order('created_at', { ascending: false });
            if (productsError) throw productsError;

            if (productsData && productsData.length > 0) {
                const productIds = productsData.map(p => p.id);
                const [{ data: productLikesData }, { data: productCommentsData }] = await Promise.all([
                    supabase.from('product_likes').select('product_id, user_id').in('product_id', productIds),
                    supabase.from('product_comments').select('product_id, id').in('product_id', productIds)
                ]);

                const likesByProduct = new Map<string, any[]>();
                (productLikesData || []).forEach(like => {
                    if (!likesByProduct.has(like.product_id)) likesByProduct.set(like.product_id, []);
                    likesByProduct.get(like.product_id)!.push({ user_id: like.user_id });
                });

                const commentsByProduct = new Map<string, number>();
                (productCommentsData || []).forEach(comment => {
                    commentsByProduct.set(comment.product_id, (commentsByProduct.get(comment.product_id) || 0) + 1);
                });

                productsData.forEach((product: any) => {
                    product.product_likes = likesByProduct.get(product.id) || [];
                    product.product_comments = [{ count: commentsByProduct.get(product.id) || 0 }];
                });
            }

            setProducts((productsData || []) as any[]);

        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [storeId, user]);

    useEffect(() => {
        fetchStoreData();
    }, [fetchStoreData]);
    
    const handleFollowToggle = async () => {
        if (!user || !store) return;
        setActionLoading(prev => ({ ...prev, follow: true }));
        if (isFollowing) {
            const { error } = await supabase.from('store_followers').delete().match({ store_id: store.id, user_id: user.id });
            if (!error) { setIsFollowing(false); setFollowersCount(c => c - 1); }
        } else {
            const { error } = await supabase.from('store_followers').insert({ store_id: store.id, user_id: user.id });
            if (!error) {
                setIsFollowing(true);
                setFollowersCount(c => c + 1);
                if (user.id !== store.user_id) {
                    await supabase.from('notifications').insert({
                        user_id: store.user_id,
                        actor_id: user.id,
                        type: 'new_store_follower',
                        entity_id: store.id,
                    });
                }
            }
        }
        setActionLoading(prev => ({ ...prev, follow: false }));
    };

    const handleRatingSubmit = async (newRating: number) => {
        if (!user || !store || newRating === userRating) return;
        setActionLoading(prev => ({ ...prev, rate: true }));
        const { error } = await supabase.from('store_ratings').upsert({ store_id: store.id, user_id: user.id, rating: newRating }, { onConflict: 'store_id, user_id' });
        if (!error) {
            if (user.id !== store.user_id) {
                await supabase.from('notifications').insert({
                    user_id: store.user_id,
                    actor_id: user.id,
                    type: 'new_store_rating',
                    entity_id: store.id,
                });
            }
            fetchStoreData();
        }
        setActionLoading(prev => ({ ...prev, rate: false }));
    };

    const handleProductDeleted = (productId: string) => {
        setProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
    };
    
    const handleDeleteStore = async () => {
        if (!store) return;
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        if (!confirmingDelete) {
            setConfirmingDelete(true);
            deleteTimeoutRef.current = window.setTimeout(() => setConfirmingDelete(false), 3000);
            return;
        }

        setIsMenuOpen(false);
        try {
            const { count, error } = await supabase.from('stores').delete({ count: 'exact' }).eq('id', store.id);
            if (error) throw error;
            if (count === 0 || count === null) throw new Error('لم يتم حذف المتجر، قد لا تملك الصلاحية.');
            
            if (store.image_url) {
                const { error: storageError } = await supabase.storage.from('uploads').remove([store.image_url]);
                if (storageError) console.warn(`Store deleted, but failed to remove image: ${storageError.message}`);
            }
            navigate('/stores');
        } catch (err: unknown) { 
            alert(`فشل حذف المتجر: ${getErrorMessage(err)}`);
        } finally {
            setConfirmingDelete(false);
        }
    };

    const renderProducts = () => {
        if (products.length === 0) return <div className="text-center text-gray-500 dark:text-zinc-400 py-10"><p>لا توجد منتجات في هذا المتجر حتى الآن.</p></div>;
        return ( <div className="grid grid-cols-2 sm:grid-cols-3 gap-4"> {products.map(p => <ProductCard key={p.id} product={p} isOwner={isOwner} onProductDeleted={handleProductDeleted}/>)} </div> );
    };

    const isOwner = user?.id === store?.user_id;
    const isAdmin = user?.email === 'azaamazeez8877@gmail.com';

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                     <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"> <BackIcon /> </button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">{loading ? '...' : store?.name || 'تفاصيل المتجر'}</h1>
                         {(isOwner || isAdmin) && (<div className="absolute left-2" ref={menuRef}><button onClick={() => setIsMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"><MoreIcon /></button>{isMenuOpen && (<div className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg z-10"><button onClick={handleDeleteStore} className={`block w-full text-right px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors ${confirmingDelete ? 'bg-red-600 dark:bg-red-700 text-white' : ''}`}>{confirmingDelete ? 'تأكيد الحذف؟' : 'حذف المتجر'}</button></div>)}</div>)}
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                 <div className="max-w-2xl mx-auto">
                     {loading && <div className="text-center py-10"><Spinner /></div>}
                     {!loading && error && !store && <p className="text-center text-red-400 py-10">{error}</p>}
                     {store && (
                        <div>
                            {storeImageUrl && ( <div className="aspect-video w-full bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden mb-6 border border-gray-200 dark:border-zinc-700"><img src={storeImageUrl} alt={store.name} className="w-full h-full object-cover" /></div> )}
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 mb-6">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar url={store.profiles?.avatar_url} size={56} userId={store.user_id} showStatus={true} />
                                        <div>
                                            <h2 className="text-2xl font-bold">{store.name}</h2>
                                            <p className="text-gray-500 dark:text-zinc-400">بواسطة {store.profiles?.full_name}</p>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500 dark:text-zinc-400 text-sm mt-2">
                                                <StarRating rating={avgRating} count={ratingCount} />
                                                <span>•</span>
                                                <span>{followersCount} متابع</span>
                                            </div>
                                        </div>
                                    </div>
                                    {isOwner && ( <Link to={`/store/${storeId}/products/new`}><Button variant="secondary" className="!w-auto px-4 !py-2 !text-sm flex-shrink-0">أضف منتجًا</Button></Link> )}
                                </div>
                                {store.description && <p className="text-gray-700 dark:text-zinc-300 mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">{store.description}</p>}
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800 space-y-3">
                                    {!isOwner && user && store.user_id && (
                                        <div className="space-y-3">
                                            <Button onClick={handleFollowToggle} loading={actionLoading.follow} variant={isFollowing ? 'secondary' : 'primary'}>{isFollowing ? 'إلغاء المتابعة' : 'متابعة'}</Button>
                                            <Button onClick={() => navigate(`/chat/${store.user_id}`)} variant="secondary"><MessageIcon />مراسلة البائع</Button>
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-md font-semibold mb-2">{userRating > 0 ? 'تقييمك' : 'قيّم هذا المتجر'}</h4>
                                        <StarInput currentRating={userRating} onRatingSubmit={handleRatingSubmit} disabled={actionLoading.rate} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-4">المنتجات</h3>
                                <div className="min-h-[100px]"> {renderProducts()} </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StoreDetailScreen;

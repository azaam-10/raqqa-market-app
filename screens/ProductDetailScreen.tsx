import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Product, ProductComment } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import CreateProductCommentForm from '../components/CreateProductCommentForm';
import ProductCommentCard from '../components/ProductCommentCard';
import { getErrorMessage, playLikeSound, triggerHapticFeedback } from '../utils/errors';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const HeartIcon = ({ filled }: { filled: boolean }) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transform transition-all duration-300 ease-out group-hover:scale-125 ${ filled ? 'text-red-500 scale-110' : 'text-gray-500 dark:text-zinc-400' }`}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> );
const CommentIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-500 dark:text-zinc-400 group-hover:text-teal-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> );

const ProductDetailScreen: React.FC = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [product, setProduct] = useState<Product | null>(null);
    const [comments, setComments] = useState<ProductComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    useEffect(() => {
        if (!productId) return;
        
        const fetchProductData = async () => {
             setLoading(true); setError(null);
             try {
                // Step 1: Fetch base product
                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .select('id, created_at, name, description, price, image_url, store_id, user_id')
                    .eq('id', productId)
                    .single();

                if (productError) throw productError;

                // Step 2: Fetch related data in parallel
                const [
                    storeResult,
                    profileResult,
                    likesResult,
                    commentsResult
                ] = await Promise.all([
                    supabase.from('stores').select('id, name').eq('id', productData.store_id).single(),
                    supabase.from('profiles').select('full_name, avatar_url').eq('id', productData.user_id).single(),
                    supabase.from('product_likes').select('user_id').eq('product_id', productId),
                    supabase.from('product_comments').select('id, content, created_at, user_id, product_id').eq('product_id', productId).order('created_at', { ascending: true })
                ]);
                
                const { data: storeData, error: storeError } = storeResult;
                const { data: profileData, error: profileError } = profileResult;
                const { data: likesData, error: likesError } = likesResult;
                const { data: commentsData, error: commentsError } = commentsResult;
                
                if (storeError) console.warn("Error fetching store", storeError.message);
                if (profileError) console.warn("Error fetching profile", profileError.message);
                if (likesError) throw likesError;
                if (commentsError) throw commentsError;
                
                 // Step 3: Augment comments with their profiles
                if (commentsData && commentsData.length > 0) {
                    const commentUserIds = [...new Set(commentsData.map(c => c.user_id))];
                    const { data: commentProfiles, error: commentProfilesError } = await supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url')
                        .in('id', commentUserIds);
                    if (commentProfilesError) throw commentProfilesError;

                    const profilesMap = new Map((commentProfiles || []).map(p => [p.id, p]));
                    const augmentedComments = commentsData.map(comment => ({
                        ...comment,
                        profiles: profilesMap.get(comment.user_id) || null
                    }));
                    setComments(augmentedComments as any[]);
                } else {
                    setComments([]);
                }

                // Step 4: Combine all data for the product
                const augmentedProduct: any = {
                    ...productData,
                    stores: storeData || null,
                    profiles: profileData || null,
                    product_likes: likesData || []
                };
                
                setProduct(augmentedProduct);
                
                setLikeCount(likesData?.length || 0);
                if(user) setIsLiked(likesData?.some((l: any) => l.user_id === user.id) || false);
                
                if (productData.image_url) {
                    const { data } = supabase.storage.from('uploads').getPublicUrl(productData.image_url);
                    setProductImageUrl(data.publicUrl);
                }

            } catch (err: unknown) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };
        
        fetchProductData();
        
        const subscription = supabase
            .channel(`product-details-${productId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'product_comments', filter: `product_id=eq.${productId}` }, () => fetchProductData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'product_likes', filter: `product_id=eq.${productId}` }, () => fetchProductData())
            .subscribe();
            
        return () => { supabase.removeChannel(subscription); };

    }, [productId, user]);
    
     const handleLikeToggle = async () => {
        if (!user || !product) return alert('يجب عليك تسجيل الدخول أولاً.');
        
        playLikeSound();
        triggerHapticFeedback();
        
        const currentlyLiked = isLiked;
        setIsLiked(!currentlyLiked);
        setLikeCount(prev => currentlyLiked ? prev - 1 : prev + 1);

        if (currentlyLiked) {
            await supabase.from('product_likes').delete().match({ product_id: product.id, user_id: user.id });
        } else {
            const { error } = await supabase.from('product_likes').insert({ product_id: product.id, user_id: user.id });
            if (!error && user.id !== product.user_id) {
                await supabase.from('notifications').insert({ user_id: product.user_id, actor_id: user.id, type: 'like_product', entity_id: product.id });
            }
        }
    };
    
    const onCommentAction = (action: 'deleted' | 'updated' | 'created', data: any) => {
        if (action === 'created') setComments(current => [...current, data]);
        if (action === 'updated') setComments(current => current.map(c => c.id === data.id ? data : c));
        if (action === 'deleted') setComments(current => current.filter(c => c.id !== data.id));
    };

    return (
      <div className="min-h-screen">
        <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
            <div className="container mx-auto px-4">
                <div className="flex items-center h-16 relative">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"> <BackIcon /> </button>
                    <h1 className="text-xl font-bold text-center w-full truncate px-12">تفاصيل المنتج</h1>
                </div>
            </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            {loading && <div className="text-center py-10"><Spinner /></div>}
            {error && <p className="text-center text-red-400 py-10">{error}</p>}
            {product && (
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                {productImageUrl && (
                    <div className="aspect-square w-full bg-black">
                        <img src={productImageUrl} alt={product.name} className="w-full h-full object-contain" />
                    </div>
                )}
                <div className="p-4 md:p-6">
                    <h2 className="text-3xl font-bold">{product.name}</h2>
                    <p className="text-teal-500 font-bold text-2xl my-2">{product.price.toFixed(2)}$</p>
                    <div className="text-sm text-gray-500 dark:text-zinc-400 my-4">
                        <p>يباع بواسطة: <Link to={`/user/${product.user_id}`} className="font-semibold text-gray-700 dark:text-zinc-300 hover:underline">{product.profiles?.full_name}</Link></p>
                        <p>من متجر: <Link to={`/store/${product.stores?.id}`} className="font-semibold text-gray-700 dark:text-zinc-300 hover:underline">{product.stores?.name}</Link></p>
                    </div>

                    {product.description && <p className="text-gray-700 dark:text-zinc-300 whitespace-pre-wrap mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">{product.description}</p>}

                    <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-zinc-800">
                        <button onClick={handleLikeToggle} className="flex items-center gap-2 group p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transform transition-transform active:scale-125">
                            <HeartIcon filled={isLiked} /> <span className="text-gray-700 dark:text-zinc-300">{likeCount}</span>
                        </button>
                        <div className="flex items-center gap-2 group p-2 rounded-md">
                            <CommentIcon /> <span className="text-gray-700 dark:text-zinc-300">{comments.length}</span>
                        </div>
                    </div>
                </div>
                <div className="p-4 md:p-6 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                     <h3 className="text-lg font-bold mb-4">التعليقات</h3>
                     <CreateProductCommentForm productId={product.id} productOwnerId={product.user_id} onCommentCreated={(c) => onCommentAction('created', c)} />
                     <div className="space-y-4 mt-4">
                        {comments.length > 0 ? (
                            comments.map(comment => (
                                <ProductCommentCard 
                                    key={comment.id} 
                                    comment={comment} 
                                    onCommentUpdated={(c) => onCommentAction('updated', c)} 
                                    onCommentDeleted={(id) => onCommentAction('deleted', {id})}
                                />
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

export default ProductDetailScreen;

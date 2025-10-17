import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import Avatar from './ui/Avatar';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';
import { playLikeSound, triggerHapticFeedback, timeAgo } from '../utils/errors';

const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transform transition-all duration-300 ease-out group-hover:scale-125 ${ filled ? 'text-lime-400 scale-110' : 'text-gray-500 dark:text-slate-400' }`}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);
const CommentIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>);
const ShareIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg> );
const StoreIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7"/></svg>);

interface ProductPostCardProps {
    product: Product;
    onProductDeleted?: (productId: string) => void;
    onProductUpdated?: (updatedProduct: Product) => void;
}

const ProductPostCard: React.FC<ProductPostCardProps> = ({ product, onProductDeleted, onProductUpdated }) => {
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(product.product_likes.length);
    const [productImageUrl, setProductImageUrl] = useState<string | null>(null);

    const commentCount = product.product_comments[0]?.count || 0;

    useEffect(() => {
        if (product.image_url) {
            const { data } = supabase.storage.from('uploads').getPublicUrl(product.image_url);
            setProductImageUrl(data.publicUrl);
        }
    }, [product.image_url]);

    useEffect(() => {
        setIsLiked(user ? product.product_likes.some(like => like.user_id === user.id) : false);
        setLikeCount(product.product_likes.length);
    }, [product.product_likes, user]);
    
    const handleLikeToggle = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) return alert('يجب عليك تسجيل الدخول أولاً.');

        playLikeSound();
        triggerHapticFeedback();
        
        const currentlyLiked = isLiked;
        setIsLiked(!currentlyLiked);
        setLikeCount(prev => currentlyLiked ? prev - 1 : prev + 1);

        if (currentlyLiked) {
            const { error } = await supabase.from('product_likes').delete().match({ product_id: product.id, user_id: user.id });
            if (error) {
                console.error('Error unliking product:', error);
                setIsLiked(true); setLikeCount(prev => prev + 1);
            }
        } else {
            const { error } = await supabase.from('product_likes').insert({ product_id: product.id, user_id: user.id });
            if (error) {
                console.error('Error liking product:', error);
                setIsLiked(false); setLikeCount(prev => prev - 1);
            } else if (user.id !== product.user_id) {
                await supabase.from('notifications').insert({ user_id: product.user_id, actor_id: user.id, type: 'like_product', entity_id: product.id });
            }
        }
    };
    
    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation(); e.preventDefault();
        const shareUrl = `${window.location.origin}/#/product/${product.id}`;
        const shareText = `${product.name} - السعر: ${product.price.toFixed(2)}$`;
        const shareData = { title: `منتج: ${product.name}`, text: shareText, url: shareUrl };
        try {
            if (navigator.share) await navigator.share(shareData);
            else alert('المشاركة غير مدعومة على هذا المتصفح.');
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const authorName = product.profiles?.full_name || 'مستخدم غير معروف';
    const authorAvatarUrl = product.profiles?.avatar_url;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 mb-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center mb-3 flex-1">
                    <Link to={`/user/${product.user_id}`} className="ml-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Avatar url={authorAvatarUrl} size={40} userId={product.user_id} showStatus={true} />
                    </Link>
                    <div>
                        <Link to={`/user/${product.user_id}`} className="font-bold text-gray-900 dark:text-zinc-100 hover:underline" onClick={e => e.stopPropagation()}>{authorName}</Link>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                           <Link to={`/product/${product.id}`} className="hover:underline">{timeAgo(product.created_at)}</Link>
                           • 
                           <Link to={`/store/${product.stores?.id}`} className="hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}><StoreIcon /> {product.stores?.name}</Link>
                        </p>
                    </div>
                </div>
            </div>
            
            <Link to={`/product/${product.id}`} className="block">
                <div className="mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{product.name}</h3>
                    <p className="text-teal-500 dark:text-teal-400 font-bold text-xl">{product.price.toFixed(2)}$</p>
                </div>
                {product.description && (
                    <p className="text-gray-700 dark:text-zinc-300 whitespace-pre-wrap mb-3">
                        {product.description.length > 150 ? `${product.description.substring(0, 150)}...` : product.description}
                    </p>
                )}
                {productImageUrl && (
                    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700">
                        <img src={productImageUrl} alt={product.name} className="w-full h-auto" />
                    </div>
                )}
            </Link>
            
            <div className="flex items-center justify-around mt-4 border-t border-gray-200 dark:border-zinc-800 pt-2 text-gray-500 dark:text-zinc-400">
                <button 
                  onClick={handleLikeToggle} 
                  className="flex items-center gap-2 group p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 transform transition-transform active:scale-125"
                  aria-label={isLiked ? 'إلغاء الإعجاب' : 'إعجاب'}
                >
                    <HeartIcon filled={isLiked} />
                    <span className="text-sm">{likeCount}</span>
                </button>
                <Link to={`/product/${product.id}`} className="flex items-center gap-2 group hover:text-teal-400 text-sm transition-colors p-2 rounded-md">
                    <CommentIcon />
                    <span>{commentCount}</span>
                </Link>
                <button onClick={handleShare} className="flex items-center gap-2 group hover:text-teal-400 text-sm transition-colors p-2 rounded-md">
                    <ShareIcon />
                    <span>مشاركة</span>
                </button>
            </div>
        </div>
    );
};

export default ProductPostCard;
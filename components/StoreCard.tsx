import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store } from '../types';
import { supabase } from '../services/supabase';
import Avatar from './ui/Avatar';
import StarRating from './ui/StarRating';
import { useAuth } from '../hooks/useAuth';
import Button from './ui/Button';

const StorePlaceholderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-gray-400 dark:text-zinc-500"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7"/></svg>
);

const StoreCard: React.FC<{ store: Store }> = ({ store }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(store.store_followers.length);
  const [actionLoading, setActionLoading] = useState(false);

  const isOwner = user?.id === store.user_id;

  useEffect(() => {
    if (user) {
      setIsFollowing(store.store_followers.some(f => f.user_id === user.id));
    }
    setFollowersCount(store.store_followers.length);
  }, [store.store_followers, user]);
  
  useEffect(() => {
    if (store.image_url) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(store.image_url);
      setImageUrl(data.publicUrl);
    } else {
        setImageUrl(null);
    }
  }, [store.image_url]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate('/login');
    
    setActionLoading(true);
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
    setActionLoading(false);
  };

  const ratings = store.store_ratings || [];
  const ratingCount = ratings.length;
  const avgRating = ratingCount > 0 
    ? ratings.reduce((acc, r) => acc + (r.rating || 0), 0) / ratingCount 
    : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 flex items-center gap-4 transition-colors hover:border-gray-300 dark:hover:border-zinc-700">
        <Link to={`/store/${store.id}`} className="flex-shrink-0">
            <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                    <img src={imageUrl} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                    <StorePlaceholderIcon />
                )}
            </div>
        </Link>
        <div className="flex-1 min-w-0">
            <Link to={`/store/${store.id}`} className="hover:underline">
                <h2 className="font-bold text-gray-900 dark:text-zinc-100 truncate text-lg">{store.name}</h2>
            </Link>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mt-1">
                <Avatar url={store.profiles?.avatar_url} size={16} userId={store.user_id} showStatus={true} />
                <span className="truncate">بواسطة {store.profiles?.full_name || 'مالك غير معروف'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 dark:text-zinc-400 text-sm mt-2">
                <StarRating rating={avgRating} count={ratingCount} size="sm" />
                <span className="hidden sm:inline">•</span>
                <span className="text-xs sm:text-sm">{followersCount} متابع</span>
            </div>
        </div>
        <div className="flex-shrink-0">
            {isOwner ? (
                <Link to={`/store/${store.id}`}>
                    <Button variant="secondary" className="!w-auto px-4 !py-2 !text-sm">عرض</Button>
                </Link>
            ) : (
                <Button 
                    onClick={handleFollowToggle} 
                    loading={actionLoading} 
                    variant={isFollowing ? 'secondary' : 'primary'} 
                    className="!w-auto px-4 !py-2 !text-sm"
                >
                    {isFollowing ? 'أتابعه' : 'متابعة'}
                </Button>
            )}
        </div>
    </div>
  );
};

export default StoreCard;

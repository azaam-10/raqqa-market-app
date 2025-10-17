import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { Post, Product, RentalPost } from '../types';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';
import ProductPostCard from '../components/ProductPostCard';
import RentalPostCard from '../components/RentalPostCard';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { getErrorMessage, playNotificationSound, triggerHapticFeedback } from '../utils/errors';
import PostCardSkeleton from '../components/ui/PostCardSkeleton';

type FeedItem = (Post & { item_type: 'post' }) | (Product & { item_type: 'product' }) | (RentalPost & { item_type: 'rental' });
type FeedFilter = 'all' | 'groups' | 'stores' | 'rentals';

const PAGE_SIZE = 10;
const REFRESH_THRESHOLD = 80;

const fetchAugmentedProducts = async (productIds: string[]) => {
    if (productIds.length === 0) return [];

    // 1. Fetch base products, stores, likes, comments
    const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, stores!store_id(id, name), product_likes:product_likes(user_id), product_comments:product_comments(count)')
        .in('id', productIds);
    if (productsError) throw productsError;
    if (!productsData) return [];

    // 2. Get unique user IDs
    const userIds = [...new Set(productsData.map(p => p.user_id))];
    if (userIds.length === 0) {
        return productsData.map(p => ({...p, profiles: null}));
    }

    // 3. Fetch profiles for these users
    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
    if (profilesError) throw profilesError;

    // 4. Map profiles to user IDs and join client-side
    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
    return productsData.map(product => ({
        ...product,
        profiles: profilesMap.get(product.user_id) || null,
    }));
};


const MessengerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

const NotificationsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
);

const SalesAssistantIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M12 8V4H8"/>
        <rect x="4" y="12" width="16" height="8" rx="2"/>
        <path d="M8 12v-2a4 4 0 1 1 8 0v2"/>
        <path d="M12 16h.01"/>
        <path d="M16 16h.01"/>
    </svg>
);


const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
);

const ProfileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const AdminIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="8" cy="7" r="3"/></svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);

const CurrencyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const RefreshIcon = ({ rotation }: { rotation: number }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="h-6 w-6 text-zinc-400 transition-transform duration-200"
        style={{ transform: `rotate(${rotation}deg)` }}
    >
        <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m0 0a9 9 0 0 1 9-9m-9 9a9 9 0 0 0 9 9"/><path d="m3 12 4-4"/><path d="m3 12 4 4"/>
    </svg>
);

const TabButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void; }) => (
    <button onClick={onClick} className={`flex-1 py-3 text-sm font-bold transition-colors ${active ? 'text-teal-400 border-b-2 border-teal-400' : 'text-gray-500 dark:text-zinc-400 border-b-2 border-transparent hover:bg-gray-100 dark:hover:bg-zinc-800/50'}`}>
        {label}
    </button>
);


const HomeScreen: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);


  // Pull to refresh state
  const [pullStart, setPullStart] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const isAdmin = user?.email === 'azaamazeez8877@gmail.com';

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver>();

  const loadMoreTriggerRef = useCallback(node => {
    if (loading || loadingMore || isRefreshing) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
           setPage(prevPage => prevPage + 1);
        }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, isRefreshing]);
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);

        if (error) {
            console.error('Error fetching unread count:', error.message);
        } else if (count !== null) {
            setUnreadCount(count);
        }
    };

    fetchUnreadCount();
    
    const subscription = supabase
        .channel(`public:notifications:user_id=eq.${user.id}`)
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
            (payload) => {
                if (!(payload.new as any).read) {
                    setUnreadCount(prev => prev + 1);
                    playNotificationSound();
                    triggerHapticFeedback();
                }
            }
        )
        .subscribe();
        
    return () => {
        supabase.removeChannel(subscription);
    };
  }, [user]);
  
 const fetchPageData = useCallback(async (pageNum: number, isRefresh: boolean) => {
    if (pageNum > 0) setLoadingMore(true);
    else if (!isRefresh) setLoading(true);
    
    setError(null);

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
        let fetchedItems: FeedItem[] = [];
        const BATCH_SIZE = Math.ceil(PAGE_SIZE / 3);
        const fromBatch = pageNum * BATCH_SIZE;
        const toBatch = fromBatch + BATCH_SIZE - 1;

        if (feedFilter === 'all') {
            const [postsResult, rentalsResult, productsResultData] = await Promise.all([
                supabase.from('posts').select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)').order('created_at', { ascending: false }).range(fromBatch, toBatch),
                supabase.from('rental_posts').select('*, profiles!user_id(full_name, avatar_url), rental_post_likes(user_id), rental_post_comments(count)').order('created_at', { ascending: false }).range(fromBatch, toBatch),
                supabase.from('products').select('id, user_id').order('created_at', { ascending: false }).range(fromBatch, toBatch)
            ]);

            if (postsResult.error) throw postsResult.error;
            if (rentalsResult.error) throw rentalsResult.error;
            if (productsResultData.error) throw productsResultData.error;

            const productIds = (productsResultData.data || []).map(p => p.id);
            const productsResult = await fetchAugmentedProducts(productIds);
            
            fetchedItems = [
                ...(postsResult.data || []).map(p => ({ ...p, item_type: 'post' as const })),
                ...(productsResult || []).map(p => ({ ...p, item_type: 'product' as const })),
                ...(rentalsResult.data || []).map(p => ({ ...p, item_type: 'rental' as const })),
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
        } else if (feedFilter === 'groups') {
            const { data, error } = await supabase.from('posts').select('*, profiles!user_id(full_name, avatar_url), groups!group_id(name), likes(user_id), comments(count)').not('group_id', 'is', null).order('created_at', { ascending: false }).range(from, to);
            if (error) throw error;
            fetchedItems = (data || []).map(p => ({ ...p, item_type: 'post' as const }));
        } else if (feedFilter === 'stores') {
            const { data, error } = await supabase.from('products').select('id, user_id').order('created_at', { ascending: false }).range(from, to);
            if (error) throw error;
            const productIds = (data || []).map(p => p.id);
            const products = await fetchAugmentedProducts(productIds);
            fetchedItems = (products || []).map(p => ({ ...p, item_type: 'product' as const }));
        } else if (feedFilter === 'rentals') {
            const { data, error } = await supabase.from('rental_posts').select('*, profiles!user_id(full_name, avatar_url), rental_post_likes(user_id), rental_post_comments(count)').order('created_at', { ascending: false }).range(from, to);
            if (error) throw error;
            fetchedItems = (data || []).map(p => ({ ...p, item_type: 'rental' as const }));
        }

        setHasMore(fetchedItems.length >= PAGE_SIZE || (feedFilter === 'all' && fetchedItems.length > 0));
        setFeedItems(prev => pageNum === 0 ? fetchedItems : [...prev, ...fetchedItems]);

    } catch (err) {
        setError(getErrorMessage(err));
    } finally {
        setLoading(false);
        setLoadingMore(false);
        setIsRefreshing(false);
    }
}, [feedFilter]);


const initializeFeed = useCallback((isRefreshing: boolean) => {
    if (!user) return;
    if (isRefreshing) setIsRefreshing(true);
    else setLoading(true);

    setError(null);
    setPage(0);
    setFeedItems([]);
    setHasMore(true);
    fetchPageData(0, isRefreshing);

}, [user, fetchPageData]);

  useEffect(() => {
    if (user) {
        initializeFeed(false);
    }
  }, [initializeFeed, user, feedFilter]);

  useEffect(() => {
    if (page > 0) {
        fetchPageData(page, false);
    }
  }, [page, fetchPageData]);

  const onPostCreated = (newPost: Post) => {
    if (feedFilter === 'all' || (feedFilter === 'groups' && newPost.group_id)) {
        setFeedItems(prev => [{ ...newPost, item_type: 'post' }, ...prev]);
    }
  };

  const onPostDeleted = (postId: string) => {
    setFeedItems(prev => prev.filter(item => item.item_type !== 'post' || item.id !== postId));
  };
  
  const onPostUpdated = (updatedPost: Post) => {
      setFeedItems(prev => prev.map(item => (item.item_type === 'post' && item.id === updatedPost.id ? { ...updatedPost, item_type: 'post' } : item)));
  };

  const renderItem = (item: FeedItem) => {
    switch (item.item_type) {
      case 'post':
        return <PostCard key={`post-${item.id}`} post={item} onPostDeleted={onPostDeleted} onPostUpdated={onPostUpdated} />;
      case 'product':
        return <ProductPostCard key={`product-${item.id}`} product={item} />;
      case 'rental':
         return <RentalPostCard key={`rental-${item.id}`} post={item} onPostDeleted={() => {}} />;
      default:
        return null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      const scrollable = mainContainerRef.current;
      if (scrollable && scrollable.scrollTop === 0) {
          setPullStart(e.touches[0].clientY);
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (pullStart !== null) {
          const distance = e.touches[0].clientY - pullStart;
          if (distance > 0) {
              setPullDistance(Math.min(distance, REFRESH_THRESHOLD + 40));
          }
      }
  };
  
  const handleTouchEnd = () => {
    if (pullStart !== null) {
      if (pullDistance > REFRESH_THRESHOLD && !isRefreshing) {
        initializeFeed(true).finally(() => {
          setPullStart(null);
          setPullDistance(0);
        });
      } else {
        setPullDistance(0);
        setPullStart(null);
      }
    }
  };
  
  const handleFilterChange = (newFilter: FeedFilter) => {
    setFeedFilter(newFilter);
    mainContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const pullToRefreshStyle = {
    transform: `translateY(${Math.min(pullDistance, REFRESH_THRESHOLD)}px)`,
    transition: 'transform 0.3s',
  };
  
  const handleLogout = () => {
    setIsDropdownOpen(false);
    signOut();
  };
  
  const handleInstallClick = async () => {
    if (!installPrompt) {
        return;
    }
    const promptEvent = installPrompt as any;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setInstallPrompt(null);
    setIsDropdownOpen(false);
  };


  return (
    <div>
      <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-lime-400 bg-clip-text text-transparent">
              سوق محافظة الرقه
            </h1>
            <div className="flex items-center gap-1 sm:gap-2 text-gray-600 dark:text-zinc-300">
                <Link to="/sales-assistant" className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800" title="مساعد البيع">
                    <SalesAssistantIcon />
                </Link>
                <Link to="/messages" className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800" title="الرسائل">
                  <MessengerIcon />
                </Link>
                <Link to="/notifications" className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800" title="الإشعارات">
                  <NotificationsIcon />
                  {unreadCount > 0 && <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </Link>
                <div className="relative" ref={dropdownRef}>
                <button onClick={() => setIsDropdownOpen(p => !p)}>
                    <Avatar url={profile?.avatar_url} size={36} userId={user?.id} showStatus={true} />
                </button>
                {isDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg z-20 py-1">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
                            <p className="font-bold text-gray-900 dark:text-zinc-100 truncate">{profile?.full_name}</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{user?.email}</p>
                        </div>
                        <Link to="/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors w-full">
                            <ProfileIcon />
                            <span>الملف الشخصي</span>
                        </Link>
                        {isAdmin && (
                            <Link to="/admin" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors w-full">
                                <AdminIcon />
                                <span>لوحة تحكم المسؤول</span>
                            </Link>
                        )}
                        <Link to="/settings" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors w-full">
                            <SettingsIcon />
                            <span>الإعدادات</span>
                        </Link>
                        <Link to="/rates" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors w-full">
                            <CurrencyIcon />
                            <span>أسعار العملات</span>
                        </Link>
                        {installPrompt && (
                            <button onClick={handleInstallClick} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                                <DownloadIcon />
                                <span>تثبيت التطبيق</span>
                            </button>
                        )}
                        <div className="my-1 h-px bg-gray-200 dark:bg-zinc-700"></div>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                            <LogoutIcon />
                            <span>تسجيل الخروج</span>
                        </button>
                    </div>
                )}
                </div>
            </div>
          </div>
        </div>
      </header>

      <div 
        ref={mainContainerRef}
        className="container mx-auto max-w-2xl overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ height: 'calc(100vh - 64px)' }}
      >
        <div style={pullToRefreshStyle}>
            <div className="flex justify-center items-center h-16 text-center -mt-16" style={{ opacity: Math.min(pullDistance/REFRESH_THRESHOLD, 1) }}>
                {isRefreshing ? <Spinner /> : <RefreshIcon rotation={pullDistance * 2} />}
            </div>

            <main className="px-2 pt-4 sm:px-4">
              <CreatePostForm onPostCreated={onPostCreated} profile={profile} />
              <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-800 flex mb-4 sticky top-0 z-[5]">
                  <TabButton label="الكل" active={feedFilter === 'all'} onClick={() => handleFilterChange('all')} />
                  <TabButton label="المجموعات" active={feedFilter === 'groups'} onClick={() => handleFilterChange('groups')} />
                  <TabButton label="المتاجر" active={feedFilter === 'stores'} onClick={() => handleFilterChange('stores')} />
                  <TabButton label="الإيجارات" active={feedFilter === 'rentals'} onClick={() => handleFilterChange('rentals')} />
              </div>
              
              {loading && page === 0 && !isRefreshing && (
                  <div> <PostCardSkeleton /> <PostCardSkeleton /> </div>
              )}
              
              {!loading && feedItems.length === 0 && (
                  <div className="text-center py-10 text-gray-500 dark:text-zinc-500">
                      <p>لا توجد منشورات لعرضها في هذا القسم.</p>
                  </div>
              )}
              
              {error && <p className="text-center py-10 text-red-400">{error}</p>}

              <div>
                  {feedItems.map(renderItem)}
              </div>
              
              {loadingMore && <div className="flex justify-center py-4"><Spinner /></div>}

              <div ref={loadMoreTriggerRef} style={{ height: '1px' }}></div>
            </main>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
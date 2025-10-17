import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Store } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import StoreCard from '../components/StoreCard';
import { getErrorMessage } from '../utils/errors';
import StoreCardSkeleton from '../components/ui/StoreCardSkeleton';

const StoresScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'my-stores' | 'following'>('all');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const selectString = 'id, created_at, name, description, user_id, image_url';
        let storesData: any[] | null = [];

        if (activeTab === 'following') {
          const { data: followedStoresData, error: followedStoresError } = await supabase
            .from('store_followers')
            .select('store_id')
            .eq('user_id', user.id);
          
          if (followedStoresError) throw followedStoresError;

          if (!followedStoresData || followedStoresData.length === 0) {
              setStores([]);
              setLoading(false);
              return;
          }
          const storeIdsToFetch = followedStoresData.map(f => f.store_id);

          const { data, error } = await supabase
            .from('stores')
            .select(selectString)
            .in('id', storeIdsToFetch);
          
          if (error) throw error;
          storesData = data;

        } else {
          let query = supabase.from('stores').select(selectString);
          if (activeTab === 'my-stores') {
            query = query.eq('user_id', user.id);
          }
          const { data, error } = await query.order('created_at', { ascending: false });
          if (error) throw error;
          storesData = data;
        }
        
        if (!storesData || storesData.length === 0) {
            setStores([]);
            setLoading(false);
            return;
        }
        
        const storeIds = storesData.map(s => s.id);
        const [{ data: followersData }, { data: ratingsData }] = await Promise.all([
            supabase.from('store_followers').select('store_id, user_id').in('store_id', storeIds),
            supabase.from('store_ratings').select('store_id, rating').in('store_id', storeIds)
        ]);

        const followersByStore = new Map<string, any[]>();
        (followersData || []).forEach(f => {
            if (!followersByStore.has(f.store_id)) followersByStore.set(f.store_id, []);
            followersByStore.get(f.store_id)!.push({ user_id: f.user_id });
        });

        const ratingsByStore = new Map<string, any[]>();
        (ratingsData || []).forEach(r => {
            if (!ratingsByStore.has(r.store_id)) ratingsByStore.set(r.store_id, []);
            ratingsByStore.get(r.store_id)!.push({ rating: r.rating });
        });

        storesData.forEach((store: any) => {
            store.store_followers = followersByStore.get(store.id) || [];
            store.store_ratings = ratingsByStore.get(store.id) || [];
        });


        // Get unique user IDs from stores
        const userIds = [...new Set(storesData.map((s) => s.user_id))];

        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Map profiles to user IDs and join client-side
        const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));
        
        const storesWithProfiles = storesData.map((s) => ({
          ...s,
          profiles: profilesMap.get(s.user_id) || null,
        }));

        setStores(storesWithProfiles as Store[]);

      } catch (error: unknown) {
        console.error("Error fetching stores:", error);
        setError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [activeTab, user]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col gap-3">
          <StoreCardSkeleton />
          <StoreCardSkeleton />
          <StoreCardSkeleton />
        </div>
      );
    }
    if (error) {
      return <p className="text-center text-red-400 py-10">{error}</p>;
    }
    if (stores.length === 0) {
      const messages = {
        all: "لا توجد متاجر حتى الآن. كن أول من ينشئ متجرًا!",
        'my-stores': "أنت لا تملك أي متاجر بعد. أنشئ متجرك الأول!",
        following: "أنت لا تتابع أي متاجر بعد."
      };
      return <p className="text-center text-zinc-500 dark:text-zinc-400 py-10">{messages[activeTab]}</p>;
    }
    return (
      <div className="flex flex-col gap-3">
        {stores.map(store => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    );
  };

  const tabButtonClasses = (tabName: typeof activeTab) => 
    `flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
      activeTab === tabName ? 'bg-teal-500 text-white' : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
    }`;

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold">المتاجر</h1>
            <Link to="/stores/new">
              <Button className="!w-auto px-4 py-2 text-sm">أنشئ متجرًا</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg flex gap-1 mb-4 border border-gray-200 dark:border-zinc-800">
            <button className={tabButtonClasses('all')} onClick={() => setActiveTab('all')}>كل المتاجر</button>
            <button className={tabButtonClasses('my-stores')} onClick={() => setActiveTab('my-stores')}>متاجري</button>
            <button className={tabButtonClasses('following')} onClick={() => setActiveTab('following')}>أتابعها</button>
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default StoresScreen;

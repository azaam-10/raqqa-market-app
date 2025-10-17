import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { RentalPost } from '../types';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import RentalPostCard from '../components/RentalPostCard';
import { getErrorMessage } from '../utils/errors';
import { useAuth } from '../hooks/useAuth';

const HouseRentalsScreen: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<RentalPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRentalPosts = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // 1. Fetch base posts
            const { data: postsData, error: postsError } = await supabase
                .from('rental_posts')
                .select('id, created_at, user_id, region, room_count, image_urls, rent_amount, payment_term')
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;
            if (!postsData || postsData.length === 0) {
                setPosts([]);
                return;
            }
            
            // 2. Collect IDs
            const postIds = postsData.map(p => p.id);
            const userIds = [...new Set(postsData.map(p => p.user_id))];

            // 3. Fetch related data
            const [profilesRes, likesRes, commentsRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
                supabase.from('rental_post_likes').select('post_id, user_id').in('post_id', postIds),
                supabase.from('rental_post_comments').select('post_id, id').in('post_id', postIds)
            ]);
            
            // 4. Create lookup maps
            const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
            const likesMap = new Map<string, any[]>();
            (likesRes.data || []).forEach(l => {
                if (!likesMap.has(l.post_id)) likesMap.set(l.post_id, []);
                likesMap.get(l.post_id)!.push({ user_id: l.user_id });
            });
            const commentsMap = new Map<string, number>();
            (commentsRes.data || []).forEach(c => {
                commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1);
            });
            
            // 5. Augment posts
            const augmentedPosts = postsData.map(post => ({
                ...post,
                profiles: profilesMap.get(post.user_id) || null,
                rental_post_likes: likesMap.get(post.id) || [],
                rental_post_comments: [{ count: commentsMap.get(post.id) || 0 }],
            }));
            
            setPosts(augmentedPosts as any[]);

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRentalPosts();
        
        const subscription = supabase
            .channel('public:rental_posts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_posts' }, fetchRentalPosts)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_post_likes' }, fetchRentalPosts)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_post_comments' }, fetchRentalPosts)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchRentalPosts]);

    const handlePostDeleted = (postId: string) => {
        setPosts(current => current.filter(p => p.id !== postId));
    };


    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (posts.length === 0) {
            return <p className="text-center text-gray-500 dark:text-zinc-400 py-10">لا توجد عروض إيجار متاحة حالياً. كن أول من يضيف عرضاً!</p>;
        }
        return (
            <div className="space-y-4">
                {posts.map(post => (
                    <RentalPostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-bold">بيوت للإيجار</h1>
                        <Link to="/rentals/new">
                            <Button className="!w-auto px-4 py-2 text-sm">أضف عرض إيجار</Button>
                        </Link>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default HouseRentalsScreen;

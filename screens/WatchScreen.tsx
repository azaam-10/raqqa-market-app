import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Post } from '../types';
import { getErrorMessage } from '../utils/errors';
import Spinner from '../components/ui/Spinner';
import VideoPlayer from '../components/VideoPlayer';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="m15 18-6-6 6-6"/>
    </svg>
);


const WatchScreen: React.FC = () => {
    const [videos, setVideos] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { postId } = useParams<{ postId?: string }>();
    const navigate = useNavigate();

    const fetchVideos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch posts that have a video_url
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('id, content, image_url, video_url, created_at, user_id, group_id')
                .not('video_url', 'is', null)
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;

            if (!postsData || postsData.length === 0) {
                setVideos([]);
                setLoading(false);
                return;
            }

            // Augment with profiles, likes, comments
            const postIds = postsData.map(p => p.id);
            const userIds = [...new Set(postsData.map(p => p.user_id))];

            const [likesRes, commentsRes, profilesRes] = await Promise.all([
                supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
                supabase.from('comments').select('post_id, id').in('post_id', postIds),
                supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
            ]);

            const likesMap = new Map<string, any[]>();
            (likesRes.data || []).forEach(l => {
                if (!likesMap.has(l.post_id)) likesMap.set(l.post_id, []);
                likesMap.get(l.post_id)!.push({ user_id: l.user_id });
            });

            const commentsMap = new Map<string, number>();
            (commentsRes.data || []).forEach(c => {
                commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1);
            });

            const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

            const augmentedPosts = postsData.map(post => ({
                ...post,
                profiles: profilesMap.get(post.user_id) || null,
                likes: likesMap.get(post.id) || [],
                comments: [{ count: commentsMap.get(post.id) || 0 }],
            }));
            
            // If a specific post ID is provided in the URL, move it to the front
            if (postId) {
                const postIndex = augmentedPosts.findIndex(p => p.id === postId);
                if (postIndex > -1) {
                    const targetPost = augmentedPosts.splice(postIndex, 1)[0];
                    augmentedPosts.unshift(targetPost);
                }
            }
            
            setVideos(augmentedPosts as Post[]);

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center bg-zinc-100 dark:bg-black"><Spinner /></div>;
    }

    if (error) {
        return <div className="flex h-screen w-full items-center justify-center text-red-400 p-4 bg-zinc-100 dark:bg-black">{error}</div>;
    }

    if (videos.length === 0) {
        return (
            <div className="flex h-screen w-full items-center justify-center text-gray-500 dark:text-zinc-400 p-4 bg-zinc-100 dark:bg-black">
                <button 
                    onClick={() => navigate(-1)} 
                    aria-label="العودة"
                    className="absolute top-4 left-4 z-20 bg-black/40 p-2 rounded-full text-white hover:bg-black/60 transition-colors"
                >
                    <BackIcon />
                </button>
                لا توجد فيديوهات لعرضها حالياً.
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="h-screen w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory bg-zinc-100 dark:bg-black"
        >
             <button 
                onClick={() => navigate(-1)} 
                aria-label="العودة"
                className="absolute top-4 left-4 z-20 bg-black/40 p-2 rounded-full text-white hover:bg-black/60 transition-colors"
            >
                <BackIcon />
            </button>
            {videos.map((videoPost) => (
                <VideoPlayer key={videoPost.id} post={videoPost} />
            ))}
        </div>
    );
};

export default WatchScreen;
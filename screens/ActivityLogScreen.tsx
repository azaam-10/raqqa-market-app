
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Post, Comment as CommentType } from '../types';
import Spinner from '../components/ui/Spinner';
import { getErrorMessage } from '../utils/errors';

// Icons
const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const PostIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;
const CommentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;

type ActivityPost = Post & { type: 'post' };
type ActivityComment = CommentType & { type: 'comment', posts: { id: string, content: string } | null };
type ActivityLike = {
    type: 'like';
    created_at: string;
    posts: {
        id: string;
        content: string;
        user_id: string;
        profiles: { full_name: string } | null;
    } | null;
};

type ActivityItem = ActivityPost | ActivityComment | ActivityLike;
type ActivityFilter = 'all' | 'post' | 'comment' | 'like';

const ActivityLogScreen: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<ActivityFilter>('all');

    useEffect(() => {
        const fetchActivity = async () => {
            if (!user) return;
            setLoading(true);
            setError(null);
            try {
                const [postsRes, commentsRes, likesRes] = await Promise.all([
                    supabase.from('posts').select('*').eq('user_id', user.id),
                    supabase.from('comments').select('*, posts(id, content)').eq('user_id', user.id),
                    supabase.from('likes').select('created_at, posts(*, profiles!user_id(full_name))').eq('user_id', user.id)
                ]);

                if (postsRes.error) throw postsRes.error;
                if (commentsRes.error) throw commentsRes.error;
                if (likesRes.error) throw likesRes.error;

                const combinedActivity = [
                    ...(postsRes.data || []).map(p => ({ ...p, type: 'post' as const })),
                    ...(commentsRes.data || []).map(c => ({ ...c, type: 'comment' as const })),
                    ...(likesRes.data || []).map(l => ({ ...l, type: 'like' as const }))
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                setActivity(combinedActivity as ActivityItem[]);
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, [user]);

    const filteredActivity = useMemo(() => {
        if (filter === 'all') {
            return activity;
        }
        return activity.filter(item => item.type === filter);
    }, [activity, filter]);

    const renderActivityItem = (item: ActivityItem) => {
        let icon: React.ReactNode;
        let content: React.ReactNode;

        switch(item.type) {
            case 'post':
                icon = <PostIcon />;
                content = (
                    <Link to={`/post/${item.id}`} className="hover:underline">
                        <p className="font-semibold">لقد قمت بنشر منشور:</p>
                        <p className="text-sm text-gray-700 dark:text-slate-300 truncate mt-1">"{item.content}"</p>
                    </Link>
                );
                break;
            case 'comment':
                icon = <CommentIcon />;
                content = (
                    <div>
                        <p className="font-semibold">لقد قمت بالتعليق:</p>
                        <p className="text-sm text-gray-700 dark:text-slate-300 my-1">"{item.content}"</p>
                        {item.posts && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                على منشور: <Link to={`/post/${item.posts.id}`} className="hover:underline">"{`${(item.posts.content || '').substring(0, 50)}...`}"</Link>
                            </p>
                        )}
                    </div>
                );
                break;
            case 'like':
                icon = <HeartIcon />;
                content = item.posts ? (
                    <p className="text-gray-700 dark:text-slate-300">
                        لقد أعجبت بمنشور لـ <Link to={`/user/${item.posts.user_id}`} className="font-semibold text-gray-900 dark:text-white hover:underline">{item.posts.profiles?.full_name || 'مستخدم'}</Link>: <Link to={`/post/${item.posts.id}`} className="hover:underline text-gray-500 dark:text-slate-400">"{`${(item.posts.content || '').substring(0, 50)}...`}"</Link>
                    </p>
                ) : (
                    <p className="text-gray-500 dark:text-slate-400">لقد أعجبت بمنشور تم حذفه.</p>
                );
                break;
            default:
                return null;
        }

        return (
            <div className="flex items-start gap-4 p-4">
                <div className="text-teal-500 dark:text-teal-400 mt-1">{icon}</div>
                <div className="flex-1">
                    {content}
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-2 font-mono">
                        {new Date(item.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (filteredActivity.length === 0) {
            const message = filter === 'all' 
                ? 'لا يوجد نشاط لعرضه.'
                : 'لا يوجد نشاط من هذا النوع.';
            return <p className="text-center text-gray-500 dark:text-slate-400 py-10">{message}</p>;
        }
        return (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg divide-y divide-gray-200 dark:divide-zinc-800">
                {filteredActivity.map((item, index) => (
                    <div key={`${item.type}-${(item as any).id || index}`}>{renderActivityItem(item)}</div>
                ))}
            </div>
        );
    };
    
    const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
        <button
            onClick={onClick}
            className={`flex-1 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                active ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="absolute right-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">سجل النشاطات</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                     <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex mb-4">
                        <TabButton label="الكل" active={filter === 'all'} onClick={() => setFilter('all')} />
                        <TabButton label="المنشورات" active={filter === 'post'} onClick={() => setFilter('post')} />
                        <TabButton label="التعليقات" active={filter === 'comment'} onClick={() => setFilter('comment')} />
                        <TabButton label="الإعجابات" active={filter === 'like'} onClick={() => setFilter('like')} />
                    </div>
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default ActivityLogScreen;

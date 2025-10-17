import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import Spinner from '../components/ui/Spinner';
import NotificationCard from '../components/NotificationCard';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );

const NotificationsScreen: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAndMarkRead = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Fetch base notifications
            const { data: notificationsData, error: notificationsError } = await supabase
                .from('notifications')
                .select('id, created_at, user_id, actor_id, type, entity_id, read')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (notificationsError) throw notificationsError;
            
            if (!notificationsData || notificationsData.length === 0) {
                setNotifications([]);
                setLoading(false);
                return;
            }

            // 2. Collect actor IDs
            const actorIds = [...new Set(notificationsData.map(n => n.actor_id))];

            // 3. Fetch actor profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', actorIds);
            
            if (profilesError) throw profilesError;
            
            // 4. Join data on client
            const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
            const augmentedNotifications = notificationsData.map(n => ({
                ...n,
                actors: profilesMap.get(n.actor_id) || null
            }));

            setNotifications(augmentedNotifications as any[]);
            
            // 5. Mark as read after fetching
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

        } catch (err: any) {
            console.error("Error fetching notifications:", err);
            setError("فشل في تحميل الإشعارات.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchAndMarkRead();
        
        const subscription = supabase
            .channel(`public:notifications:user_id=eq.${user.id}`)
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                () => {
                     fetchAndMarkRead();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        }
    }, [user]);

    const handleClearAll = async () => {
        if (!user || clearing) return;
        if (window.confirm('هل أنت متأكد من أنك تريد مسح جميع الإشعارات؟ لا يمكن التراجع عن هذا الإجراء.')) {
            setClearing(true);
            const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
            if (error) {
                setError('فشل في مسح الإشعارات.');
                console.error('Error clearing notifications:', error);
            } else {
                setNotifications([]);
            }
            setClearing(false);
        }
    };
    
    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (notifications.length === 0) {
            return (
                 <div className="text-center text-gray-500 dark:text-zinc-400 py-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mx-auto mb-4"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <p>لا توجد إشعارات جديدة.</p>
                    <p className="text-sm">عندما يتفاعل الآخرون معك، ستظهر الإشعارات هنا.</p>
                </div>
            )
        }
        return (
            <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                {notifications.map(notif => (
                    <NotificationCard key={notif.id} notification={notif} />
                ))}
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                         <button onClick={() => navigate(-1)} className="absolute right-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">الإشعارات</h1>
                        {notifications.length > 0 && !loading && (
                            <button 
                                onClick={handleClearAll} 
                                disabled={clearing}
                                className="absolute left-0 text-sm font-semibold text-teal-500 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-500 disabled:opacity-50"
                            >
                                {clearing ? 'جاري المسح...' : 'مسح الكل'}
                            </button>
                        )}
                    </div>
                </div>
            </header>
            <main className="container mx-auto">
                <div className="max-w-2xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default NotificationsScreen;
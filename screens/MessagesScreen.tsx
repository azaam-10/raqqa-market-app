import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Conversation, Profile, Message } from '../types';
import Spinner from '../components/ui/Spinner';
import ConversationCard from '../components/ConversationCard';
import Input from '../components/ui/Input';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
);

const MessagesScreen: React.FC = () => {
    const { user, isBlocked } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        
        setError(null);
        
        try {
            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select('id, created_at, sender_id, receiver_id, content, image_url, audio_url, read')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
                .limit(300); // Performance improvement: limit to last 300 messages

            if (messagesError) throw messagesError;

            if (!messagesData || messagesData.length === 0) {
                setConversations([]);
                setLoading(false); 
                return;
            }
            
            const otherUserIds = new Set<string>();
            messagesData.forEach(msg => {
                if (msg.sender_id !== user.id) otherUserIds.add(msg.sender_id);
                if (msg.receiver_id !== user.id) otherUserIds.add(msg.receiver_id);
            });

            if (otherUserIds.size === 0) {
                setConversations([]);
                setLoading(false);
                return;
            }

            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', Array.from(otherUserIds));

            if (profilesError) throw profilesError;

            const profilesMap = new Map<string, Profile>((profilesData || []).map(p => [p.id, p as Profile]));
            
            const conversationMap = new Map<string, Conversation>();

            for (const message of messagesData as Message[]) {
                const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
                
                if (!conversationMap.has(otherUserId)) {
                    const profile = profilesMap.get(otherUserId);
                    if (profile) {
                        conversationMap.set(otherUserId, {
                            other_user_id: otherUserId,
                            profile: profile,
                            last_message: message,
                            unread_count: 0
                        });
                    }
                }
            }
            
            const unreadCounts = new Map<string, number>();
            messagesData.forEach(message => {
                 if (message.receiver_id === user.id && !message.read) {
                    const otherUserId = message.sender_id;
                    unreadCounts.set(otherUserId, (unreadCounts.get(otherUserId) || 0) + 1);
                }
            });

            conversationMap.forEach((conversation, userId) => {
                conversation.unread_count = unreadCounts.get(userId) || 0;
            });
            
            const finalConversations = Array.from(conversationMap.values())
              .sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime());
            
            setConversations(finalConversations);

        } catch (err: any) {
             console.error("Error fetching conversations:", err);
             setError("فشل في تحميل المحادثات. يرجى المحاولة مرة أخرى.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        setLoading(true);
        fetchConversations();
        
        const handleFocus = () => fetchConversations();
        window.addEventListener('focus', handleFocus);
        
        const messagesChannel = supabase
            .channel(`messages-for-${user.id}`)
            .on(
              'postgres_changes',
              { 
                event: '*', 
                schema: 'public', 
                table: 'messages',
                filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`
              },
              (payload) => {
                fetchConversations();
              }
            )
            .subscribe();
            
        return () => {
            window.removeEventListener('focus', handleFocus);
            supabase.removeChannel(messagesChannel);
        }

    }, [user, fetchConversations]);

    const filteredConversations = useMemo(() => {
        const searchFiltered = conversations.filter(conv =>
            conv.profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return searchFiltered.filter(conv => !isBlocked(conv.other_user_id));
    }, [conversations, searchTerm, isBlocked]);

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (conversations.length === 0) {
            return <p className="text-center text-gray-500 dark:text-zinc-400 py-10">ليس لديك رسائل حتى الآن. ابدأ محادثة من صفحة مستخدم.</p>;
        }
        if (filteredConversations.length === 0) {
             return <p className="text-center text-gray-500 dark:text-zinc-400 py-10">لا توجد نتائج بحث مطابقة.</p>;
        }
        return (
            <div className="space-y-2">
                {filteredConversations.map(conv => (
                    <ConversationCard key={conv.other_user_id} conversation={conv} />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate('/home')} className="absolute right-0 p-2 rounded-full text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800" aria-label="الرئيسية">
                            <HomeIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">الرسائل</h1>
                        <button onClick={() => navigate('/settings/chat')} className="absolute left-0 p-2 rounded-full text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800" aria-label="إعدادات الدردشة">
                            <SettingsIcon />
                        </button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <div className="relative mb-4">
                        <Input
                            type="text"
                            placeholder="ابحث في المحادثات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full !pl-10 !bg-gray-100 dark:!bg-zinc-800"
                        />
                        <SearchIcon />
                    </div>
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default MessagesScreen;
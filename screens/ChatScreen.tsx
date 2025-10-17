import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, Message } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import MessageBubble from '../components/MessageBubble';
import MessageActionMenu from '../components/MessageActionMenu';
import { getErrorMessage } from '../utils/errors';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> );
const MicIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg> );
const ImageIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> );
const VideoCallIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> );
const AudioCallIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> );
const MoreIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg> );

const ChatScreen: React.FC = () => {
    const { userId: otherUserId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user, profile: currentUserProfile, isOnline, isBlocked, toggleBlock, refreshProfile } = useAuth();
    
    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [menuState, setMenuState] = useState<{ isOpen: boolean, anchorEl: HTMLElement | null, message: Message | null }>({ isOpen: false, anchorEl: null, message: null });
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const optionsMenuRef = useRef<HTMLDivElement>(null);

    const isThisUserBlocked = otherUserId ? isBlocked(otherUserId) : false;
    const amIBlocked = otherUser?.blocked_users?.includes(user?.id || '') ?? false;

    const markMessagesAsRead = useCallback(async () => {
        if (!user || !otherUserId) return;
        await supabase
            .from('messages')
            .update({ read: true })
            .eq('receiver_id', user.id)
            .eq('sender_id', otherUserId)
            .eq('read', false);
    }, [user, otherUserId]);
    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, sending]);
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setIsOptionsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user || !otherUserId) return;
        
        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: otherUserData, error: userError } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
                if (userError || !otherUserData) throw new Error('لم يتم العثور على المستخدم.');
                setOtherUser(otherUserData as Profile);

                const { data: messagesData, error: messagesError } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
                    .order('created_at', { ascending: true });

                if (messagesError) throw messagesError;
                setMessages((messagesData as Message[]) || []);

            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
        markMessagesAsRead();

        const sortedIds = [user.id, otherUserId].sort();
        const channelName = `chat-${sortedIds[0]}-${sortedIds[1]}`;
        const dbFilter = `or(and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id}))`;

        const channel = supabase
            .channel(channelName, {
                config: {
                    broadcast: {
                        self: true,
                    },
                },
            })
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: dbFilter
                },
                (payload) => {
                    const newMessage = payload.new as Message;
                    setMessages(current => {
                        if (current.some(m => m.id === newMessage.id)) return current;
                        return [...current, newMessage];
                    });
                    if(newMessage.receiver_id === user.id) {
                        markMessagesAsRead();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: dbFilter
                },
                (payload) => {
                    const updatedMessage = payload.new as Message;
                    setMessages(current => current.map(m => m.id === updatedMessage.id ? updatedMessage : m));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, otherUserId, markMessagesAsRead]);
    
    const handleSendMessage = async (content: string | null, imageUrl: string | null = null, audioUrl: string | null = null) => {
        if (!user || !otherUserId) return;
        if (!content && !imageUrl && !audioUrl) return;

        setSending(true);
        const textContent = content ? content.trim() : null;
        if(textContent) setNewMessage(''); // Clear input optimistically

        const messageData = { sender_id: user.id, receiver_id: otherUserId, content: textContent, image_url: imageUrl, audio_url: audioUrl };
        const { error } = await supabase.from('messages').insert([messageData]);
        
        if (error) {
            const friendlyError = getErrorMessage(error);
             if (friendlyError.includes('violates row-level security policy')) {
                alert('لا يمكنك إرسال رسالة إلى هذا المستخدم. قد يكون قد قام بحظرك أو أن إعدادات الخصوصية الخاصة به لا تسمح بذلك.');
            } else {
                alert(`فشل إرسال الرسالة: ${friendlyError}`);
            }
            if (textContent) setNewMessage(textContent); // Restore input on error
        }
        setSending(false);
    };
    
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setSending(true);
        const filePath = `${user.id}/messages/${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);

        if (uploadError) {
            alert(`فشل رفع الصورة: ${uploadError.message}`);
            setSending(false);
            return;
        }

        await handleSendMessage(null, filePath);
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const handleDeleteForMe = async () => {
        const message = menuState.message;
        if (!message || !user) return;
        const newDeletedFor = [...(message.deleted_for || []), user.id];
        const { error } = await supabase.from('messages').update({ deleted_for: newDeletedFor }).eq('id', message.id);
        if (error) alert(`فشل الحذف: ${error.message}`);
        setMenuState({ isOpen: false, anchorEl: null, message: null });
    };

    const handleDeleteForEveryone = async () => {
        const message = menuState.message;
        if (!message) return;
        const { error } = await supabase.from('messages').delete().eq('id', message.id);
        if (error) alert(`فشل الحذف: ${error.message}`);
        setMessages(current => current.filter(m => m.id !== message.id));
        setMenuState({ isOpen: false, anchorEl: null, message: null });
    };
    
    const handleClearChat = async () => {
        if (!user || !otherUserId) return;
        if (window.confirm('هل أنت متأكد من أنك تريد مسح هذه المحادثة؟ سيتم حذف جميع الرسائل لديك فقط.')) {
            setIsOptionsMenuOpen(false);
            const messageIds = messages.map(m => m.id);
            if(messageIds.length === 0) return;

            const { data, error } = await supabase.rpc('add_user_to_deleted_for', {
                p_user_id: user.id,
                p_message_ids: messageIds
            });
            
            if (error) {
                alert(`فشل مسح المحادثة: ${error.message}`);
            } else {
                setMessages([]);
            }
        }
    };
    
    const handleToggleBlock = () => {
        if (!otherUserId) return;
        setIsOptionsMenuOpen(false);
        const action = isThisUserBlocked ? 'إلغاء حظر' : 'حظر';
        if (window.confirm(`هل أنت متأكد من أنك تريد ${action} هذا المستخدم؟`)) {
            toggleBlock(otherUserId);
        }
    };

    const handleToggleReadReceipts = async () => {
        if (!currentUserProfile || !user) return;
        setIsOptionsMenuOpen(false);

        const newValue = !(currentUserProfile.read_receipts_enabled ?? true);
        
        const { error } = await supabase
            .from('profiles')
            .update({ read_receipts_enabled: newValue })
            .eq('id', user.id);
        
        if (error) {
            alert(`فشل تحديث الإعداد: ${getErrorMessage(error)}`);
        } else {
            await refreshProfile();
        }
    };

    const displayedMessages = messages.filter(m => !m.deleted_for?.includes(user?.id || ''));

    const renderMessages = () => {
        let lastSenderId: string | null = null;
        return displayedMessages.map((msg, index) => {
            const isFirst = lastSenderId !== msg.sender_id;
            const isLast = index === displayedMessages.length - 1 || displayedMessages[index + 1].sender_id !== msg.sender_id;
            lastSenderId = msg.sender_id;
            
            return (
                <MessageBubble
                    key={msg.id}
                    message={msg}
                    isFirstInGroup={isFirst}
                    isLastInGroup={isLast}
                    showReadReceipt={otherUser?.read_receipts_enabled ?? true}
                    onOpenMenu={(message, anchorEl) => setMenuState({ isOpen: true, message, anchorEl })}
                />
            );
        });
    };
    
    if (loading) return <div className="flex h-screen w-full items-center justify-center"><Spinner /></div>;
    if (error) return <div className="flex h-screen w-full items-center justify-center text-red-400 p-4">{error}</div>;

    const cannotSendMessage = amIBlocked || isThisUserBlocked;

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"> <BackIcon /> </button>
                            <Link to={`/user/${otherUserId}`} className="flex items-center gap-3">
                                <Avatar url={otherUser?.avatar_url} size={40} userId={otherUserId} showStatus={true} />
                                <div>
                                    <h1 className="text-lg font-bold truncate text-zinc-900 dark:text-zinc-100">{otherUser?.full_name}</h1>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400">{isOnline(otherUserId || '') ? 'متصل الآن' : 'غير متصل'}</p>
                                </div>
                            </Link>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                             <Link to={`/call/video/${otherUserId}`} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"><VideoCallIcon /></Link>
                             <Link to={`/call/audio/${otherUserId}`} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"><AudioCallIcon /></Link>
                             <div className="relative" ref={optionsMenuRef}>
                                <button onClick={() => setIsOptionsMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                                    <MoreIcon />
                                </button>
                                {isOptionsMenuOpen && (
                                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg z-20 py-1">
                                        <Link to={`/user/${otherUserId}`} onClick={() => setIsOptionsMenuOpen(false)} className="block w-full text-right px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                            عرض الملف الشخصي
                                        </Link>
                                        <button onClick={handleClearChat} className="block w-full text-right px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                            مسح محتوى الدردشة
                                        </button>
                                        <div className="my-1 h-px bg-gray-200 dark:bg-zinc-700"></div>
                                        <button onClick={handleToggleBlock} className="w-full text-right px-4 py-3 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                            {isThisUserBlocked ? 'إلغاء حظر المستخدم' : 'حظر المستخدم'}
                                        </button>
                                        <button onClick={handleToggleReadReceipts} className="block w-full text-right px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                            {(currentUserProfile?.read_receipts_enabled ?? true) ? 'إخفاء صحين الاستلام' : 'إظهار صحين الاستلام'}
                                        </button>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            </header>
            
            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {renderMessages()}
            </main>

            {cannotSendMessage && (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-zinc-400 border-t border-gray-200 dark:border-zinc-800">
                    {isThisUserBlocked ? 'لقد قمت بحظر هذا المستخدم.' : 'لا يمكنك مراسلة هذا الحساب.'}
                    {isThisUserBlocked && <button onClick={handleToggleBlock} className="text-teal-500 ml-2">إلغاء الحظر</button>}
                </div>
            )}
            
            {!cannotSendMessage && (
                <footer className="p-2 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(newMessage, null, null); }} className="flex items-center gap-2">
                         <button type="button" onClick={() => imageInputRef.current?.click()} className="p-3 text-gray-500 dark:text-zinc-400 hover:text-teal-500" disabled={sending}><ImageIcon /></button>
                         <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                         <button type="button" className="p-3 text-gray-500 dark:text-zinc-400 hover:text-teal-500" disabled={sending}><MicIcon /></button>
                         <input
                            type="text"
                            placeholder="اكتب رسالة..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={sending}
                            className="flex-1 bg-gray-100 dark:bg-zinc-800 border-none rounded-full px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none text-zinc-900 dark:text-zinc-200"
                        />
                        <button type="submit" className="p-3 text-white bg-teal-500 rounded-full hover:bg-teal-600 disabled:opacity-50" disabled={sending || !newMessage.trim()}>
                            {sending ? <Spinner /> : <SendIcon />}
                        </button>
                    </form>
                </footer>
            )}
            
             <MessageActionMenu
                isOpen={menuState.isOpen}
                anchorEl={menuState.anchorEl}
                onClose={() => setMenuState({ isOpen: false, anchorEl: null, message: null })}
                onDeleteForMe={handleDeleteForMe}
                onDeleteForEveryone={menuState.message?.sender_id === user?.id && (new Date().getTime() - new Date(menuState.message.created_at).getTime()) < 5 * 60 * 1000 ? handleDeleteForEveryone : undefined}
            />

        </div>
    );
};

export default ChatScreen;
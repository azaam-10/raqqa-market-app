
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, Post, Comment as CommentType, Message } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { getErrorMessage } from '../utils/errors';
import Textarea from '../components/ui/Textarea';
import Input from '../components/ui/Input';

type Tab = 'profile' | 'activity' | 'messages' | 'actions';

type MessageWithProfiles = Message & {
    sender: Profile | null;
    receiver: Profile | null;
};

type ConversationMap = Record<string, { profile: Profile | null; messages: MessageWithProfiles[] }>;

type AdminLike = {
    type: 'like';
    created_at: string;
    posts: {
        id: string;
        content: string;
        user_id: string;
        profiles: { full_name: string } | null;
    } | null;
};

type AdminPost = Post & { type: 'post' };
type AdminComment = CommentType & { type: 'comment', posts: { id: string, content: string } };

const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-300',
    suspended: 'bg-yellow-500/20 text-yellow-300',
    banned: 'bg-red-500/20 text-red-300',
};
const statusText: Record<string, string> = {
    active: 'نشط',
    suspended: 'معلق',
    banned: 'محظور',
};


const AdminMessageDisplay: React.FC<{ message: MessageWithProfiles; viewingAs: string }> = ({ message, viewingAs }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    useEffect(() => {
        if (message.image_url) {
            const { data } = supabase.storage.from('uploads').getPublicUrl(message.image_url);
            setImageUrl(data.publicUrl);
        }
        if (message.audio_url) {
            const { data } = supabase.storage.from('uploads').getPublicUrl(message.audio_url);
            setAudioUrl(data.publicUrl);
        }
    }, [message.image_url, message.audio_url]);

    const isPrimaryUserSender = message.sender_id === viewingAs; 
    
    const bubbleClasses = isPrimaryUserSender ? 'bg-cyan-800 rounded-br-none' : 'bg-slate-700 rounded-bl-none';
    const containerClasses = isPrimaryUserSender ? 'justify-end' : 'justify-start';
    const layoutClasses = isPrimaryUserSender ? 'flex-row-reverse' : 'flex-row';
    const paddingClasses = !message.content && imageUrl ? 'p-1.5' : 'px-4 py-3';

    return (
        <div className={`flex ${containerClasses} w-full`}>
            <div className={`flex items-end gap-2 max-w-xl ${layoutClasses}`}>
                <Avatar url={message.sender?.avatar_url} size={24} className="flex-shrink-0" />
                <div className={`rounded-2xl ${bubbleClasses} ${paddingClasses}`}>
                    {imageUrl && (
                        <img 
                            src={imageUrl} 
                            alt="محتوى مرسل"
                            className={`rounded-lg max-w-xs max-h-80 object-cover cursor-pointer ${message.content || audioUrl ? 'mb-2' : ''}`}
                            onClick={() => window.open(imageUrl, '_blank')}
                        />
                    )}
                    {audioUrl && <p className="text-xs text-white/70 italic">[رسالة صوتية]</p>}
                    {message.content && (
                        <p className="text-white whitespace-pre-wrap">{message.content}</p>
                    )}
                </div>
            </div>
        </div>
    );
};


const AdminUserDetailScreen: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: adminUser } = useAuth();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState<Profile | null>(null);
    const [activity, setActivity] = useState<(AdminPost | AdminComment | AdminLike)[]>([]);
    const [messages, setMessages] = useState<MessageWithProfiles[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [privateMessage, setPrivateMessage] = useState('');
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [confirmingAction, setConfirmingAction] = useState<string | null>(null);
    const actionTimeoutRef = useRef<number | null>(null);

    // Activity Filter State
    const [activityFilter, setActivityFilter] = useState<'all' | 'post' | 'comment' | 'like'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');


    useEffect(() => {
        if (adminUser && adminUser.email !== 'azaamazeez8877@gmail.com') {
            navigate('/home', { replace: true });
        }
    }, [adminUser, navigate]);

    useEffect(() => {
        return () => {
            if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
        };
    }, []);

    const handleConfirmAction = (action: string, callback: () => void) => {
        if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);

        if (confirmingAction === action) {
            setConfirmingAction(null);
            callback();
        } else {
            setConfirmingAction(action);
            actionTimeoutRef.current = window.setTimeout(() => setConfirmingAction(null), 3000);
        }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            if (!userId) return;
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, created_at, bio, status').eq('id', userId).single();
                if (error) throw error;
                setProfile(data as Profile);

                const [postsRes, commentsRes, likesRes, messagesRes] = await Promise.all([
                    supabase.from('posts').select('*, profiles!user_id(full_name, avatar_url), groups(name)').eq('user_id', userId),
                    supabase.from('comments').select('*, posts(id, content)').eq('user_id', userId),
                    supabase.from('likes').select('created_at, posts(id, content, user_id, profiles!user_id(full_name))').eq('user_id', userId),
                    supabase.from('messages').select('*, sender:sender_id(id, full_name, avatar_url), receiver:receiver_id(id, full_name, avatar_url)').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: true })
                ]);
                
                if (postsRes.error) throw postsRes.error;
                if (commentsRes.error) throw commentsRes.error;
                if (likesRes.error) throw likesRes.error;
                if (messagesRes.error) throw messagesRes.error;

                const combinedActivity = [
                    ...(postsRes.data || []).map(p => ({ ...p, type: 'post' })),
                    ...(commentsRes.data || []).map(c => ({ ...c, type: 'comment' })),
                    ...(likesRes.data || []).map(l => ({ ...l, type: 'like' }))
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setActivity(combinedActivity as (AdminPost | AdminComment | AdminLike)[]);
                setMessages(messagesRes.data as MessageWithProfiles[] || []);

            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [userId]);

    const conversations = useMemo(() => {
        if (!userId) return {};
        const conversationsMap: ConversationMap = {};
        for (const msg of messages) {
            const otherParticipantId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
            const otherParticipantProfile = msg.sender_id === userId ? msg.receiver : msg.sender;
            
            if (!conversationsMap[otherParticipantId]) {
                conversationsMap[otherParticipantId] = {
                    profile: otherParticipantProfile,
                    messages: [],
                };
            }
            conversationsMap[otherParticipantId].messages.push(msg);
        }
        return conversationsMap;
    }, [messages, userId]);
    
    const filteredActivity = useMemo(() => {
        return activity.filter(item => {
            if (activityFilter !== 'all' && item.type !== activityFilter) return false;
            const itemDate = new Date(item.created_at);
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (itemDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (itemDate > end) return false;
            }
            return true;
        });
    }, [activity, activityFilter, startDate, endDate]);


    const handleSendMessageAndNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !privateMessage.trim() || !adminUser) return;
        setIsActionLoading(true);
        setActionError(null);
        setActionSuccess(null);
        try {
            const { error: msgError } = await supabase.from('messages').insert({ sender_id: adminUser.id, receiver_id: profile.id, content: privateMessage.trim() });
            if (msgError) throw msgError;
            const { error: notificationError } = await supabase.from('notifications').insert({ user_id: profile.id, actor_id: adminUser.id, type: 'new_message', entity_id: adminUser.id });
            if (notificationError) throw notificationError;
            setActionSuccess('تم إرسال الرسالة والإشعار بنجاح.');
            setPrivateMessage('');
        } catch (err) {
            setActionError(`فشل الإجراء: ${getErrorMessage(err)}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: 'suspended' | 'banned' | 'active') => {
        if (!profile) return;
        const actionText = { suspended: 'تعليق', banned: 'حظر', active: 'تفعيل' };
        
        setIsActionLoading(true);
        setActionError(null);
        setActionSuccess(null);
        try {
            const { data, error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', profile.id).select('status').single();
            if (error) throw error;
            if (!data) throw new Error("لم يتم إرجاع بيانات بعد التحديث.");

            setProfile(p => p ? { ...p, status: data.status } : null);
            setActionSuccess(`تم ${actionText[newStatus]} الحساب بنجاح.`);
        } catch (err) {
            const msg = getErrorMessage(err);
             if (msg.toLowerCase().includes('violates row-level security policy')) {
                setActionError(`فشل الإجراء: تم رفض الوصول. يرجى التأكد من أن صلاحيات الأمان (RLS) في Supabase تسمح للمسؤول بتنفيذ هذا الإجراء على جدول 'profiles'.`);
            } else if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('does not exist')) {
                 setActionError(`فشل الإجراء: عمود 'status' غير موجود في جدول 'profiles'. يرجى إضافته في قاعدة البيانات لتفعيل هذه الميزة.`);
            } else {
                 setActionError(`فشل الإجراء: ${msg}`);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!profile) return;
        setIsActionLoading(true);
        setActionError(null);
        setActionSuccess(null);
        try {
            const { count, error } = await supabase.from('profiles').delete({ count: 'exact' }).eq('id', profile.id);
            if (error) throw error;
            if (count === 0 || count === null) throw new Error('لم يتم حذف الملف الشخصي، قد لا تملك الصلاحية.');

            setActionSuccess('تم حذف ملف المستخدم بنجاح. سيتم إعادة توجيهك.');
            setTimeout(() => navigate('/admin'), 2000);
        } catch (err) {
            const msg = getErrorMessage(err);
            if (msg.toLowerCase().includes('violates row-level security policy')) {
                setActionError(`فشل الحذف: تم رفض الوصول. يرجى التأكد من أن صلاحيات الأمان (RLS) في Supabase تسمح للمسؤول بحذف المستخدمين من جدول 'profiles'.`);
            } else {
                setActionError(`فشل حذف الملف: ${msg}`);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const BackButton = () => (
        <button onClick={() => navigate('/admin')} className="absolute right-0 top-0 p-2 m-4 rounded-full hover:bg-slate-700">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
    );

    const MainTabButton: React.FC<{tab: Tab, label: string}> = ({ tab, label }) => (
        <button onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tab ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
            {label}
        </button>
    );
    
    const ActivitySubTabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
        <button
            onClick={onClick}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                active
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-300'
            }`}
        >
            {label}
        </button>
    );


    if (loading) return <div className="flex h-screen w-full items-center justify-center"><BackButton /><Spinner /></div>;
    if (error) return <div className="flex h-screen w-full items-center justify-center text-red-400 p-4"><BackButton />{error}</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-4xl mx-auto relative">
                    <BackButton />
                    {profile && (
                        <div className="text-center pt-8">
                            <Avatar url={profile.avatar_url} size={96} className="mx-auto" />
                            <h1 className="text-3xl font-bold mt-4">{profile.full_name}</h1>
                            <p className="text-slate-400">{profile.id}</p>
                        </div>
                    )}
                    
                    <div className="bg-slate-800 p-1 rounded-lg flex gap-1 my-6 border border-slate-700 justify-center flex-wrap">
                        <MainTabButton tab="profile" label="الملف الشخصي" />
                        <MainTabButton tab="activity" label="النشاط" />
                        <MainTabButton tab="messages" label="الرسائل" />
                        <MainTabButton tab="actions" label="الإجراءات" />
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 min-h-[300px]">
                        {activeTab === 'profile' && profile && (
                            <div className="space-y-3">
                                <h2 className="text-xl font-bold text-cyan-400 mb-4">معلومات المستخدم</h2>
                                <p><strong className="text-slate-400">الاسم الكامل:</strong> {profile.full_name}</p>
                                <p><strong className="text-slate-400">تاريخ الانضمام:</strong> {new Date(profile.created_at).toLocaleString('ar-EG')}</p>
                                <p>
                                    <strong className="text-slate-400">الحالة:</strong> 
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full mr-2 ${statusColors[profile.status || 'active']}`}>
                                        {statusText[profile.status || 'active']}
                                    </span>
                                </p>
                                {profile.bio && <p><strong className="text-slate-400">النبذة التعريفية:</strong><br/>{profile.bio}</p>}
                            </div>
                        )}
                        {activeTab === 'activity' && (
                             <div>
                                <h2 className="text-xl font-bold text-cyan-400 mb-2">سجل النشاط ({filteredActivity.length})</h2>
                                <div className="mb-4 border-b border-slate-700 flex">
                                    <ActivitySubTabButton label="الكل" active={activityFilter === 'all'} onClick={() => setActivityFilter('all')} />
                                    <ActivitySubTabButton label="المنشورات" active={activityFilter === 'post'} onClick={() => setActivityFilter('post')} />
                                    <ActivitySubTabButton label="التعليقات" active={activityFilter === 'comment'} onClick={() => setActivityFilter('comment')} />
                                    <ActivitySubTabButton label="الإعجابات" active={activityFilter === 'like'} onClick={() => setActivityFilter('like')} />
                                </div>

                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mb-4 space-y-4">
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="flex-1 min-w-[150px]">
                                            <label className="text-xs text-slate-400 mb-1 block">من تاريخ</label>
                                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="!py-2 !text-sm" />
                                        </div>
                                        <div className="flex-1 min-w-[150px]">
                                            <label className="text-xs text-slate-400 mb-1 block">إلى تاريخ</label>
                                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="!py-2 !text-sm" />
                                        </div>
                                        <Button variant="secondary" onClick={() => { setStartDate(''); setEndDate(''); }} className="!py-2 !px-4 !text-sm h-fit">مسح</Button>
                                    </div>
                                </div>
                                <div className="space-y-4 max-h-[50vh] overflow-y-auto p-1">
                                    {filteredActivity.length > 0 ? filteredActivity.map((item, i) => {
                                        let content;
                                        switch(item.type) {
                                            case 'post': content = ( <Link to={`/post/${item.id}`} className="hover:underline text-white"><p className="font-semibold">نشر منشور جديد:</p><p className="text-sm text-slate-300 truncate mt-1">"{item.content}"</p></Link> ); break;
                                            case 'comment': content = ( <div><p className="font-semibold text-white">أضاف تعليقاً:</p><p className="text-sm text-slate-300 my-1">"{item.content}"</p>{item.posts && (<p className="text-xs text-slate-400">على منشور: <Link to={`/post/${item.posts.id}`} className="hover:underline">"{`${(item.posts.content || '').substring(0, 50)}...`}"</Link></p>)}</div> ); break;
                                            case 'like': content = item.posts ? ( <p className="text-slate-300">أعجب بمنشور لـ <Link to={`/user/${item.posts.user_id}`} className="font-semibold text-white hover:underline">{item.posts.profiles?.full_name || 'مستخدم'}</Link>: <Link to={`/post/${item.posts.id}`} className="hover:underline text-slate-400">"{`${(item.posts.content || '').substring(0, 50)}...`}"</Link></p> ) : (<p className="text-slate-400">أعجب بمنشور تم حذفه.</p>); break;
                                            default: content = null;
                                        }
                                        return ( <div key={i} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700"><div className="flex justify-between items-center text-xs text-slate-400 mb-2"><span className="font-mono">{new Date(item.created_at).toLocaleString('ar-EG')}</span></div>{content}</div> )
                                    }) : <p className="text-slate-400 text-center py-8">لا يوجد نشاط يطابق معايير الفلترة.</p>}
                                </div>
                            </div>
                        )}
                        {activeTab === 'messages' && (
                             <div>
                                <h2 className="text-xl font-bold text-cyan-400 mb-4">{selectedConversationId ? `محادثة مع ${conversations[selectedConversationId]?.profile?.full_name || 'مستخدم'}` : 'سجل المحادثات'}</h2>
                                {selectedConversationId ? ( <div><Button onClick={() => setSelectedConversationId(null)} variant="secondary" className="!w-auto !py-1 !px-3 mb-4 text-sm">&rarr; العودة</Button><div className="space-y-4 max-h-[50vh] overflow-y-auto p-2">{conversations[selectedConversationId].messages.map(msg => (<AdminMessageDisplay key={msg.id} message={msg} viewingAs={userId!} />))}</div></div> ) : ( <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">{Object.keys(conversations).length > 0 ? Object.entries(conversations).map(([otherId, convo]: [string, any]) => ( <button key={otherId} onClick={() => setSelectedConversationId(otherId)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:bg-slate-700/50 transition-colors text-right"><Avatar url={convo.profile?.avatar_url} size={40} /><div className="flex-1 overflow-hidden"><p className="font-semibold text-white">{convo.profile?.full_name || 'مستخدم غير معروف'}</p><p className="text-xs text-slate-400">{convo.messages.length} رسائل</p></div></button> )) : <p className="text-slate-400 text-center py-8">لا توجد رسائل لهذا المستخدم.</p>}</div> )}
                            </div>
                        )}
                         {activeTab === 'actions' && profile && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-cyan-400 mb-4">إجراءات المسؤول</h2>
                                {actionError && <p className="text-red-400 text-sm whitespace-pre-wrap py-2 px-3 bg-red-500/10 rounded-md">{actionError}</p>}
                                {actionSuccess && <p className="text-green-400 text-sm py-2 px-3 bg-green-500/10 rounded-md">{actionSuccess}</p>}
                                <div className="pt-4"><h3 className="text-lg font-semibold mb-2">إرسال رسالة و إشعار</h3><form onSubmit={handleSendMessageAndNotification} className="space-y-3"><Textarea placeholder="سيستلم المستخدم محتوى هذه الرسالة في الخاص وسيصله إشعار بها..." value={privateMessage} onChange={e => setPrivateMessage(e.target.value)} required /><Button type="submit" loading={isActionLoading}>إرسال</Button></form></div>
                                <div className="pt-4 mt-4 border-t border-slate-700">
                                    <h3 className="text-lg font-semibold mb-2">إدارة الحساب</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <Button onClick={() => handleConfirmAction('activate', () => handleUpdateStatus('active'))} loading={isActionLoading} variant="secondary" className="!bg-green-600 hover:!bg-green-700 text-white" disabled={isActionLoading || profile.status === 'active' || profile.status === null}>
                                            {confirmingAction === 'activate' ? 'تأكيد التفعيل؟' : 'تفعيل الحساب'}
                                        </Button>
                                        <Button onClick={() => handleConfirmAction('suspend', () => handleUpdateStatus('suspended'))} loading={isActionLoading} variant="secondary" className="!bg-yellow-600 hover:!bg-yellow-700 text-white" disabled={isActionLoading || profile.status === 'suspended'}>
                                            {confirmingAction === 'suspend' ? 'تأكيد التعليق؟' : 'تعليق الحساب'}
                                        </Button>
                                        <Button onClick={() => handleConfirmAction('ban', () => handleUpdateStatus('banned'))} loading={isActionLoading} variant="secondary" className="!bg-orange-600 hover:!bg-orange-700 text-white" disabled={isActionLoading || profile.status === 'banned'}>
                                            {confirmingAction === 'ban' ? 'تأكيد الحظر؟' : 'حظر الحساب'}
                                        </Button>
                                        <Button onClick={() => handleConfirmAction('delete', handleDeleteProfile)} loading={isActionLoading} variant="secondary" className="!bg-red-700 hover:!bg-red-800 text-white" disabled={isActionLoading}>
                                            {confirmingAction === 'delete' ? 'تأكيد الحذف؟' : 'حذف الحساب'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminUserDetailScreen;

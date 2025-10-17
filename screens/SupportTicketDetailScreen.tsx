import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { SupportTicket, SupportTicketReply } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Textarea from '../components/ui/Textarea';
import MultiImageInput from '../components/ui/MultiImageInput';
import { getErrorMessage, timeAgo } from '../utils/errors';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> );

const ReplyBubble: React.FC<{ reply: SupportTicketReply; isAdmin: boolean }> = ({ reply, isAdmin }) => {
    const isAuthorAdmin = reply.profiles?.id === 'azaamazeez8877@gmail.com' || isAdmin; // Simple check, could be a role
    const bubbleClasses = isAuthorAdmin ? 'bg-cyan-800 self-end rounded-br-none' : 'bg-slate-700 self-start rounded-bl-none';

    return (
        <div className={`w-full flex ${isAuthorAdmin ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl p-3 rounded-2xl ${bubbleClasses}`}>
                <div className="flex items-center gap-2 mb-2">
                    <Avatar url={reply.profiles?.avatar_url} size={24}/>
                    <span className="text-sm font-semibold">{reply.profiles?.full_name}{isAuthorAdmin && ' (الدعم)'}</span>
                    <span className="text-xs text-slate-400">{timeAgo(reply.created_at)}</span>
                </div>
                {reply.content && <p className="whitespace-pre-wrap">{reply.content}</p>}
                {reply.image_urls && reply.image_urls.length > 0 && (
                     <div className="mt-2 grid grid-cols-2 gap-2">
                        {reply.image_urls.map(path => {
                            const url = supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
                            return <a href={url} target="_blank" rel="noopener noreferrer" key={path}><img src={url} className="rounded-md" /></a>
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}


const SupportTicketDetailScreen: React.FC = () => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.email === 'azaamazeez8877@gmail.com';

    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [replies, setReplies] = useState<SupportTicketReply[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Reply form state
    const [newReply, setNewReply] = useState('');
    const [newImages, setNewImages] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchTicketData = useCallback(async () => {
        if (!ticketId || !user) return;
        setLoading(true);
        setError(null);
        try {
            const { data: ticketData, error: ticketError } = await supabase.from('support_tickets').select('*, profiles!user_id(full_name, avatar_url)').eq('id', ticketId).single();
            if (ticketError) throw ticketError;
            if (!isAdmin && ticketData.user_id !== user.id) throw new Error("ليس لديك صلاحية الوصول لهذا الطلب.");

            setTicket(ticketData as SupportTicket);

            const { data: repliesData, error: repliesError } = await supabase.from('support_ticket_replies').select('*, profiles!user_id(id, full_name, avatar_url)').eq('ticket_id', ticketId).order('created_at', { ascending: true });
            if (repliesError) throw repliesError;
            setReplies(repliesData as any[] || []);

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [ticketId, user, isAdmin]);

    useEffect(() => {
        fetchTicketData();
        const channel = supabase.channel(`support-ticket-${ticketId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_ticket_replies', filter: `ticket_id=eq.${ticketId}` }, () => fetchTicketData()).subscribe();
        return () => { supabase.removeChannel(channel); }
    }, [fetchTicketData, ticketId]);

     useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [replies, sending]);

    const handleReply = async () => {
        if (!user || (!newReply.trim() && newImages.length === 0)) return;

        setSending(true);
        try {
             let screenshotUrls: string[] = [];
            if (newImages.length > 0) {
                screenshotUrls = await Promise.all(
                    newImages.map(async (file) => {
                        const fileName = `${user.id}/support-tickets/${Date.now()}-${Math.random()}`;
                        await supabase.storage.from('uploads').upload(fileName, file);
                        return fileName;
                    })
                );
            }

            const { error: insertError } = await supabase.from('support_ticket_replies').insert({
                ticket_id: ticketId,
                user_id: user.id,
                content: newReply.trim() || null,
                image_urls: screenshotUrls.length > 0 ? screenshotUrls : null,
            });
            if (insertError) throw insertError;
            
            // If user replies, change status to pending. If admin replies, notify user.
            if (!isAdmin) {
                await supabase.from('support_tickets').update({ status: 'PENDING' }).eq('id', ticketId!);
            } else {
                 await supabase.from('notifications').insert({ user_id: ticket!.user_id, actor_id: user.id, type: 'support_ticket_reply', entity_id: ticketId });
            }

            setNewReply('');
            setNewImages([]);
            // Realtime will handle the update

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSending(false);
        }
    };
    
    const handleStatusChange = async (status: 'PENDING' | 'RESOLVED') => {
        setSending(true);
        const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId!);
        if (error) setError(getErrorMessage(error));
        else setTicket(t => t ? {...t, status} : null);
        setSending(false);
    }

    if (loading) return <div className="flex h-screen w-full items-center justify-center"><Spinner /></div>;
    if (error) return <div className="flex h-screen w-full items-center justify-center text-red-400 p-4">{error}</div>;

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <div className="text-center w-full px-12">
                            <h1 className="text-xl font-bold truncate">طلب الدعم #{ticketId?.substring(0, 8)}</h1>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ticket?.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                                {ticket?.status === 'PENDING' ? 'معلق' : 'تم الحل'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>
            
            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Original Ticket */}
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar url={ticket?.profiles?.avatar_url} size={40}/>
                        <div>
                            <p className="font-bold">{ticket?.profiles?.full_name}</p>
                            <p className="text-xs text-slate-400">فتح الطلب في {new Date(ticket?.created_at || '').toLocaleString('ar-EG')}</p>
                        </div>
                    </div>
                    <p className="whitespace-pre-wrap">{ticket?.problem_description}</p>
                    {ticket?.screenshot_urls && ticket.screenshot_urls.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {ticket.screenshot_urls.map(path => {
                                const url = supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
                                return <a href={url} target="_blank" rel="noopener noreferrer" key={path}><img src={url} className="rounded-md object-cover" alt="Screenshot"/></a>
                            })}
                        </div>
                    )}
                </div>

                {replies.map(reply => (
                    <ReplyBubble key={reply.id} reply={reply} isAdmin={user?.email === reply.user_id} />
                ))}

            </main>

            <footer className="p-2 border-t border-slate-700 bg-slate-800">
                {isAdmin && ticket?.status === 'PENDING' && (
                    <div className="p-2"><Button onClick={() => handleStatusChange('RESOLVED')} loading={sending} variant="secondary">تحديد كـ (تم الحل)</Button></div>
                )}
                {isAdmin && ticket?.status === 'RESOLVED' && (
                    <div className="p-2"><Button onClick={() => handleStatusChange('PENDING')} loading={sending} variant="secondary">إعادة فتح الطلب</Button></div>
                )}

                <div className="p-2 space-y-3">
                    <Textarea 
                        value={newReply} 
                        onChange={e => setNewReply(e.target.value)}
                        placeholder="اكتب رداً..."
                        className="!bg-slate-700" 
                        rows={3} 
                        disabled={sending}
                    />
                    <MultiImageInput onFilesSelect={setNewImages} />
                    <Button onClick={handleReply} loading={sending}>
                        <SendIcon /> إرسال الرد
                    </Button>
                </div>
            </footer>
        </div>
    );
};

export default SupportTicketDetailScreen;
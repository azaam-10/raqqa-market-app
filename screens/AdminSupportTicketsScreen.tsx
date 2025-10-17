import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import { getErrorMessage, timeAgo } from '../utils/errors';
import { SupportTicket } from '../types';
import Avatar from '../components/ui/Avatar';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>;

type ReportStatus = 'PENDING' | 'RESOLVED';

const AdminSupportTicketsScreen: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ReportStatus>('PENDING');

    useEffect(() => {
        if (user && user.email !== 'azaamazeez8877@gmail.com') {
            navigate('/home', { replace: true });
        }
    }, [user, navigate]);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*, profiles!user_id(full_name, avatar_url)')
                .eq('status', activeTab)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data as SupportTicket[] || []);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const renderTicketList = () => {
        if (loading) return <div className="text-center py-10"><Spinner /></div>;
        if (error) return <p className="text-center text-red-400 py-10">{error}</p>;
        if (tickets.length === 0) return <p className="text-center text-slate-400 py-10">لا توجد طلبات دعم في هذا القسم.</p>;

        return (
            <div className="space-y-3">
                {tickets.map(ticket => (
                    <Link
                        key={ticket.id}
                        to={`/support/ticket/${ticket.id}`}
                        className="block w-full text-right p-4 rounded-lg border bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
                    >
                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-3">
                                <Avatar url={ticket.profiles?.avatar_url} size={40}/>
                                <div>
                                    <p className="font-bold text-white">{ticket.profiles?.full_name}</p>
                                     <p className="text-xs text-slate-400">{timeAgo(ticket.created_at)}</p>
                                </div>
                           </div>
                           <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                                {activeTab === 'PENDING' ? 'معلق' : 'تم الحل'}
                            </span>
                        </div>
                        <p className="text-sm text-slate-300 mt-2 truncate">
                            {ticket.problem_description}
                        </p>
                    </Link>
                ))}
            </div>
        );
    };
    
    const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
        <button
            onClick={onClick}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                active ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-300'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                         <button onClick={() => navigate('/admin')} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full px-12">إدارة طلبات الدعم</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <div className="border-b border-slate-700 flex mb-4">
                        <TabButton label="معلقة" active={activeTab === 'PENDING'} onClick={() => setActiveTab('PENDING')} />
                        <TabButton label="تم حلها" active={activeTab === 'RESOLVED'} onClick={() => setActiveTab('RESOLVED')} />
                    </div>
                    {renderTicketList()}
                </div>
            </main>
        </div>
    );
};

export default AdminSupportTicketsScreen;
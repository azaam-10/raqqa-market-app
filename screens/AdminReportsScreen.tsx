import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import { getErrorMessage } from '../utils/errors';
import PostCard from '../components/PostCard';
import { Post, Profile } from '../types';
import Button from '../components/ui/Button';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>;
const PostIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

type ReportStatus = 'PENDING' | 'RESOLVED';
type EntityType = 'post' | 'user' | 'product' | 'comment';

interface Report {
    id: string;
    created_at: string;
    reason: string;
    details: string | null;
    status: ReportStatus;
    entity_id: string;
    entity_type: EntityType;
    reporter: Profile | null;
    reported_user: Profile | null;
}

const entityTypeLabels: Record<EntityType, string> = {
    post: 'منشور',
    user: 'مستخدم',
    product: 'منتج',
    comment: 'تعليق',
};

const reasonLabels: Record<string, string> = {
    SPAM: 'محتوى غير مرغوب فيه',
    INAPPROPRIATE: 'محتوى غير لائق',
    HARASSMENT: 'مضايقة',
    SCAM: 'احتيال',
    VIOLENCE: 'عنف',
    OTHER: 'آخر',
};

const AdminReportsScreen: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ReportStatus>('PENDING');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [reportedContent, setReportedContent] = useState<any>(null);
    const [contentLoading, setContentLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (user && user.email !== 'azaamazeez8877@gmail.com') {
            navigate('/home', { replace: true });
        }
    }, [user, navigate]);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*, reporter:reporter_id(*), reported_user:reported_user_id(*)')
                .eq('status', activeTab)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data as Report[] || []);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const fetchReportedContent = async (report: Report) => {
        setContentLoading(true);
        setReportedContent(null);
        try {
            if (report.entity_type === 'post') {
                const { data, error } = await supabase
                    .from('posts')
                    .select('*, profiles!user_id(full_name, avatar_url), likes(user_id), comments(count)')
                    .eq('id', report.entity_id)
                    .single();
                if (error) throw new Error('لم يتم العثور على المنشور، قد يكون قد تم حذفه.');
                setReportedContent(data);
            }
            // Add other entity types (user, product, comment) here later
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setContentLoading(false);
        }
    };

    const handleSelectReport = (report: Report) => {
        setSelectedReport(report);
        fetchReportedContent(report);
    };

    const handleResolveReport = async (reportId: string) => {
        setActionLoading(true);
        const { error } = await supabase.from('reports').update({ status: 'RESOLVED' }).eq('id', reportId);
        if (error) {
            alert('فشل في تحديث حالة البلاغ.');
        } else {
            setReports(prev => prev.filter(r => r.id !== reportId));
            setSelectedReport(null);
        }
        setActionLoading(false);
    };

    const handleDeleteContent = async () => {
        if (!selectedReport || !reportedContent) return;
        
        setActionLoading(true);
        try {
            if (selectedReport.entity_type === 'post') {
                const { error: deleteError } = await supabase.from('posts').delete().eq('id', reportedContent.id);
                if (deleteError) throw deleteError;

                if (reportedContent.image_url) {
                    await supabase.storage.from('uploads').remove([reportedContent.image_url]);
                }
                 if (reportedContent.video_url) {
                    await supabase.storage.from('uploads').remove([reportedContent.video_url]);
                }
            }
            await handleResolveReport(selectedReport.id);
        } catch (err) {
            alert(`فشل حذف المحتوى: ${getErrorMessage(err)}`);
        } finally {
            setActionLoading(false);
        }
    };


    const renderReportList = () => {
        if (loading) return <div className="text-center py-10"><Spinner /></div>;
        if (error) return <p className="text-center text-red-400 py-10">{error}</p>;
        if (reports.length === 0) return <p className="text-center text-slate-400 py-10">لا توجد بلاغات في هذا القسم.</p>;

        return (
            <div className="space-y-3">
                {reports.map(report => (
                    <button
                        key={report.id}
                        onClick={() => handleSelectReport(report)}
                        className={`w-full text-right p-4 rounded-lg border transition-colors ${selectedReport?.id === report.id ? 'bg-cyan-900/50 border-cyan-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                    >
                        <div className="flex justify-between items-center">
                            <p className="font-bold text-white flex items-center gap-2">
                               {report.entity_type === 'post' ? <PostIcon/> : <UserIcon />}
                               <span>بلاغ عن {entityTypeLabels[report.entity_type] || 'محتوى'}</span>
                            </p>
                            <p className="text-xs text-slate-400">{new Date(report.created_at).toLocaleString('ar-EG')}</p>
                        </div>
                        <p className="text-sm text-slate-300 mt-2">
                            <span className="font-semibold">السبب:</span> {reasonLabels[report.reason] || report.reason}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            <span className="font-semibold">المُبلغ:</span> {report.reporter?.full_name || 'غير معروف'}
                        </p>
                    </button>
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
                        <h1 className="text-xl font-bold text-center w-full px-12">إدارة البلاغات</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    <div className="md:col-span-1">
                        <div className="border-b border-slate-700 flex mb-4">
                            <TabButton label="معلقة" active={activeTab === 'PENDING'} onClick={() => { setActiveTab('PENDING'); setSelectedReport(null); }} />
                            <TabButton label="تم حلها" active={activeTab === 'RESOLVED'} onClick={() => { setActiveTab('RESOLVED'); setSelectedReport(null); }} />
                        </div>
                        {renderReportList()}
                    </div>
                    <div className="md:col-span-2">
                        {selectedReport ? (
                             <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 sticky top-24">
                                <h2 className="text-2xl font-bold text-cyan-400 mb-4">تفاصيل البلاغ</h2>
                                <div className="space-y-2 mb-4 text-sm">
                                    <p><strong>السبب:</strong> {reasonLabels[selectedReport.reason] || selectedReport.reason}</p>
                                    {selectedReport.details && <p><strong>التفاصيل:</strong> {selectedReport.details}</p>}
                                    <p><strong>المُبلغ عنه:</strong> {selectedReport.reported_user?.full_name || 'غير معروف'}</p>
                                </div>
                                <div className="border-t border-slate-700 pt-4">
                                    <h3 className="font-bold mb-2">المحتوى المُبلغ عنه:</h3>
                                    {contentLoading && <Spinner />}
                                    {reportedContent && selectedReport.entity_type === 'post' && (
                                        <div className="max-h-[50vh] overflow-y-auto rounded-lg p-2 bg-slate-900/50">
                                            <PostCard post={reportedContent as Post} onPostDeleted={() => {setSelectedReport(null); fetchReports();}} />
                                        </div>
                                    )}
                                    {!reportedContent && !contentLoading && <p className="text-yellow-400">لا يمكن عرض المحتوى.</p>}
                                </div>
                                {activeTab === 'PENDING' && (
                                    <div className="flex gap-4 mt-6 border-t border-slate-700 pt-4">
                                        <Button onClick={() => handleResolveReport(selectedReport.id)} loading={actionLoading} variant="secondary">
                                            تجاهل البلاغ
                                        </Button>
                                        <Button onClick={handleDeleteContent} loading={actionLoading} className="!bg-red-600 hover:!bg-red-700">
                                            حذف المحتوى
                                        </Button>
                                    </div>
                                )}
                             </div>
                        ) : (
                            <div className="flex items-center justify-center h-full bg-slate-800 border border-slate-700 rounded-lg p-10 text-center text-slate-400">
                                <p>الرجاء تحديد بلاغ من القائمة لعرض التفاصيل.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminReportsScreen;
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Accordion from '../components/ui/Accordion';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import MultiImageInput from '../components/ui/MultiImageInput';
import { getErrorMessage, timeAgo } from '../utils/errors';
import { SupportTicket } from '../types';
import Spinner from '../components/ui/Spinner';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const SearchIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> );

const faqData = [
    { q: 'كيف يمكنني تعديل ملفي الشخصي؟', a: 'اذهب إلى الإعدادات > الحساب > الملف الشخصي، ثم اضغط على "تعديل الملف الشخصي". يمكنك هناك تغيير اسمك، سيرتك الذاتية، وصور العرض والغلاف.' },
    { q: 'كيف أقوم بإنشاء منشور جديد؟', a: 'من الصفحة الرئيسية، ستجد نموذج "بماذا تفكر؟". اكتب منشورك، أضف صورة أو فيديو إذا أردت، ثم اضغط على "نشر".' },
    { q: 'هل يمكنني حذف منشور أو تعليق؟', a: 'نعم. اضغط على أيقونة الثلاث نقاط (...) بجانب منشورك أو تعليقك، ثم اختر "حذف". سيُطلب منك تأكيد الحذف.' },
    { q: 'كيف أتحكم في خصوصية حسابي؟', a: 'من الإعدادات، يمكنك التحكم في من يمكنه مراسلتك، ومن يرى تفاصيل ملفك الشخصي الإضافية مثل مكان الإقامة والتعليم.' },
    { q: 'ماذا أفعل إذا واجهت محتوى مسيئاً؟', a: 'يمكنك الإبلاغ عن أي منشور أو مستخدم عن طريق الضغط على أيقونة الثلاث نقاط (...) واختيار "إبلاغ". سيقوم فريقنا بمراجعة البلاغ واتخاذ الإجراء المناسب.' },
    { q: 'كيف أنشئ متجراً؟', a: 'اذهب إلى قسم "المتاجر" من الشريط السفلي، ثم اضغط على زر "أنشئ متجراً". املأ التفاصيل المطلوبة وأضف صورة للمتجر.' },
    { q: 'كيف أغير لغة التطبيق أو المظهر (داكن/فاتح)؟', a: 'اذهب إلى الإعدادات > إعدادات إضافية > المظهر. يمكنك هناك تفعيل الوضع الداكن أو إلغاء تفعيله.'},
];

const HelpAndSupportScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [problemDescription, setProblemDescription] = useState('');
    const [screenshots, setScreenshots] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);

    const fetchUserTickets = async () => {
        if (!user) return;
        setTicketsLoading(true);
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*, unread_admin_replies:support_ticket_replies(count)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUserTickets(data as any[] || []);
        } catch (err) {
            console.error(err);
        } finally {
            setTicketsLoading(false);
        }
    };

    useEffect(() => {
        fetchUserTickets();
    }, [user]);

    const filteredFaq = useMemo(() => {
        if (!searchQuery.trim()) return faqData;
        return faqData.filter(item => 
            item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.a.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const handleFilesSelect = (files: File[]) => {
        if (files.length > 2) {
            alert('يمكنك إرفاق صورتين كحد أقصى.');
            setScreenshots(files.slice(0, 2));
        } else {
            setScreenshots(files);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!problemDescription.trim() || !user) {
            setError('الرجاء كتابة وصف للمشكلة.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            let screenshotUrls: string[] = [];
            if (screenshots.length > 0) {
                screenshotUrls = await Promise.all(
                    screenshots.map(async (file) => {
                        const fileName = `${user.id}/support-tickets/${Date.now()}-${Math.random()}`;
                        const { error: uploadError } = await supabase.storage
                            .from('uploads')
                            .upload(fileName, file);
                        if (uploadError) throw uploadError;
                        return fileName;
                    })
                );
            }

            const { error: insertError } = await supabase.from('support_tickets').insert({
                user_id: user.id,
                problem_description: problemDescription.trim(),
                screenshot_urls: screenshotUrls.length > 0 ? screenshotUrls : null,
            });

            if (insertError) throw insertError;

            setSuccess(true);
            setProblemDescription('');
            setScreenshots([]);
            await fetchUserTickets(); // Refresh ticket list
            setTimeout(() => setSuccess(false), 5000);

        } catch (err) {
            const friendlyError = getErrorMessage(err);
             if (friendlyError.toLowerCase().includes('relation "support_tickets" does not exist')) {
                setError("عذراً، ميزة الدعم الفني غير مفعلة حالياً في قاعدة البيانات. يرجى التواصل مع المسؤول.");
             } else {
                setError(friendlyError);
             }
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full px-12">المساعدة والدعم</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto space-y-8">

                    {/* My Tickets Section */}
                    <div>
                        <h2 className="text-lg font-bold text-teal-500 dark:text-teal-400 mb-4 px-1">طلباتك السابقة</h2>
                        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
                            {ticketsLoading ? <Spinner/> : userTickets.length > 0 ? (
                                <div className="space-y-2">
                                    {userTickets.map(ticket => (
                                        <Link key={ticket.id} to={`/support/ticket/${ticket.id}`} className="block p-3 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800/50">
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 truncate pr-4">
                                                    {ticket.problem_description}
                                                </p>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {ticket.unread_admin_replies && ticket.unread_admin_replies > 0 && <span className="w-2.5 h-2.5 bg-cyan-500 rounded-full" title="رد جديد"></span>}
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ticket.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                                                        {ticket.status === 'PENDING' ? 'معلق' : 'تم الحل'}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{timeAgo(ticket.created_at)}</p>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 dark:text-zinc-400 py-4">لم تقم بإرسال أي طلبات دعم بعد.</p>
                            )}
                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div>
                         <h2 className="text-lg font-bold text-teal-500 dark:text-teal-400 mb-4 px-1">الأسئلة الشائعة</h2>
                         <div className="relative mb-4">
                            <Input
                                type="text"
                                placeholder="ابحث عن إجابة..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full !pl-10"
                            />
                            <SearchIcon />
                        </div>
                        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
                            {filteredFaq.length > 0 ? (
                                filteredFaq.map(item => (
                                    <Accordion key={item.q} title={item.q}>{item.a}</Accordion>
                                ))
                            ) : (
                                <p className="p-4 text-center text-gray-500 dark:text-zinc-400">لا توجد نتائج بحث مطابقة.</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Contact Support Section */}
                    <div>
                        <h2 className="text-lg font-bold text-teal-500 dark:text-teal-400 mb-4 px-1">هل ما زلت بحاجة للمساعدة؟</h2>
                        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 space-y-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">إنشاء طلب دعم جديد</h3>
                             {success && <p className="text-green-400 text-sm p-3 bg-green-500/10 rounded-md">تم إرسال طلبك بنجاح! سنتواصل معك قريباً.</p>}
                             {error && <p className="text-red-400 text-sm p-3 bg-red-500/10 rounded-md">{error}</p>}
                            <div>
                                <label htmlFor="problem" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">اشرح مشكلتك</label>
                                <Textarea 
                                    id="problem"
                                    rows={5}
                                    placeholder="يرجى تقديم أكبر قدر ممكن من التفاصيل حول المشكلة التي تواجهها..."
                                    value={problemDescription}
                                    onChange={e => setProblemDescription(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">إرفاق لقطات شاشة (اختياري، صورتان كحد أقصى)</label>
                                <MultiImageInput onFilesSelect={handleFilesSelect} />
                            </div>
                            <Button type="submit" loading={loading} disabled={!problemDescription.trim()}>إرسال الطلب</Button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HelpAndSupportScreen;
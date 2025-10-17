import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { getErrorMessage } from '../utils/errors';
import Spinner from '../components/ui/Spinner';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import { PrivacySetting } from '../types';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const ChevronLeftIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> );
const BanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>;

const SettingsRow: React.FC<{ icon?: React.ReactNode; label: string; description: string; action: React.ReactNode; isLink?: boolean; }> = ({ icon, label, description, action, isLink }) => (
    <div className={`flex justify-between items-center p-4 ${isLink ? 'hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors' : ''}`}>
        <div className="flex items-center gap-4">
            {icon && <div className="text-teal-500 dark:text-teal-400">{icon}</div>}
            <div>
                <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
                <p className="text-sm text-gray-500 dark:text-zinc-400">{description}</p>
            </div>
        </div>
        <div className="text-gray-400 dark:text-zinc-500">{action}</div>
    </div>
);

const LabeledSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }> = ({ children, ...props }) => (
    <select
        {...props}
        className="w-36 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition duration-200 appearance-none text-center !py-1 !px-2 !text-xs"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'left 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1em 1em',
            paddingLeft: '1.75rem'
        }}
    >
        {children}
    </select>
);


const ChatSettingsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user, profile, refreshProfile } = useAuth();
    
    const [messagePrivacy, setMessagePrivacy] = useState<PrivacySetting>('public');
    const [readReceipts, setReadReceipts] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            setMessagePrivacy(profile.message_privacy || 'public');
            setReadReceipts(profile.read_receipts_enabled ?? true);
        }
    }, [profile]);

    const handleUpdate = async (field: string, value: any) => {
        if (!user) return;
        setLoading(true);
        setError(null);
        setSuccess(null);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ [field]: value })
            .eq('id', user.id);

        if (updateError) {
            setError(getErrorMessage(updateError));
        } else {
            setSuccess('تم حفظ الإعدادات بنجاح.');
            await refreshProfile();
            setTimeout(() => setSuccess(null), 2000);
        }
        setLoading(false);
    };

    const handlePrivacyChange = (value: PrivacySetting) => {
        setMessagePrivacy(value);
        handleUpdate('message_privacy', value);
    };
    
    const handleReceiptsChange = (value: boolean) => {
        setReadReceipts(value);
        handleUpdate('read_receipts_enabled', value);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="absolute right-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">إعدادات الدردشة</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto space-y-8">
                     {error && <p className="text-red-400 text-sm text-center p-3 bg-red-500/10 rounded-md">{error}</p>}
                     {success && <p className="text-green-400 text-sm text-center p-3 bg-green-500/10 rounded-md">{success}</p>}

                    <div>
                         <h2 className="text-lg font-bold text-teal-500 dark:text-teal-400 mb-4 px-1">الخصوصية</h2>
                        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg divide-y divide-gray-200 dark:divide-zinc-800">
                            <SettingsRow
                                label="من يمكنه مراسلتي؟"
                                description="التحكم في من يستطيع بدء محادثة معك."
                                action={
                                    loading ? <Spinner /> :
                                    <LabeledSelect 
                                        value={messagePrivacy} 
                                        onChange={e => handlePrivacyChange(e.target.value as PrivacySetting)} 
                                    >
                                        <option value="public">الكل</option>
                                        <option value="followers">المتابعون فقط</option>
                                        <option value="private">لا أحد</option>
                                    </LabeledSelect>
                                }
                            />
                             <SettingsRow
                                label="مؤشرات قراءة الرسائل"
                                description="السماح للآخرين بمعرفة أنك قرأت رسائلهم."
                                action={<ToggleSwitch id="read-receipts" checked={readReceipts} onChange={handleReceiptsChange} label="Toggle read receipts" />}
                            />
                        </div>
                    </div>
                     <div>
                         <h2 className="text-lg font-bold text-teal-500 dark:text-teal-400 mb-4 px-1">الإدارة</h2>
                        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
                            <Link to="/settings/chat/blocked">
                                 <SettingsRow
                                    icon={<BanIcon />}
                                    label="المستخدمون المحظورون"
                                    description="إدارة قائمة المستخدمين الذين قمت بحظرهم."
                                    action={<ChevronLeftIcon />}
                                    isLink={true}
                                />
                            </Link>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default ChatSettingsScreen;

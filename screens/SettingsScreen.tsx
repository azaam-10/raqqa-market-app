import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ToggleSwitch from '../components/ui/ToggleSwitch';

// --- Icons --- //
const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const ChevronLeftIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> );
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const HelpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;


const SettingsRow: React.FC<{ icon: React.ReactNode; label: string; description: string; action: React.ReactNode; isLink?: boolean; disabled?: boolean; }> = ({ icon, label, description, action, isLink, disabled }) => (
    <div className={`flex justify-between items-center p-4 ${isLink ? 'hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className="flex items-center gap-4">
            <div className="text-teal-500 dark:text-teal-400">{icon}</div>
            <div>
                <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
                <p className="text-sm text-gray-500 dark:text-zinc-400">{description}</p>
            </div>
        </div>
        <div className="text-gray-400 dark:text-zinc-500">{action}</div>
    </div>
);

const SettingsScreen: React.FC = () => {
    const navigate = useNavigate();

    // Notification states (UI only for now)
    const [likeNotifs, setLikeNotifs] = useState(true);
    const [commentNotifs, setCommentNotifs] = useState(true);
    const [messageNotifs, setMessageNotifs] = useState(true);
    const [followerNotifs, setFollowerNotifs] = useState(true);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="absolute right-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">الإعدادات</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Account Section */}
                    <div>
                         <h2 className="text-lg font-bold text-teal-500 dark:text-teal-400 mb-4 px-1">الحساب</h2>
                        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg divide-y divide-gray-200 dark:divide-zinc-800">
                            <Link to="/profile/edit">
                                <SettingsRow
                                    icon={<UserIcon />}
                                    label="الملف الشخصي"
                                    description="عرض ملفك الشخصي وتعديله."
                                    action={<ChevronLeftIcon />}
                                    isLink={true}
                                />
                            </Link>
                            <Link to="/settings/chat">
                                <SettingsRow
                                    icon={<ChatIcon />}
                                    label="إعدادات الدردشة"
                                    description="التحكم في خصوصية الرسائل ومؤشرات القراءة."
                                    action={<ChevronLeftIcon />}
                                    isLink={true}
                                />
                            </Link>
                            <Link to="/activity-log">
                                <SettingsRow
                                    icon={<ListIcon />}
                                    label="سجل النشاطات"
                                    description="مراجعة منشوراتك وتعليقاتك وإعجاباتك."
                                    action={<ChevronLeftIcon />}
                                    isLink={true}
                                />
                            </Link>
                        </div>
                    </div>

                    {/* Notifications Section */}
                    <div>
                        <h2 className="text-lg font-bold text-teal-500 dark:text-teal-400 mb-4 px-1">الإشعارات</h2>
                        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg divide-y divide-gray-200 dark:divide-zinc-800">
                            <SettingsRow icon={<BellIcon />} label="الإعجابات" description="على منشوراتك ومنتجاتك." action={<ToggleSwitch id="like-notif" checked={likeNotifs} onChange={setLikeNotifs} label="Toggle Likes"/>} />
                            <SettingsRow icon={<BellIcon />} label="التعليقات" description="على منشوراتك ومنتجاتك." action={<ToggleSwitch id="comment-notif" checked={commentNotifs} onChange={setCommentNotifs} label="Toggle Comments"/>} />
                            <SettingsRow icon={<BellIcon />} label="الرسائل الجديدة" description="عند استلام رسالة جديدة." action={<ToggleSwitch id="message-notif" checked={messageNotifs} onChange={setMessageNotifs} label="Toggle Messages"/>} />
                            <SettingsRow icon={<BellIcon />} label="المتابعون الجدد" description="عندما يبدأ شخص بمتابعتك." action={<ToggleSwitch id="follower-notif" checked={followerNotifs} onChange={setFollowerNotifs} label="Toggle Followers"/>} />
                        </div>
                    </div>
                    
                    {/* Other Sections */}
                     <div>
                        <h2 className="text-lg font-bold text-teal-500 dark:text-teal-400 mb-4 px-1">إعدادات إضافية</h2>
                        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg divide-y divide-gray-200 dark:divide-zinc-800">
                             <Link to="/settings/display">
                                <SettingsRow
                                    icon={<MoonIcon />}
                                    label="المظهر"
                                    description="تغيير الثيم إلى فاتح أو داكن."
                                    action={<ChevronLeftIcon />}
                                    isLink={true}
                                />
                            </Link>
                            <Link to="/help-support">
                                <SettingsRow
                                    icon={<HelpIcon />}
                                    label="المساعدة والدعم"
                                    description="تواصل معنا أو اقرأ الأسئلة الشائعة."
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

export default SettingsScreen;
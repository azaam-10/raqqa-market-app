import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import ImageInput from '../components/ui/ImageInput';
import { getErrorMessage } from '../utils/errors';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;


const CreateGroupScreen: React.FC = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !user) return;

        setLoading(true);
        setError(null);
        
        try {
            let coverImageUrl: string | null = null;
            if (coverFile) {
                const fileExt = coverFile.name.split('.').pop();
                const fileName = `${user.id}/groups/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('uploads')
                    .upload(fileName, coverFile, {
                        contentType: coverFile.type,
                        upsert: true,
                    });
                if (uploadError) throw uploadError;
                coverImageUrl = fileName;
            }

            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .insert([{ 
                    name: name.trim(), 
                    description: description.trim(), 
                    user_id: user.id,
                    cover_image_url: coverImageUrl,
                    is_private: isPrivate,
                }])
                .select('id')
                .single();

            if (groupError) throw groupError;

            const { error: memberError } = await supabase
                .from('group_members')
                .insert({ group_id: groupData.id, user_id: user.id });

            if (memberError) throw memberError;

            navigate(`/group/${groupData.id}`);

        } catch (err: unknown) {
            setError(`فشل إنشاء المجموعة: ${getErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="absolute right-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full">إنشاء مجموعة جديدة</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 space-y-6">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">صورة الغلاف (اختياري)</label>
                             <ImageInput onFileSelect={setCoverFile} />
                        </div>
                        <div>
                            <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">اسم المجموعة</label>
                            <Input
                                id="group-name"
                                type="text"
                                placeholder="مثال: محبي السيارات الكلاسيكية"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">الخصوصية</label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${!isPrivate ? 'bg-teal-50 dark:bg-teal-900/50 border-teal-500' : 'bg-gray-50 dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-600'}`}>
                                    <input type="radio" name="privacy" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="hidden" />
                                    <GlobeIcon />
                                    <span className="font-semibold mt-2">عامة</span>
                                    <span className="text-xs text-gray-500 dark:text-zinc-400 text-center mt-1">يمكن لأي شخص رؤية المجموعة ومنشوراتها.</span>
                                </label>
                                <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${isPrivate ? 'bg-teal-50 dark:bg-teal-900/50 border-teal-500' : 'bg-gray-50 dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-600'}`}>
                                    <input type="radio" name="privacy" checked={isPrivate} onChange={() => setIsPrivate(true)} className="hidden" />
                                    <LockIcon />
                                    <span className="font-semibold mt-2">خاصة</span>
                                     <span className="text-xs text-gray-500 dark:text-zinc-400 text-center mt-1">يمكن للأعضاء فقط رؤية المنشورات.</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="group-description" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">الوصف (اختياري)</label>
                            <Textarea
                                id="group-description"
                                rows={4}
                                placeholder="صف الغرض من هذه المجموعة..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm text-right">{error}</p>}
                        <div className="flex justify-end pt-2">
                            <div className="w-full sm:w-auto">
                                <Button type="submit" loading={loading} disabled={!name.trim()}>
                                    إنشاء المجموعة
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateGroupScreen;

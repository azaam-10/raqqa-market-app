
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { getErrorMessage } from '../utils/errors';
import Button from './ui/Button';
import Avatar from './ui/Avatar';
import Spinner from './ui/Spinner';
import Textarea from './ui/Textarea';

// --- Icons --- //
const CameraIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg> );
const ImageIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> );
const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg> );
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

// --- Component --- //
interface StepConfig {
    key: 'avatar' | 'cover' | 'bio';
    title: string;
    description: string;
    icon: React.ReactNode;
}

const ALL_STEPS: StepConfig[] = [
    { key: 'avatar', title: 'إضافة صورة شخصية', description: 'الصورة الشخصية تساعد أصدقاءك في العثور عليك بسهولة.', icon: <CameraIcon /> },
    { key: 'cover', title: 'إضافة صورة غلاف', description: 'أضف لمسة شخصية لملفك بصورة غلاف تعبر عنك.', icon: <ImageIcon /> },
    { key: 'bio', title: 'كتابة نبذة تعريفية', description: 'أخبر الآخرين المزيد عن نفسك، اهتماماتك، أو ما تقدمه.', icon: <EditIcon /> },
];


const ProfileCompletionWizard: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
    const { user, profile, refreshProfile } = useAuth();
    const [steps, setSteps] = useState<StepConfig[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bio, setBio] = useState(profile?.bio || '');

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

     useEffect(() => {
        if (profile) {
            const incompleteSteps = ALL_STEPS.filter(step => {
                switch(step.key) {
                    case 'avatar': return !profile.avatar_url;
                    case 'cover': return !profile.cover_photo_url;
                    case 'bio': return !profile.bio || profile.bio.trim() === '';
                    default: return false;
                }
            });
            setSteps(incompleteSteps);
        }
    }, [profile]);

    const handleSkip = () => {
        onFinish();
    };

    const advanceStep = () => {
        if (stepIndex >= steps.length - 1) {
            setStepIndex(s => s + 1); // Go to success step
        } else {
            setStepIndex(s => s + 1);
        }
    };

    const handleFileUpload = async (file: File, type: 'avatar' | 'cover') => {
        if (!file || !user) return;

        const folder = type === 'avatar' ? 'avatars' : 'covers';
        const column = type === 'avatar' ? 'avatar_url' : 'cover_photo_url';
        const oldPath = type === 'avatar' ? profile?.avatar_url : profile?.cover_photo_url;
        
        const newFilePath = `${user.id}/${folder}/${Date.now()}.${file.name.split('.').pop()}`;
        
        setLoading(true);
        setError(null);

        try {
            const { error: uploadError } = await supabase.storage.from('uploads').upload(newFilePath, file);
            if (uploadError) throw uploadError;

            const { error: updateError } = await supabase.from('profiles').update({ [column]: newFilePath }).eq('id', user.id);
            if (updateError) {
                await supabase.storage.from('uploads').remove([newFilePath]);
                throw updateError;
            }
            
            await refreshProfile();
            
            if (oldPath) {
                try {
                    await supabase.storage.from('uploads').remove([oldPath]);
                } catch(removeError) {
                    console.warn("Could not remove old file, it might not exist:", removeError);
                }
            }
            advanceStep();
        } catch (error: any) {
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };
    
     const handleBioSubmit = async () => {
        if (!user || !bio.trim()) return advanceStep();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.from('profiles').update({ bio: bio.trim() }).eq('id', user!.id);
            if (error) throw error;
            await refreshProfile();
            advanceStep();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };


    const currentStepData = steps[stepIndex];
    const isFinished = stepIndex >= steps.length;
    const modalRoot = document.getElementById('modal-root');
    
    if (!modalRoot || steps.length === 0) return null;

    const renderStepContent = () => {
        if (isFinished) {
            return (
                <div className="text-center p-8 flex flex-col items-center">
                    <CheckCircleIcon />
                    <h2 className="text-2xl font-bold mt-4 text-white">اكتمل ملفك الشخصي!</h2>
                    <p className="text-zinc-400 mt-2">أصبحت جاهزاً الآن. يمكنك دائماً إضافة المزيد من التفاصيل من الإعدادات.</p>
                    <Button onClick={onFinish} className="mt-8">ابدأ التصفح</Button>
                </div>
            );
        }

        let content;
        switch(currentStepData.key) {
            case 'avatar':
                content = (
                    <div className="flex flex-col items-center">
                        <div className="relative mb-4">
                           <Avatar url={profile?.avatar_url} size={128} />
                           {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full"><Spinner/></div>}
                        </div>
                        <Button onClick={() => avatarInputRef.current?.click()} disabled={loading}>
                            اختر صورة
                        </Button>
                        <input type="file" ref={avatarInputRef} onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'avatar')} className="hidden" accept="image/*" />
                    </div>
                );
                break;
            case 'cover':
                content = (
                     <div className="flex flex-col items-center w-full">
                        <div className="w-full aspect-video bg-zinc-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
                           {profile?.cover_photo_url ? (
                               <img src={supabase.storage.from('uploads').getPublicUrl(profile.cover_photo_url).data.publicUrl} alt="Cover preview" className="w-full h-full object-cover" />
                           ) : <p className="text-zinc-500">معاينة صورة الغلاف</p>}
                           {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Spinner/></div>}
                        </div>
                        <Button onClick={() => coverInputRef.current?.click()} disabled={loading}>
                            اختر صورة غلاف
                        </Button>
                        <input type="file" ref={coverInputRef} onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'cover')} className="hidden" accept="image/*" />
                    </div>
                );
                break;
            case 'bio':
                 content = (
                    <Textarea 
                        rows={5} 
                        placeholder="أخبرنا عن نفسك..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        disabled={loading}
                    />
                );
                break;
            default: content = null;
        }

        return (
            <>
                 <div className="p-6 text-center">
                    <div className="flex justify-center gap-2 mb-6">
                        {steps.map((_, index) => (
                            <div key={index} className={`w-3 h-3 rounded-full transition-colors ${stepIndex === index ? 'bg-teal-400' : 'bg-zinc-700'}`}></div>
                        ))}
                    </div>

                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-teal-500/50">
                        {currentStepData.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-white mt-4">{currentStepData.title}</h2>
                    <p className="text-zinc-400 mt-2 mb-6">{currentStepData.description}</p>
                    {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                    
                    {content}
                </div>
                 <div className="flex items-center gap-2 p-4 border-t border-zinc-800">
                    <Button variant="secondary" onClick={handleSkip} className="flex-1">
                        التذكير لاحقاً
                    </Button>
                     <Button onClick={currentStepData.key === 'bio' ? handleBioSubmit : advanceStep} loading={loading} className="flex-1">
                        {stepIndex === steps.length - 1 ? 'إنهاء' : 'التالي'}
                    </Button>
                </div>
            </>
        )
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
            <div 
                className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {renderStepContent()}
            </div>
        </div>,
        modalRoot
    );
};

// Add keyframes for animation
const style = document.createElement('style');
style.innerHTML = `
    @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    .animate-fade-in {
        animation: fade-in 0.3s ease-out forwards;
    }
`;
document.head.appendChild(style);

export default ProfileCompletionWizard;

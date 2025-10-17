import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import Button from './ui/Button';

// Icons for each permission
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;


type Permission = 'camera' | 'microphone' | 'geolocation' | 'notifications';
type PermissionStatus = 'pending' | 'granted' | 'denied';

interface PermissionStep {
    key: Permission;
    icon: React.ReactNode;
    title: string;
    description: string;
    actionText: string;
}

const permissionSteps: PermissionStep[] = [
    {
        key: 'notifications',
        icon: <BellIcon />,
        title: 'الإشعارات',
        description: 'نحتاج إذن الإشعارات لنعلمك بالرسائل الجديدة، التفاعلات، والتحديثات الهامة.',
        actionText: 'تمكين الإشعارات'
    },
    {
        key: 'camera',
        icon: <CameraIcon />,
        title: 'الكاميرا',
        description: 'نستخدم الكاميرا لمساعدتك في التقاط صور وفيديوهات لمشاركتها في المنشورات أو الرسائل.',
        actionText: 'تمكين الكاميرا'
    },
    {
        key: 'microphone',
        icon: <MicIcon />,
        title: 'الميكروفون',
        description: 'يُستخدم الميكروفون لتسجيل الرسائل الصوتية وإجراء المكالمات داخل التطبيق.',
        actionText: 'تمكين الميكروفون'
    },
    {
        key: 'geolocation',
        icon: <LocationIcon />,
        title: 'الموقع الجغرافي',
        description: 'يساعدنا موقعك في عرض المنتجات والخدمات القريبة منك وتحسين تجربتك.',
        actionText: 'تمكين الموقع'
    },
];

const PermissionsWizard: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
    const [step, setStep] = useState(0);
    const [statuses, setStatuses] = useState<Record<Permission, PermissionStatus>>(
        Object.fromEntries(permissionSteps.map(p => [p.key, 'pending'])) as Record<Permission, PermissionStatus>
    );
    const [isRequesting, setIsRequesting] = useState(false);

    const handleRequest = async (permission: Permission) => {
        setIsRequesting(true);
        let status: PermissionStatus = 'denied';
        try {
            let result: PermissionState | string;
            switch (permission) {
                case 'notifications':
                    result = await Notification.requestPermission();
                    if (result === 'granted') status = 'granted';
                    break;
                case 'camera':
                    await navigator.mediaDevices.getUserMedia({ video: true });
                    status = 'granted';
                    break;
                case 'microphone':
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                    status = 'granted';
                    break;
                case 'geolocation':
                    await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
                    status = 'granted';
                    break;
            }
        } catch (error) {
            console.warn(`Permission for ${permission} denied:`, error);
            status = 'denied';
        }

        setStatuses(prev => ({ ...prev, [permission]: status }));
        setIsRequesting(false);
        setTimeout(() => setStep(prev => prev + 1), 500); // Move to next step after a short delay
    };

    const currentStepData = permissionSteps[step];
    const isFinished = step >= permissionSteps.length;
    const modalRoot = document.getElementById('modal-root');
    
    if (!modalRoot) return null;

    const renderStepContent = () => {
        if (isFinished) {
            return (
                <div className="text-center p-8 flex flex-col items-center">
                    <CheckCircleIcon />
                    <h2 className="text-2xl font-bold mt-4">شكراً لك!</h2>
                    <p className="text-zinc-400 mt-2">لقد أصبحت جاهزاً الآن لاستخدام التطبيق بكامل ميزاته.</p>
                    <Button onClick={onFinish} className="mt-8">ابدأ الآن</Button>
                </div>
            );
        }

        const status = statuses[currentStepData.key];
        let statusIndicator: React.ReactNode = null;
        if(status === 'granted') {
             statusIndicator = <span className="text-xs font-bold text-green-400">تم القبول</span>
        } else if (status === 'denied') {
             statusIndicator = <span className="text-xs font-bold text-yellow-400">تم الرفض/التخطي</span>
        }

        return (
            <div className="text-center p-8 flex flex-col items-center">
                {currentStepData.icon}
                <h2 className="text-2xl font-bold mt-4">{currentStepData.title}</h2>
                <p className="text-zinc-400 mt-2">{currentStepData.description}</p>
                <div className="h-6 mt-4">{statusIndicator}</div>
                <Button onClick={() => handleRequest(currentStepData.key)} loading={isRequesting} disabled={status !== 'pending'} className="mt-4">
                    {currentStepData.actionText}
                </Button>
                <button onClick={() => setStep(prev => prev + 1)} className="mt-4 text-sm text-zinc-500 hover:text-zinc-300">
                    تخطي الآن
                </button>
            </div>
        );
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                    <h3 className="font-bold text-white">إعداد الأذونات ({step >= permissionSteps.length ? permissionSteps.length : step + 1}/{permissionSteps.length})</h3>
                    <button onClick={onFinish} className="text-zinc-500 hover:text-white">إنهاء</button>
                </div>
                {renderStepContent()}
            </div>
        </div>,
        modalRoot
    );
};

export default PermissionsWizard;
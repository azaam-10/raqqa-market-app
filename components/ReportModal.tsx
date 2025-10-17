import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Textarea from './ui/Textarea';
import Button from './ui/Button';
import { getErrorMessage } from '../utils/errors';

const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );

type ReportReason = 'SPAM' | 'INAPPROPRIATE' | 'HARASSMENT' | 'SCAM' | 'VIOLENCE' | 'OTHER';

const reasons: { key: ReportReason; label: string }[] = [
    { key: 'SPAM', label: 'محتوى غير مرغوب فيه أو مضلل' },
    { key: 'INAPPROPRIATE', label: 'محتوى غير لائق أو إباحي' },
    { key: 'HARASSMENT', label: 'مضايقة أو خطاب يحض على الكراهية' },
    { key: 'SCAM', label: 'عملية احتيال أو خداع' },
    { key: 'VIOLENCE', label: 'محتوى عنيف أو خطير' },
    { key: 'OTHER', label: 'سبب آخر (يرجى التوضيح)' },
];

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
    entityType: 'post' | 'user' | 'product' | 'comment';
    reportedUserId: string;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, entityId, entityType, reportedUserId }) => {
    const { user } = useAuth();
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const modalRoot = document.getElementById('modal-root');

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setSelectedReason(null);
            setDetails('');
            setLoading(false);
            setError(null);
            setSuccess(false);
            // Prevent background scrolling
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReason || !user) {
            setError('الرجاء اختيار سبب للإبلاغ.');
            return;
        }
        if (selectedReason === 'OTHER' && !details.trim()) {
            setError('الرجاء تقديم تفاصيل إضافية للسبب "آخر".');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const { error: insertError } = await supabase.from('reports').insert({
                reporter_id: user.id,
                entity_id: entityId,
                entity_type: entityType,
                reported_user_id: reportedUserId,
                reason: selectedReason,
                details: details.trim() || null,
            });

            if (insertError) throw insertError;

            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000); // Close modal after 2 seconds

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;
    
    const entityTypeText = {
        post: 'المنشور',
        user: 'المستخدم',
        product: 'المنتج',
        comment: 'التعليق'
    };

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" 
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
                    <h2 id="report-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">الإبلاغ عن {entityTypeText[entityType]}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400" aria-label="Close modal">
                        <CloseIcon />
                    </button>
                </div>

                {success ? (
                    <div className="p-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4">شكراً لك</h3>
                        <p className="text-gray-600 dark:text-slate-300 mt-2">تم استلام بلاغك. سيقوم فريقنا بمراجعته في أقرب وقت ممكن.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <p className="text-sm text-gray-600 dark:text-slate-300">لماذا تقوم بالإبلاغ عن هذا المحتوى؟</p>
                            <div className="space-y-2">
                                {reasons.map(reason => (
                                    <label key={reason.key} className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${selectedReason === reason.key ? 'bg-cyan-50 dark:bg-cyan-900/50 border-cyan-500' : 'border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                                        <input
                                            type="radio"
                                            name="reason"
                                            value={reason.key}
                                            checked={selectedReason === reason.key}
                                            onChange={() => setSelectedReason(reason.key)}
                                            className="h-4 w-4 text-cyan-500 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 focus:ring-cyan-600"
                                        />
                                        <span className="mr-3 text-gray-900 dark:text-white">{reason.label}</span>
                                    </label>
                                ))}
                            </div>
                            
                            {(selectedReason === 'OTHER' || selectedReason === 'SCAM' || selectedReason === 'HARASSMENT') && (
                                <div>
                                    <label htmlFor="details" className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-2">
                                        تفاصيل إضافية (اختياري)
                                    </label>
                                    <Textarea
                                        id="details"
                                        rows={3}
                                        value={details}
                                        onChange={e => setDetails(e.target.value)}
                                        placeholder="قدم المزيد من المعلومات لمساعدتنا على فهم المشكلة."
                                    />
                                </div>
                            )}

                            {error && <p className="text-red-400 text-sm">{error}</p>}
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-slate-700 mt-auto bg-white dark:bg-slate-800">
                             <Button type="submit" loading={loading} disabled={!selectedReason}>إرسال البلاغ</Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
    
    return ReactDOM.createPortal(modalContent, modalRoot);
};

export default ReportModal;

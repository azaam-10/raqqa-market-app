import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../services/supabase';
import { Post } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';
import { getErrorMessage } from '../utils/errors';

const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );

interface PromotePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Post;
}

const PromotePostModal: React.FC<PromotePostModalProps> = ({ isOpen, onClose, post }) => {
    const [numUsers, setNumUsers] = useState('100');
    const [sendToAll, setSendToAll] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const modalRoot = document.getElementById('modal-root');

    useEffect(() => {
        if (isOpen) {
            setLoading(false);
            setError(null);
            setSuccess(false);
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
        
        setLoading(true);
        setError(null);
        setSuccess(false);
        
        try {
            const target_user_count = sendToAll ? 0 : parseInt(numUsers, 10);
            if (isNaN(target_user_count) || target_user_count < 0) {
                throw new Error("الرجاء إدخال عدد مستخدمين صالح.");
            }

            // NOTE: This assumes an RPC function `promote_post` exists in your Supabase project.
            // You need to create this function in your Supabase SQL editor.
            const { error: rpcError } = await supabase.rpc('promote_post', {
                post_id_to_promote: post.id,
                target_user_count: target_user_count,
            });
            
            if (rpcError) throw rpcError;

            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2500);

        } catch (err) {
            const friendlyError = getErrorMessage(err);
            if (friendlyError.toLowerCase().includes("function public.promote_post does not exist")) {
                 setError("ميزة الترويج غير مفعلة في قاعدة البيانات. يرجى إنشاء دالة RPC باسم 'promote_post'.");
            } else {
                 setError(friendlyError);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !modalRoot) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" 
            role="dialog"
            aria-modal="true"
            aria-labelledby="promote-modal-title"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
                    <h2 id="promote-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">ترويج المنشور</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400" aria-label="Close modal">
                        <CloseIcon />
                    </button>
                </div>

                {success ? (
                    <div className="p-6 text-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4">تم بنجاح</h3>
                        <p className="text-gray-600 dark:text-slate-300 mt-2">جاري إرسال إشعارات الترويج في الخلفية.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="bg-gray-100 dark:bg-slate-900/50 p-3 rounded-md border border-gray-200 dark:border-slate-700">
                                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">المنشور المستهدف:</p>
                                <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 truncate">"{post.content}"</p>
                            </div>
                            
                            <div>
                                <label htmlFor="num-users" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">عدد المستخدمين</label>
                                <Input
                                    id="num-users"
                                    type="number"
                                    value={numUsers}
                                    onChange={(e) => setNumUsers(e.target.value)}
                                    disabled={loading || sendToAll}
                                    min="1"
                                />
                            </div>

                             <label className="flex items-center gap-3 p-3 rounded-md border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700/50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sendToAll}
                                    onChange={(e) => setSendToAll(e.target.checked)}
                                    disabled={loading}
                                    className="h-5 w-5 rounded text-cyan-500 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 focus:ring-cyan-600"
                                />
                                <span className="text-gray-900 dark:text-white font-semibold">إرسال لجميع المستخدمين</span>
                            </label>

                            {error && <p className="text-red-400 text-sm">{error}</p>}
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-slate-700 mt-auto bg-white dark:bg-slate-800">
                             <Button type="submit" loading={loading}>
                                {loading ? 'جاري الإرسال...' : 'بدء الترويج'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
    
    return ReactDOM.createPortal(modalContent, modalRoot);
};

export default PromotePostModal;

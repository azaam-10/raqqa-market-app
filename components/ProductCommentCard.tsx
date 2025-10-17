import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ProductComment } from '../types';
import Avatar from './ui/Avatar';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import Textarea from './ui/Textarea';
import Button from './ui/Button';
import { getErrorMessage, timeAgo } from '../utils/errors';

const MoreIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg> );

interface ProductCommentCardProps {
  comment: ProductComment;
  onCommentUpdated: (updatedComment: ProductComment) => void;
  onCommentDeleted: (commentId: string) => void;
}

const ProductCommentCard: React.FC<ProductCommentCardProps> = ({ comment, onCommentUpdated, onCommentDeleted }) => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const deleteTimeoutRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const isOwner = user?.id === comment.user_id;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

     useEffect(() => {
        if (!isMenuOpen) {
            setConfirmingDelete(false);
            if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        }
    }, [isMenuOpen]);

    const handleDelete = async () => {
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        if (!confirmingDelete) {
            setConfirmingDelete(true);
            deleteTimeoutRef.current = window.setTimeout(() => setConfirmingDelete(false), 3000);
            return;
        }

        setIsMenuOpen(false);
        try {
            const { count, error } = await supabase.from('product_comments').delete({ count: 'exact' }).eq('id', comment.id);
            if (error) throw error;
            if (count === 0 || count === null) throw new Error('فشل حذف التعليق. قد لا تملك الصلاحية.');
            onCommentDeleted(comment.id);
        } catch(err) {
            alert(`فشل حذف التعليق: ${getErrorMessage(err)}`);
        } finally {
            setConfirmingDelete(false);
        }
    };

    const handleUpdate = async () => {
        if (!editedContent.trim()) return;
        setUpdateLoading(true);
        const { data: updatedComment, error } = await supabase
            .from('product_comments')
            .update({ content: editedContent.trim() })
            .eq('id', comment.id)
            .select('id, content')
            .single();
        setUpdateLoading(false);
        if (error) alert(`فشل تحديث التعليق: ${getErrorMessage(error)}`);
        else {
            const fullUpdatedComment = { ...comment, ...updatedComment };
            onCommentUpdated(fullUpdatedComment as any);
            setIsEditing(false);
        }
    };
    
    useEffect(() => { setEditedContent(comment.content); }, [comment.content]);

    const authorName = comment.profiles?.full_name || 'مستخدم غير معروف';
    const authorAvatarUrl = comment.profiles?.avatar_url;

    return (
        <div className="flex items-start gap-3">
            <Link to={`/user/${comment.user_id}`} className="flex-shrink-0">
               <Avatar url={authorAvatarUrl} size={32} userId={comment.user_id} showStatus={true} />
            </Link>
            <div className="flex-1 bg-gray-100 dark:bg-zinc-800/50 rounded-lg px-4 py-2">
                <div className="flex items-center justify-between">
                    <Link to={`/user/${comment.user_id}`} className="font-bold text-gray-900 dark:text-zinc-100 text-sm hover:underline">{authorName}</Link>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{timeAgo(comment.created_at)}</p>
                        {isOwner && !isEditing && (
                            <div className="relative" ref={menuRef}>
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 -mr-1 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full"> <MoreIcon /> </button>
                                {isMenuOpen && (
                                    <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-md shadow-lg z-10">
                                        <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); setConfirmingDelete(false); }} className="block w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-600">تعديل</button>
                                        <button onClick={handleDelete} className={`block w-full text-right px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors ${confirmingDelete ? 'bg-red-600 text-white' : ''}`}>
                                            {confirmingDelete ? 'تأكيد الحذف؟' : 'حذف'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {isEditing ? (
                    <div className="mt-2">
                        <Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} rows={3} autoFocus className="!py-2 !text-sm" />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button onClick={() => setIsEditing(false)} variant="secondary" className="!w-auto px-3 !py-1 !text-xs">إلغاء</Button>
                            <Button onClick={handleUpdate} loading={updateLoading} className="!w-auto px-3 !py-1 !text-xs">حفظ</Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-800 dark:text-zinc-300 mt-1 whitespace-pre-wrap">{comment.content}</p>
                )}
            </div>
        </div>
    );
};

export default ProductCommentCard;
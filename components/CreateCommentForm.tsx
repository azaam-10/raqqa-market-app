

import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Textarea from './ui/Textarea';
import Button from './ui/Button';
import Avatar from './ui/Avatar';
import { Comment } from '../types';
import { getErrorMessage } from '../utils/errors';

interface CreateCommentFormProps {
  postId: string;
  postOwnerId: string;
  onCommentCreated: (newComment: Comment) => void;
}

const CreateCommentForm: React.FC<CreateCommentFormProps> = ({ postId, postOwnerId, onCommentCreated }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setLoading(true);
    setError(null);

    const { data: insertedComment, error } = await supabase
      .from('comments')
      .insert([{ content: content.trim(), user_id: user.id, post_id: postId }])
      .select('id, content, created_at, user_id, post_id')
      .single();


    if (error) {
      setLoading(false);
      setError(`فشل إضافة التعليق: ${getErrorMessage(error)}`);
      console.error('Error creating comment:', error);
    } else {
      setContent('');
      
      const newFullComment = {
        ...insertedComment,
        profiles: {
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
        }
      };
      onCommentCreated(newFullComment as any);

      // Send notification if not commenting on own post
      if (user.id !== postOwnerId) {
        await supabase.from('notifications').insert({
            user_id: postOwnerId, // Recipient
            actor_id: user.id,     // Sender
            type: 'comment_post',
            entity_id: postId,
        });
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
           <Avatar url={profile?.avatar_url} size={32} userId={profile?.id} showStatus={true} />
        </div>
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <Textarea
              rows={2}
              placeholder="أضف تعليقاً..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              required
            />
            {error && <p className="text-red-400 text-sm mt-2 text-right">{error}</p>}
            <div className="flex justify-end mt-2">
              <div className="w-full sm:w-auto">
                 <Button type="submit" loading={loading} disabled={!content.trim()} className="!py-2 !text-sm">
                   تعليق
                 </Button>
              </div>
            </div>
          </form>
        </div>
    </div>
  );
};

export default CreateCommentForm;

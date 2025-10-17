
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Textarea from './ui/Textarea';
import Button from './ui/Button';
import Avatar from './ui/Avatar';
import { ProductComment } from '../types';
import { getErrorMessage } from '../utils/errors';

interface CreateProductCommentFormProps {
  productId: string;
  productOwnerId: string;
  onCommentCreated: (newComment: ProductComment) => void;
}

const CreateProductCommentForm: React.FC<CreateProductCommentFormProps> = ({ productId, productOwnerId, onCommentCreated }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setLoading(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('product_comments')
      .insert({ content: content.trim(), user_id: user.id, product_id: productId })
      .select('id, content, created_at, user_id, product_id')
      .single();

    setLoading(false);
    if (insertError) {
      setError(`فشل إضافة التعليق: ${getErrorMessage(insertError)}`);
    } else if (data) {
      setContent('');
      
      const newCommentWithProfile: ProductComment = {
          ...data,
          profiles: {
              full_name: profile?.full_name || null,
              avatar_url: profile?.avatar_url || null,
          }
      };
      
      onCommentCreated(newCommentWithProfile);

      if (user.id !== productOwnerId) {
        await supabase.from('notifications').insert({ user_id: productOwnerId, actor_id: user.id, type: 'comment_product', entity_id: productId });
      }
    }
  };

  return (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
           <Avatar url={profile?.avatar_url} size={32} userId={profile?.id} showStatus={true} />
        </div>
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <Textarea rows={2} placeholder="أضف تعليقاً على المنتج..." value={content} onChange={(e) => setContent(e.target.value)} disabled={loading} required />
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

export default CreateProductCommentForm;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Profile } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import Avatar from './ui/Avatar';
import Button from './ui/Button';

interface SuggestionCardProps {
    profile: Profile;
    mutuals: number;
    onFollow: (userId: string) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ profile, mutuals, onFollow }) => {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleFollow = async () => {
        if (!currentUser) return;
        setLoading(true);
        const { error } = await supabase.from('followers').insert({
            follower_id: currentUser.id,
            following_id: profile.id,
        });
        
        if (!error) {
            onFollow(profile.id);
            // Send notification
            await supabase.from('notifications').insert({
                user_id: profile.id,
                actor_id: currentUser.id,
                type: 'new_follower',
                entity_id: currentUser.id
            });
        } else {
            console.error("Error following user:", error);
            alert("فشل متابعة المستخدم.");
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center gap-3 p-3">
            <Link to={`/user/${profile.id}`}>
                <Avatar url={profile.avatar_url} size={48} userId={profile.id} showStatus={true} />
            </Link>
            <div className="flex-1 overflow-hidden">
                <Link to={`/user/${profile.id}`} className="font-bold text-zinc-900 dark:text-white hover:underline truncate block">{profile.full_name}</Link>
                {mutuals > 0 && <p className="text-xs text-zinc-500 dark:text-zinc-400">يتابعه {mutuals} من أصدقائك</p>}
            </div>
            <Button
                onClick={handleFollow}
                loading={loading}
                className="!w-auto !py-2 !px-5 !text-sm flex-shrink-0"
            >
                متابعة
            </Button>
        </div>
    );
};

export default SuggestionCard;
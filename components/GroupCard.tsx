import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Group } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Button from './ui/Button';

const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;

interface GroupCardProps {
  group: Group;
  isMember: boolean;
  onGroupJoined: (groupId: string) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, isMember, onGroupJoined }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const memberCount = group.group_members[0]?.count || 0;

  useEffect(() => {
    if (group.cover_image_url) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(group.cover_image_url);
      setCoverImageUrl(data.publicUrl);
    } else {
      setCoverImageUrl(null);
    }
  }, [group.cover_image_url]);

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate('/login');
    
    setJoinLoading(true);
    const { error } = await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id });
    if (error) {
        alert('فشل الانضمام إلى المجموعة.');
        console.error(error);
    } else {
        onGroupJoined(group.id);
    }
    setJoinLoading(false);
  };

  const canJoin = !isMember && !group.is_private;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 flex items-center gap-4">
        <Link to={`/group/${group.id}`} className="flex-shrink-0">
            <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                {coverImageUrl ? (
                    <img src={coverImageUrl} alt={group.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-gray-400 dark:text-zinc-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                )}
            </div>
        </Link>
        <div className="flex-1 min-w-0">
             <Link to={`/group/${group.id}`} className="hover:underline">
                <h2 className="font-bold text-gray-900 dark:text-zinc-100 truncate">{group.name}</h2>
             </Link>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mt-1">
                {group.is_private ? <LockIcon /> : <GlobeIcon />}
                <span>{group.is_private ? 'خاصة' : 'عامة'}</span>
                <span>•</span>
                <span>{memberCount} {memberCount === 1 ? 'عضو' : 'أعضاء'}</span>
            </div>
        </div>
        <div className="flex-shrink-0">
             {isMember ? (
                <Link to={`/group/${group.id}`}>
                    <Button variant="secondary" className="!w-auto px-4 !py-2 !text-sm">عرض</Button>
                </Link>
             ) : (
                 canJoin ? (
                    <Button onClick={handleJoin} loading={joinLoading} className="!w-auto px-4 !py-2 !text-sm">انضمام</Button>
                 ) : (
                    <Link to={`/group/${group.id}`}>
                        <Button variant="secondary" className="!w-auto px-4 !py-2 !text-sm">عرض</Button>
                    </Link>
                 )
             )}
        </div>
    </div>
  );
};

export default GroupCard;

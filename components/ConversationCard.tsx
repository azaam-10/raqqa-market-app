import React from 'react';
import { Link } from 'react-router-dom';
import { Conversation } from '../types';
import Avatar from './ui/Avatar';
import { useAuth } from '../hooks/useAuth';
import { timeAgo } from '../utils/errors';

const ConversationCard: React.FC<{ conversation: Conversation }> = ({ conversation }) => {
    const { user } = useAuth();
    const { profile, last_message, unread_count } = conversation;

    const isYou = last_message.sender_id === user?.id;
    const messagePrefix = isYou ? 'أنت: ' : '';
    const isUnread = unread_count > 0;
    
    const getLastMessageContent = () => {
        if (last_message.content) {
            return last_message.content;
        }
        if (last_message.image_url) {
            return '📷 صورة';
        }
        if (last_message.audio_url) {
            return '🎤 رسالة صوتية';
        }
        return '...';
    };

    return (
        <Link 
            to={`/chat/${profile.id}`} 
            className={`flex items-center gap-4 p-3 transition-colors rounded-lg ${isUnread ? 'bg-cyan-50 dark:bg-zinc-800/50' : 'bg-white dark:bg-zinc-900'} hover:bg-gray-100 dark:hover:bg-zinc-800`}
        >
            <Avatar url={profile.avatar_url} size={56} userId={profile.id} showStatus={true} />
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <p className="font-bold truncate text-zinc-900 dark:text-zinc-100">{profile.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 flex-shrink-0">{timeAgo(last_message.created_at)}</p>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <p className={`text-sm truncate ${isUnread ? 'font-semibold text-zinc-800 dark:text-zinc-200' : 'text-gray-500 dark:text-zinc-400'}`}>
                        {messagePrefix}
                        {getLastMessageContent()}
                    </p>
                    {isUnread && (
                        <span className="ml-2 flex-shrink-0 bg-teal-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {unread_count > 9 ? '9+' : unread_count}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default ConversationCard;
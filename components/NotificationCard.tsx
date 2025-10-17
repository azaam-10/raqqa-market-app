import React from 'react';
import { Link } from 'react-router-dom';
import { Notification, NotificationType } from '../types';
import Avatar from './ui/Avatar';

// --- Icon Components --- //
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="currentColor" className="text-red-500"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
const CommentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="currentColor" className="text-blue-500"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="currentColor" className="text-cyan-400"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>;
const UserPlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="currentColor" className="text-green-500"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;
const StoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="currentColor" className="text-purple-500"><path d="M12 2L4 6v2h16V6zm-8 14v-8h16v8H4zm6-1h4v-5h-4v5z"/></svg>;
const MegaphoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-indigo-500"><path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>;


const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    switch (type) {
        case 'like_post':
        case 'like_product':
        case 'like_rental_post':
            return <HeartIcon />;
        case 'comment_post':
        case 'comment_product':
        case 'comment_rental_post':
            return <CommentIcon />;
        case 'new_message':
            return <MessageIcon />;
        case 'new_follower':
            return <UserPlusIcon />;
        case 'new_store_follower':
        case 'new_store_rating':
            return <StoreIcon />;
        case 'admin_notification':
            return <MegaphoneIcon />;
        default:
            return null;
    }
};

const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} د`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} ي`;
};

const getNotificationLink = (notification: Notification): string => {
    switch (notification.type) {
        case 'like_post':
        case 'comment_post':
        case 'admin_notification': // Admin promotions link to the post
            return `/post/${notification.entity_id}`;
        case 'like_product':
        case 'comment_product':
            return `/product/${notification.entity_id}`;
        case 'new_message':
            return `/chat/${notification.actor_id}`; // new_message uses actor_id as the other user
        case 'new_store_follower':
        case 'new_store_rating':
            return `/store/${notification.entity_id}`;
        case 'new_follower':
            return `/user/${notification.actor_id}`;
        case 'like_rental_post':
        case 'comment_rental_post':
            return `/rental/${notification.entity_id}`;
        default:
            return '#';
    }
};

const getNotificationText = (notification: Notification): React.ReactNode => {
    const actorName = <span className="font-bold">{notification.actors?.full_name || 'أحدهم'}</span>;
    switch (notification.type) {
        case 'like_post':
            return <>{actorName} أعجب بمنشورك.</>;
        case 'comment_post':
            return <>{actorName} علق على منشورك.</>;
        case 'like_product':
            return <>{actorName} أعجب بمنتجك.</>;
        case 'comment_product':
            return <>{actorName} علق على منتجك.</>;
        case 'new_message':
            return <>{actorName} أرسل لك رسالة جديدة.</>;
        case 'new_store_follower':
            return <>{actorName} بدأ بمتابعة متجرك.</>;
        case 'new_store_rating':
            return <>{actorName} قام بتقييم متجرك.</>;
        case 'new_follower':
            return <>{actorName} بدأ بمتابعتك.</>;
        case 'like_rental_post':
            return <>{actorName} أعجب بعرض الإيجار الخاص بك.</>;
        case 'comment_rental_post':
            return <>{actorName} علق على عرض الإيجار الخاص بك.</>;
        case 'admin_notification':
            return <>📢 <span className="font-bold">منشور مقترح من الإدارة.</span> شاهد هذا المنشور الذي نوصي به!</>;
        default:
            return 'إشعار جديد.';
    }
};

const NotificationCard: React.FC<{ notification: Notification }> = ({ notification }) => {
    
    const text = getNotificationText(notification);
    const link = getNotificationLink(notification);
    // For admin notifications, we use a generic icon instead of the admin's avatar
    const useGenericAvatar = notification.type === 'admin_notification';


    return (
        <Link 
            to={link}
            className={`flex items-start gap-4 p-4 transition-colors ${notification.read ? 'hover:bg-gray-100 dark:hover:bg-zinc-800' : 'bg-cyan-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
        >
            <div className="relative flex-shrink-0">
                 {useGenericAvatar ? (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-700 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-gray-500 dark:text-zinc-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                ) : (
                    <Avatar url={notification.actors?.avatar_url} size={48} />
                )}
                 <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-zinc-800 border-2 border-transparent dark:border-zinc-900">
                    <NotificationIcon type={notification.type} />
                </span>
            </div>
            <div className="flex-1">
                <p className="text-gray-800 dark:text-zinc-300">{text}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{timeAgo(notification.created_at)}</p>
            </div>
            {!notification.read && (
                 <div className="flex-shrink-0 mt-1 h-2.5 w-2.5 rounded-full bg-cyan-500" />
            )}
        </Link>
    );
};

export default NotificationCard;
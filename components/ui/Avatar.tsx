import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-1/2 w-1/2 text-gray-500 dark:text-zinc-500"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

interface AvatarProps {
  url: string | null | undefined;
  size?: number;
  className?: string;
  userId?: string;
  showStatus?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ url, size = 40, className = '', userId, showStatus = false }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { isOnline } = useAuth();
  
  const online = showStatus && userId ? isOnline(userId) : false;

  useEffect(() => {
    if (url) {
      if (url.startsWith('http')) {
        setAvatarUrl(url);
      } else {
        const { data } = supabase.storage.from('uploads').getPublicUrl(url);
        setAvatarUrl(data.publicUrl);
      }
    } else {
      setAvatarUrl(null);
    }
  }, [url]);

  const style = {
    height: `${size}px`,
    width: `${size}px`,
  };
  
  const indicatorSize = Math.max(8, size * 0.25);
  const indicatorStyle = {
    width: `${indicatorSize}px`,
    height: `${indicatorSize}px`,
    borderWidth: `${Math.max(1, size * 0.05)}px`,
  };

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={style}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="rounded-full object-cover w-full h-full"
          onError={() => setAvatarUrl(null)}
        />
      ) : (
        <div
          className="bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-full flex items-center justify-center overflow-hidden w-full h-full"
        >
          <UserIcon />
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full bg-green-500 border-white dark:border-zinc-900"
          style={indicatorStyle}
          title="متصل الآن"
        />
      )}
    </div>
  );
};

export default Avatar;

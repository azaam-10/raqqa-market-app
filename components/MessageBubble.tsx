import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Message } from '../types';
import { supabase } from '../services/supabase';

const PlayIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><path d="M8 5v14l11-7z"></path></svg> );
const PauseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg> );
const DoubleCheckIcon = ({ color }: { color: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 7 17l-5-5"></path>
        <path d="m22 6-11 11-4-4"></path>
    </svg>
);


const AudioPlayer: React.FC<{ src: string; isSender: boolean }> = ({ src, isSender }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlayPause = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const setAudioData = () => { setDuration(audio.duration); setCurrentTime(audio.currentTime); };
            const setAudioTime = () => setCurrentTime(audio.currentTime);
            const handleEnded = () => { setIsPlaying(false); setCurrentTime(0); };

            audio.addEventListener('loadeddata', setAudioData);
            audio.addEventListener('timeupdate', setAudioTime);
            audio.addEventListener('ended', handleEnded);

            return () => {
                audio.removeEventListener('loadeddata', setAudioData);
                audio.removeEventListener('timeupdate', setAudioTime);
                audio.removeEventListener('ended', handleEnded);
            }
        }
    }, []);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    const colors = isSender
      ? { text: 'text-zinc-800/80', bg: 'bg-black/10', progress: 'bg-zinc-800' }
      : { text: 'text-zinc-500 dark:text-zinc-400', bg: 'bg-zinc-300 dark:bg-zinc-700', progress: 'bg-zinc-600 dark:bg-zinc-400' };


    return (
        <div className="flex items-center gap-3 w-full max-w-[280px]">
            <audio ref={audioRef} src={src} preload="metadata"></audio>
            <button onClick={togglePlayPause} className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${colors.bg} ${isSender ? 'text-zinc-900' : 'text-zinc-800 dark:text-white'}`}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="flex-grow flex items-center gap-2">
                <div className={`w-full ${colors.bg} h-1.5 rounded-full`}>
                    <div style={{ width: `${progress}%` }} className={`h-full ${colors.progress} rounded-full`}></div>
                </div>
                <span className={`text-xs ${colors.text} font-mono w-10 text-right`}>{formatTime(duration)}</span>
            </div>
        </div>
    );
};

interface MessageBubbleProps {
  message: Message;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onOpenMenu: (message: Message, target: HTMLElement) => void;
  showReadReceipt: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isFirstInGroup, isLastInGroup, onOpenMenu, showReadReceipt }) => {
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const longPressTimer = useRef<number | undefined>();

  useEffect(() => {
    if (message.image_url) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(message.image_url);
      setImageUrl(data.publicUrl);
    }
     if (message.audio_url) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(message.audio_url);
      setAudioUrl(data.publicUrl);
    }
  }, [message.image_url, message.audio_url]);


  const isSender = message.sender_id === user?.id;
  
  const bubbleClasses = isSender 
    ? `bg-gradient-to-br from-teal-400 to-lime-400 text-zinc-900 ${isLastInGroup ? 'rounded-br-none' : 'rounded-br-2xl'}` 
    : `bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white ${isLastInGroup ? 'rounded-bl-none' : 'rounded-bl-2xl'}`;
  
  const containerClasses = isSender ? 'justify-end' : 'justify-start';
  const paddingClasses = !message.content && imageUrl ? 'p-1.5' : 'px-4 pt-3 pb-1';
  const marginClass = isFirstInGroup ? 'mt-2' : 'mt-0.5';
  
  const messageTime = new Date(message.created_at).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' });

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      longPressTimer.current = window.setTimeout(() => {
          onOpenMenu(message, e.currentTarget);
      }, 500); // 500ms for a long press
  };

  const handleTouchEnd = () => {
      clearTimeout(longPressTimer.current);
  };
  
  const handleTouchMove = () => {
      clearTimeout(longPressTimer.current);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      onOpenMenu(message, e.currentTarget);
  };


  return (
    <div className={`flex ${containerClasses} ${marginClass}`}>
      <div 
        className={`max-w-md lg:max-w-xl rounded-2xl cursor-pointer ${bubbleClasses} ${paddingClasses}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={handleContextMenu}
      >
        {imageUrl && (
            <img 
                src={imageUrl} 
                alt="محتوى مرسل"
                className={`rounded-lg max-w-xs max-h-80 object-cover ${message.content || audioUrl ? 'mb-2' : ''}`}
                onClick={() => window.open(imageUrl, '_blank')}
            />
        )}
        {audioUrl && <AudioPlayer src={audioUrl} isSender={isSender} />}
        {message.content && (
            <p className="whitespace-pre-wrap">{message.content}</p>
        )}
        <div className="flex justify-end items-center gap-2 mt-1">
            <span className={`text-xs ${isSender ? 'text-black/50' : 'text-gray-500/80 dark:text-zinc-400/80'}`}>{messageTime}</span>
            {isSender && (
                <DoubleCheckIcon color={message.read && showReadReceipt ? '#2dd4bf' : '#94a3b8'} />
            )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
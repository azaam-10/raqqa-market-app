import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { supabase } from '../services/supabase';
import Avatar from './ui/Avatar';
import { useAuth } from '../hooks/useAuth';
import { playLikeSound, triggerHapticFeedback, timeAgo } from '../utils/errors';

// Icons
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
const CommentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24" fill="rgba(255,255,255,0.8)"><path d="M8 5v14l11-7z" /></svg>;

const VideoPlayer: React.FC<{ post: Post }> = ({ post }) => {
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes.length);
    const commentCount = post.comments[0]?.count || 0;

    // State and refs for double tap to like
    const tapTimeout = useRef<number | null>(null);
    const [showHeartAnimation, setShowHeartAnimation] = useState(false);
    const animationTimeoutRef = useRef<number>();
    
    useEffect(() => {
        if (post.video_url) {
            const { data } = supabase.storage.from('uploads').getPublicUrl(post.video_url);
            setVideoUrl(data.publicUrl);
        }
    }, [post.video_url]);
    
    useEffect(() => {
        setIsLiked(user ? post.likes.some(l => l.user_id === user.id) : false);
        setLikeCount(post.likes.length);
    }, [post.likes, user]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
                } else {
                    videoRef.current?.pause();
                    setIsPlaying(false);
                }
            },
            { threshold: 0.5 } // 50% of the video must be visible to play
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                observer.unobserve(containerRef.current);
            }
        };
    }, []);

    const togglePlay = () => {
        if (videoRef.current?.paused) {
            videoRef.current?.play();
            setIsPlaying(true);
        } else {
            videoRef.current?.pause();
            setIsPlaying(false);
        }
    };
    
    const handleLikeToggle = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!user) return alert('يجب تسجيل الدخول للإعجاب.');
        playLikeSound();
        triggerHapticFeedback();
        const currentlyLiked = isLiked;
        setIsLiked(!currentlyLiked);
        setLikeCount(p => currentlyLiked ? p - 1 : p + 1);
        if (currentlyLiked) {
            await supabase.from('likes').delete().match({ post_id: post.id, user_id: user.id });
        } else {
            await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
        }
    };

    const handleDoubleTapAction = () => {
        handleLikeToggle();
        
        setShowHeartAnimation(true);
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
        }
        animationTimeoutRef.current = window.setTimeout(() => {
            setShowHeartAnimation(false);
        }, 800); // Animation duration
    };

    const handleTap = () => {
        if (tapTimeout.current === null) {
            // First tap, set a timeout
            tapTimeout.current = window.setTimeout(() => {
                // Timeout expired, so it was a single tap
                togglePlay();
                tapTimeout.current = null;
            }, 300); // 300ms window for a double tap
        } else {
            // Second tap occurred before timeout, it's a double tap
            clearTimeout(tapTimeout.current);
            tapTimeout.current = null;
            handleDoubleTapAction();
        }
    };

    return (
        <div ref={containerRef} className="h-screen w-full relative snap-start snap-always flex items-center justify-center">
            {videoUrl && (
                <video
                    ref={videoRef}
                    src={videoUrl}
                    loop
                    playsInline
                    onClick={handleTap}
                    className="w-full h-full object-contain cursor-pointer"
                />
            )}
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Animated Heart */}
                <div className={`transition-all duration-700 ease-out ${showHeartAnimation ? 'scale-100 opacity-80' : 'scale-0 opacity-0'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24" fill="currentColor" className="text-white drop-shadow-lg">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </div>

                {!isPlaying && (
                     <PlayIcon />
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex justify-between items-end">
                <div className="text-white">
                    <Link to={`/user/${post.user_id}`} className="flex items-center gap-2 mb-2">
                        <Avatar url={post.profiles?.avatar_url} size={40} />
                        <div>
                            <p className="font-bold">{post.profiles?.full_name}</p>
                            <p className="text-xs text-slate-300">{timeAgo(post.created_at)}</p>
                        </div>
                    </Link>
                    <p className="text-sm">{post.content}</p>
                </div>
                
                <div className="flex flex-col gap-4 text-white items-center">
                    <button onClick={(e) => handleLikeToggle(e)} className="flex flex-col items-center">
                        <div className={`p-3 rounded-full ${isLiked ? 'text-red-500 bg-white/20' : 'bg-black/40'}`}>
                            <HeartIcon />
                        </div>
                        <span className="text-xs font-semibold">{likeCount}</span>
                    </button>
                    <Link to={`/post/${post.id}`} className="flex flex-col items-center">
                         <div className="p-3 rounded-full bg-black/40"><CommentIcon /></div>
                         <span className="text-xs font-semibold">{commentCount}</span>
                    </Link>
                     <button className="flex flex-col items-center">
                         <div className="p-3 rounded-full bg-black/40"><ShareIcon /></div>
                         <span className="text-xs font-semibold">مشاركة</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
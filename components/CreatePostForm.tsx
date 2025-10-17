import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Textarea from './ui/Textarea';
import Button from './ui/Button';
import { Post, Profile } from '../types';
import Avatar from './ui/Avatar';
import { getErrorMessage } from '../utils/errors';
import { GoogleGenAI } from '@google/genai';
import Input from './ui/Input';


const PhotoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-green-400">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
);

const VideoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-400">
        <path d="m22 8-6 4 6 4V8Z" />
        <rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
    </svg>
);

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-red-400">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
        <circle cx="12" cy="13" r="3"></circle>
    </svg>
);

const AiIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-purple-400">
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
        <path d="M14 9a2 2 0 0 1-2-2V3" />
        <path d="M10 21v-4a2 2 0 0 1 2-2h4" />
        <path d="m21 7-8 8" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

interface CreatePostFormProps {
  groupId?: string;
  onPostCreated?: (newPost: Post) => void;
  profile: Profile | null;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ groupId, onPostCreated, profile }) => {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { user } = useAuth();
  
  const [showCamera, setShowCamera] = useState(false);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);


  // AI State
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup object URL on unmount to prevent memory leaks
    return () => {
        if (videoPreview) {
            URL.revokeObjectURL(videoPreview);
        }
    };
  }, [videoPreview]);
  
  useEffect(() => {
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("لم يتمكن من الوصول إلى الكاميرا. يرجى التحقق من الصلاحيات.");
            setShowCamera(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    if (showCamera) {
        startCamera();
    } else {
        stopCamera();
    }

    return () => {
        stopCamera();
    };
  }, [showCamera]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear video state
      setVideoFile(null);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setIsFocused(true);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear image state
      setImageFile(null);
      setImagePreview(null);
      if (imageFileInputRef.current) imageFileInputRef.current.value = "";
      
      setVideoFile(file);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(URL.createObjectURL(file));
      setIsFocused(true);
    }
  };

  const removeMedia = () => {
    setImageFile(null);
    setImagePreview(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
    if (videoFileInputRef.current) videoFileInputRef.current.value = "";
  };
  
    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                
                canvas.toBlob(blob => {
                    if (blob) {
                        setVideoFile(null);
                        if (videoPreview) URL.revokeObjectURL(videoPreview);
                        setVideoPreview(null);
                        if (videoFileInputRef.current) videoFileInputRef.current.value = "";
                        
                        const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        setImageFile(capturedFile);
                        
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            setImagePreview(reader.result as string);
                        };
                        reader.readAsDataURL(blob);
                        
                        setShowCamera(false);
                        setIsFocused(true);
                    }
                }, 'image/jpeg', 0.9);
            }
        }
    };
  
  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiError(null);

    try {
      if (!process.env.API_KEY) {
        throw new Error("مفتاح API الخاص بـ Gemini غير متوفر.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: aiPrompt,
        config: {
            systemInstruction: "You are a helpful assistant for creating social media posts for a local marketplace app in Raqqa, Syria. Generate concise and engaging content based on the user's prompt. Respond in Arabic, using a friendly and local tone.",
        }
      });
      
      const text = response.text;

      if (text) {
        setContent(text);
        setShowAiPrompt(false);
        setAiPrompt('');
        setIsFocused(true); 
      } else {
        throw new Error("لم يتمكن الذكاء الاصطناعي من إنشاء محتوى.");
      }
    } catch (error: unknown) {
      setAiError(`فشل الإنشاء: ${getErrorMessage(error)}`);
      console.error("Error generating with AI:", error);
    } finally {
      setAiLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !imageFile && !videoFile) || !user) return;

    setLoading(true);
    setError(null);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/posts/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }
        imageUrl = fileName;
      } else if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${user.id}/posts/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(fileName, videoFile, { 
              contentType: videoFile.type,
              upsert: true,
          });

        if (uploadError) throw uploadError;
        videoUrl = fileName;
      }
      
      const postData = {
          content: content.trim(),
          user_id: user.id,
          image_url: imageUrl,
          video_url: videoUrl,
          group_id: groupId || null,
      };

      const { data: insertedPost, error: insertError } = await supabase
        .from('posts')
        .insert([postData])
        .select('id, content, image_url, video_url, created_at, user_id, group_id')
        .single();
      
      if (insertError) throw insertError;
      
      const { data: groupData, error: groupError } = groupId ? await supabase.from('groups').select('name').eq('id', groupId).single() : { data: null, error: null };
      if (groupError) console.warn('Could not fetch group name for new post', groupError.message);
      
      const newFullPost: Post = {
        ...insertedPost,
        profiles: {
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
        },
        groups: groupData || null,
        likes: [],
        comments: [{ count: 0 }]
      };

      setContent('');
      removeMedia();
      setIsFocused(false);
      setShowAiPrompt(false);
      setAiPrompt('');
      if (onPostCreated) {
        onPostCreated(newFullPost);
      }
    } catch (error: unknown) {
      setError(`فشل نشر المنشور: ${getErrorMessage(error)}`);
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'المستخدم';

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 mb-6">
        {showCamera && (
            <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-2" role="dialog" aria-modal="true" aria-labelledby="camera-title">
                <div id="camera-title" className="text-white text-lg mb-4">التقط صورة</div>
                <video ref={videoRef} autoPlay playsInline className="w-full max-w-2xl h-auto rounded-lg mb-4 border-2 border-slate-600"></video>
                <div className="flex items-center gap-6">
                    <button type="button" onClick={() => setShowCamera(false)} className="px-6 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors">
                        إلغاء
                    </button>
                    <button type="button" onClick={handleCapture} className="w-20 h-20 bg-white rounded-full flex items-center justify-center ring-4 ring-slate-500 hover:ring-cyan-400 transition-shadow shadow-lg" aria-label="التقاط صورة">
                        <div className="w-16 h-16 bg-white rounded-full border-4 border-slate-800"></div>
                    </button>
                </div>
                <canvas ref={canvasRef} className="hidden" aria-hidden="true"></canvas>
            </div>
        )}
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3">
          <Avatar url={profile?.avatar_url} size={40} userId={profile?.id} showStatus={true} />
          <Textarea
            rows={isFocused || content || imageFile || videoFile ? 3 : 1}
            placeholder={groupId ? 'اكتب شيئًا لهذه المجموعة...' : `بماذا تفكر يا ${firstName}؟`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            disabled={loading}
            className="!bg-gray-100 dark:!bg-zinc-800 !border-gray-200 dark:!border-zinc-700 rounded-xl py-2 px-4 transition-all duration-300 ease-in-out"
          />
        </div>

        {imagePreview && (
          <div className="mt-4 relative p-2 border border-gray-200 dark:border-zinc-800 rounded-xl">
            <img src={imagePreview} alt="معاينة" className="rounded-xl w-full max-h-80 object-contain" />
            <button
              type="button"
              onClick={removeMedia}
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors"
              aria-label="Remove image"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {videoPreview && (
          <div className="mt-4 relative p-2 border border-gray-200 dark:border-zinc-800 rounded-xl">
            <video src={videoPreview} controls className="rounded-xl w-full max-h-80 object-contain bg-black" />
            <button
              type="button"
              onClick={removeMedia}
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors"
              aria-label="Remove video"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-2 text-right">{error}</p>}
        
        {(isFocused || content || imageFile || videoFile) && (
            <div className="mt-4 space-y-3">
                {showAiPrompt && (
                    <div className="p-3 bg-gray-100 dark:bg-zinc-800/50 rounded-xl border border-gray-200 dark:border-zinc-700 space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">إنشاء محتوى بالذكاء الاصطناعي</label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                placeholder="مثال: أعلن عن هاتف مستعمل بحالة ممتازة"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                disabled={aiLoading}
                                className="!py-2 !text-sm"
                            />
                            <Button
                                type="button"
                                onClick={handleGenerateWithAi}
                                loading={aiLoading}
                                disabled={!aiPrompt.trim()}
                                className="!w-auto !py-2 !px-4 !text-sm"
                            >
                                إنشاء
                            </Button>
                        </div>
                        {aiError && <p className="text-red-400 text-xs text-right">{aiError}</p>}
                    </div>
                )}
              <hr className="border-gray-200 dark:border-zinc-800" />
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-1 text-gray-600 dark:text-zinc-300">
                    <button
                        type="button"
                        onClick={() => imageFileInputRef.current?.click()}
                        disabled={loading || !!videoFile}
                        className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="إضافة صورة"
                        aria-label="إضافة صورة"
                    >
                        <PhotoIcon />
                    </button>
                    <input
                        type="file"
                        ref={imageFileInputRef}
                        onChange={handleImageFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                    />
                     <button
                        type="button"
                        onClick={() => videoFileInputRef.current?.click()}
                        disabled={loading || !!imageFile}
                        className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="إضافة فيديو"
                        aria-label="إضافة فيديو"
                    >
                        <VideoIcon />
                    </button>
                    <input
                        type="file"
                        ref={videoFileInputRef}
                        onChange={handleVideoFileChange}
                        className="hidden"
                        accept="video/mp4,video/webm,video/quicktime"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            removeMedia();
                            setShowCamera(true);
                        }}
                        disabled={loading}
                        className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        title="التقاط صورة بالكاميرا"
                        aria-label="التقاط صورة بالكاميرا"
                    >
                        <CameraIcon />
                    </button>
                    <button
                        type="button"
                        onClick={() => { setShowAiPrompt(prev => !prev); setAiError(null); }}
                        disabled={loading}
                        className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        title="إنشاء محتوى بالذكاء الاصطناعي"
                        aria-label="إنشاء محتوى بالذكاء الاصطناعي"
                    >
                        <AiIcon />
                    </button>
                </div>

                <div className="w-full sm:w-auto">
                  <Button type="submit" loading={loading} disabled={aiLoading || !(content.trim() || imageFile || videoFile)} className="sm:!w-auto sm:px-10">
                    نشر
                  </Button>
                </div>
              </div>
            </div>
        )}
      </form>
    </div>
  );
};

export default CreatePostForm;

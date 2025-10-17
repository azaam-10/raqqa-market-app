import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Post } from '../types';
import { getErrorMessage } from '../utils/errors';
import Spinner from '../components/ui/Spinner';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>;

type Status = 'idle' | 'fetching' | 'generating' | 'engaging' | 'complete' | 'error';
interface LogEntry {
    time: string;
    message: string;
    type: 'info' | 'success' | 'error';
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const AdminEngagementAIScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [numPosts, setNumPosts] = useState('10');
    const [numComments, setNumComments] = useState('5');
    const [numLikes, setNumLikes] = useState('10');
    const [durationMinutes, setDurationMinutes] = useState('1');
    
    const [status, setStatus] = useState<Status>('idle');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    const addLog = (message: string, type: LogEntry['type'] = 'info') => {
        const time = new Date().toLocaleTimeString('ar-EG');
        setLogs(prev => [...prev, { time, message, type }]);
        setTimeout(() => {
            if (logsContainerRef.current) {
                logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
            }
        }, 100);
    };

    const handleStartEngagement = async () => {
        if (!user) return;

        setStatus('fetching');
        setLogs([]);
        addLog('بدء محاكاة التفاعل...');

        try {
            // 1. Fetch posts
            addLog(`جلب آخر ${numPosts} منشورات...`);
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('id, content, user_id')
                .order('created_at', { ascending: false })
                .limit(parseInt(numPosts, 10));

            if (postsError) throw postsError;
            if (!postsData || postsData.length === 0) {
                throw new Error('لم يتم العثور على منشورات.');
            }
            addLog(`تم العثور على ${postsData.length} منشور.`, 'success');

            // 2. Generate comments with Gemini
            setStatus('generating');
            const commentsToGenerate = Math.min(parseInt(numComments, 10), postsData.length);
            addLog(`توليد ${commentsToGenerate} تعليقات باستخدام Gemini...`);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const postsForPrompt = postsData.filter(p => p.user_id !== user.id).slice(0, commentsToGenerate);

            const prompt = `Here are some posts from a marketplace app. Generate one realistic, engaging comment in Arabic for each post.
            Posts: ${JSON.stringify(postsForPrompt.map(p => ({ id: p.id, content: p.content })), null, 2)}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                postId: { type: Type.STRING },
                                commentContent: { type: Type.STRING },
                            },
                            required: ['postId', 'commentContent'],
                        },
                    },
                    systemInstruction: "You are an AI simulating users on a social marketplace app. Your goal is to generate realistic, varied, and engaging comments in Arabic. Comments should be in different tones (positive, inquisitive, neutral) and lengths. Some can include emojis.",
                },
            });
            
            const generatedComments = JSON.parse(response.text) as { postId: string; commentContent: string }[];
            addLog(`تم توليد ${generatedComments.length} تعليقات بنجاح.`, 'success');

            // 3. Perform actions
            setStatus('engaging');
            const likesToGenerate = parseInt(numLikes, 10);
            const totalActions = generatedComments.length + likesToGenerate;
            const totalDurationMs = parseInt(durationMinutes, 10) * 60 * 1000;
            const delay = totalActions > 0 ? totalDurationMs / totalActions : 0;

            addLog(`نشر ${totalActions} تفاعل على مدار ${durationMinutes} دقيقة...`);

            // Post comments
            for (const comment of generatedComments) {
                await sleep(delay);
                await supabase.from('comments').insert({ post_id: comment.postId, user_id: user.id, content: comment.commentContent });
                addLog(`تمت إضافة تعليق على المنشور ${comment.postId.substring(0, 8)}...`);
            }
            
            // Add likes
            const postsToLike = postsData.filter(p => p.user_id !== user.id);
            for (let i = 0; i < likesToGenerate; i++) {
                await sleep(delay);
                const randomPost = postsToLike[Math.floor(Math.random() * postsToLike.length)];
                if (randomPost) {
                    await supabase.from('likes').insert({ post_id: randomPost.id, user_id: user.id }, { onConflict: 'post_id, user_id' });
                    addLog(`تمت إضافة إعجاب للمنشور ${randomPost.id.substring(0, 8)}...`);
                }
            }

            setStatus('complete');
            addLog('اكتملت المحاكاة بنجاح!', 'success');

        } catch (err) {
            setStatus('error');
            const errorMessage = getErrorMessage(err);
            addLog(`حدث خطأ: ${errorMessage}`, 'error');
        }
    };
    
    const isRunning = ['fetching', 'generating', 'engaging'].includes(status);

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate('/admin')} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full px-12">المجتمع التفاعلي الذكي</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-cyan-400">محاكاة التفاعل</h2>
                            <p className="text-slate-400 mt-2">استخدم الذكاء الاصطناعي لتوليد تعليقات وإعجابات لجعل المجتمع يبدو أكثر نشاطاً. سيتم تنفيذ جميع الإجراءات باستخدام حساب المسؤول الخاص بك.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <LabeledInput label="عدد المنشورات المستهدفة" value={numPosts} onChange={e => setNumPosts(e.target.value)} type="number" min="1" disabled={isRunning} />
                            <LabeledInput label="عدد التعليقات للتوليد" value={numComments} onChange={e => setNumComments(e.target.value)} type="number" min="0" disabled={isRunning} />
                            <LabeledInput label="عدد الإعجابات للإضافة" value={numLikes} onChange={e => setNumLikes(e.target.value)} type="number" min="0" disabled={isRunning} />
                            <LabeledInput label="نشر خلال (دقائق)" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} type="number" min="1" disabled={isRunning} />
                        </div>

                        <Button onClick={handleStartEngagement} loading={isRunning} disabled={isRunning}>
                            {isRunning ? 'جاري التشغيل...' : 'بدء التفاعل'}
                        </Button>
                        
                        <div className="mt-6">
                            <h3 className="font-semibold mb-2">سجل العمليات:</h3>
                            <div ref={logsContainerRef} className="bg-slate-900/50 border border-slate-700 rounded-md h-64 p-3 font-mono text-xs overflow-y-auto space-y-2">
                                {logs.map((log, i) => (
                                    <p key={i} className={
                                        log.type === 'error' ? 'text-red-400' : 
                                        log.type === 'success' ? 'text-green-400' : 'text-slate-400'
                                    }>
                                        <span className="text-slate-500 mr-2">[{log.time}]</span>{log.message}
                                    </p>
                                ))}
                                {isRunning && <div className="flex items-center gap-2 text-slate-500"><Spinner /><p>جاري العمل...</p></div>}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};


const LabeledInput: React.FC<React.ComponentProps<typeof Input> & {label: string}> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
        <Input {...props} />
    </div>
);


export default AdminEngagementAIScreen;
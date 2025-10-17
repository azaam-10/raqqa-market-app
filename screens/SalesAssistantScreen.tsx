import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Chat } from '@google/genai';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Textarea from '../components/ui/Textarea';
import ChatBubble from '../components/ChatBubble';
import { getErrorMessage } from '../utils/errors';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

interface Message {
  author: 'user' | 'model';
  content: string;
}

const SalesAssistantScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            if (!process.env.API_KEY) {
                throw new Error("مفتاح API الخاص بـ Gemini غير متوفر.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: "أنت 'مساعد البيع' الذكي في تطبيق 'سوق محافظة الرقة'. مهمتك هي مساعدة المستخدمين في كتابة إعلانات جذابة لمنتجاتهم، وتقديم نصائح حول التسويق والبيع. كن ودوداً وتكلم باللهجة السورية المحلية إن أمكن. يجب أن تكون جميع ردودك باللغة العربية.",
                },
            });
            setChat(chatSession);

            setMessages([
                { author: 'model', content: 'أهلاً بك! أنا مساعد البيع الخاص بك. كيف يمكنني مساعدتك اليوم في بيع منتجاتك؟ يمكنك أن تسألني عن كيفية كتابة وصف لمنتج، أو كيفية تحديد سعر مناسب.' }
            ]);

        } catch (err) {
            setError(getErrorMessage(err));
        }
    }, [user, navigate]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = userInput.trim();
        if (!trimmedInput || !chat || loading) return;

        setLoading(true);
        setUserInput('');
        setMessages(prev => [...prev, { author: 'user', content: trimmedInput }]);

        try {
            const response = await chat.sendMessage({ message: trimmedInput });
            const aiResponse = response.text;
            
            if (!aiResponse) {
                throw new Error("لم أتلق رداً. حاول مرة أخرى.");
            }
            
            setMessages(prev => [...prev, { author: 'model', content: aiResponse }]);

        } catch (err) {
            const errorMessage = getErrorMessage(err);
            setMessages(prev => [...prev, { author: 'model', content: `عذراً، حدث خطأ: ${errorMessage}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950">
            <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200 dark:border-zinc-800">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full px-12">مساعد البيع</h1>
                    </div>
                </div>
            </header>

            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <ChatBubble key={index} author={msg.author} content={msg.content} />
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="flex items-end gap-2">
                             <ChatBubble author="model" content="" />
                             <div className="flex items-center gap-2 bg-gray-200 dark:bg-zinc-800 rounded-2xl rounded-bl-none px-4 py-3 h-12">
                                <Spinner />
                            </div>
                        </div>
                    </div>
                )}
                 {error && <p className="text-red-400 text-sm text-center p-4 bg-red-500/10 rounded-lg">{error}</p>}
            </main>

            <footer className="p-2 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Textarea 
                        value={userInput} 
                        onChange={e => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e as any);
                            }
                        }}
                        placeholder="اسأل أي شيء عن البيع..."
                        className="flex-1 !py-2" 
                        rows={1} 
                        disabled={loading}
                    />
                    <button 
                        type="submit" 
                        className="p-3 bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50" 
                        disabled={loading || !userInput.trim()}
                        aria-label="إرسال"
                    >
                        {loading ? <Spinner /> : <SendIcon />}
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default SalesAssistantScreen;
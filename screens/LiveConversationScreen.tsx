
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveConversation } from '../hooks/useLiveConversation';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ConversationBubble from '../components/ConversationBubble';
import MicWaveform from '../components/ui/MicWaveform';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);
const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
);
const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8"><rect width="12" height="12" x="6" y="6" /></svg>
);

const LiveConversationScreen: React.FC = () => {
    const { isListening, isLoading, error, transcriptionHistory, startConversation, stopConversation } = useLiveConversation();
    const navigate = useNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to the bottom of the transcription history
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcriptionHistory]);

    const handleBack = () => {
        stopConversation();
        navigate(-1);
    }

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <button onClick={handleBack} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold">المساعد الصوتي</h1>
                        <div className="w-10"></div> {/* Spacer */}
                    </div>
                </div>
            </header>

            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {transcriptionHistory.length === 0 && !isListening && !isLoading && (
                     <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                        <MicIcon />
                        <p className="mt-2">اضغط على زر الميكروفون لبدء المحادثة</p>
                    </div>
                )}
                {transcriptionHistory.map((item, index) => (
                    <ConversationBubble key={index} text={item.text} author={item.author} />
                ))}
                 {isLoading && (
                    <div className="flex justify-center items-center py-4">
                        <Spinner />
                    </div>
                )}
            </main>

            <footer className="p-4 border-t border-slate-700 bg-slate-900">
                <div className="flex flex-col items-center justify-center">
                    {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
                    
                    {isListening && <MicWaveform />}

                    <button
                        onClick={isListening ? stopConversation : startConversation}
                        disabled={isLoading}
                        className={`flex items-center justify-center h-20 w-20 rounded-full text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                            isListening ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500'
                        } disabled:opacity-50`}
                    >
                        {isLoading ? <Spinner /> : (isListening ? <StopIcon /> : <MicIcon />)}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default LiveConversationScreen;

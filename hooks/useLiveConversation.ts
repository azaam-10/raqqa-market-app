
import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from "@google/genai";

// Audio processing helper functions
// IMPORTANT: These must be implemented manually as per the Gemini API guidelines.
const encode = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};


interface Transcription {
    text: string;
    author: 'user' | 'model';
    isFinal: boolean;
}

export const useLiveConversation = () => {
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptionHistory, setTranscriptionHistory] = useState<Transcription[]>([]);

    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioContextRef = useRef<{ input: AudioContext, output: AudioContext } | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const audioPlaybackRefs = useRef<{ nextStartTime: number, sources: Set<AudioBufferSourceNode> }>({
        nextStartTime: 0,
        sources: new Set(),
    });

    useEffect(() => {
        // Safely check for API key to prevent crashes when process.env is not defined.
        const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : null;

        if (apiKey) {
            aiRef.current = new GoogleGenAI({ apiKey: apiKey });
        } else {
            console.error("Gemini API key not found or process.env is not defined.");
            setError("ميزة المساعد الصوتي معطلة لعدم توفر مفتاح الواجهة البرمجية (API Key).");
        }
        
        return () => {
            // Cleanup on unmount
            stopConversation();
        };
    }, []);

    const processMessage = useCallback(async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
            const { text, isFinal } = message.serverContent.outputTranscription;
            setTranscriptionHistory(prev => {
                const last = prev[prev.length - 1];
                if (last?.author === 'model' && !last.isFinal) {
                    const updated = [...prev.slice(0, -1), { ...last, text: last.text + text, isFinal }];
                    return updated;
                }
                return [...prev, { text, author: 'model', isFinal }];
            });
        }
        
        if (message.serverContent?.inputTranscription) {
            const { text, isFinal } = message.serverContent.inputTranscription;
             setTranscriptionHistory(prev => {
                const last = prev[prev.length - 1];
                if (last?.author === 'user' && !last.isFinal) {
                    const updated = [...prev.slice(0, -1), { ...last, text, isFinal }];
                     return updated;
                }
                return [...prev, { text, author: 'user', isFinal }];
            });
        }

        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
        if (base64Audio && audioContextRef.current) {
            const outputAudioContext = audioContextRef.current.output;
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);

            const { nextStartTime, sources } = audioPlaybackRefs.current;
            const currentTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            source.start(currentTime);
            audioPlaybackRefs.current.nextStartTime = currentTime + audioBuffer.duration;
            sources.add(source);
            source.onended = () => sources.delete(source);
        }

        if (message.serverContent?.interrupted) {
            for (const source of audioPlaybackRefs.current.sources.values()) {
                source.stop();
            }
            audioPlaybackRefs.current.sources.clear();
            audioPlaybackRefs.current.nextStartTime = 0;
        }

    }, []);

    const startConversation = async () => {
        if (!aiRef.current) {
            setError("الذكاء الاصطناعي غير مهيأ. تأكد من توفر مفتاح الواجهة البرمجية.");
            return;
        }
        if (isListening) return;

        setIsListening(true);
        setIsLoading(true);
        setError(null);
        setTranscriptionHistory([]);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = { input: inputAudioContext, output: outputAudioContext };

            sessionPromiseRef.current = aiRef.current.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsLoading(false);
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        
                        scriptProcessor.onaudioprocess = (event) => {
                            const inputData = event.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            
                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                            }
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: processMessage,
                    onerror: (e) => {
                        console.error("Live session error:", e);
                        setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
                        stopConversation();
                    },
                    onclose: () => {
                        stopConversation();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: 'You are a friendly and helpful customer support agent. Please keep your answers concise and to the point.'
                },
            });

        } catch (err) {
            console.error("Error starting conversation:", err);
            setError("لم يتمكن من الوصول إلى الميكروفون. الرجاء التحقق من الصلاحيات.");
            setIsListening(false);
            setIsLoading(false);
        }
    };

    const stopConversation = useCallback(async () => {
        if (!isListening) return;

        setIsListening(false);
        setIsLoading(false);

        if (sessionPromiseRef.current) {
            const session = await sessionPromiseRef.current;
            session.close();
            sessionPromiseRef.current = null;
        }
        
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        
        if (audioContextRef.current) {
            await audioContextRef.current.input.close();
            await audioContextRef.current.output.close();
            audioContextRef.current = null;
        }
        
        audioPlaybackRefs.current.sources.forEach(source => source.stop());
        audioPlaybackRefs.current.sources.clear();
        audioPlaybackRefs.current.nextStartTime = 0;
    }, [isListening]);

    return {
        isListening,
        isLoading,
        error,
        transcriptionHistory,
        startConversation,
        stopConversation,
    };
};

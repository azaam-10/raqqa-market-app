import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, CallSignal } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';

// Icons
const MicOnIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
const MicOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="8"></line><line x1="12" y1="16" x2="12" y2="22"></line><line x1="2" y1="2" x2="22" y2="22"></line><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>;
const VideoOnIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
const VideoOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v-3.27a2.23 2.23 0 0 0-1.07-1.93l-8-5.34A2 2 0 0 0 3 7.27V17a2 2 0 0 0 3.07 1.73l.93-.62M1 1l22 22"></path></svg>;
const EndCallIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M13.26 3.03a19.79 19.79 0 0 0-8.63 3.07 19.5 19.5 0 0 0-6 6 19.79 19.79 0 0 0 3.07 8.67A2 2 0 0 0 4.11 22h3a2 2 0 0 0 2-1.72 12.84 12.84 0 0 1-.7-2.81 2 2 0 0 0 .45-2.11L8.09 14.1a16 16 0 0 1 6-6l1.27-1.27a2 2 0 0 0 .45-2.11 12.84 12.84 0 0 1-.7-2.81A2 2 0 0 0 13.26 3.03z"/></svg>;


type CallStatus = 'idle' | 'calling' | 'connected' | 'ended';

const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

const CallScreen: React.FC = () => {
    const { userId: otherUserId, callType } = useParams<{ userId: string; callType: 'video' | 'audio' }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [status, setStatus] = useState<CallStatus>('idle');
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const channelRef = useRef<any>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    
    useEffect(() => {
        if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }
    }, [localStreamRef.current, status]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
    }, [remoteStreamRef.current, status]);


    const cleanup = () => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
    };

    const hangUp = () => {
        if (channelRef.current && user && otherUserId) {
             channelRef.current.send({
                type: 'broadcast',
                event: 'signal',
                payload: { type: 'hang-up', senderId: user.id, receiverId: otherUserId },
            });
        }
        cleanup();
        setStatus('ended');
        setTimeout(() => navigate(`/chat/${otherUserId}`), 1500);
    };

    useEffect(() => {
        if (!user || !otherUserId) return;

        let isCaller = true;

        const init = async () => {
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
            if (profileData) setOtherUser(profileData);

            const channelName = `call-${[user.id, otherUserId].sort().join('-')}`;
            const channel = supabase.channel(channelName, { config: { broadcast: { self: false } } });
            channelRef.current = channel;

            channel.on('broadcast', { event: 'signal' }, async ({ payload }: { payload: CallSignal }) => {
                if (payload.receiverId !== user.id) return;
                
                if (payload.type === 'offer') {
                    isCaller = false;
                    const stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
                    localStreamRef.current = stream;

                    pcRef.current = new RTCPeerConnection(STUN_SERVERS);
                    stream.getTracks().forEach(track => pcRef.current?.addTrack(track, stream));

                    pcRef.current.onicecandidate = event => {
                        if (event.candidate) channel.send({ type: 'broadcast', event: 'signal', payload: { type: 'ice-candidate', payload: event.candidate, senderId: user.id, receiverId: otherUserId }});
                    };
                    pcRef.current.ontrack = event => { remoteStreamRef.current = event.streams[0]; setStatus('connected'); };

                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload));
                    const answer = await pcRef.current.createAnswer();
                    await pcRef.current.setLocalDescription(answer);

                    channel.send({ type: 'broadcast', event: 'signal', payload: { type: 'answer', payload: answer, senderId: user.id, receiverId: otherUserId }});

                } else if (payload.type === 'answer') {
                     if (pcRef.current && pcRef.current.signalingState !== 'stable') {
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload));
                     }
                } else if (payload.type === 'ice-candidate') {
                    if (pcRef.current) await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.payload));
                } else if (payload.type === 'hang-up') {
                    cleanup();
                    setStatus('ended');
                    setTimeout(() => navigate(`/chat/${otherUserId}`), 1500);
                }
            }).subscribe(async (status) => {
                 if (status === 'SUBSCRIBED' && isCaller) {
                    setStatus('calling');
                    const stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
                    localStreamRef.current = stream;

                    pcRef.current = new RTCPeerConnection(STUN_SERVERS);
                    stream.getTracks().forEach(track => pcRef.current?.addTrack(track, stream));

                    pcRef.current.onicecandidate = event => {
                        if (event.candidate) channel.send({ type: 'broadcast', event: 'signal', payload: { type: 'ice-candidate', payload: event.candidate, senderId: user.id, receiverId: otherUserId }});
                    };
                    pcRef.current.ontrack = event => { remoteStreamRef.current = event.streams[0]; setStatus('connected'); };

                    const offer = await pcRef.current.createOffer();
                    await pcRef.current.setLocalDescription(offer);
                    
                    channel.send({ type: 'broadcast', event: 'signal', payload: { type: 'offer', payload: offer, senderId: user.id, receiverId: otherUserId }});
                }
            });
        };

        init();
        return () => { hangUp(); };
    }, [user, otherUserId, callType, navigate]);


    const toggleMic = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMicMuted(prev => !prev);
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoEnabled(prev => !prev);
        }
    };

    const renderStatusText = () => {
        switch (status) {
            case 'calling': return `جاري الاتصال بـ ${otherUser?.full_name}...`;
            case 'connected': return `في مكالمة مع ${otherUser?.full_name}`;
            case 'ended': return 'تم إنهاء المكالمة';
            default: return 'جاري التحضير...';
        }
    };
    
    const showRemoteVideo = status === 'connected' && callType === 'video';
    const showLocalVideo = callType === 'video' && isVideoEnabled;

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white relative">
            
            <div className="absolute inset-0 flex items-center justify-center">
                 {showRemoteVideo && remoteStreamRef.current ? (
                     <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                 ) : (
                     <div className="flex flex-col items-center">
                         <Avatar url={otherUser?.avatar_url} size={128} />
                         <p className="mt-4 text-2xl font-bold">{otherUser?.full_name}</p>
                     </div>
                 )}
            </div>
            
            <div className="absolute inset-0 bg-black/50"></div>

             {showLocalVideo && localStreamRef.current && (
                <div className="absolute top-4 right-4 w-32 h-48 sm:w-40 sm:h-56 rounded-lg overflow-hidden border-2 border-slate-700 shadow-lg">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
            )}

            <div className="relative z-10 flex flex-col h-full p-6 justify-between items-center">
                <div className="text-center bg-black/30 px-4 py-2 rounded-lg">
                    <p className="text-lg text-slate-300">{renderStatusText()}</p>
                </div>

                <div className="flex justify-center items-center gap-4 bg-black/30 p-4 rounded-full">
                     <button onClick={toggleMic} className={`p-4 rounded-full transition-colors ${isMicMuted ? 'bg-red-600 text-white' : 'bg-white/20 text-white'}`}>
                        {isMicMuted ? <MicOffIcon /> : <MicOnIcon />}
                    </button>
                    {callType === 'video' && (
                        <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${!isVideoEnabled ? 'bg-red-600 text-white' : 'bg-white/20 text-white'}`}>
                           {isVideoEnabled ? <VideoOnIcon /> : <VideoOffIcon />}
                        </button>
                    )}
                     <button onClick={hangUp} className="p-4 rounded-full bg-red-600 text-white">
                        <EndCallIcon />
                    </button>
                </div>
            </div>

        </div>
    );
};

export default CallScreen;

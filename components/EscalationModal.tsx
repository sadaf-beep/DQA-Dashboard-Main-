
import React, { useState, useEffect, useRef } from 'react';
import { Escalation, User, UserRole } from '../types';
import { Button } from './Common';

interface EscalationModalProps {
    escalation: Escalation;
    currentUser: User;
    onClose: () => void;
    onReply: (message: string) => void;
    onResolveClose: () => void;
}

export const EscalationModal: React.FC<EscalationModalProps> = ({ escalation, currentUser, onClose, onReply, onResolveClose }) => {
    const [replyText, setReplyText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest message on history update
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [escalation.history]);

    const handleSubmit = () => {
        if (!replyText.trim()) return;
        onReply(replyText);
        setReplyText('');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-fadeIn" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Escalation Discussion</h3>
                        <p className="text-xs text-slate-500">Regarding: {escalation.taskTitle}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content Area - Chat History */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar scroll-smooth"
                >
                    {escalation.link && (
                         <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3 mb-4">
                             <div className="bg-blue-100 p-2 rounded text-blue-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                             </div>
                             <div>
                                 <h5 className="text-xs font-bold text-blue-800 uppercase">Context Link</h5>
                                 <a href={escalation.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline break-all">{escalation.link}</a>
                             </div>
                         </div>
                    )}

                    <div className="flex flex-col gap-4">
                        {escalation.history.map((msg) => {
                            const isMe = msg.authorId === currentUser.id;
                            const isManager = msg.role === UserRole.MANAGER;
                            
                            return (
                                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border ${isMe ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                                        {msg.authorName.charAt(0)}
                                    </div>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                                        <div className={`text-[9px] font-bold mb-1 opacity-80 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {msg.authorName} &bull; {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer - Actions */}
                <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
                    {escalation.status === 'CLOSED' ? (
                        <div className="text-center py-4">
                             <span className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-green-100 text-green-700 font-bold text-sm border border-green-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                This escalation thread is closed
                             </span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <textarea
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                                placeholder={currentUser.role === UserRole.MANAGER ? "Advise the agent or ask for more info..." : "Add your comment..."}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                            />
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-medium">SHIF + ENTER for new line</span>
                                <div className="flex gap-2">
                                    {currentUser.role === UserRole.AGENT && escalation.history.length > 1 && (
                                        <Button variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" onClick={onResolveClose}>
                                            Mark Resolved & Close
                                        </Button>
                                    )}
                                    <Button onClick={handleSubmit} disabled={!replyText.trim()}>
                                        Send Message
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

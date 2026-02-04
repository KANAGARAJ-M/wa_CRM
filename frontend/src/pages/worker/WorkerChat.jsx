import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Send, Paperclip, ArrowLeft, Loader2, Clock, Check, CheckCheck, Smile, Mic } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

export default function WorkerChat() {
    const location = useLocation();
    const navigate = useNavigate();
    const { lead } = location.state || {};

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!lead) {
            navigate('/worker/dashboard');
            return;
        }
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [lead]);

    useEffect(() => {
        scrollToBottom();
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.direction === 'incoming' && lastMsg.status !== 'read') {
                markAsRead();
            }
        }
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    const markAsRead = async () => {
        try {
            await api.post('/whatsapp/mark-read', {
                contactPhone: lead.phone,
                phoneNumberId: lead.phoneNumberId
            });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            const response = await api.get(`/worker/messages/${lead.phone}`);
            setMessages(response.data.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching messages:', error);
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        const optimisticMsg = {
            _id: 'temp-' + Date.now(),
            body: messageInput,
            isIncoming: false,
            timestamp: new Date(),
            status: 'pending',
            type: 'text'
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setMessageInput('');
        setSending(true);

        try {
            await api.post('/whatsapp/send', {
                message: optimisticMsg.body,
                phone: lead.phone,
                phoneNumberId: lead.phoneNumberId // Send via the correct account
            });
            // Fetch will update status
        } catch (error) {
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const formatMessageDate = (date) => {
        return format(new Date(date), 'h:mm a');
    };

    if (!lead) return null;

    return (
        <div className="h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-white p-3 flex items-center gap-3 border-b border-gray-200 shadow-sm z-10">
                <button
                    onClick={() => navigate('/worker/dashboard')}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                    {lead.name[0].toUpperCase()}
                </div>
                <div className="flex flex-col">
                    <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                    <span className="text-xs text-gray-500">{lead.phone}</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 whatsapp-chat-bg">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>Start a conversation with {lead.name}</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = !msg.isIncoming;
                        const showDate = idx === 0 || !isSameDay(new Date(msg.timestamp), new Date(messages[idx - 1].timestamp));

                        return (
                            <div key={msg._id || idx}>
                                {showDate && (
                                    <div className="flex justify-center my-4">
                                        <span className="bg-white/80 text-gray-500 text-xs px-3 py-1 rounded-lg shadow-sm">
                                            {format(new Date(msg.timestamp), 'MMMM d, yyyy')}
                                        </span>
                                    </div>
                                )}
                                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`relative max-w-[80%] md:max-w-[60%] px-4 py-2 rounded-lg shadow-sm text-sm ${isMe
                                        ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
                                        : 'bg-white text-gray-900 rounded-tl-none'
                                        }`}>
                                        <div className="mb-1 whitespace-pre-wrap">{msg.body}</div>
                                        <div className="flex items-center justify-end gap-1 select-none">
                                            <span className="text-[10px] text-gray-500">
                                                {formatMessageDate(msg.timestamp)}
                                            </span>
                                            {isMe && (
                                                <span className="ml-1">
                                                    {msg.status === 'pending' ? <Clock className="h-3 w-3 text-gray-400" /> :
                                                        msg.status === 'read' ? <CheckCheck className="h-3 w-3 text-[#53bdeb]" /> :
                                                            msg.status === 'delivered' ? <CheckCheck className="h-3 w-3 text-gray-400" /> :
                                                                <Check className="h-3 w-3 text-gray-400" />}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-gray-50 p-3 border-t border-gray-200 z-10">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                    <button type="button" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                        <Smile className="h-6 w-6" />
                    </button>
                    <button type="button" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                        <Paperclip className="h-6 w-6" />
                    </button>

                    <input
                        type="text"
                        placeholder="Type a message"
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                    />

                    {messageInput.trim() ? (
                        <button
                            type="submit"
                            disabled={sending}
                            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm disabled:opacity-70"
                        >
                            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </button>
                    ) : (
                        <button type="button" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                            <Mic className="h-6 w-6" />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}

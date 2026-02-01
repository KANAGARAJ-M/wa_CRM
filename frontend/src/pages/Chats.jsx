import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import {
    Search, Send, Paperclip, MoreVertical,
    Check, CheckCheck, Mic, Smile, ArrowLeft, Loader2,
    RefreshCw, MessageSquare, Clock, ChevronDown
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Chats() {
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const [whatsappConfigs, setWhatsappConfigs] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('all');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        fetchData();
        fetchSettings();
        const interval = setInterval(fetchData, 3000); // 3 seconds for near real-time updates
        return () => clearInterval(interval);
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            setWhatsappConfigs(response.data.data?.whatsappConfigs || []);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    // Handle navigation from Leads page
    useEffect(() => {
        if (location.state?.lead && conversations.length > 0) {
            const lead = location.state.lead;
            const existingChat = conversations.find(c => c.contactPhone === lead.phone);

            if (existingChat) {
                setSelectedChat(existingChat);
                setShowSidebar(false);
            } else {
                // Create a temporary "ghost" chat for this lead
                const ghostChat = {
                    id: lead.phone,
                    contactName: lead.name,
                    contactPhone: lead.phone,
                    messages: [],
                    unreadCount: 0,
                    lastMessage: { body: 'Start a conversation...', timestamp: new Date() },
                    integrationId: lead.phoneNumberId
                };
                setSelectedChat(ghostChat);
                setShowSidebar(false);
            }

            // Clear state to avoid re-selection on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state, conversations]);

    useEffect(() => {
        if (selectedChat?.unreadCount > 0) {
            markAsRead(selectedChat);
        }
    }, [selectedChat, conversations]);

    const markAsRead = async (chat) => {
        try {
            await api.post('/whatsapp/mark-read', {
                contactPhone: chat.contactPhone,
                phoneNumberId: chat.integrationId
            });
            // Optimistically update conversation unread count used for badge
            // But we won't mutate messages status locally to avoid complex sync, 
            // relying on backend poll to verify 'read' status eventually.
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedChat, conversations]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    const fetchData = async () => {
        try {
            const response = await api.get('/whatsapp/messages');
            const data = response.data.data || [];
            processConversations(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching messages:', error);
            setLoading(false);
        }
    };

    const processConversations = (messages) => {
        const groups = {};

        messages.forEach(msg => {
            const isIncoming = msg.direction === 'incoming' || msg.status === 'received';
            const contactPhone = isIncoming ? msg.from : msg.to;

            if (!contactPhone) return;

            if (!groups[contactPhone]) {
                groups[contactPhone] = {
                    id: contactPhone,
                    contactName: isIncoming ? (msg.fromName || msg.from) : (msg.lead?.name || msg.to),
                    contactPhone: contactPhone,
                    messages: [],
                    unreadCount: 0,
                    lastMessage: null,
                    integrationId: msg.phoneNumberId
                };
            }

            if (!groups[contactPhone].contactName || groups[contactPhone].contactName === contactPhone) {
                const name = isIncoming ? msg.fromName : msg.lead?.name;
                if (name) groups[contactPhone].contactName = name;
            }

            groups[contactPhone].messages.push({
                ...msg,
                isIncoming,
                timestamp: new Date(msg.timestamp || msg.createdAt)
            });

            if (isIncoming && msg.status !== 'read' && msg.status !== 'replied') {
                groups[contactPhone].unreadCount++;
            }
        });

        const conversationList = Object.values(groups).map(group => {
            group.messages.sort((a, b) => a.timestamp - b.timestamp);
            group.lastMessage = group.messages[group.messages.length - 1];
            return group;
        });

        conversationList.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
        setConversations(conversationList);

        if (selectedChat) {
            const updatedChat = conversationList.find(c => c.id === selectedChat.id);
            if (updatedChat) setSelectedChat(updatedChat);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChat) return;

        const optimisticMsg = {
            _id: 'temp-' + Date.now(),
            body: messageInput,
            isIncoming: false,
            timestamp: new Date(),
            status: 'pending',
            type: 'text'
        };

        const updatedChat = {
            ...selectedChat,
            messages: [...selectedChat.messages, optimisticMsg],
            lastMessage: optimisticMsg
        };

        setSelectedChat(updatedChat);
        setConversations(prev => prev.map(c => c.id === selectedChat.id ? updatedChat : c));

        setMessageInput('');
        setSending(true);

        try {
            const payload = {
                message: optimisticMsg.body,
                phone: selectedChat.contactPhone,
                phoneNumberId: selectedChat.integrationId
            };

            await api.post('/whatsapp/send', payload);
            setTimeout(fetchData, 2000);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to connect to server';
            alert(`Failed to send message: ${errorMessage}`);
            fetchData();
        } finally {
            setSending(false);
        }
    };

    const formatDate = (date) => {
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'd/M/yy');
    };

    const formatMessageDate = (date) => {
        return format(date, 'h:mm a');
    };

    const filteredConversations = conversations.filter(chat => {
        const matchesSearch = chat.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.contactPhone.includes(searchQuery);

        const matchesAccount = selectedAccountId === 'all' || chat.integrationId === selectedAccountId;

        return matchesSearch && matchesAccount;
    });

    return (
        <div className="flex h-full bg-gray-100">
            <div className="flex h-full w-full bg-white shadow-xl overflow-hidden">
                {/* Conversations List */}
                <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[350px] bg-white border-r border-gray-200`}>
                    {/* Header */}
                    <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-teal-600">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Chats
                        </h2>
                    </div>

                    {/* Search & Account Filter */}
                    <div className="p-3 border-b border-gray-100 bg-white space-y-2">
                        {/* Account Selector */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MessageSquare className="h-4 w-4 text-gray-400" />
                            </div>
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 block hover:bg-white transition-all cursor-pointer appearance-none font-medium"
                            >
                                <option value="all">All Accounts</option>
                                {whatsappConfigs.filter(c => c.isEnabled).map(config => (
                                    <option key={config.phoneNumberId} value={config.phoneNumberId}>
                                        {config.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search chats..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
                            </div>
                            <button
                                onClick={fetchData}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Conversations */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No conversations found.</p>
                                <p className="text-xs mt-2">Messages will appear here when you start chatting with leads.</p>
                                <button
                                    onClick={() => navigate('/leads')}
                                    className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                                >
                                    View Leads
                                </button>
                            </div>
                        ) : (
                            <div>
                                {filteredConversations.map(chat => (
                                    <div
                                        key={chat.id}
                                        onClick={() => {
                                            setSelectedChat(chat);
                                            setShowSidebar(false);
                                        }}
                                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-green-50' : ''
                                            }`}
                                    >
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex-shrink-0 flex items-center justify-center text-lg font-bold text-white">
                                            {chat.contactName[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <h3 className="font-medium text-gray-900 truncate">{chat.contactName}</h3>
                                                <span className={`text-xs ${chat.unreadCount > 0 ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                                                    {formatDate(chat.lastMessage.timestamp)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <p className="text-sm text-gray-500 truncate max-w-[80%]">
                                                    {!chat.lastMessage.isIncoming && (
                                                        <CheckCheck className="inline h-3 w-3 mr-1 text-blue-500" />
                                                    )}
                                                    {chat.lastMessage.body}
                                                </p>
                                                {chat.unreadCount > 0 && (
                                                    <span className="bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                        {chat.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                {selectedChat ? (
                    <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-col flex-1 whatsapp-chat-bg relative`}>
                        {/* Chat Header */}
                        <div className="bg-white p-3 flex justify-between items-center border-b border-gray-200 z-10 shadow-sm">
                            <div className="flex items-center gap-3">
                                <button className="md:hidden text-gray-600" onClick={() => setShowSidebar(true)}>
                                    <ArrowLeft className="h-6 w-6" />
                                </button>
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                                    {selectedChat.contactName[0].toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-semibold text-gray-900">{selectedChat.contactName}</h3>
                                    <span className="text-xs text-gray-500">{selectedChat.contactPhone}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-gray-500">
                                <Search className="h-5 w-5 cursor-pointer hover:text-gray-700" />
                                <MoreVertical className="h-5 w-5 cursor-pointer hover:text-gray-700" />
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 z-10 space-y-2">
                            {selectedChat.messages.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <div className="h-20 w-20 mx-auto mb-4 bg-white/80 rounded-full flex items-center justify-center">
                                        <MessageSquare className="h-10 w-10 text-gray-300" />
                                    </div>
                                    <p>This is the beginning of your conversation with {selectedChat.contactName}.</p>
                                    <p className="text-sm mt-2">Send a message to get started!</p>
                                </div>
                            ) : (
                                selectedChat.messages.map((msg, idx) => {
                                    const isMe = !msg.isIncoming;
                                    const showDate = idx === 0 || !isSameDay(msg.timestamp, selectedChat.messages[idx - 1].timestamp);

                                    return (
                                        <div key={msg._id || idx}>
                                            {showDate && (
                                                <div className="flex justify-center my-4">
                                                    <span className="bg-white/80 text-gray-500 text-xs px-3 py-1 rounded-lg shadow-sm">
                                                        {format(msg.timestamp, 'MMMM d, yyyy')}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`relative max-w-[80%] md:max-w-[60%] px-4 py-2 rounded-lg shadow-sm text-sm ${isMe
                                                    ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
                                                    : 'bg-white text-gray-900 rounded-tl-none'
                                                    }`}>
                                                    {msg.type === 'template' && (
                                                        <div className="italic text-gray-600 mb-1">Template: {msg.templateName}</div>
                                                    )}
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
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
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
                ) : (
                    /* Empty State */
                    <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 border-b-8 border-green-500">
                        <div className="text-center">
                            <div className="bg-gradient-to-br from-green-100 to-teal-100 h-40 w-40 rounded-full flex items-center justify-center mx-auto mb-6">
                                <MessageSquare className="h-20 w-20 text-green-500" />
                            </div>
                            <h1 className="text-3xl font-light text-gray-700 mb-4">WhatsApp Chats</h1>
                            <p className="text-gray-500 text-sm max-w-md mx-auto leading-6">
                                Send and receive messages across your WhatsApp Business accounts.
                                <br />
                                Select a conversation to start chatting.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

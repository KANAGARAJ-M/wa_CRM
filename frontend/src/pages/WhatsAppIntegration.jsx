import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import {
    Search, Send, Paperclip, MoreVertical,
    Check, CheckCheck, Mic, Smile, ArrowLeft, Loader2,
    Image as ImageIcon, User, RefreshCw, MessageSquare, Users,
    Clock, Settings, LogOut, Plus
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function WhatsAppIntegration() {
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'leads'
    const [conversations, setConversations] = useState([]);
    const [leads, setLeads] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        fetchLeads();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

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

    const fetchLeads = async () => {
        setLoadingLeads(true);
        try {
            const response = await api.get('/leads/kanban');
            const data = response.data.data || [];
            const allLeads = data.reduce((acc, stage) => [...acc, ...stage.leads], []);
            setLeads(allLeads);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoadingLeads(false);
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

    const startChat = (lead) => {
        setActiveTab('chats');
        const existingChat = conversations.find(c =>
            c.contactPhone === lead.phone || c.contactPhone === lead.phone.replace('+', '')
        );

        if (existingChat) {
            setSelectedChat(existingChat);
        } else {
            const newChat = {
                id: lead.phone,
                contactName: lead.name,
                contactPhone: lead.phone,
                messages: [],
                unreadCount: 0,
                lastMessage: {
                    body: 'Start a new conversation',
                    timestamp: new Date(),
                    isIncoming: false
                },
                isNew: true
            };
            setSelectedChat(newChat);
            setSearchQuery('');
        }
        setShowSidebar(false);
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
                phone: selectedChat.contactPhone
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

    const filteredConversations = conversations.filter(chat =>
        chat.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.contactPhone.includes(searchQuery)
    );

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.includes(searchQuery) ||
        lead.email?.toLowerCase().includes(searchQuery)
    );

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Top Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-lg">WhatsApp CRM</h1>
                        <p className="text-green-100 text-xs">Multi-Account Integration</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={fetchData}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                                {user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="hidden md:block text-sm">{user?.name || 'User'}</span>
                        </button>

                        {showSettingsMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn">
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                    <Settings className="h-4 w-4" />
                                    Settings
                                </button>
                                <button
                                    onClick={() => navigate('/leads')}
                                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                    <Users className="h-4 w-4" />
                                    Manage Leads
                                </button>
                                <hr className="my-2" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex h-full w-full bg-white rounded-t-2xl shadow-xl overflow-hidden">
                    {/* Navigation Tabs */}
                    <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[400px] bg-white border-r border-gray-200`}>
                        <div className="flex items-center border-b border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setActiveTab('chats')}
                                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'chats'
                                        ? 'text-green-600 border-b-2 border-green-600 bg-white'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <MessageSquare className="h-4 w-4" />
                                Chats
                            </button>
                            <div className="w-px h-6 bg-gray-300"></div>
                            <button
                                onClick={() => setActiveTab('leads')}
                                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'leads'
                                        ? 'text-green-600 border-b-2 border-green-600 bg-white'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <Users className="h-4 w-4" />
                                Leads
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-3 border-b border-gray-100 bg-white">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={activeTab === 'chats' ? "Search chats..." : "Search leads..."}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
                            </div>
                        </div>

                        {/* Content List */}
                        <div className="flex-1 overflow-y-auto">
                            {activeTab === 'chats' ? (
                                // Chats List
                                loading ? (
                                    <div className="flex justify-center items-center h-40">
                                        <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                                    </div>
                                ) : filteredConversations.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>No conversations found.</p>
                                        <p className="text-xs mt-2">Start a new chat from the Leads tab!</p>
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
                                                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-gray-100' : ''
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
                                )
                            ) : (
                                // Leads List
                                loadingLeads ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                                    </div>
                                ) : filteredLeads.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">
                                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>No leads found.</p>
                                        <button
                                            onClick={() => navigate('/leads')}
                                            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs"
                                        >
                                            <Plus className="h-4 w-4 inline mr-1" />
                                            Add Lead
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        {filteredLeads.map(lead => (
                                            <div
                                                key={lead._id}
                                                className="flex items-center gap-3 p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                                    {lead.name[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-gray-900 truncate">{lead.name}</h3>
                                                    <p className="text-sm text-gray-500 truncate">{lead.phone}</p>
                                                </div>
                                                <button
                                                    onClick={() => startChat(lead)}
                                                    className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-full hover:bg-green-600 transition-colors flex items-center gap-1"
                                                >
                                                    <MessageSquare className="h-3 w-3" />
                                                    Chat
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )
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
                                <h1 className="text-3xl font-light text-gray-700 mb-4">WhatsApp CRM</h1>
                                <p className="text-gray-500 text-sm max-w-md mx-auto leading-6">
                                    Send and receive messages across multiple WhatsApp Business accounts.
                                    <br />
                                    Select a chat or start a new conversation from Leads.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import * as XLSX from 'xlsx';
import {
    Search, Send, Paperclip, MoreVertical,
    Check, CheckCheck, Mic, Smile, ArrowLeft, Loader2,
    User, RefreshCw, MessageSquare, Users,
    Clock, Plus, Phone, Mail, Edit2, Trash2,
    Upload, FileSpreadsheet, Download, Info, AlertCircle, X, ChevronDown, ChevronRight
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

export default function Communication() {
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'leads'
    const [conversations, setConversations] = useState([]);
    const [leads, setLeads] = useState([]);
    const [whatsappConfigs, setWhatsappConfigs] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const [showSidebar, setShowSidebar] = useState(true);

    // Leads Management State
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');
    const [importing, setImporting] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const fileInputRef = useRef(null);
    const [expandedAccounts, setExpandedAccounts] = useState({});
    const [selectedAccountFilter, setSelectedAccountFilter] = useState('all'); // 'all' or specific phoneNumberId

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        source: 'manual',
        notes: ''
    });



    useEffect(() => {
        // Load settings FIRST (needed before processing messages)
        fetchSettings();
        fetchLeads();
    }, []);

    // Fetch messages AFTER settings are loaded
    useEffect(() => {
        if (whatsappConfigs.length > 0) {
            fetchData();
            const interval = setInterval(fetchData, 15000);
            return () => clearInterval(interval);
        }
    }, [whatsappConfigs]);

    useEffect(() => {
        scrollToBottom();
    }, [selectedChat, conversations]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            const configs = response.data.data?.whatsappConfigs || [];
            setWhatsappConfigs(configs);
            // Initialize all accounts as expanded
            const expanded = {};
            configs.forEach((config, index) => {
                expanded[config.phoneNumberId || index] = true;
            });
            setExpandedAccounts(expanded);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
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
            const response = await api.get('/leads?limit=500');
            setLeads(response.data.data || []);
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

            // CRITICAL: Determine which Business Account this message belongs to.
            // If phoneNumberId is missing (legacy data), we might bundle it into 'unknown' or try to guess.
            // But for new multi-account support, this ID is the key splitter.
            const integrationId = msg.phoneNumberId || 'legacy_account';

            if (!contactPhone) return;

            // UNIQUE KEY: Compose of Contact Phone + Business Account ID
            const groupKey = `${contactPhone}_${integrationId}`;

            // DEBUG: Log the grouping logic
            // console.log(`Msg from ${contactPhone} on Account ${integrationId} -> Group: ${groupKey}`);

            if (!groups[groupKey]) {
                // Determine the account name for the label
                const accountName = whatsappConfigs.find(c => c.phoneNumberId === integrationId)?.name || 'Account';

                groups[groupKey] = {
                    id: groupKey,
                    // Name is the Customer Name
                    contactName: isIncoming ? (msg.fromName || msg.from) : (msg.lead?.name || msg.to),
                    contactPhone: contactPhone,
                    messages: [],
                    unreadCount: 0,
                    lastMessage: null,
                    integrationId: integrationId,
                    accountName: accountName // Store for display
                };
            }

            // Update contact name if better one found
            if (!groups[groupKey].contactName || groups[groupKey].contactName === contactPhone) {
                const name = isIncoming ? msg.fromName : msg.lead?.name;
                if (name) groups[groupKey].contactName = name;
            }

            groups[groupKey].messages.push({
                ...msg,
                isIncoming,
                timestamp: new Date(msg.timestamp || msg.createdAt)
            });

            if (isIncoming && msg.status !== 'read' && msg.status !== 'replied') {
                groups[groupKey].unreadCount++;
            }
        });

        const conversationList = Object.values(groups).map(group => {
            group.messages.sort((a, b) => a.timestamp - b.timestamp);
            group.lastMessage = group.messages[group.messages.length - 1];
            return group;
        });

        conversationList.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);

        // DEBUG: Log processed conversations
        console.log('Processed Conversations:', conversationList.map(c => ({
            id: c.id,
            name: c.contactName,
            phone: c.contactPhone,
            integrationId: c.integrationId,
            accountName: c.accountName,
            msgCount: c.messages.length
        })));

        setConversations(conversationList);

        if (selectedChat) {
            const updatedChat = conversationList.find(c => c.id === selectedChat.id);
            if (updatedChat) setSelectedChat(updatedChat);
        }
    };

    const startChat = (lead) => {
        setActiveTab('chats');

        // When starting a chat, we ideally need to know WHICH account to start it from.
        // For now, let's pick the first enabled account or the most recent one used for this lead if it exists.

        // 1. Try to find ANY existing chat for this lead
        const existingChats = conversations.filter(c =>
            c.contactPhone === lead.phone || c.contactPhone === lead.phone.replace('+', '')
        );

        if (existingChats.length > 0) {
            // If exists, open the most recent one
            setSelectedChat(existingChats[0]);
        } else {
            // 2. Create a NEW chat. Default to the first enabled WhatsApp config.
            const defaultConfig = whatsappConfigs.find(c => c.isEnabled) || whatsappConfigs[0];

            if (!defaultConfig) {
                alert("No WhatsApp Account Configured!");
                return;
            }

            const newChat = {
                id: `${lead.phone}_${defaultConfig.phoneNumberId}`, // Force the unique ID structure
                contactName: lead.name,
                contactPhone: lead.phone,
                messages: [],
                unreadCount: 0,
                lastMessage: {
                    body: 'Start a new conversation',
                    timestamp: new Date(),
                    isIncoming: false
                },
                integrationId: defaultConfig.phoneNumberId,
                accountName: defaultConfig.name,
                isNew: true
            };
            setSelectedChat(newChat);
            // Add to list temporarily so it renders
            setConversations(prev => [newChat, ...prev]);
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
                phone: selectedChat.contactPhone,
                phoneId: selectedChat.integrationId
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

    // Leads Management Functions
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            if (editingLead) {
                await api.put(`/leads/${editingLead._id}`, formData);
            } else {
                await api.post('/leads', formData);
            }

            fetchLeads();
            closeModal();
        } catch (error) {
            console.error('Error saving lead:', error);
            setError(error.response?.data?.message || 'Failed to save lead');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this lead?')) return;

        try {
            await api.delete(`/leads/${id}`);
            fetchLeads();
        } catch (error) {
            console.error('Error deleting lead:', error);
            alert('Failed to delete lead');
        }
    };

    const openEditModal = (lead) => {
        setEditingLead(lead);
        setFormData({
            name: lead.name,
            phone: lead.phone,
            email: lead.email || '',
            source: lead.source || 'manual',
            notes: lead.notes || ''
        });
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingLead(null);
        setFormData({
            name: '',
            phone: '',
            email: '',
            source: 'manual',
            notes: ''
        });
        setError('');
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setPreviewData([]);
        setImportError('');
        setImportSuccess('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportError('');
        setImportSuccess('');

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) {
                    setImportError('Excel file is empty or has no data rows');
                    return;
                }

                const headers = jsonData[0].map(h => String(h).toLowerCase().trim());

                // Helper to find column index based on keywords
                const getColumnIndex = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));

                const nameIndex = getColumnIndex(['name', 'first', 'full', 'client', 'customer', 'lead', 'prospect']);
                const phoneIndex = getColumnIndex(['phone', 'mobile', 'cell', 'tel', 'contact', 'whatsapp', 'call', 'num', 'no.']);
                const emailIndex = getColumnIndex(['email', 'e-mail', 'mail']);
                const notesIndex = getColumnIndex(['note', 'comment', 'remark', 'desc', 'message', 'info', 'detail']);

                if (nameIndex === -1 && phoneIndex === -1) {
                    setImportError('Excel must have at least "Name" or "Phone" column');
                    return;
                }

                const parsedLeads = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    const name = nameIndex !== -1 ? String(row[nameIndex] || '').trim() : '';
                    let phone = phoneIndex !== -1 ? String(row[phoneIndex] || '').trim() : '';
                    const email = emailIndex !== -1 ? String(row[emailIndex] || '').trim() : '';
                    const notes = notesIndex !== -1 ? String(row[notesIndex] || '').trim() : '';

                    phone = phone.replace(/[\s\-\(\)\.]/g, '');

                    if (!name && !phone) continue;

                    parsedLeads.push({
                        name: name || `Lead ${i}`,
                        phone: phone,
                        email: email,
                        notes: notes,
                        source: 'excel_upload',
                        stage: 'new',
                        status: 'new'
                    });
                }

                if (parsedLeads.length === 0) {
                    setImportError('No valid leads found in the Excel file');
                    return;
                }

                setPreviewData(parsedLeads);
            } catch (err) {
                console.error('Error parsing Excel:', err);
                setImportError('Failed to parse Excel file. Please check the format.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImportLeads = async () => {
        if (previewData.length === 0) return;

        setImporting(true);
        setImportError('');

        try {
            const response = await api.post('/leads/bulk', { leads: previewData });
            setImportSuccess(`Successfully imported ${response.data.count} leads!`);
            setPreviewData([]);
            fetchLeads();

            setTimeout(() => {
                closeImportModal();
            }, 2000);
        } catch (error) {
            console.error('Error importing leads:', error);
            setImportError(error.response?.data?.message || 'Failed to import leads');
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const templateData = [
            ['Name', 'Phone', 'Email', 'Notes'],
            ['John Doe', '919876543210', 'john@example.com', 'Interested in product'],
            ['Jane Smith', '918765432109', 'jane@example.com', 'Follow up next week']
        ];

        const ws = XLSX.utils.aoa_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Leads');
        XLSX.writeFile(wb, 'leads_template.xlsx');
    };

    const toggleAccountExpansion = (accountId) => {
        setExpandedAccounts(prev => ({
            ...prev,
            [accountId]: !prev[accountId]
        }));
    };

    // Group leads by WhatsApp account (using their source or a default)
    const getLeadsGroupedByAccount = () => {
        const enabledConfigs = whatsappConfigs.filter(c => c.isEnabled);

        if (enabledConfigs.length === 0) {
            // If no configs, show all leads under "All Leads"
            return [{
                accountId: 'all',
                accountName: 'All Leads',
                leads: leads
            }];
        }

        // Group leads - for now we'll show all leads under each account
        // In a real scenario, you'd have a field in lead model linking to the account
        return enabledConfigs.map(config => ({
            accountId: config.phoneNumberId || config.name,
            accountName: config.name || `Account ${config.phoneNumberId}`,
            leads: leads // All leads shown under each account for now
        }));
    };

    const formatDate = (date) => {
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'd/M/yy');
    };

    const formatMessageDate = (date) => {
        return format(date, 'h:mm a');
    };

    const formatLeadTime = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
        if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
        return format(d, 'MMM d, yyyy \'at\' h:mm a');
    };

    const filteredConversations = conversations.filter(chat => {
        // 1. Filter by Account
        if (selectedAccountFilter !== 'all' && chat.integrationId !== selectedAccountFilter) {
            return false;
        }
        // 2. Filter by Search Query
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            return chat.contactName.toLowerCase().includes(lowerQuery) ||
                chat.contactPhone.includes(searchQuery);
        }
        return true;
    });

    // DEBUG: Log filter results
    console.log('Filter:', selectedAccountFilter, '| Conversations:', conversations.length, '| Filtered:', filteredConversations.length);

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
        <div className="flex flex-col h-full bg-gray-100">
            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex h-full w-full bg-white shadow-xl overflow-hidden">
                    {/* Navigation Tabs */}
                    <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[350px] bg-white border-r border-gray-200`}>
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

                        {/* Account Filter (Only for Chats) */}
                        {activeTab === 'chats' && (
                            <div className="px-3 pt-3 pb-1 border-b border-gray-100 bg-gray-50">
                                <select
                                    value={selectedAccountFilter}
                                    onChange={(e) => setSelectedAccountFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="all">All Accounts</option>
                                    {whatsappConfigs.filter(c => c.isEnabled).map(config => (
                                        <option key={config.phoneNumberId} value={config.phoneNumberId}>
                                            {config.name || `Account ${config.phoneNumberId}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Search & Actions Bar */}
                        <div className="p-3 border-b border-gray-100 bg-white">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder={activeTab === 'chats' ? "Search chats..." : "Search leads..."}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
                                </div>
                                {activeTab === 'leads' && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setShowImportModal(true)}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Import Excel"
                                        >
                                            <Upload className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                            title="Add Lead"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}
                                {activeTab === 'chats' && (
                                    <button
                                        onClick={fetchData}
                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Refresh"
                                    >
                                        <RefreshCw className="h-5 w-5" />
                                    </button>
                                )}
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

                                                    {/* Account Tag - Always show */}
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                                            {chat.accountName || whatsappConfigs.find(c => c.phoneNumberId === chat.integrationId)?.name || chat.integrationId || 'Unknown'}
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
                                // Leads List - Grouped by WhatsApp Account
                                loadingLeads ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                                    </div>
                                ) : filteredLeads.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">
                                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>No leads found.</p>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs"
                                        >
                                            <Plus className="h-4 w-4 inline mr-1" />
                                            Add Lead
                                        </button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {getLeadsGroupedByAccount().map(group => (
                                            <div key={group.accountId}>
                                                {/* Account Header */}
                                                <button
                                                    onClick={() => toggleAccountExpansion(group.accountId)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-50 to-teal-50 hover:from-green-100 hover:to-teal-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                                                            <MessageSquare className="h-4 w-4 text-white" />
                                                        </div>
                                                        <div className="text-left">
                                                            <h3 className="font-semibold text-gray-800 text-sm">{group.accountName}</h3>
                                                            <p className="text-xs text-gray-500">{group.leads.length} leads</p>
                                                        </div>
                                                    </div>
                                                    {expandedAccounts[group.accountId] ? (
                                                        <ChevronDown className="h-5 w-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                                    )}
                                                </button>

                                                {/* Leads List under Account */}
                                                {expandedAccounts[group.accountId] && (
                                                    <div className="bg-white">
                                                        {group.leads
                                                            .filter(lead =>
                                                                lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                lead.phone?.includes(searchQuery) ||
                                                                lead.email?.toLowerCase().includes(searchQuery)
                                                            )
                                                            .map(lead => (
                                                                <div
                                                                    key={lead._id}
                                                                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors group"
                                                                >
                                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                                        {lead.name[0].toUpperCase()}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between">
                                                                            <h4 className="font-medium text-gray-900 truncate text-sm">{lead.name}</h4>
                                                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                                <Clock className="h-3 w-3" />
                                                                                {formatLeadTime(lead.createdAt)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                                                <Phone className="h-3 w-3" />
                                                                                {lead.phone}
                                                                            </span>
                                                                            {lead.email && (
                                                                                <span className="text-xs text-gray-400 truncate">
                                                                                    • {lead.email}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${lead.stage === 'new' ? 'bg-blue-100 text-blue-700' :
                                                                                lead.stage === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                                                                                    lead.stage === 'interested' ? 'bg-green-100 text-green-700' :
                                                                                        lead.stage === 'converted' ? 'bg-purple-100 text-purple-700' :
                                                                                            'bg-gray-100 text-gray-700'
                                                                                }`}>
                                                                                {lead.stage?.charAt(0).toUpperCase() + lead.stage?.slice(1) || 'New'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => startChat(lead)}
                                                                            className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                                                            title="Start Chat"
                                                                        >
                                                                            <MessageSquare className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => openEditModal(lead)}
                                                                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit2 className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDelete(lead._id)}
                                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
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
                                <h1 className="text-3xl font-light text-gray-700 mb-4">Communication Hub</h1>
                                <p className="text-gray-500 text-sm max-w-md mx-auto leading-6">
                                    Manage your leads and conversations in one place.
                                    <br />
                                    Select a chat or start a new conversation from Leads.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Lead Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-fadeIn">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-800">
                                {editingLead ? 'Edit Lead' : 'Add New Lead'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Contact name"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number *
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="91XXXXXXXXXX (with country code)"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Include country code without + sign</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="email@example.com"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Source
                                </label>
                                <select
                                    value={formData.source}
                                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="manual">Manual Entry</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="website">Website</option>
                                    <option value="referral">Referral</option>
                                    <option value="social_media">Social Media</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional notes about this lead..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                    {editingLead ? 'Update' : 'Add Lead'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Excel Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full animate-fadeIn max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="h-6 w-6 text-green-600" />
                                <h2 className="text-lg font-semibold text-gray-800">Import Leads from Excel</h2>
                            </div>
                            <button
                                onClick={closeImportModal}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* Instructions */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium mb-2">Excel Format Requirements:</p>
                                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                                            <li>First row should contain column headers</li>
                                            <li>Required columns: <strong>Name</strong> and/or <strong>Phone</strong></li>
                                            <li>Optional columns: <strong>Email</strong>, <strong>Notes</strong></li>
                                            <li>Phone numbers should include country code (e.g., 919876543210)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Download Template */}
                            <div className="mb-6">
                                <button
                                    onClick={downloadTemplate}
                                    className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium"
                                >
                                    <Download className="h-4 w-4" />
                                    Download Sample Template
                                </button>
                            </div>

                            {/* File Upload */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Excel File
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="excel-upload"
                                    />
                                    <label htmlFor="excel-upload" className="cursor-pointer">
                                        <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-600">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            .xlsx, .xls, or .csv files
                                        </p>
                                    </label>
                                </div>
                            </div>

                            {/* Error/Success Messages */}
                            {importError && (
                                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" />
                                    {importError}
                                </div>
                            )}
                            {importSuccess && (
                                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                                    <Check className="h-5 w-5" />
                                    {importSuccess}
                                </div>
                            )}

                            {/* Preview Data */}
                            {previewData.length > 0 && (
                                <div>
                                    <h3 className="font-medium text-gray-700 mb-3">
                                        Preview ({previewData.length} leads found)
                                    </h3>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="max-h-64 overflow-y-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {previewData.slice(0, 10).map((lead, index) => (
                                                        <tr key={index} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-900">{lead.name}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-600">{lead.phone}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-600">{lead.email || '-'}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={lead.notes}>{lead.notes || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {previewData.length > 10 && (
                                            <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                                                ... and {previewData.length - 10} more leads
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={closeImportModal}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportLeads}
                                disabled={previewData.length === 0 || importing}
                                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        Import {previewData.length} Leads
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

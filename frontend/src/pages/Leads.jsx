import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import * as XLSX from 'xlsx';
import {
    Search, Loader2, Users, Clock, Plus, Phone, Mail, Edit2, Trash2,
    Upload, FileSpreadsheet, Download, Info, AlertCircle, X, ChevronDown, ChevronRight,
    MessageSquare, RefreshCw
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Leads() {
    const [leads, setLeads] = useState([]);
    const [whatsappConfigs, setWhatsappConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const navigate = useNavigate();

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

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        source: 'manual',
        notes: '',
        phoneNumberId: ''
    });

    useEffect(() => {
        fetchLeads();
    }, [dateRange]);

    useEffect(() => {
        fetchSettings();
    }, []);

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

    const fetchLeads = async () => {
        setLoading(true);
        try {
            let query = '/leads?limit=500';
            if (dateRange.start) query += `&startDate=${dateRange.start}`;
            if (dateRange.end) query += `&endDate=${dateRange.end}`;

            const response = await api.get(query);
            setLeads(response.data.data || []);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const startChat = (lead) => {
        // Navigate to chats with lead data
        navigate('/chats', { state: { lead } });
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
            notes: lead.notes || '',
            phoneNumberId: lead.phoneNumberId || ''
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
            notes: '',
            phoneNumberId: ''
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
                const nameIndex = headers.findIndex(h => h.includes('name'));
                const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
                const emailIndex = headers.findIndex(h => h.includes('email'));
                const notesIndex = headers.findIndex(h => h.includes('note') || h.includes('comment'));

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

    // Group leads by WhatsApp account
    const getLeadsGroupedByAccount = () => {
        const enabledConfigs = whatsappConfigs.filter(c => c.isEnabled);

        if (enabledConfigs.length === 0) {
            return [{
                accountId: 'all',
                accountName: 'All Leads',
                leads: leads
            }];
        }

        const groups = enabledConfigs.map(config => ({
            accountId: config.phoneNumberId || config.name,
            accountName: config.name || `Account ${config.phoneNumberId}`,
            // Filter leads that belong to this account
            leads: leads.filter(l => l.phoneNumberId === config.phoneNumberId)
        }));

        // Handle leads that are not assigned to any specific account (e.g. manually added or legacy)
        // These will be shown in a "General / Unassigned" group
        const assignedLeadIds = new Set(groups.flatMap(g => g.leads.map(l => l._id)));
        const unassignedLeads = leads.filter(l => !assignedLeadIds.has(l._id));

        if (unassignedLeads.length > 0) {
            groups.push({
                accountId: 'unassigned',
                accountName: 'General / Unassigned',
                leads: unassignedLeads
            });
        }

        return groups;
    };

    const formatLeadTime = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
        if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
        return format(d, 'MMM d, yyyy \'at\' h:mm a');
    };

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.includes(searchQuery) ||
        lead.email?.toLowerCase().includes(searchQuery)
    );

    return (
        <div className="flex h-full bg-gray-100">
            <div className="flex h-full w-full bg-white shadow-xl overflow-hidden">
                {/* Leads List */}
                <div className="flex flex-col w-full">
                    {/* Header */}
                    <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-teal-600">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Leads
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="p-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                                    title="Import Excel"
                                >
                                    <Upload className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="px-3 py-1.5 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium flex items-center gap-1"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Lead
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="p-3 border-b border-gray-100 bg-white">
                        <div className="flex flex-col md:flex-row items-center gap-2">
                            {/* Date Filter */}
                            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 w-full md:w-auto">
                                <span className="text-xs text-gray-500 pl-1">From:</span>
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-sm focus:ring-0 px-1 py-1 text-gray-600 w-32"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                />
                                <span className="text-xs text-gray-500">To:</span>
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-sm focus:ring-0 px-1 py-1 text-gray-600 w-32"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                />
                                {(dateRange.start || dateRange.end) && (
                                    <button
                                        onClick={() => setDateRange({ start: '', end: '' })}
                                        className="p-1 hover:bg-gray-200 rounded-full text-gray-500"
                                        title="Clear Date Filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>

                            <div className="relative flex-1 w-full">
                                <input
                                    type="text"
                                    placeholder="Search leads..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
                            </div>
                            <button
                                onClick={fetchLeads}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Leads Content */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                            </div>
                        ) : filteredLeads.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No leads found.</p>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                                >
                                    <Plus className="h-4 w-4 inline mr-1" />
                                    Add Your First Lead
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
                                                                        {formatLeadTime(lead.lastInteraction || lead.createdAt)}
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
                                                                {lead.lastMessage && (
                                                                    <div className="mt-1 text-xs text-gray-500 truncate pr-2">
                                                                        {lead.lastMessage.length > 50
                                                                            ? lead.lastMessage.substring(0, 50) + '...'
                                                                            : lead.lastMessage}
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2 mt-2">
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
                        )}
                    </div>
                </div>
            </div>

            {/* Add/Edit Lead Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingLead ? 'Edit Lead' : 'Add New Lead'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="919876543210"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Account</label>
                                <select
                                    value={formData.phoneNumberId}
                                    onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="">General / Unassigned</option>
                                    {whatsappConfigs.filter(c => c.isEnabled).map(config => (
                                        <option key={config.phoneNumberId} value={config.phoneNumberId}>
                                            {config.name} ({config.phoneNumberId})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Any additional notes..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        editingLead ? 'Update Lead' : 'Add Lead'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-fadeIn max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-green-500" />
                                Import Leads from Excel
                            </h3>
                            <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {importError && (
                                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    {importError}
                                </div>
                            )}

                            {importSuccess && (
                                <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                                    <Info className="h-4 w-4 flex-shrink-0" />
                                    {importSuccess}
                                </div>
                            )}

                            {/* Info Box */}
                            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium mb-1">Excel Format Requirements:</p>
                                        <ul className="list-disc list-inside space-y-1 text-blue-600">
                                            <li>First row should contain column headers</li>
                                            <li>Required columns: <strong>Name</strong> or <strong>Phone</strong></li>
                                            <li>Optional columns: Email, Notes</li>
                                        </ul>
                                        <button
                                            onClick={downloadTemplate}
                                            className="mt-3 text-blue-700 hover:text-blue-800 flex items-center gap-1 font-medium"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download Template
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* File Upload */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileUpload}
                                    ref={fileInputRef}
                                    className="hidden"
                                    id="excel-upload"
                                />
                                <label htmlFor="excel-upload" className="cursor-pointer">
                                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                    <p className="text-gray-600 font-medium">Click to upload Excel file</p>
                                    <p className="text-gray-400 text-sm mt-1">or drag and drop</p>
                                </label>
                            </div>

                            {/* Preview */}
                            {previewData.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Preview ({previewData.length} leads)</h4>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-700">Phone</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {previewData.slice(0, 10).map((lead, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-2 text-gray-900">{lead.name}</td>
                                                        <td className="px-4 py-2 text-gray-600">{lead.phone}</td>
                                                        <td className="px-4 py-2 text-gray-600">{lead.email || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {previewData.length > 10 && (
                                            <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-500">
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
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportLeads}
                                disabled={previewData.length === 0 || importing}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

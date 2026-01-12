import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import * as XLSX from 'xlsx';
import {
    ArrowLeft, Users, Plus, Trash2, Search, Loader2,
    Phone, Mail, Edit2, Check, X, MessageSquare, AlertCircle, User,
    Upload, FileSpreadsheet, Download, Info
} from 'lucide-react';

export default function Leads() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [leads, setLeads] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
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

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        source: 'manual',
        notes: ''
    });

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const response = await api.get('/leads?limit=100');
            setLeads(response.data.data || []);
        } catch (error) {
            console.error('Error fetching leads:', error);
            setError('Failed to load leads');
        } finally {
            setLoading(false);
        }
    };

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

                // Get headers (first row)
                const headers = jsonData[0].map(h => String(h).toLowerCase().trim());

                // Find column indices
                const nameIndex = headers.findIndex(h => h.includes('name'));
                const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
                const emailIndex = headers.findIndex(h => h.includes('email'));
                const notesIndex = headers.findIndex(h => h.includes('note') || h.includes('comment'));

                if (nameIndex === -1 && phoneIndex === -1) {
                    setImportError('Excel must have at least "Name" or "Phone" column');
                    return;
                }

                // Parse data rows
                const parsedLeads = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    const name = nameIndex !== -1 ? String(row[nameIndex] || '').trim() : '';
                    let phone = phoneIndex !== -1 ? String(row[phoneIndex] || '').trim() : '';
                    const email = emailIndex !== -1 ? String(row[emailIndex] || '').trim() : '';
                    const notes = notesIndex !== -1 ? String(row[notesIndex] || '').trim() : '';

                    // Clean phone number (remove spaces, dashes, etc.)
                    phone = phone.replace(/[\s\-\(\)\.]/g, '');

                    // Skip empty rows
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

            // Close modal after 2 seconds
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

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.includes(searchQuery) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const startChat = (lead) => {
        navigate('/', { state: { startChatWithLead: lead } });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <div className="flex items-center gap-3">
                            <Users className="h-6 w-6" />
                            <h1 className="text-xl font-semibold">Manage Leads</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Upload className="h-5 w-5" />
                            <span className="hidden md:inline">Import Excel</span>
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="hidden md:inline">Add Lead</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto p-4">
                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search leads by name, phone, or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-6 flex items-center gap-4 text-sm text-gray-600">
                    <span className="bg-white px-3 py-1 rounded-full border border-gray-200">
                        Total: <strong>{leads.length}</strong> leads
                    </span>
                    {searchQuery && (
                        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200">
                            Showing: <strong>{filteredLeads.length}</strong> results
                        </span>
                    )}
                </div>

                {/* Leads Grid */}
                {filteredLeads.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-700">No Leads Found</h3>
                        <p className="text-gray-500 mt-2">
                            {searchQuery ? 'Try a different search term.' : 'Add your first lead to get started.'}
                        </p>
                        {!searchQuery && (
                            <div className="flex justify-center gap-3 mt-4">
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="px-6 py-2 border border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-2"
                                >
                                    <Upload className="h-4 w-4" />
                                    Import Excel
                                </button>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Lead
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredLeads.map(lead => (
                            <div
                                key={lead._id}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                        {lead.name[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">{lead.name}</h3>
                                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                            <Phone className="h-3 w-3" />
                                            <span className="truncate">{lead.phone}</span>
                                        </div>
                                        {lead.email && (
                                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                                                <Mail className="h-3 w-3" />
                                                <span className="truncate">{lead.email}</span>
                                            </div>
                                        )}
                                        <div className="mt-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${lead.stage === 'new' ? 'bg-blue-100 text-blue-700' :
                                                    lead.stage === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                                                        lead.stage === 'interested' ? 'bg-green-100 text-green-700' :
                                                            lead.stage === 'converted' ? 'bg-purple-100 text-purple-700' :
                                                                'bg-gray-100 text-gray-700'
                                                }`}>
                                                {lead.stage?.charAt(0).toUpperCase() + lead.stage?.slice(1) || 'New'}
                                            </span>
                                            {lead.source && (
                                                <span className="ml-2 text-xs text-gray-400">
                                                    via {lead.source}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={() => startChat(lead)}
                                        className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        Message
                                    </button>
                                    <button
                                        onClick={() => openEditModal(lead)}
                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(lead._id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
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
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {previewData.slice(0, 10).map((lead, index) => (
                                                        <tr key={index} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-900">{lead.name}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-600">{lead.phone}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-600">{lead.email || '-'}</td>
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

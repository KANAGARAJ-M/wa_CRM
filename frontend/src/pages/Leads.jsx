import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import * as XLSX from 'xlsx';
import {
    Search, Loader2, Users, Clock, Plus, Phone, Mail, Edit2, Trash2,
    Upload, FileSpreadsheet, Download, Info, AlertCircle, X, ChevronDown, ChevronRight,
    MessageSquare, RefreshCw, UserPlus, History, GitBranch, Eye
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

    // Agent Assignment State
    const [workers, setWorkers] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState('');
    const [agentSearchQuery, setAgentSearchQuery] = useState('');
    const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);

    // Lead History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedLeadHistory, setSelectedLeadHistory] = useState(null);

    // Tab State
    const [tabs, setTabs] = useState([
        {
            id: 'tab-1',
            title: 'Loading...',
            accountId: 'all',
            searchQuery: '',
            dateRange: { start: '', end: '' },
            selectedLeads: [],
            expandedAccounts: {}
        }
    ]);
    const [activeTabId, setActiveTabId] = useState('tab-1');

    // Derived State
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

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
    }, [activeTabId, activeTab.dateRange]);

    useEffect(() => {
        fetchSettings();
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        try {
            const response = await api.get('/workers');
            setWorkers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching workers:', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            const configs = response.data.data?.whatsappConfigs || [];
            setWhatsappConfigs(configs);

            // Initialize tabs if it's the first load
            if (tabs.length === 1 && tabs[0].title === 'Loading...') {
                const firstAccount = configs.length > 0 ? configs[0] : null;
                const initialTab = {
                    id: 'tab-1',
                    title: firstAccount ? (firstAccount.name || 'Account 1') : 'All Leads',
                    accountId: firstAccount ? firstAccount.phoneNumberId : 'all',
                    searchQuery: '',
                    dateRange: { start: '', end: '' },
                    selectedLeads: [],
                    expandedAccounts: {}
                };

                // Initialize expanded accounts for the new tab
                const expanded = {};
                configs.forEach((config, index) => {
                    expanded[config.phoneNumberId || index] = true;
                });
                initialTab.expandedAccounts = expanded;

                setTabs([initialTab]);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            let query = '/leads?limit=500';
            if (activeTab?.dateRange?.start) query += `&startDate=${activeTab.dateRange.start}`;
            if (activeTab?.dateRange?.end) query += `&endDate=${activeTab.dateRange.end}`;

            const response = await api.get(query);
            setLeads(response.data.data || []);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const viewLeadHistory = (lead) => {
        setSelectedLeadHistory(lead);
        setShowHistoryModal(true);
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

                // Helper to find column index based on keywords
                const getColumnIndex = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));

                const nameIndex = getColumnIndex(['name', 'first', 'full', 'client', 'customer', 'prospect']);
                const phoneIndex = getColumnIndex(['phone', 'mobile', 'cell', 'tel', 'contact', 'whatsapp', 'call', 'num', 'no.']);
                const emailIndex = getColumnIndex(['email', 'e-mail', 'mail']);
                const notesIndex = getColumnIndex(['note', 'comment', 'remark', 'desc', 'message', 'info', 'detail']);
                const callTypeIndex = getColumnIndex(['call type', 'type', 'call_type']);
                const assignedDateIndex = getColumnIndex(['lead date']);

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

                    let callType = 'fresh';
                    if (callTypeIndex !== -1) {
                        const val = String(row[callTypeIndex] || '').trim().toLowerCase();
                        if (['fresh', 'call back', 'paid'].includes(val)) {
                            callType = val;
                        }
                    }

                    let leadDate = null;

                    if (assignedDateIndex !== -1 && row[assignedDateIndex]) {
                        const val = row[assignedDateIndex];
                        if (typeof val === 'number') {
                            // Excel serial date to JS Date
                            leadDate = new Date(Math.round((val - 25569) * 86400 * 1000));
                        } else {
                            // Try parsing custom format: DD.MM.YYYY HH.MM PM (e.g. 12.01.2025 01.30 PM)
                            const customDateMatch = String(val).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2})[\.:](\d{2})\s*(AM|PM|am|pm)$/i);

                            if (customDateMatch) {
                                const [_, day, month, year, hours, minutes, meridian] = customDateMatch;
                                let hour = parseInt(hours);
                                if (meridian.toUpperCase() === 'PM' && hour < 12) hour += 12;
                                if (meridian.toUpperCase() === 'AM' && hour === 12) hour = 0;
                                leadDate = new Date(year, parseInt(month) - 1, day, hour, parseInt(minutes));
                            } else {
                                // Fallback to standard JS parsing
                                const d = new Date(val);
                                if (!isNaN(d.getTime())) {
                                    leadDate = d;
                                }
                            }
                        }
                    }

                    phone = phone.replace(/[\s\-\(\)\.]/g, '');

                    if (!name && !phone) continue;

                    parsedLeads.push({
                        name: name || `Lead ${i}`,
                        phone: phone,
                        email: email,
                        notes: notes,
                        source: 'excel_upload',
                        stage: 'new',
                        status: 'new',
                        callType,
                        leadDate
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

    const handleExportLeads = () => {
        const leadsToExport = filteredLeads;
        if (leadsToExport.length === 0) {
            alert('No leads to export');
            return;
        }

        // Main leads data with all details
        const exportData = leadsToExport.map((lead, index) => {
            // Get assignment history as formatted string
            const assignmentHistory = (lead.assignedAgents || [])
                .map((a, i) => `${i + 1}. ${a.agentId?.name || 'Unknown'} (${a.assignedAt ? format(new Date(a.assignedAt), 'MMM d, yyyy h:mm a') : 'N/A'})`)
                .join(' → ') || 'No history';

            // Get first and current assignment
            const firstAssignment = lead.assignedAgents?.[0];
            const lastAssignment = lead.assignedAgents?.[lead.assignedAgents?.length - 1];

            // Get stage history as formatted string
            const stageHistory = (lead.stageHistory || [])
                .map((s, i) => `${s.stage} (${s.changedAt ? format(new Date(s.changedAt), 'MMM d, yyyy h:mm a') : 'N/A'} by ${s.changedBy?.name || 'System'})`)
                .join(' → ') || 'No history';

            // Get comments as formatted string
            const comments = (lead.commentHistory || [])
                .map(c => `[${c.timestamp ? format(new Date(c.timestamp), 'MMM d, h:mm a') : ''}] ${c.content}`)
                .join(' | ') || '';

            return {
                'S.No': index + 1,
                'Created Date': format(new Date(lead.createdAt), 'yyyy-MM-dd HH:mm:ss'),
                'Lead Date': lead.leadDate ? format(new Date(lead.leadDate), 'yyyy-MM-dd HH:mm:ss') : '',
                'Name': lead.name,
                'Phone': lead.phone,
                'Email': lead.email || '',
                'Source': lead.source || 'Manual',
                'Stage': lead.stage,
                'Status': lead.status,
                'Call Type': lead.callType || 'fresh',
                'Priority': lead.priority || '-',
                'Value': lead.value || '',
                'Current Agent': lead.assignedTo?.name || 'Unassigned',
                'Current Agent Email': lead.assignedTo?.email || '',
                'First Assigned Agent': firstAssignment?.agentId?.name || 'N/A',
                'First Assignment Date': firstAssignment?.assignedAt ? format(new Date(firstAssignment.assignedAt), 'yyyy-MM-dd HH:mm:ss') : '',
                'Last Assignment Date': lastAssignment?.assignedAt ? format(new Date(lastAssignment.assignedAt), 'yyyy-MM-dd HH:mm:ss') : '',
                'Total Assignments': lead.assignedAgents?.length || 0,
                'Assignment History': assignmentHistory,
                'Stage History': stageHistory,
                'Total Stage Changes': lead.stageHistory?.length || 0,
                'Notes': lead.notes || '',
                'Comment History': comments,
                'Last Interaction': lead.lastInteraction ? format(new Date(lead.lastInteraction), 'yyyy-MM-dd HH:mm:ss') : ''
            };
        });

        // Create workbook with multiple sheets
        const wb = XLSX.utils.book_new();

        // Main Leads Sheet
        const wsLeads = XLSX.utils.json_to_sheet(exportData);

        // Set column widths for better readability
        const colWidths = [
            { wch: 5 },   // S.No
            { wch: 20 },  // Created Date
            { wch: 20 },  // Lead Date
            { wch: 20 },  // Name
            { wch: 15 },  // Phone
            { wch: 25 },  // Email
            { wch: 12 },  // Source
            { wch: 12 },  // Stage
            { wch: 12 },  // Status
            { wch: 12 },  // Call Type
            { wch: 10 },  // Priority
            { wch: 10 },  // Value
            { wch: 20 },  // Current Agent
            { wch: 25 },  // Current Agent Email
            { wch: 20 },  // First Assigned Agent
            { wch: 20 },  // First Assignment Date
            { wch: 20 },  // Last Assignment Date
            { wch: 8 },   // Total Assignments
            { wch: 50 },  // Assignment History
            { wch: 50 },  // Stage History
            { wch: 8 },   // Total Stage Changes
            { wch: 30 },  // Notes
            { wch: 50 },  // Comment History
            { wch: 20 }   // Last Interaction
        ];
        wsLeads['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, wsLeads, 'Leads');

        // Assignment History Sheet (detailed)
        const assignmentData = [];
        leadsToExport.forEach(lead => {
            (lead.assignedAgents || []).forEach((assignment, idx) => {
                assignmentData.push({
                    'Lead Name': lead.name,
                    'Lead Phone': lead.phone,
                    'Assignment #': idx + 1,
                    'Agent Name': assignment.agentId?.name || 'Unknown',
                    'Agent Email': assignment.agentId?.email || '',
                    'Assigned At': assignment.assignedAt ? format(new Date(assignment.assignedAt), 'yyyy-MM-dd HH:mm:ss') : '',
                    'Assigned By': assignment.assignedBy?.name || 'System',
                    'Is Current': idx === (lead.assignedAgents?.length - 1) ? 'Yes' : 'No'
                });
            });
        });
        if (assignmentData.length > 0) {
            const wsAssignments = XLSX.utils.json_to_sheet(assignmentData);
            XLSX.utils.book_append_sheet(wb, wsAssignments, 'Assignment History');
        }

        // Stage History Sheet (detailed)
        const stageData = [];
        leadsToExport.forEach(lead => {
            (lead.stageHistory || []).forEach((change, idx) => {
                stageData.push({
                    'Lead Name': lead.name,
                    'Lead Phone': lead.phone,
                    'Change #': idx + 1,
                    'Stage': change.stage,
                    'Changed At': change.changedAt ? format(new Date(change.changedAt), 'yyyy-MM-dd HH:mm:ss') : '',
                    'Changed By': change.changedBy?.name || 'System',
                    'Notes': change.notes || ''
                });
            });
        });
        if (stageData.length > 0) {
            const wsStages = XLSX.utils.json_to_sheet(stageData);
            XLSX.utils.book_append_sheet(wb, wsStages, 'Stage History');
        }

        // Summary Sheet
        const summaryData = [
            { 'Metric': 'Total Leads', 'Value': leadsToExport.length },
            { 'Metric': 'Assigned Leads', 'Value': leadsToExport.filter(l => l.assignedTo).length },
            { 'Metric': 'Unassigned Leads', 'Value': leadsToExport.filter(l => !l.assignedTo).length },
            { 'Metric': 'New Stage', 'Value': leadsToExport.filter(l => l.stage === 'new').length },
            { 'Metric': 'Contacted Stage', 'Value': leadsToExport.filter(l => l.stage === 'contacted').length },
            { 'Metric': 'Interested Stage', 'Value': leadsToExport.filter(l => l.stage === 'interested').length },
            { 'Metric': 'Negotiation Stage', 'Value': leadsToExport.filter(l => l.stage === 'negotiation').length },
            { 'Metric': 'Converted Stage', 'Value': leadsToExport.filter(l => l.stage === 'converted').length },
            { 'Metric': 'Lost Stage', 'Value': leadsToExport.filter(l => l.stage === 'lost').length },
            { 'Metric': 'Export Date', 'Value': format(new Date(), 'yyyy-MM-dd HH:mm:ss') }
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        XLSX.writeFile(wb, `leads_detailed_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    };

    const handleAssignLeads = async () => {
        if (!selectedWorker) return;
        try {
            await api.put('/leads/assign', {
                leadIds: activeTab.selectedLeads,
                workerId: selectedWorker
            });
            setShowAssignModal(false);
            setSelectedWorker('');
            setAgentSearchQuery('');
            setIsAgentDropdownOpen(false);
            updateActiveTab({ selectedLeads: [] });
            fetchLeads();
            alert('Leads assigned successfully');
        } catch (error) {
            console.error('Error assigning leads:', error);
            alert('Failed to assign leads');
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
        updateActiveTab({
            expandedAccounts: {
                ...activeTab.expandedAccounts,
                [accountId]: !activeTab.expandedAccounts[accountId]
            }
        });
    };

    // Tab Management Functions
    const updateActiveTab = (updates) => {
        setTabs(prev => prev.map(tab =>
            tab.id === activeTabId ? { ...tab, ...updates } : tab
        ));
    };

    const handleAddTab = () => {
        const newId = `tab-${Date.now()}`;
        const newTab = {
            id: newId,
            title: 'New Tab',
            accountId: 'all',
            searchQuery: '',
            dateRange: { start: '', end: '' },
            selectedLeads: [],
            expandedAccounts: activeTab.expandedAccounts // Inherit expansion state or reset? Let's inherit for convenience
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newId);
    };

    const handleCloseTab = (e, tabId) => {
        e.stopPropagation();
        if (tabs.length === 1) return; // Don't close the last tab

        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);

        if (activeTabId === tabId) {
            setActiveTabId(newTabs[newTabs.length - 1].id);
        }
    };

    const handleTabClick = (tabId) => {
        setActiveTabId(tabId);
    };

    const handleSelectLead = (leadId) => {
        const currentSelected = activeTab.selectedLeads;
        const newSelected = currentSelected.includes(leadId)
            ? currentSelected.filter(id => id !== leadId)
            : [...currentSelected, leadId];

        updateActiveTab({ selectedLeads: newSelected });
    };

    const handleSelectAll = (leadsToSelect) => {
        const allIds = leadsToSelect.map(l => l._id);
        const allSelected = allIds.every(id => activeTab.selectedLeads.includes(id));

        if (allSelected) {
            // Deselect all visible
            updateActiveTab({
                selectedLeads: activeTab.selectedLeads.filter(id => !allIds.includes(id))
            });
        } else {
            // Select all visible
            const newSelected = [...new Set([...activeTab.selectedLeads, ...allIds])];
            updateActiveTab({ selectedLeads: newSelected });
        }
    };

    // Group leads by WhatsApp account
    const getLeadsGroupedByAccount = (leadsToGroup) => {
        // If specific account is selected, just return that group
        if (activeTab.accountId !== 'all') {
            const config = whatsappConfigs.find(c => c.phoneNumberId === activeTab.accountId);
            return [{
                accountId: activeTab.accountId,
                accountName: config ? config.name : 'Unknown Account',
                leads: leadsToGroup
            }];
        }

        const enabledConfigs = whatsappConfigs.filter(c => c.isEnabled);

        if (enabledConfigs.length === 0) {
            return [{
                accountId: 'all',
                accountName: 'All Leads',
                leads: leadsToGroup
            }];
        }

        const groups = enabledConfigs.map(config => ({
            accountId: config.phoneNumberId || config.name,
            accountName: config.name || `Account ${config.phoneNumberId}`,
            // Filter leads that belong to this account
            leads: leadsToGroup.filter(l => l.phoneNumberId === config.phoneNumberId)
        }));

        // Handle leads that are not assigned to any specific account
        const assignedLeadIds = new Set(groups.flatMap(g => g.leads.map(l => l._id)));
        const unassignedLeads = leadsToGroup.filter(l => !assignedLeadIds.has(l._id));

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

    // Filter leads based on Active Tab settings
    const filteredLeads = leads.filter(lead => {
        // 1. Account Filter
        if (activeTab.accountId !== 'all' && lead.phoneNumberId !== activeTab.accountId) {
            return false;
        }

        // 2. Search Filter
        const query = activeTab.searchQuery.toLowerCase();
        return (
            lead.name.toLowerCase().includes(query) ||
            lead.phone?.includes(query) ||
            lead.email?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="flex h-full bg-gray-100 flex-col">
            {/* Tab Bar */}
            {/* Tab Bar */}
            <div className="bg-[#dee1e6] px-2 pt-2 flex items-end gap-1 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`
                            group relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl cursor-pointer select-none min-w-[160px] max-w-[240px] transition-all duration-200
                            ${activeTabId === tab.id
                                ? 'bg-white text-gray-800 shadow-[0_-1px_2px_rgba(0,0,0,0.05)] z-10'
                                : 'text-gray-600 hover:bg-white/40'}
                        `}
                    >
                        {/* Active Tab Connector - hides the bottom border */}
                        {activeTabId === tab.id && (
                            <div className="absolute -bottom-1 left-0 right-0 h-2 bg-white z-20" />
                        )}

                        {/* Tab Content */}
                        <div className="flex items-center gap-2 flex-1 overflow-hidden relative z-30">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeTabId === tab.id ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-base font-medium truncate flex-1">{tab.title}</span>
                        </div>

                        {/* Close Button */}
                        {tabs.length > 1 && (
                            <button
                                onClick={(e) => handleCloseTab(e, tab.id)}
                                className={`
                                    p-0.5 rounded-full hover:bg-gray-200/80 transition-all z-30
                                    ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                `}
                            >
                                <X className="h-3.5 w-3.5 text-gray-500" />
                            </button>
                        )}

                        {/* Separator for inactive tabs */}
                        {activeTabId !== tab.id && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-4 bg-gray-400/30 group-hover:hidden" />
                        )}
                    </div>
                ))}

                {/* New Tab Button */}
                <button
                    onClick={handleAddTab}
                    className="ml-1 p-2 mb-1.5 text-gray-600 hover:bg-white/40 rounded-full transition-colors"
                    title="New Tab"
                >
                    <Plus className="h-5 w-5" />
                </button>
            </div>

            <div className="flex h-full w-full bg-white shadow-xl overflow-hidden relative z-0">
                {/* Leads List */}
                <div className="flex flex-col w-full">
                    {/* Header */}
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-xl">
                                        <Users className="h-6 w-6 text-green-600" />
                                    </div>
                                    Leads
                                </h2>

                                {/* Account Selector Pill */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MessageSquare className="h-4 w-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                                    </div>
                                    <select
                                        value={activeTab.accountId}
                                        onChange={(e) => {
                                            const newAccountId = e.target.value;
                                            const config = whatsappConfigs.find(c => c.phoneNumberId === newAccountId);
                                            updateActiveTab({
                                                accountId: newAccountId,
                                                title: config ? config.name : (newAccountId === 'all' ? 'All Leads' : 'Unassigned')
                                            });
                                        }}
                                        className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-base rounded-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 block w-[220px] hover:bg-white hover:shadow-sm transition-all cursor-pointer appearance-none font-medium"
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
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleExportLeads}
                                    className="p-2.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                                    title="Export to Excel"
                                >
                                    <Download className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="p-2.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                                    title="Import Excel"
                                >
                                    <Upload className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 text-base font-semibold flex items-center gap-2 active:scale-95"
                                >
                                    <Plus className="h-5 w-5" />
                                    Add New Lead
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
                                    className="bg-transparent border-none text-base focus:ring-0 px-1 py-1 text-gray-600 w-36"
                                    value={activeTab.dateRange.start}
                                    onChange={(e) => updateActiveTab({ dateRange: { ...activeTab.dateRange, start: e.target.value } })}
                                />
                                <span className="text-xs text-gray-500">To:</span>
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-base focus:ring-0 px-1 py-1 text-gray-600 w-36"
                                    value={activeTab.dateRange.end}
                                    onChange={(e) => updateActiveTab({ dateRange: { ...activeTab.dateRange, end: e.target.value } })}
                                />
                                {(activeTab.dateRange.start || activeTab.dateRange.end) && (
                                    <button
                                        onClick={() => updateActiveTab({ dateRange: { start: '', end: '' } })}
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
                                    placeholder="Search leads in this tab..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-base focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                    value={activeTab.searchQuery}
                                    onChange={(e) => updateActiveTab({ searchQuery: e.target.value })}
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

                        {/* Selection Info */}
                        {activeTab.selectedLeads.length > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                <span className="font-medium">{activeTab.selectedLeads.length} selected</span>
                                <div className="h-4 w-px bg-green-200 mx-1"></div>
                                <button
                                    onClick={() => setShowAssignModal(true)}
                                    className="hover:underline flex items-center gap-1"
                                >
                                    <UserPlus className="h-3 w-3" />
                                    Assign to Agent
                                </button>
                                <button className="hover:underline ml-2">Delete Selected</button>
                                <button
                                    onClick={() => updateActiveTab({ selectedLeads: [] })}
                                    className="ml-auto text-gray-500 hover:text-gray-700"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Leads Content */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                            </div>
                        ) : filteredLeads.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                                <div className="bg-green-50 p-6 rounded-full mb-6">
                                    <Users className="h-16 w-16 text-green-200" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No leads found</h3>
                                <p className="text-gray-500 max-w-sm mb-8">
                                    {activeTab.searchQuery
                                        ? `No results found for "${activeTab.searchQuery}". Try adjusting your search or filters.`
                                        : "Get started by adding your first lead or importing from Excel."}
                                </p>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 font-medium flex items-center gap-2"
                                    >
                                        <Plus className="h-5 w-5" />
                                        Add Lead
                                    </button>
                                    <button
                                        onClick={() => setShowImportModal(true)}
                                        className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium flex items-center gap-2"
                                    >
                                        <Upload className="h-5 w-5" />
                                        Import
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {getLeadsGroupedByAccount(filteredLeads).map(group => (
                                    <div key={group.accountId}>
                                        {/* Account Header - Only show if we are in 'All' view, otherwise redundant */}
                                        {activeTab.accountId === 'all' && (
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
                                                {activeTab.expandedAccounts[group.accountId] ? (
                                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                                ) : (
                                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                                )}
                                            </button>
                                        )}

                                        {/* Leads List under Account */}
                                        {(activeTab.accountId !== 'all' || activeTab.expandedAccounts[group.accountId]) && (
                                            <div className="bg-white overflow-hidden border-t border-gray-100">
                                                <table className="min-w-full divide-y divide-gray-100">
                                                    <thead className="bg-gray-50/80 backdrop-blur-sm">
                                                        <tr>
                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={group.leads.length > 0 && group.leads.every(l => activeTab.selectedLeads.includes(l._id))}
                                                                    onChange={() => handleSelectAll(group.leads)}
                                                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                                />
                                                            </th>
                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                Name
                                                            </th>
                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                Contact
                                                            </th>
                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                Stage
                                                            </th>
                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                Assigned
                                                            </th>
                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                Received
                                                            </th>
                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                Type
                                                            </th>
                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                Lead Date
                                                            </th>
                                                            <th scope="col" className="relative px-6 py-4">
                                                                <span className="sr-only">Actions</span>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-100">
                                                        {group.leads.map(lead => (
                                                            <tr key={lead._id} className={`group hover:bg-blue-50/30 transition-all duration-200 ${activeTab.selectedLeads.includes(lead._id) ? 'bg-blue-50' : ''}`}>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={activeTab.selectedLeads.includes(lead._id)}
                                                                        onChange={() => handleSelectLead(lead._id)}
                                                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer h-4 w-4"
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center">
                                                                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm ring-2 ring-white">
                                                                            {lead.name[0].toUpperCase()}
                                                                        </div>
                                                                        <div className="ml-4">
                                                                            <div className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{lead.name}</div>
                                                                            {lead.lastMessage && (
                                                                                <div className="text-sm text-gray-500 max-w-[240px] truncate flex items-center gap-1.5 mt-0.5" title={lead.lastMessage}>
                                                                                    <MessageSquare className="h-3 w-3 text-gray-400" />
                                                                                    {lead.lastMessage}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="text-sm font-medium text-gray-700 flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-md w-fit border border-gray-100">
                                                                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                                            {lead.phone}
                                                                        </div>
                                                                        {lead.email && (
                                                                            <div className="text-sm text-gray-500 flex items-center gap-2 px-2">
                                                                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                                                {lead.email}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${lead.stage === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                        lead.stage === 'contacted' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                                            lead.stage === 'interested' ? 'bg-green-50 text-green-700 border-green-100' :
                                                                                lead.stage === 'converted' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                                    'bg-gray-50 text-gray-700 border-gray-100'
                                                                        }`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${lead.stage === 'new' ? 'bg-blue-500' :
                                                                            lead.stage === 'contacted' ? 'bg-yellow-500' :
                                                                                lead.stage === 'interested' ? 'bg-green-500' :
                                                                                    lead.stage === 'converted' ? 'bg-purple-500' :
                                                                                        'bg-gray-400'
                                                                            }`}></span>
                                                                        {lead.stage?.charAt(0).toUpperCase() + lead.stage?.slice(1) || 'New'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {lead.assignedTo ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                                                                                    {lead.assignedTo.name[0]}
                                                                                </div>
                                                                                <span className="font-medium text-gray-700">{lead.assignedTo.name}</span>
                                                                            </div>
                                                                            {/* Show last assignment date */}
                                                                            {lead.assignedAgents && lead.assignedAgents.length > 0 && (
                                                                                <div className="text-xs text-gray-400 ml-8 flex items-center gap-1">
                                                                                    <Clock className="h-3 w-3" />
                                                                                    {format(new Date(lead.assignedAgents[lead.assignedAgents.length - 1].assignedAt), 'MMM d, h:mm a')}
                                                                                </div>
                                                                            )}
                                                                            {/* History count badge */}
                                                                            {lead.assignedAgents && lead.assignedAgents.length > 1 && (
                                                                                <button
                                                                                    onClick={() => viewLeadHistory(lead)}
                                                                                    className="text-xs text-indigo-600 hover:text-indigo-700 ml-8 flex items-center gap-1"
                                                                                >
                                                                                    <GitBranch className="h-3 w-3" />
                                                                                    {lead.assignedAgents.length} assignments
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-400 border border-dashed border-gray-200">
                                                                            Unassigned
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-1.5 font-medium text-gray-700">
                                                                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                                            {formatLeadTime(lead.createdAt)}
                                                                        </div>
                                                                        {lead.source && (
                                                                            <span className="text-xs text-gray-400 mt-1 ml-5 flex items-center gap-1">
                                                                                via <span className="font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{lead.source}</span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                                        ${lead.callType === 'paid' ? 'bg-purple-100 text-purple-800' :
                                                                            lead.callType === 'call back' ? 'bg-orange-100 text-orange-800' :
                                                                                'bg-blue-100 text-blue-800'}`}>
                                                                        {lead.callType || 'fresh'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {lead.leadDate ? formatLeadTime(lead.leadDate) : '-'}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                                                                        <button
                                                                            onClick={() => viewLeadHistory(lead)}
                                                                            className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-all shadow-sm border border-indigo-100"
                                                                            title="View History"
                                                                        >
                                                                            <History className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => startChat(lead)}
                                                                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 hover:text-green-700 transition-all shadow-sm border border-green-100"
                                                                            title="Start Chat"
                                                                        >
                                                                            <MessageSquare className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => openEditModal(lead)}
                                                                            className="p-2 bg-white text-gray-500 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm border border-gray-200"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit2 className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDelete(lead._id)}
                                                                            className="p-2 bg-white text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all shadow-sm border border-gray-200"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Assign Agent Modal */}
            {
                showAssignModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-fadeIn p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Leads</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Assigning {activeTab.selectedLeads.length} leads to an agent.
                            </p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Agent</label>
                                <div className="relative">
                                    <div
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-green-500 cursor-pointer bg-white flex items-center justify-between"
                                        onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                                    >
                                        <span className={selectedWorker ? 'text-gray-900' : 'text-gray-500'}>
                                            {selectedWorker
                                                ? workers.find(w => w._id === selectedWorker)?.name || 'Unknown Agent'
                                                : 'Select an agent...'}
                                        </span>
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </div>

                                    {isAgentDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden flex flex-col">
                                            <div className="p-2 border-b border-gray-100">
                                                <div className="relative">
                                                    <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search agents..."
                                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-green-500 transition-colors"
                                                        value={agentSearchQuery}
                                                        onChange={(e) => setAgentSearchQuery(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="overflow-y-auto flex-1">
                                                {workers
                                                    .filter(w =>
                                                        w.name.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
                                                        w.email.toLowerCase().includes(agentSearchQuery.toLowerCase())
                                                    )
                                                    .map(worker => (
                                                        <div
                                                            key={worker._id}
                                                            onClick={() => {
                                                                setSelectedWorker(worker._id);
                                                                setIsAgentDropdownOpen(false);
                                                                setAgentSearchQuery('');
                                                            }}
                                                            className={`px-4 py-2 hover:bg-green-50 cursor-pointer flex items-center justify-between group ${selectedWorker === worker._id ? 'bg-green-50/50 text-green-700' : 'text-gray-700'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="font-medium">{worker.name}</div>
                                                                <div className="text-xs text-gray-500 group-hover:text-green-600">{worker.email}</div>
                                                            </div>
                                                            {selectedWorker === worker._id && (
                                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                            )}
                                                        </div>
                                                    ))}
                                                {workers.filter(w =>
                                                    w.name.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
                                                    w.email.toLowerCase().includes(agentSearchQuery.toLowerCase())
                                                ).length === 0 && (
                                                        <div className="p-4 text-center text-gray-500 text-sm">
                                                            No agents found
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowAssignModal(false);
                                        setAgentSearchQuery('');
                                        setIsAgentDropdownOpen(false);
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignLeads}
                                    disabled={!selectedWorker}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Assign
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add/Edit Lead Modal */}
            {
                showAddModal && (
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
                )
            }

            {/* Import Modal */}
            {
                showImportModal && (
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
                                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Type</th>
                                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Lead Date</th>
                                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {previewData.slice(0, 10).map((lead, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-4 py-2 text-gray-900">{lead.name}</td>
                                                            <td className="px-4 py-2 text-gray-600">{lead.phone}</td>
                                                            <td className="px-4 py-2 text-gray-600">{lead.email || '-'}</td>
                                                            <td className="px-4 py-2 text-gray-600 capitalize">{lead.callType || 'fresh'}</td>
                                                            <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{lead.leadDate ? formatLeadTime(lead.leadDate) : '-'}</td>
                                                            <td className="px-4 py-2 text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={lead.notes}>{lead.notes || '-'}</td>
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
                )
            }

            {/* Lead History Modal */}
            {showHistoryModal && selectedLeadHistory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fadeIn">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <History className="h-5 w-5 text-indigo-500" />
                                    Lead History
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedLeadHistory.name} - {selectedLeadHistory.phone}
                                </p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Agent Assignment History */}
                            <div className="mb-8">
                                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <GitBranch className="h-4 w-4 text-indigo-500" />
                                    Agent Assignment History
                                </h4>
                                {selectedLeadHistory.assignedAgents && selectedLeadHistory.assignedAgents.length > 0 ? (
                                    <div className="relative">
                                        {/* Timeline line */}
                                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-indigo-100"></div>

                                        {selectedLeadHistory.assignedAgents.map((assignment, index) => (
                                            <div key={index} className="relative pl-10 pb-6 last:pb-0">
                                                {/* Timeline dot */}
                                                <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${index === selectedLeadHistory.assignedAgents.length - 1
                                                    ? 'bg-indigo-500'
                                                    : 'bg-indigo-200'
                                                    }`}>
                                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                                </div>

                                                <div className={`p-4 rounded-lg border ${index === selectedLeadHistory.assignedAgents.length - 1
                                                    ? 'bg-indigo-50 border-indigo-200'
                                                    : 'bg-gray-50 border-gray-200'
                                                    }`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold">
                                                                {assignment.agentId?.name?.[0] || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900">
                                                                    {assignment.agentId?.name || 'Unknown Agent'}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {assignment.agentId?.email || ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-gray-700">
                                                                {format(new Date(assignment.assignedAt), 'MMM d, yyyy')}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {format(new Date(assignment.assignedAt), 'h:mm a')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {assignment.assignedBy && (
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            Assigned by: {assignment.assignedBy.name || 'System'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg">No assignment history available.</p>
                                )}
                            </div>

                            {/* Stage Change History */}
                            <div>
                                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-green-500" />
                                    Stage Change History
                                </h4>
                                {selectedLeadHistory.stageHistory && selectedLeadHistory.stageHistory.length > 0 ? (
                                    <div className="relative">
                                        {/* Timeline line */}
                                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-green-100"></div>

                                        {selectedLeadHistory.stageHistory.map((change, index) => (
                                            <div key={index} className="relative pl-10 pb-6 last:pb-0">
                                                {/* Timeline dot */}
                                                <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${index === selectedLeadHistory.stageHistory.length - 1
                                                    ? 'bg-green-500'
                                                    : 'bg-green-200'
                                                    }`}>
                                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                                </div>

                                                <div className={`p-4 rounded-lg border ${index === selectedLeadHistory.stageHistory.length - 1
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-gray-50 border-gray-200'
                                                    }`}>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${change.stage === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                change.stage === 'contacted' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                                    change.stage === 'interested' ? 'bg-green-50 text-green-700 border-green-100' :
                                                                        change.stage === 'negotiation' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                                            change.stage === 'converted' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                                'bg-gray-50 text-gray-700 border-gray-100'
                                                                }`}>
                                                                {change.stage?.charAt(0).toUpperCase() + change.stage?.slice(1)}
                                                            </span>
                                                            {change.notes && (
                                                                <p className="text-sm text-gray-600 mt-2">{change.notes}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-gray-700">
                                                                {format(new Date(change.changedAt), 'MMM d, yyyy')}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {format(new Date(change.changedAt), 'h:mm a')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {change.changedBy && (
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            Updated by: {change.changedBy.name || 'System'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg">No stage history available.</p>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

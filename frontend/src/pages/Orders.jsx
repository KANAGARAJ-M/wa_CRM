import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    ShoppingCart, Calendar, User, Package, MessageCircle, X,
    Clock, CheckCircle, AlertCircle, FileText, ChevronRight,
    Loader2, Filter, RefreshCw, Eye, Zap, FormInput, Phone
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function Orders() {
    const [activeDataSource, setActiveDataSource] = useState('flows'); // 'flows' or 'forms'
    const [flowResponses, setFlowResponses] = useState([]);
    const [formSubmissions, setFormSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [selectedItem, setSelectedItem] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (activeDataSource === 'flows') {
            fetchFlowResponses();
        } else {
            fetchFormSubmissions();
        }
    }, [page, statusFilter, activeDataSource]);

    const fetchFlowResponses = async () => {
        try {
            setLoading(true);
            const response = await api.get('/whatsapp/flow-responses', {
                params: { page, limit: 30, status: statusFilter }
            });
            setFlowResponses(response.data.data || []);
            setPagination(response.data.pagination || {});
        } catch (error) {
            console.error('Error fetching flow responses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFormSubmissions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/forms/submissions/all', {
                params: { page, limit: 30, status: statusFilter }
            });
            setFormSubmissions(response.data.data || []);
            setPagination(response.data.pagination || {});
        } catch (error) {
            console.error('Error fetching form submissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const currentData = activeDataSource === 'flows' ? flowResponses : formSubmissions;

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'in_progress': return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'draft': return <FileText className="w-4 h-4 text-gray-400" />;
            case 'abandoned': case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return <CheckCircle className="w-4 h-4 text-green-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'in_progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'draft': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'abandoned': case 'error': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-green-100 text-green-700 border-green-200';
        }
    };

    const formatFieldValue = (value) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    };

    // Get display name based on data source
    const getItemDisplayName = (item) => {
        if (activeDataSource === 'flows') {
            return item.fromName || item.from || 'Anonymous';
        }
        return item.submitterName || item.submitterIdentifier || 'Anonymous';
    };

    // Get identifier (phone/email)
    const getItemIdentifier = (item) => {
        if (activeDataSource === 'flows') {
            return item.from;
        }
        return item.submitterIdentifier;
    };

    // Get title/source
    const getItemSource = (item) => {
        if (activeDataSource === 'flows') {
            return item.product?.name || `Flow ${item.flowId?.slice(0, 8)}...`;
        }
        return item.formId?.title || 'Unknown Form';
    };

    // Get data fields
    const getItemFields = (item) => {
        if (activeDataSource === 'flows') {
            return item.parsedFields || [];
        }
        // For forms, convert Map or Object to array
        if (!item.data) return [];
        const entries = item.data instanceof Map
            ? Array.from(item.data.entries())
            : Object.entries(item.data);
        return entries.map(([fieldName, fieldValue]) => ({
            fieldName,
            fieldValue,
            fieldType: typeof fieldValue
        }));
    };

    // Get first field preview
    const getFirstFieldPreview = (item) => {
        const fields = getItemFields(item);
        if (fields.length === 0) return '';
        const first = fields[0];
        return `${first.fieldName}: ${formatFieldValue(first.fieldValue)}`;
    };

    return (
        <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 flex overflow-hidden">
            {/* Left Panel - List (Mobile-first, Instagram DM style) */}
            <div className={`w-full md:w-96 bg-white border-r border-gray-200 flex flex-col ${selectedItem ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-500 to-emerald-600">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Customer Responses</h1>
                                <p className="text-xs text-white/70">{pagination.total || 0} responses</p>
                            </div>
                        </div>
                        <button
                            onClick={() => activeDataSource === 'flows' ? fetchFlowResponses() : fetchFormSubmissions()}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Data Source Toggle */}
                    <div className="flex gap-2 mt-3 bg-white/10 rounded-lg p-1">
                        <button
                            onClick={() => { setActiveDataSource('flows'); setPage(1); setSelectedItem(null); }}
                            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-all ${activeDataSource === 'flows'
                                    ? 'bg-white text-green-600 shadow-md'
                                    : 'text-white hover:bg-white/10'
                                }`}
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp Flows
                        </button>
                        <button
                            onClick={() => { setActiveDataSource('forms'); setPage(1); setSelectedItem(null); }}
                            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-all ${activeDataSource === 'forms'
                                    ? 'bg-white text-green-600 shadow-md'
                                    : 'text-white hover:bg-white/10'
                                }`}
                        >
                            <FormInput className="w-3.5 h-3.5" />
                            Web Forms
                        </button>
                    </div>

                    {/* Status Filters */}
                    <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                        {['all', 'completed', 'in_progress', 'abandoned'].map(status => (
                            <button
                                key={status}
                                onClick={() => { setStatusFilter(status); setPage(1); }}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${statusFilter === status
                                        ? 'bg-white text-green-600 shadow-md'
                                        : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                            >
                                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                        </div>
                    ) : currentData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-6">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                {activeDataSource === 'flows' ? (
                                    <MessageCircle className="w-8 h-8 text-gray-300" />
                                ) : (
                                    <FileText className="w-8 h-8 text-gray-300" />
                                )}
                            </div>
                            <p className="text-sm font-medium">No {activeDataSource === 'flows' ? 'flow responses' : 'form submissions'} found</p>
                            <p className="text-xs text-gray-400 text-center mt-1">
                                {activeDataSource === 'flows'
                                    ? 'Flow responses from WhatsApp will appear here'
                                    : 'Web form submissions will appear here'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {currentData.map((item) => (
                                <div
                                    key={item._id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${selectedItem?._id === item._id ? 'bg-green-50 border-l-4 border-green-500' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${activeDataSource === 'flows'
                                                    ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                                                    : 'bg-gradient-to-br from-indigo-400 to-purple-500'
                                                }`}>
                                                {getItemDisplayName(item)[0]?.toUpperCase() || <User className="w-5 h-5" />}
                                            </div>
                                            {/* Status dot */}
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${item.status === 'completed' ? 'bg-green-500' :
                                                    item.status === 'in_progress' ? 'bg-yellow-500' :
                                                        item.status === 'abandoned' || item.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                                                }`}>
                                                {item.status === 'completed' && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="font-semibold text-gray-900 text-sm truncate">
                                                    {getItemDisplayName(item)}
                                                </h3>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1">
                                                {activeDataSource === 'flows' && <MessageCircle className="w-3 h-3 text-green-500" />}
                                                {activeDataSource === 'forms' && <FormInput className="w-3 h-3 text-indigo-500" />}
                                                {getItemSource(item)}
                                            </p>

                                            {/* Preview of first data field */}
                                            <p className="text-xs text-gray-400 truncate mt-1">
                                                {getFirstFieldPreview(item)}
                                            </p>

                                            {/* Status badge */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(item.status)}`}>
                                                    {getStatusIcon(item.status)}
                                                    {(item.status || 'completed').replace('_', ' ')}
                                                </span>
                                                {activeDataSource === 'flows' && item.flowId && (
                                                    <span className="text-[10px] text-gray-400">
                                                        ID: {item.flowId?.slice(0, 8)}...
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-gray-500">
                            {page} / {pagination.pages}
                        </span>
                        <button
                            disabled={page === pagination.pages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Right Panel - Detail (Chat-like view) */}
            <div className={`flex-1 flex flex-col bg-gray-50 ${selectedItem ? 'flex' : 'hidden md:flex'}`}>
                {selectedItem ? (
                    <>
                        {/* Detail Header */}
                        <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedItem(null)}
                                        className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 rotate-180" />
                                    </button>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${activeDataSource === 'flows'
                                            ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                                            : 'bg-gradient-to-br from-indigo-400 to-purple-500'
                                        }`}>
                                        {getItemDisplayName(selectedItem)[0]?.toUpperCase() || <User className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-gray-900 text-sm">
                                            {getItemDisplayName(selectedItem)}
                                        </h2>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {getItemIdentifier(selectedItem)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedItem.status)}`}>
                                        {getStatusIcon(selectedItem.status)}
                                        {(selectedItem.status || 'completed').replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Chat-like Data Display */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'linear-gradient(180deg, #e5ddd5 0%, #d9d2c5 100%)' }}>
                            {/* Time indicator */}
                            <div className="flex justify-center">
                                <span className="bg-white/80 text-gray-500 text-[10px] px-3 py-1 rounded-full shadow-sm">
                                    {format(new Date(selectedItem.createdAt), 'MMMM d, yyyy • h:mm a')}
                                </span>
                            </div>

                            {/* Source Info Bubble */}
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%] shadow-sm">
                                    <p className="text-xs text-green-600 font-medium mb-1 flex items-center gap-1">
                                        {activeDataSource === 'flows' ? (
                                            <><MessageCircle className="w-3 h-3" /> WhatsApp Flow Response</>
                                        ) : (
                                            <><FormInput className="w-3 h-3" /> Web Form Submission</>
                                        )}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-800">{getItemSource(selectedItem)}</p>
                                    {activeDataSource === 'flows' && selectedItem.flowId && (
                                        <p className="text-[10px] text-gray-400 mt-1">Flow ID: {selectedItem.flowId}</p>
                                    )}
                                </div>
                            </div>

                            {/* Data Fields as Chat Bubbles */}
                            {getItemFields(selectedItem).map((field, index) => (
                                <div key={field.fieldName || index} className="flex flex-col gap-1">
                                    {/* Question (from system) */}
                                    <div className="flex justify-start">
                                        <div className="bg-white rounded-2xl rounded-tl-md px-4 py-2 max-w-[75%] shadow-sm">
                                            <p className="text-xs text-gray-500">{field.fieldName}</p>
                                        </div>
                                    </div>
                                    {/* Answer (from user) */}
                                    <div className="flex justify-end">
                                        <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-md px-4 py-2 max-w-[75%] shadow-sm">
                                            <p className="text-sm text-gray-800">{formatFieldValue(field.fieldValue)}</p>
                                            {index === getItemFields(selectedItem).length - 1 && (
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <span className="text-[10px] text-gray-500">
                                                        {format(new Date(selectedItem.createdAt), 'h:mm a')}
                                                    </span>
                                                    {selectedItem.status === 'completed' && (
                                                        <CheckCircle className="w-3 h-3 text-blue-500" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Status Summary Bubble */}
                            <div className="flex justify-center">
                                <div className={`rounded-xl px-4 py-2 text-xs text-center shadow-sm ${selectedItem.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        selectedItem.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                            selectedItem.status === 'abandoned' || selectedItem.status === 'error' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
                                    }`}>
                                    {selectedItem.status === 'completed' && '✓ Response completed successfully'}
                                    {selectedItem.status === 'in_progress' && '⏳ Still in progress'}
                                    {(selectedItem.status === 'abandoned' || selectedItem.status === 'error') && '✗ Did not complete'}
                                    {selectedItem.status === 'draft' && '📝 Saved as draft'}
                                </div>
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-4">
                                    {getItemIdentifier(selectedItem) && (
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {getItemIdentifier(selectedItem)}
                                        </span>
                                    )}
                                    {activeDataSource === 'flows' && selectedItem.product && (
                                        <span className="flex items-center gap-1">
                                            <Package className="w-3 h-3" />
                                            {selectedItem.product.name}
                                        </span>
                                    )}
                                </div>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(selectedItem.createdAt), 'MMM d, yyyy')}
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-6">
                            <Eye className="w-12 h-12 text-green-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600">Select a response</h3>
                        <p className="text-sm text-gray-400 text-center mt-2 max-w-xs">
                            Click on any {activeDataSource === 'flows' ? 'WhatsApp flow response' : 'form submission'} from the list to view the details
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

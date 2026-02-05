import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    MessageSquare, Phone, Clock, RefreshCw, Filter,
    CheckCircle, X, ChevronDown, ChevronUp, Save,
    ShoppingCart, FileText, User, Calendar, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';

export default function AssignedOrders() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedItem, setExpandedItem] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all'); // all, pending, in_progress, completed
    const navigate = useNavigate();

    useEffect(() => {
        fetchAssignedItems();
    }, []);

    const fetchAssignedItems = async () => {
        setLoading(true);
        try {
            const res = await api.get('/whatsapp/assigned');
            const { messages, flows } = res.data.data || { messages: [], flows: [] };

            const combined = [
                ...(messages || []).map(m => ({
                    type: (m.metadata?.order || m.type === 'order') ? 'order' : 'message',
                    id: m._id,
                    name: m.fromName || m.from,
                    phone: m.from,
                    receivedAt: m.createdAt,
                    agentStatus: m.agentStatus || 'pending',
                    agentNotes: m.agentNotes,
                    agreedTo: m.agreedTo,
                    data: m
                })),
                ...(flows || []).map(f => ({
                    type: 'flow',
                    id: f._id,
                    name: f.fromName || f.from,
                    phone: f.from,
                    receivedAt: f.createdAt,
                    agentStatus: f.agentStatus || 'pending',
                    agentNotes: f.agentNotes,
                    agreedTo: f.agreedTo,
                    data: f
                }))
            ].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

            setItems(combined);
        } catch (error) {
            console.error('Error fetching assigned items:', error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (item, newStatus) => {
        try {
            const payload = {
                id: item.id,
                type: item.type,
                status: newStatus,
                notes: item.agentNotes
            };

            await api.post('/whatsapp/update-status', payload);

            // Optimistic update
            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, agentStatus: newStatus } : i
            ));
        } catch (error) {
            console.error('Error updating status:', error);
            fetchAssignedItems(); // Revert on error
        }
    };

    const handleNotesUpdate = async (item, notes) => {
        try {
            const payload = {
                id: item.id,
                type: item.type,
                status: item.agentStatus,
                notes: notes
            };

            await api.post('/whatsapp/update-status', payload);
            // Optimistic update
            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, agentNotes: notes } : i
            ));
        } catch (error) {
            console.error('Error updating notes:', error);
        }
    };

    const handleAgreedToUpdate = async (item, agreedToDate) => {
        try {
            const payload = {
                id: item.id,
                type: item.type,
                status: item.agentStatus,
                notes: item.agentNotes,
                agreedTo: agreedToDate || null
            };

            await api.post('/whatsapp/update-status', payload);
            // Optimistic update
            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, agreedTo: agreedToDate } : i
            ));
        } catch (error) {
            console.error('Error updating agreed to date:', error);
        }
    };

    const toggleExpand = (id) => {
        setExpandedItem(expandedItem === id ? null : id);
    };

    const filteredItems = items.filter(item => {
        if (statusFilter === 'all') return true;
        return (item.agentStatus || 'pending') === statusFilter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-yellow-100 text-yellow-800'; // pending
        }
    };

    const formatCurrency = (amount, currency = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Mobile Header */}
            <header className="bg-white shadow-sm px-4 py-3 sticky top-0 z-20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/worker/dashboard')}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Assigned Orders</h1>
                        <p className="text-xs text-gray-500">{items.length} total assignments</p>
                    </div>
                </div>
                <button
                    onClick={fetchAssignedItems}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            {/* Filters */}
            <div className="px-4 py-3 overflow-x-auto no-scrollbar">
                <div className="flex gap-2">
                    {['all', 'pending', 'in_progress', 'completed'].map(filter => (
                        <button
                            key={filter}
                            onClick={() => setStatusFilter(filter)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize transition-colors ${statusFilter === filter
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white text-gray-600 border border-gray-200'
                                }`}
                        >
                            {filter.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="px-4 space-y-3">
                {loading && items.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">Loading...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        No {statusFilter !== 'all' ? statusFilter : ''} items found
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Card Header */}
                            <div className="p-4" onClick={() => toggleExpand(item.id)}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${item.type === 'order' ? 'bg-orange-100 text-orange-600' :
                                            item.type === 'flow' ? 'bg-green-100 text-green-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>
                                            {item.type === 'order' ? <ShoppingCart className="w-4 h-4" /> :
                                                item.type === 'flow' ? <FileText className="w-4 h-4" /> :
                                                    <MessageSquare className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                                            <p className="text-xs text-gray-500">{item.phone}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item.agentStatus)}`}>
                                        {item.agentStatus}
                                    </span>
                                </div>

                                {/* Content Preview */}
                                <div className="text-sm text-gray-600 mb-3 border-l-2 border-gray-100 pl-3 py-1">
                                    {item.type === 'order' ? (
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {formatCurrency(
                                                    (item.data.metadata?.order?.product_items || []).reduce(
                                                        (sum, p) => sum + (p.item_price * p.quantity), 0
                                                    ),
                                                    item.data.metadata?.order?.product_items?.[0]?.currency || 'INR'
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(item.data.metadata?.order?.product_items || []).length} items
                                            </p>
                                        </div>
                                    ) : item.type === 'flow' ? (
                                        <div>
                                            <p className="font-medium">Form Submission</p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {item.data.flow_name || 'Details inside'}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="italic line-clamp-2">"{item.data.body}"</p>
                                    )}
                                </div>

                                {/* Actions Row */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = `tel:${item.phone}`;
                                        }}
                                        className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:bg-green-100 transition-colors"
                                    >
                                        <Phone className="w-3.5 h-3.5" /> Call
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/worker/chat', { state: { lead: { phone: item.phone, name: item.name } } });
                                        }}
                                        className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" /> Chat
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedItem === item.id && (
                                <div className="bg-gray-50 p-4 border-t border-gray-100 animate-in slide-in-from-top-2">

                                    {/* Status Updater */}
                                    <div className="mb-4">
                                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Status</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['pending', 'in_progress', 'completed', 'cancelled'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleStatusUpdate(item, s)}
                                                    className={`py-2 px-3 rounded-lg text-xs font-medium capitalize border ${item.agentStatus === s
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {s.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="mb-4">
                                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Notes</label>
                                        <textarea
                                            className="w-full text-sm p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                            rows="3"
                                            placeholder="Add private notes..."
                                            value={item.agentNotes || ''}
                                            onChange={(e) => {
                                                setItems(prev => prev.map(i =>
                                                    i.id === item.id ? { ...i, agentNotes: e.target.value } : i
                                                ));
                                            }}
                                            onBlur={(e) => handleNotesUpdate(item, e.target.value)}
                                        />
                                    </div>

                                    {/* Agreed To Date/Time */}
                                    <div className="mb-4">
                                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Customer Agreed To
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full text-sm p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                            value={item.agreedTo ? new Date(item.agreedTo).toISOString().slice(0, 16) : ''}
                                            onChange={(e) => {
                                                const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                                                setItems(prev => prev.map(i =>
                                                    i.id === item.id ? { ...i, agreedTo: newDate } : i
                                                ));
                                                handleAgreedToUpdate(item, newDate);
                                            }}
                                        />
                                        {item.agreedTo && (
                                            <p className="text-xs text-green-600 mt-1">
                                                Agreed on: {format(new Date(item.agreedTo), 'MMM d, yyyy h:mm a')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-right text-xs text-gray-400">
                                        Assigned on {format(new Date(item.receivedAt), 'MMM d, h:mm a')}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    ShoppingCart, User, Package, MessageCircle, X,
    Clock, CheckCircle, FileText, Loader2, RefreshCw, Eye, Phone, StickyNote, CheckSquare, Square, Users
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

export default function Orders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [flowResponses, setFlowResponses] = useState([]);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailModal, setDetailModal] = useState(null);
    const [agents, setAgents] = useState([]);
    const [assignModal, setAssignModal] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [bulkAssignModal, setBulkAssignModal] = useState(false);

    useEffect(() => {
        fetchAllData();
        fetchAgents();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [ordersRes, flowsRes, messagesRes] = await Promise.all([
                api.get('/whatsapp/orders'),
                api.get('/whatsapp/flow-responses'),
                api.get('/whatsapp/messages')
            ]);
            setOrders(ordersRes.data.data || []);
            setFlowResponses(flowsRes.data.data || []);
            setMessages(messagesRes.data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgents = async () => {
        try {
            const res = await api.get('/workers');
            setAgents(res.data.data || []);
        } catch (error) {
            console.error('Error fetching agents:', error);
        }
    };

    const handleAssign = async (agentId) => {
        if (!assignModal) return;

        try {
            const payload = { userId: agentId };
            if (assignModal.order) payload.orderId = assignModal.order._id;
            if (assignModal.flow) payload.flowId = assignModal.flow._id;
            if (assignModal.type === 'message') payload.messageId = assignModal.id;

            await api.post('/whatsapp/assign', payload);
            setAssignModal(null);
            fetchAllData();
        } catch (error) {
            console.error('Assignment error:', error);
        }
    };

    const getAssignmentDetails = (item) => {
        const source = item.order || item.flow || (item.type === 'message' ? item.data : null);
        if (!source) return { assignedTo: null, status: '-', agreedTo: null, notes: '' };

        return {
            assignedTo: source.assignedTo,
            status: source.agentStatus || 'pending',
            agreedTo: source.agreedTo,
            notes: source.agentNotes || ''
        };
    };

    const getAgentName = (id) => {
        const agent = agents.find(a => a._id === id);
        return agent ? agent.name : 'Unknown';
    };

    const toggleSelectItem = (itemId) => {
        setSelectedItems(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const toggleSelectAll = (items) => {
        if (selectedItems.length === items.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(items.map(item => item.id));
        }
    };

    const handleBulkAssign = async (agentId) => {
        if (selectedItems.length === 0) return;

        try {
            // Find the items and assign them
            const assignPromises = selectedItems.map(itemId => {
                const item = allItems.find(i => i.id === itemId);
                if (!item) return Promise.resolve();

                const payload = { userId: agentId };
                if (item.order) payload.orderId = item.order._id;
                if (item.flow) payload.flowId = item.flow._id;
                if (item.type === 'message') payload.messageId = item.id;

                return api.post('/whatsapp/assign', payload);
            });

            await Promise.all(assignPromises);
            setSelectedItems([]);
            setBulkAssignModal(false);
            fetchAllData();
        } catch (error) {
            console.error('Bulk assignment error:', error);
        }
    };

    const allItems = useMemo(() => {
        const rawItems = [];

        orders.forEach(order => {
            rawItems.push({
                rawType: 'order',
                data: order,
                id: order._id,
                timestamp: new Date(order.timestamp || order.createdAt),
                phone: order.from,
                name: order.fromName || order.from
            });
        });

        flowResponses.forEach(flow => {
            rawItems.push({
                rawType: 'flow',
                data: flow,
                id: flow._id,
                timestamp: new Date(flow.createdAt),
                phone: flow.from,
                name: flow.fromName || flow.from
            });
        });

        messages.forEach(msg => {
            if (msg.direction === 'incoming' && msg.type === 'text') {
                rawItems.push({
                    rawType: 'message',
                    data: msg,
                    id: msg._id,
                    timestamp: new Date(msg.createdAt),
                    phone: msg.from,
                    name: msg.fromName || msg.from,
                    body: msg.body
                });
            }
        });

        rawItems.sort((a, b) => a.timestamp - b.timestamp);

        const mergedItems = [];
        const lastUserItem = {};

        rawItems.forEach(item => {
            const phone = item.phone;
            const prevItem = lastUserItem[phone];
            const isRecent = prevItem && differenceInMinutes(item.timestamp, prevItem.timestamp) < 30;

            if (item.rawType === 'message') {
                const newItem = {
                    type: 'message',
                    id: item.id,
                    timestamp: item.timestamp,
                    phone: item.phone,
                    name: item.name,
                    keyword: item.body,
                    order: null,
                    flow: null,
                    data: item.data
                };
                mergedItems.push(newItem);
                lastUserItem[phone] = newItem;
            } else if (item.rawType === 'flow') {
                if (prevItem && prevItem.type === 'message' && isRecent) {
                    prevItem.type = 'flow';
                    prevItem.flow = item.data;
                    prevItem.flowTimestamp = item.timestamp;
                    prevItem.timestamp = item.timestamp;
                    prevItem.id = item.id;
                } else {
                    const newItem = {
                        type: 'flow',
                        id: item.id,
                        timestamp: item.timestamp,
                        phone: item.phone,
                        name: item.name,
                        keyword: '-',
                        order: null,
                        flow: item.data,
                        flowTimestamp: item.timestamp
                    };
                    mergedItems.push(newItem);
                    lastUserItem[phone] = newItem;
                }
            } else if (item.rawType === 'order') {
                if (prevItem && (prevItem.type === 'message' || prevItem.type === 'flow') && isRecent) {
                    prevItem.type = 'order';
                    prevItem.order = item.data;
                    prevItem.timestamp = item.timestamp;
                    prevItem.id = item.id;
                } else {
                    const newItem = {
                        type: 'order',
                        id: item.id,
                        timestamp: item.timestamp,
                        phone: item.phone,
                        name: item.name,
                        keyword: '-',
                        order: item.data,
                        flow: null
                    };
                    mergedItems.push(newItem);
                    lastUserItem[phone] = newItem;
                }
            }
        });

        return mergedItems.sort((a, b) => b.timestamp - a.timestamp);
    }, [orders, flowResponses, messages]);

    const formatCurrency = (amount, currency = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const handlePhoneClick = (phone, name) => {
        navigate('/chats', {
            state: {
                lead: { phone, name }
            }
        });
    };

    const getStatus = (item, hasOrder, hasFlow) => {
        if (hasOrder && hasFlow && item.flow.status === 'completed') {
            return { label: 'Paid', color: 'bg-green-100 text-green-700' };
        }
        if ((hasOrder && (!hasFlow || item.flow.status !== 'completed')) ||
            (hasFlow && item.flow.status === 'in_progress')) {
            return { label: 'Waiting', color: 'bg-yellow-100 text-yellow-700' };
        }
        if (hasFlow && item.flow.status === 'completed' && !hasOrder) {
            return { label: 'Completed', color: 'bg-blue-100 text-blue-700' };
        }
        if (item.type === 'message') {
            return { label: 'Inquiry', color: 'bg-gray-100 text-gray-600' };
        }
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-600' };
    };

    return (
        <div className="h-full bg-gray-100 p-6 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders & Responses</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        View and manage all customer orders and form entries
                    </p>
                </div>
                <button
                    onClick={fetchAllData}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Bulk Action Toolbar */}
            {selectedItems.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-900">
                            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedItems([])}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-white rounded-lg transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => setBulkAssignModal(true)}
                            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                            <Users className="w-4 h-4" />
                            Bulk Assign
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-4 w-10">
                                    <button
                                        onClick={() => toggleSelectAll(allItems)}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    >
                                        {selectedItems.length === allItems.length && allItems.length > 0 ? (
                                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                                        ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Keyword</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Form</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned To</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agreed To</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="12" className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                        </div>
                                    </td>
                                </tr>
                            ) : allItems.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="px-6 py-12 text-center text-gray-400">
                                        No orders or responses found
                                    </td>
                                </tr>
                            ) : (
                                allItems.map((item) => {
                                    const hasOrder = !!item.order;
                                    const hasFlow = !!item.flow;
                                    const status = getStatus(item, hasOrder, hasFlow);
                                    const assignment = getAssignmentDetails(item);
                                    const isSelected = selectedItems.includes(item.id);

                                    return (
                                        <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}>
                                            {/* Checkbox */}
                                            <td className="px-4 py-4 w-10">
                                                <button
                                                    onClick={() => toggleSelectItem(item.id)}
                                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {format(item.timestamp, 'MMM d, yyyy')}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {format(item.timestamp, 'h:mm a')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${item.type === 'order' ? 'bg-orange-500' :
                                                            item.type === 'flow' ? 'bg-green-500' : 'bg-gray-500'
                                                            }`}>
                                                            {item.name?.[0]?.toUpperCase() || <User className="w-3 h-3" />}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handlePhoneClick(item.phone, item.name)}
                                                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors w-fit"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        {item.phone}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 font-medium max-w-[200px] break-words">
                                                    {item.keyword}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {hasFlow ? (
                                                    <button
                                                        onClick={() => setDetailModal({
                                                            type: 'flow',
                                                            data: item.flow,
                                                            name: item.name,
                                                            phone: item.phone,
                                                            timestamp: item.flowTimestamp || item.timestamp
                                                        })}
                                                        className="text-xs inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                                                    >
                                                        <FileText className="w-3 h-3" />
                                                        View Form
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {hasOrder ? (
                                                    <div className="text-sm">
                                                        <div className="font-medium text-gray-900">
                                                            {formatCurrency(
                                                                (item.order.metadata?.order?.product_items || []).reduce(
                                                                    (sum, p) => sum + (p.item_price * p.quantity), 0
                                                                ),
                                                                item.order.metadata?.order?.product_items?.[0]?.currency || 'INR'
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                                            {(item.order.metadata?.order?.product_items || []).length} items
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Assigned To */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {assignment.assignedTo ? (
                                                    <button
                                                        onClick={() => setAssignModal(item)}
                                                        className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded transition-colors"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                                            {getAgentName(assignment.assignedTo)?.[0]}
                                                        </div>
                                                        <span className="text-sm text-gray-700">{getAgentName(assignment.assignedTo)}</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setAssignModal(item)}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-2 py-1 rounded transition-colors"
                                                    >
                                                        + Assign
                                                    </button>
                                                )}
                                            </td>

                                            {/* Agent Status */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-xs font-medium capitalize px-2 py-1 rounded-full ${assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                        assignment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {assignment.status}
                                                </span>
                                            </td>

                                            {/* Agreed To */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {assignment.agreedTo ? (
                                                    <div className="text-xs text-gray-700">
                                                        {format(new Date(assignment.agreedTo), 'MMM d, h:mm a')}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Notes */}
                                            <td className="px-6 py-4">
                                                {assignment.notes ? (
                                                    <div className="flex items-start gap-1 max-w-[150px]" title={assignment.notes}>
                                                        <StickyNote className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                                                        <span className="text-xs text-gray-600 line-clamp-2">{assignment.notes}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {hasOrder && (
                                                    <button
                                                        onClick={() => setDetailModal({
                                                            type: 'order',
                                                            data: item.order,
                                                            name: item.name,
                                                            phone: item.phone,
                                                            timestamp: item.timestamp
                                                        })}
                                                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                        title="View Order"
                                                    >
                                                        <ShoppingCart className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {hasFlow && !hasOrder && (
                                                    <button
                                                        onClick={() => setDetailModal({
                                                            type: 'flow',
                                                            data: item.flow,
                                                            name: item.name,
                                                            phone: item.phone,
                                                            timestamp: item.timestamp
                                                        })}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Form"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
                    <span>Showing {allItems.length} records</span>
                </div>
            </div>

            {/* Assignments Modal */}
            {assignModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setAssignModal(null)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Assign To Agent</h3>
                            <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-2">
                                {agents.map(agent => (
                                    <button
                                        key={agent._id}
                                        onClick={() => handleAssign(agent._id)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                            {agent.name?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{agent.name}</div>
                                            <div className="text-xs text-gray-500">{agent.role}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detailModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDetailModal(null)}>
                    <div
                        className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`p-4 ${detailModal.type === 'order' ? 'bg-orange-500' : 'bg-green-500'} flex-shrink-0`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                        {detailModal.type === 'order' ? (
                                            <ShoppingCart className="w-5 h-5" />
                                        ) : (
                                            <MessageCircle className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">
                                            {detailModal.type === 'order' ? 'Order Details' : 'Form Response'}
                                        </h3>
                                        <p className="text-white/80 text-xs">
                                            {format(detailModal.timestamp, 'MMMM d, yyyy • h:mm a')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailModal(null)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                            {detailModal.type === 'order' ? (
                                <div className="space-y-6">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">Items Ordered</h4>
                                                <p className="text-xs text-gray-500">
                                                    Order ID: #{detailModal.data.messageId?.slice(-6) || detailModal.data._id?.slice(-6)}
                                                </p>
                                            </div>
                                            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">
                                                Catalog
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {(detailModal.data.metadata?.order?.product_items || []).map((product, pIdx) => (
                                                <div key={pIdx} className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <Package className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-medium text-sm text-gray-900 truncate">
                                                            {product.name || `Product ${product.product_retailer_id}`}
                                                        </h5>
                                                        <p className="text-xs text-gray-500">
                                                            {product.quantity} x {formatCurrency(product.item_price, product.currency)}
                                                        </p>
                                                    </div>
                                                    <span className="font-semibold text-sm text-gray-900">
                                                        {formatCurrency(product.item_price * product.quantity, product.currency)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-600">Total Amount</span>
                                            <span className="text-lg font-bold text-orange-600">
                                                {formatCurrency(
                                                    (detailModal.data.metadata?.order?.product_items || []).reduce(
                                                        (sum, p) => sum + (p.item_price * p.quantity), 0
                                                    ),
                                                    detailModal.data.metadata?.order?.product_items?.[0]?.currency || 'INR'
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <h4 className="font-semibold text-gray-900 mb-3 text-sm">Customer</h4>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                                                {detailModal.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">{detailModal.name}</p>
                                                <button
                                                    onClick={() => {
                                                        setDetailModal(null);
                                                        handlePhoneClick(detailModal.phone, detailModal.name);
                                                    }}
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                                                >
                                                    <Phone className="w-3 h-3" />
                                                    {detailModal.phone}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-gray-900">Response Data</h4>
                                            <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${detailModal.data.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                detailModal.data.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {detailModal.data.status || 'Completed'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2">
                                            {detailModal.data.response_json && (
                                                Object.entries(detailModal.data.response_json).map(([key, value]) => (
                                                    <div key={key} className="bg-gray-50 p-3 rounded-lg">
                                                        <span className="text-xs font-medium text-gray-500 uppercase block mb-1">
                                                            {key.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-sm text-gray-900 font-medium">
                                                            {Array.isArray(value) ? value.join(', ') : String(value)}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Assign Modal */}
            {bulkAssignModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Users className="w-6 h-6 text-white" />
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Bulk Assign</h3>
                                        <p className="text-indigo-200 text-sm">{selectedItems.length} items selected</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setBulkAssignModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">Select an agent to assign the selected items:</p>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {agents.map(agent => (
                                    <button
                                        key={agent._id}
                                        onClick={() => handleBulkAssign(agent._id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {agent.name?.[0]?.toUpperCase() || 'A'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{agent.name}</p>
                                            <p className="text-xs text-gray-500">{agent.role || 'Agent'}</p>
                                        </div>
                                    </button>
                                ))}
                                {agents.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">No agents available</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

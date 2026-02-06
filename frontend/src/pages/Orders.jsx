import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    ShoppingCart, User, Package, MessageCircle, X,
    Clock, CheckCircle, FileText, Loader2, RefreshCw, Eye, Phone, StickyNote, CheckSquare, Square, Users,
    Search, Calendar, Download, Share2, MessageSquare
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import * as XLSX from 'xlsx';

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



    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchAllData();
        }, 800);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, startDate, endDate]);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const params = {
                search: searchTerm,
                startDate: startDate,
                endDate: endDate
            };

            const [ordersRes, flowsRes, messagesRes] = await Promise.all([
                api.get('/whatsapp/orders', { params }),
                api.get('/whatsapp/flow-responses', { params }), // Assuming backend supports params or ignores them
                api.get('/whatsapp/messages', { params }) // Assuming backend supports params or ignores them
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
                        keyword: item.data.flowId || '-',
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
        // Open WhatsApp Chat directly
        window.open(`https://wa.me/${phone}`, '_blank');
    };

    const handleShareOrder = (item) => {
        const products = item.order.metadata?.order?.product_items || [];
        const total = formatCurrency(
            products.reduce((sum, p) => sum + (p.item_price * p.quantity), 0),
            products[0]?.currency || 'INR'
        );

        const productList = products.map(p => `${p.quantity}x ${p.name || 'Product'}`).join('\n');

        const message = `Hello ${item.name},\nHere are the details of your incomplete order:\n\n${productList}\n\nTotal: ${total}\n\nPlease let us know if you need any assistance completing this order.`;

        const url = `https://wa.me/${item.phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleExportExcel = () => {
        const dataToExport = allItems.map(item => {
            const products = item.order?.metadata?.order?.product_items || [];
            const productNames = products.map(p => p.name).join(', ');
            const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);

            return {
                Date: format(item.timestamp, 'yyyy-MM-dd HH:mm'),
                'Customer Name': item.name,
                'Contact Number': item.phone,
                Type: item.type,
                Status: item.order ? 'Order' : (item.flow ? 'Form' : 'Message'),
                'Payment Status': item.order?.metadata?.order?.payment_status || 'Pending',
                'Product Name': productNames || '-',
                'Qty': totalQty || 0,
                'Address': item.order?.metadata?.order?.address || '-',
                'Assigned To': getAssignmentDetails(item).assignedTo ? getAgentName(getAssignmentDetails(item).assignedTo) : 'Unassigned',
                'Agent Status': getAssignmentDetails(item).status
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Orders");
        XLSX.writeFile(wb, `Orders_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
            // Check if responseData has meaningful data
            const data = item.flow.responseData || {};
            const keys = Object.keys(data).filter(k => k !== 'flow_token' && k !== 'flow_id');

            if (keys.length === 0) {
                return { label: 'Incomplete', color: 'bg-red-100 text-red-700' };
            }
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
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Orders & Responses</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            View and manage all customer orders and form entries
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export Excel
                        </button>
                        <button
                            onClick={fetchAllData}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
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
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Number</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Keyword</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Form</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned To</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
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

                                            {/* Customer Name */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${item.type === 'order' ? 'bg-orange-500' :
                                                        item.type === 'flow' ? 'bg-green-500' : 'bg-gray-500'
                                                        }`}>
                                                        {item.name?.[0]?.toUpperCase() || <User className="w-3 h-3" />}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                                </div>
                                            </td>

                                            {/* Contact Number */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handlePhoneClick(item.phone, item.name)}
                                                    className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-green-600 transition-colors"
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    {item.phone}
                                                </button>
                                            </td>

                                            {/* Keyword */}
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 font-medium max-w-[200px] break-words">
                                                    {item.keyword}
                                                </div>
                                            </td>

                                            {/* Form */}
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

                                            {/* Payment Status */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {hasOrder ? (
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${item.order.metadata?.order?.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {item.order.metadata?.order?.payment_status || 'Pending'}
                                                    </span>
                                                ) : '-'}
                                            </td>

                                            {/* Product Name */}
                                            <td className="px-6 py-4">
                                                {hasOrder ? (
                                                    <div className="text-sm text-gray-900 max-w-[200px] truncate" title={(item.order.metadata?.order?.product_items || []).map(p => p.name).join(', ')}>
                                                        {(item.order.metadata?.order?.product_items || [])[0]?.name}
                                                        {(item.order.metadata?.order?.product_items || []).length > 1 && ` +${(item.order.metadata?.order?.product_items || []).length - 1} more`}
                                                    </div>
                                                ) : '-'}
                                            </td>

                                            {/* Qty */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {hasOrder ? (
                                                    <div className="text-sm text-gray-900">
                                                        {(item.order.metadata?.order?.product_items || []).reduce((sum, p) => sum + (p.quantity || 0), 0)}
                                                    </div>
                                                ) : '-'}
                                            </td>

                                            {/* Address */}
                                            <td className="px-6 py-4">
                                                {hasOrder ? (
                                                    <div className="text-sm text-gray-500 max-w-[150px] truncate" title={item.order.metadata?.order?.address}>
                                                        {item.order.metadata?.order?.address || '-'}
                                                    </div>
                                                ) : '-'}
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


                                            {/* Notes */}


                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {hasOrder && (
                                                    <>
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
                                                        <button
                                                            onClick={() => handleShareOrder(item)}
                                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Share Order via WhatsApp"
                                                        >
                                                            <Share2 className="w-4 h-4" />
                                                        </button>
                                                    </>
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

                                            {(() => {
                                                const rawData = detailModal.data.responseData || {};
                                                const keys = Object.keys(rawData).filter(k => k !== 'flow_token' && k !== 'flow_id');
                                                const isCompleted = keys.length > 0;
                                                const statusColor = isCompleted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
                                                const statusLabel = isCompleted ? 'Completed' : 'Incomplete';

                                                return (
                                                    <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${statusColor}`}>
                                                        {statusLabel}
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <div className="grid grid-cols-1 gap-2">
                                            {detailModal.data.responseData && (
                                                Object.entries(detailModal.data.responseData)
                                                    .filter(([key]) => key !== 'flow_token' && key !== 'flow_id')
                                                    .map(([key, value]) => (
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

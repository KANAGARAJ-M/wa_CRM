import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/axios';
import {
    ShoppingCart, Calendar, User, Package, MessageCircle, X,
    Clock, CheckCircle, AlertCircle, FileText, ChevronRight, ChevronDown,
    Loader2, RefreshCw, Eye, Zap, Phone, ShoppingBag, Send, Paperclip
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [flowResponses, setFlowResponses] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState({});
    const [detailModal, setDetailModal] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    // Scroll to bottom when customer changes or new messages
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedCustomer, chatMessages]);

    // Fetch chat messages when customer is selected
    useEffect(() => {
        if (selectedCustomer) {
            fetchChatMessages(selectedCustomer.phone);
        }
    }, [selectedCustomer]);

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // Fetch WhatsApp catalog orders
            const ordersRes = await api.get('/whatsapp/orders', { params: { limit: 200 } });
            setOrders(ordersRes.data.data || []);

            // Also fetch flow responses
            const flowsRes = await api.get('/whatsapp/flow-responses', { params: { limit: 200 } });
            setFlowResponses(flowsRes.data.data || []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatMessages = async (phone) => {
        try {
            const res = await api.get('/whatsapp/messages', {
                params: { phone, limit: 100 }
            });
            setChatMessages(res.data.data || []);
        } catch (error) {
            console.error('Error fetching chat messages:', error);
            setChatMessages([]);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedCustomer || sendingMessage) return;

        try {
            setSendingMessage(true);
            await api.post('/whatsapp/send', {
                phone: selectedCustomer.phone,
                message: newMessage
            });
            setNewMessage('');
            // Refresh chat messages
            fetchChatMessages(selectedCustomer.phone);
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            setSendingMessage(false);
        }
    };

    // Group orders and flows by customer phone
    const customerGroups = useMemo(() => {
        const groups = {};

        // Add catalog orders
        orders.forEach(order => {
            const phone = order.from;
            if (!groups[phone]) {
                groups[phone] = {
                    phone,
                    name: order.fromName || phone,
                    items: [],
                    lastActivity: order.timestamp || order.createdAt
                };
            }
            groups[phone].items.push({
                type: 'order',
                data: order,
                timestamp: new Date(order.timestamp || order.createdAt)
            });
            const ts = new Date(order.timestamp || order.createdAt);
            if (ts > new Date(groups[phone].lastActivity)) {
                groups[phone].lastActivity = order.timestamp || order.createdAt;
            }
        });

        // Add flow responses
        flowResponses.forEach(flow => {
            const phone = flow.from;
            if (!groups[phone]) {
                groups[phone] = {
                    phone,
                    name: flow.fromName || phone,
                    items: [],
                    lastActivity: flow.createdAt
                };
            }
            groups[phone].items.push({
                type: 'flow',
                data: flow,
                timestamp: new Date(flow.createdAt)
            });
            const ts = new Date(flow.createdAt);
            if (ts > new Date(groups[phone].lastActivity)) {
                groups[phone].lastActivity = flow.createdAt;
                groups[phone].name = flow.fromName || groups[phone].name;
            }
        });

        // Sort items within each group by timestamp ASCENDING (oldest first - like WhatsApp)
        Object.values(groups).forEach(group => {
            group.items.sort((a, b) => a.timestamp - b.timestamp);
        });

        // Convert to array and sort by last activity (newest customers first)
        return Object.values(groups).sort((a, b) =>
            new Date(b.lastActivity) - new Date(a.lastActivity)
        );
    }, [orders, flowResponses]);

    const toggleOrderExpand = (itemId) => {
        setExpandedOrders(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const formatCurrency = (amount, currency = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency
        }).format(amount / 1000);
    };

    const formatFieldValue = (value) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    };

    const openDetailModal = (item) => {
        setDetailModal(item);
    };

    return (
        <div className="h-full bg-gradient-to-br from-slate-50 to-gray-100 flex overflow-hidden">
            {/* Left Panel - Customer List */}
            <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${selectedCustomer ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <ShoppingBag className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Orders & Responses</h1>
                                <p className="text-xs text-white/70">{customerGroups.length} customers</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchAllData}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : customerGroups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-6">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <ShoppingCart className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium">No orders yet</p>
                            <p className="text-xs text-gray-400 text-center mt-1">
                                Customer orders and form responses will appear here
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {customerGroups.map((customer) => {
                                const orderCount = customer.items.filter(i => i.type === 'order').length;
                                const flowCount = customer.items.filter(i => i.type === 'flow').length;

                                return (
                                    <div
                                        key={customer.phone}
                                        onClick={() => setSelectedCustomer(customer)}
                                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${selectedCustomer?.phone === customer.phone ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                    {customer.name[0]?.toUpperCase() || <User className="w-5 h-5" />}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                                                    {customer.items.length}
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                                                        {customer.name}
                                                    </h3>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                        {formatDistanceToNow(new Date(customer.lastActivity), { addSuffix: true })}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {customer.phone}
                                                </p>

                                                <div className="flex items-center gap-2 mt-2">
                                                    {orderCount > 0 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                                                            <ShoppingCart className="w-3 h-3" />
                                                            {orderCount}
                                                        </span>
                                                    )}
                                                    {flowCount > 0 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                                                            <Zap className="w-3 h-3" />
                                                            {flowCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Customer Orders as Chat */}
            <div className={`flex-1 flex flex-col bg-gray-50 ${selectedCustomer ? 'flex' : 'hidden md:flex'}`}>
                {selectedCustomer ? (
                    <>
                        {/* Detail Header */}
                        <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedCustomer(null)}
                                        className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 rotate-180" />
                                    </button>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                                        {selectedCustomer.name[0]?.toUpperCase() || <User className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-gray-900 text-sm">{selectedCustomer.name}</h2>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {selectedCustomer.phone}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                        {selectedCustomer.items.length} activities
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Chat-like Orders Display - OLDEST FIRST (like WhatsApp) */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'linear-gradient(180deg, #e5ddd5 0%, #d9d2c5 100%)' }}>
                            {selectedCustomer.items.map((item, idx) => {
                                const isOrder = item.type === 'order';
                                const isExpanded = expandedOrders[item.data._id];
                                const prevItem = selectedCustomer.items[idx - 1];
                                const showDate = idx === 0 || (prevItem && format(item.timestamp, 'yyyy-MM-dd') !== format(prevItem.timestamp, 'yyyy-MM-dd'));

                                if (isOrder) {
                                    const orderData = item.data.metadata?.order || {};
                                    const products = orderData.product_items || [];
                                    const totalAmount = products.reduce((sum, p) => sum + (p.item_price * p.quantity), 0);
                                    const currency = products[0]?.currency || 'INR';

                                    return (
                                        <div key={item.data._id} className="flex flex-col gap-2">
                                            {showDate && (
                                                <div className="flex justify-center my-2">
                                                    <span className="bg-white/80 text-gray-500 text-[10px] px-3 py-1 rounded-full shadow-sm">
                                                        {format(item.timestamp, 'MMMM d, yyyy')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Order Card - Customer's order (right side) */}
                                            <div className="flex justify-end">
                                                <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%] shadow-sm">
                                                    <div
                                                        className="flex items-center gap-2 mb-2 cursor-pointer"
                                                        onClick={() => openDetailModal(item)}
                                                    >
                                                        <ShoppingCart className="w-4 h-4 text-orange-600" />
                                                        <span className="text-xs font-semibold text-orange-600">Catalog Order</span>
                                                        <Eye className="w-3.5 h-3.5 text-blue-500 ml-auto" />
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        {products.slice(0, 2).map((product, pIdx) => (
                                                            <div key={pIdx} className="flex items-center justify-between text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-5 h-5 bg-white rounded flex items-center justify-center text-xs font-bold text-gray-600">
                                                                        {product.quantity}
                                                                    </span>
                                                                    <span className="text-gray-800 truncate max-w-[150px]">
                                                                        {product.name || `Item`}
                                                                    </span>
                                                                </div>
                                                                <span className="text-gray-600 text-xs">
                                                                    {formatCurrency(product.item_price * product.quantity, currency)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {products.length > 2 && (
                                                            <p className="text-xs text-blue-600">+{products.length - 2} more items</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-green-200">
                                                        <span className="text-xs font-medium text-gray-600">Total</span>
                                                        <span className="font-bold text-gray-800">{formatCurrency(totalAmount, currency)}</span>
                                                    </div>

                                                    <div className="flex items-center justify-end gap-1 mt-2">
                                                        <span className="text-[10px] text-gray-500">
                                                            {format(item.timestamp, 'h:mm a')}
                                                        </span>
                                                        <CheckCircle className="w-3 h-3 text-blue-500" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // Flow Response
                                    const fields = item.data.parsedFields || [];
                                    const status = item.data.status || 'completed';

                                    return (
                                        <div key={item.data._id} className="flex flex-col gap-2">
                                            {showDate && (
                                                <div className="flex justify-center my-2">
                                                    <span className="bg-white/80 text-gray-500 text-[10px] px-3 py-1 rounded-full shadow-sm">
                                                        {format(item.timestamp, 'MMMM d, yyyy')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Flow Card */}
                                            <div className="flex justify-end">
                                                <div className={`rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%] shadow-sm ${status === 'completed' ? 'bg-[#dcf8c6]' :
                                                        status === 'in_progress' ? 'bg-yellow-100' :
                                                            status === 'draft' ? 'bg-gray-100' :
                                                                'bg-red-50'
                                                    }`}>
                                                    <div
                                                        className="flex items-center gap-2 mb-2 cursor-pointer"
                                                        onClick={() => openDetailModal(item)}
                                                    >
                                                        <MessageCircle className="w-4 h-4 text-green-600" />
                                                        <span className="text-xs font-semibold text-green-600">
                                                            {item.data.product?.name || 'Form Response'}
                                                        </span>
                                                        <Eye className="w-3.5 h-3.5 text-blue-500 ml-auto" />
                                                    </div>

                                                    <div className="space-y-1">
                                                        {fields.slice(0, 3).map((field, fIdx) => (
                                                            <div key={fIdx} className="text-sm">
                                                                <span className="text-gray-500 text-xs">{field.fieldName}:</span>
                                                                <span className="text-gray-800 ml-1 text-xs">{formatFieldValue(field.fieldValue)}</span>
                                                            </div>
                                                        ))}
                                                        {fields.length > 3 && (
                                                            <p className="text-xs text-blue-600">+{fields.length - 3} more fields</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${status === 'completed' ? 'bg-green-200 text-green-700' :
                                                                status === 'in_progress' ? 'bg-yellow-200 text-yellow-700' :
                                                                    status === 'draft' ? 'bg-gray-200 text-gray-600' :
                                                                        'bg-red-200 text-red-700'
                                                            }`}>
                                                            {status === 'in_progress' ? 'Incomplete' : status}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-gray-500">
                                                                {format(item.timestamp, 'h:mm a')}
                                                            </span>
                                                            {status === 'completed' && <CheckCircle className="w-3 h-3 text-blue-500" />}
                                                            {status === 'in_progress' && <Clock className="w-3 h-3 text-yellow-500" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            })}

                            {selectedCustomer.items.length === 0 && (
                                <div className="flex justify-center">
                                    <span className="bg-white/80 text-gray-500 text-xs px-4 py-2 rounded-lg shadow-sm">
                                        No orders or responses yet
                                    </span>
                                </div>
                            )}

                            {/* Scroll anchor */}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-3 bg-gray-100 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 flex items-center bg-white rounded-full px-4 py-2 shadow-sm">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        className="flex-1 text-sm outline-none bg-transparent"
                                    />
                                </div>
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim() || sendingMessage}
                                    className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sendingMessage ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-6">
                            <Eye className="w-12 h-12 text-orange-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600">Select a customer</h3>
                        <p className="text-sm text-gray-400 text-center mt-2 max-w-xs">
                            Click on any customer from the list to view their orders and chat
                        </p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {detailModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailModal(null)}>
                    <div
                        className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`p-4 ${detailModal.type === 'order' ? 'bg-orange-500' : 'bg-green-500'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-white">
                                    {detailModal.type === 'order' ? (
                                        <ShoppingCart className="w-5 h-5" />
                                    ) : (
                                        <MessageCircle className="w-5 h-5" />
                                    )}
                                    <div>
                                        <h3 className="font-bold">
                                            {detailModal.type === 'order' ? 'Order Details' : 'Form Response Details'}
                                        </h3>
                                        <p className="text-xs text-white/70">
                                            {format(detailModal.timestamp, 'MMMM d, yyyy h:mm a')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailModal(null)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            {detailModal.type === 'order' ? (
                                // Order Details
                                <div className="space-y-4">
                                    <div className="text-sm text-gray-500">
                                        Order ID: {detailModal.data.messageId || detailModal.data._id}
                                    </div>

                                    {(detailModal.data.metadata?.order?.product_items || []).map((product, pIdx) => (
                                        <div key={pIdx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                                <Package className="w-6 h-6 text-orange-500" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">
                                                    {product.name || `Product ${product.product_retailer_id}`}
                                                </h4>
                                                <p className="text-xs text-gray-500">
                                                    Qty: {product.quantity} × {formatCurrency(product.item_price, product.currency)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-gray-900">
                                                    {formatCurrency(product.item_price * product.quantity, product.currency)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                                        <span className="font-medium text-gray-700">Total Amount</span>
                                        <span className="font-bold text-xl text-orange-600">
                                            {formatCurrency(
                                                (detailModal.data.metadata?.order?.product_items || []).reduce(
                                                    (sum, p) => sum + (p.item_price * p.quantity), 0
                                                ),
                                                detailModal.data.metadata?.order?.product_items?.[0]?.currency || 'INR'
                                            )}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                // Flow Response Details
                                <div className="space-y-4">
                                    {detailModal.data.product && (
                                        <div className="p-3 bg-green-50 rounded-xl">
                                            <span className="text-xs text-green-600 font-medium">Product</span>
                                            <p className="font-medium text-gray-900">{detailModal.data.product.name}</p>
                                        </div>
                                    )}

                                    {detailModal.data.flowId && (
                                        <div className="text-sm text-gray-500">
                                            Flow ID: {detailModal.data.flowId}
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {(detailModal.data.parsedFields || []).map((field, fIdx) => (
                                            <div key={fIdx} className="p-3 bg-gray-50 rounded-xl">
                                                <span className="text-xs text-gray-500 uppercase tracking-wide">{field.fieldName}</span>
                                                <p className="font-medium text-gray-900 mt-1">{formatFieldValue(field.fieldValue)}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className={`p-3 rounded-xl ${detailModal.data.status === 'completed' ? 'bg-green-100' :
                                            detailModal.data.status === 'in_progress' ? 'bg-yellow-100' :
                                                'bg-gray-100'
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            {detailModal.data.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                                            {detailModal.data.status === 'in_progress' && <Clock className="w-5 h-5 text-yellow-600" />}
                                            {detailModal.data.status === 'draft' && <FileText className="w-5 h-5 text-gray-600" />}
                                            <span className="font-medium capitalize">{detailModal.data.status || 'Completed'}</span>
                                        </div>
                                        {detailModal.data.status === 'in_progress' && (
                                            <p className="text-xs text-yellow-700 mt-1">
                                                Customer started but hasn't completed all steps
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

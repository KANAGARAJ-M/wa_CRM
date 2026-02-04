import { useState, useEffect } from 'react';
import api from '../api/axios';
import { ShoppingCart, Calendar, User, ChevronRight, Package, MessageCircle } from 'lucide-react';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        fetchOrders();
    }, [page]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/whatsapp/orders', {
                params: { page, limit: 20 }
            });
            setOrders(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="h-full bg-gray-50 flex flex-col p-6 overflow-hidden">
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-green-600" />
                        WhatsApp Orders
                    </h1>
                    <p className="text-gray-500">View orders received directly via WhatsApp Catalog</p>
                </div>
            </header>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50/50 font-medium text-gray-500 text-sm">
                    <div className="col-span-3">Customer</div>
                    <div className="col-span-4">Items</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-3 text-right">Date</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
                            <p>No orders received yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {orders.map((order) => {
                                const orderData = order.metadata?.order || {};
                                const items = orderData.product_items || [];
                                const totalAmount = items.reduce((sum, item) => sum + (item.item_price * item.quantity), 0);
                                const currency = items[0]?.currency || 'USD';

                                return (
                                    <div key={order._id} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors items-center group">
                                        <div className="col-span-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                                                    {order.fromName ? order.fromName[0] : <User className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{order.fromName || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <MessageCircle className="w-3 h-3" />
                                                        {order.from}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-4">
                                            <div className="space-y-1">
                                                {items.slice(0, 2).map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                                        <span className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-xs font-medium">
                                                            {item.quantity}
                                                        </span>
                                                        <span className="truncate max-w-[150px]" title={item.name || item.product_retailer_id}>
                                                            {item.name || `Item ${item.product_retailer_id}`}
                                                        </span>
                                                    </div>
                                                ))}
                                                {items.length > 2 && (
                                                    <p className="text-xs text-blue-500 pl-7">
                                                        +{items.length - 2} more items
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-span-2 text-right">
                                            <p className="font-bold text-gray-800">
                                                {currency} {totalAmount.toFixed(2)}
                                            </p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                Received
                                            </span>
                                        </div>

                                        <div className="col-span-3 text-right text-gray-500 text-sm flex items-center justify-end gap-4">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(order.timestamp)}
                                            </div>
                                            {/* Future: Add 'View Details' button here */}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1 rounded bg-white border border-gray-200 text-sm disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {page} of {pagination.pages}
                        </span>
                        <button
                            disabled={page === pagination.pages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 rounded bg-white border border-gray-200 text-sm disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

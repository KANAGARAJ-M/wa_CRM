import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Plus, Search, Edit2, Trash2, Tag, DollarSign, Image as ImageIcon,
    MoreVertical, Archive, RefreshCw, ShoppingBag, Loader2, FileText,
    Link as LinkIcon, Eye, List, CheckSquare, AlignLeft, Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Products() {
    const { currentCompany } = useAuth();
    const [activeTab, setActiveTab] = useState('products');

    // Products State
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        currency: 'USD',
        imageUrl: '',
        retailerId: '',
        linkedForm: '',
        whatsappFlowId: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [pushing, setPushing] = useState(false);

    // Forms State
    const [forms, setForms] = useState([]);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingForm, setEditingForm] = useState(null);
    const [formBuilderData, setFormBuilderData] = useState({
        title: '',
        description: '',
        fields: []
    });
    const [viewingSubmissions, setViewingSubmissions] = useState(null); // Form ID
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    const [error, setError] = useState('');

    useEffect(() => {
        if (activeTab === 'products') {
            fetchProducts();
        } else {
            fetchForms();
        }
    }, [activeTab]);

    // --- Product Functions ---

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/products');
            setProducts(response.data.data);
        } catch (error) {
            console.error('Error fetching products:', error);
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setError('');
        try {
            const res = await api.post('/products/sync');
            await fetchProducts();
            alert(res.data.message);
        } catch (error) {
            console.error('Error syncing:', error);
            setError('Failed to sync products: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setSyncing(false);
        }
    };

    const handlePush = async () => {
        setPushing(true);
        setError('');
        try {
            const res = await api.post('/products/push-to-meta');
            await fetchProducts();
            alert(res.data.message);
        } catch (error) {
            console.error('Error pushing to Meta:', error);
            setError('Failed to push products: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setPushing(false);
        }
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description || '',
                price: product.price,
                currency: product.currency || 'USD',
                imageUrl: product.imageUrl || '',
                retailerId: product.retailerId || '',
                linkedForm: product.linkedForm || '',
                whatsappFlowId: product.whatsappFlowId || ''
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                currency: 'USD',
                imageUrl: '',
                retailerId: '',
                linkedForm: '',
                whatsappFlowId: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct._id}`, formData);
            } else {
                await api.post('/products', formData);
            }
            fetchProducts();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving product:', error);
            setError('Failed to save product');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await api.delete(`/products/${id}`);
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    // --- Form Functions ---

    const fetchForms = async () => {
        setLoading(true);
        try {
            const response = await api.get('/forms');
            setForms(response.data.data);
        } catch (error) {
            console.error('Error fetching forms:', error);
            setError('Failed to load forms');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFormModal = (form = null) => {
        if (form) {
            setEditingForm(form);
            setFormBuilderData({
                title: form.title,
                description: form.description || '',
                fields: form.fields || []
            });
        } else {
            setEditingForm(null);
            setFormBuilderData({
                title: '',
                description: '',
                fields: []
            });
        }
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            if (editingForm) {
                await api.put(`/forms/${editingForm._id}`, formBuilderData);
            } else {
                await api.post('/forms', formBuilderData);
            }
            fetchForms();
            setIsFormModalOpen(false);
        } catch (error) {
            console.error('Error saving form:', error);
            setError('Failed to save form');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteForm = async (id) => {
        if (!confirm('Are you sure you want to delete this form? All submissions will also be deleted may be lost.')) return;
        try {
            await api.delete(`/forms/${id}`);
            fetchForms();
        } catch (error) {
            console.error('Error deleting form:', error);
            alert('Failed to delete form');
        }
    };

    const handleAddField = (type) => {
        setFormBuilderData({
            ...formBuilderData,
            fields: [...formBuilderData.fields, {
                label: 'New Field',
                type: type,
                required: false,
                options: type === 'select' || type === 'checkbox' ? ['Option 1'] : []
            }]
        });
    };

    const handleUpdateField = (index, updates) => {
        const newFields = [...formBuilderData.fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFormBuilderData({ ...formBuilderData, fields: newFields });
    };

    const handleRemoveField = (index) => {
        const newFields = formBuilderData.fields.filter((_, i) => i !== index);
        setFormBuilderData({ ...formBuilderData, fields: newFields });
    };

    const handleViewSubmissions = async (form) => {
        setViewingSubmissions(form);
        setLoadingSubmissions(true);
        try {
            const response = await api.get(`/forms/${form._id}/submissions`);
            setSubmissions(response.data.data);
        } catch (error) {
            console.error('Error fetching submissions:', error);
            alert('Failed to load submissions');
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const getFieldIcon = (type) => {
        switch (type) {
            case 'text': return <Edit2 className="h-4 w-4" />;
            case 'textarea': return <AlignLeft className="h-4 w-4" />;
            case 'number': return <Tag className="h-4 w-4" />;
            case 'select': return <List className="h-4 w-4" />;
            case 'checkbox': return <CheckSquare className="h-4 w-4" />;
            case 'date': return <Calendar className="h-4 w-4" />;
            default: return <Edit2 className="h-4 w-4" />;
        }
    };

    if (loading && !products.length && !forms.length && activeTab === 'products') { // Initial load only
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 flex flex-col">
            {/* Header with Tabs */}
            <div className="bg-white border-b border-gray-200 px-6 pt-4 sticky top-0 z-10 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <ShoppingBag className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Products & Forms</h1>
                            <p className="text-sm text-gray-500">Manage catalog and order forms</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'products' ? (
                            <>
                                <button
                                    onClick={handleSync}
                                    disabled={syncing || pushing}
                                    className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
                                >
                                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    Sync Meta
                                </button>
                                <button
                                    onClick={handlePush}
                                    disabled={syncing || pushing}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
                                >
                                    {pushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 transform rotate-180" />}
                                    Push Meta
                                </button>
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"
                                >
                                    <Plus className="h-5 w-5" />
                                    Add Product
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleOpenFormModal()}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"
                            >
                                <Plus className="h-5 w-5" />
                                Create Form
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'products'
                            ? 'border-green-500 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Products
                    </button>
                    <button
                        onClick={() => setActiveTab('forms')}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'forms'
                            ? 'border-green-500 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Order Forms
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'products' ? (
                    /* Products Grid */
                    products.length === 0 && !loading ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No products yet</h3>
                            <button onClick={() => handleOpenModal()} className="text-green-600 font-medium hover:text-green-700 hover:underline mt-2">
                                Create a product
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {products.map(product => (
                                <div key={product._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <ImageIcon className="h-12 w-12" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => handleOpenModal(product)} className="p-2 bg-white rounded-full text-gray-700 hover:text-green-600">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(product._id)} className="p-2 bg-white rounded-full text-gray-700 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-gray-800 line-clamp-1">{product.name}</h3>
                                            <span className="font-bold text-green-600">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5em]">{product.description || 'No description'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    /* Forms Grid */
                    forms.length === 0 && !loading ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No forms created</h3>
                            <button onClick={() => handleOpenFormModal()} className="text-green-600 font-medium hover:text-green-700 hover:underline mt-2">
                                Create your first form
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {forms.map(form => (
                                <div key={form._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleViewSubmissions(form)}
                                                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                                                title="View Submissions"
                                            >
                                                <List className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenFormModal(form)}
                                                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                                                title="Edit"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteForm(form._id)}
                                                className="p-1.5 hover:bg-red-50 rounded text-red-500"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-800 mb-1">{form.title}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{form.description || 'No description'}</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <span className="text-xs text-gray-400">{form.fields?.length || 0} fields</span>
                                        <button
                                            onClick={() => window.open(`${window.location.origin}/form/${form._id}`, '_blank')}
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <LinkIcon className="h-3 w-3" />
                                            Public Link
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">
                                {editingProduct ? 'Edit Product' : 'New Product'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* ... fields ... same as before */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                    <select
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="INR">INR</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Send Form (Trigger on product inquiry)</label>
                                <select
                                    value={formData.linkedForm || ''}
                                    onChange={e => setFormData({ ...formData, linkedForm: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                >
                                    <option value="">-- No Auto-Reply --</option>
                                    {forms.map(form => (
                                        <option key={form._id} value={form._id}>{form.title}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">If a customer asks about this product on WhatsApp, they will automatically receive this form.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                <input
                                    type="url"
                                    value={formData.imageUrl}
                                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Catalog ID</label>
                                <input
                                    type="text"
                                    value={formData.retailerId}
                                    onChange={e => setFormData({ ...formData, retailerId: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Flow ID</label>
                                <input
                                    type="text"
                                    value={formData.whatsappFlowId}
                                    onChange={e => setFormData({ ...formData, whatsappFlowId: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                    placeholder="e.g. 899702372463526"
                                />
                                <p className="text-xs text-gray-500 mt-1">If set, customers will see a native form (Flow) instead of a website link.</p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">
                                    {submitting ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Form Builder Modal */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">
                                {editingForm ? 'Edit Order Form' : 'Create Order Form'}
                            </h2>
                            <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Side: Form Settings */}
                            <div className="w-1/3 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
                                        <input
                                            type="text"
                                            value={formBuilderData.title}
                                            onChange={e => setFormBuilderData({ ...formBuilderData, title: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                            placeholder="e.g. Custom Shoe Order"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={formBuilderData.description}
                                            onChange={e => setFormBuilderData({ ...formBuilderData, description: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300 h-24"
                                            placeholder="Instructions for customer..."
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Add Fields</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { type: 'text', label: 'Text Input', icon: <Edit2 className="w-4 h-4" /> },
                                                { type: 'textarea', label: 'Long Text', icon: <AlignLeft className="w-4 h-4" /> },
                                                { type: 'number', label: 'Number', icon: <Tag className="w-4 h-4" /> },
                                                { type: 'email', label: 'Email', icon: <LinkIcon className="w-4 h-4" /> },
                                                { type: 'date', label: 'Date', icon: <Calendar className="w-4 h-4" /> },
                                                { type: 'select', label: 'Dropdown', icon: <List className="w-4 h-4" /> },
                                                { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-4 h-4" /> },
                                            ].map((item) => (
                                                <button
                                                    key={item.type}
                                                    onClick={() => handleAddField(item.type)}
                                                    className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-sm"
                                                >
                                                    {item.icon}
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Form Preview / Builder */}
                            <div className="flex-1 p-6 overflow-y-auto bg-white">
                                <div className="max-w-xl mx-auto space-y-4">
                                    <div className="border border-dashed border-gray-300 rounded-xl p-6 min-h-[400px]">
                                        {formBuilderData.title && (
                                            <div className="mb-6 text-center">
                                                <h2 className="text-2xl font-bold text-gray-900">{formBuilderData.title}</h2>
                                                {formBuilderData.description && <p className="text-gray-500 mt-1">{formBuilderData.description}</p>}
                                            </div>
                                        )}

                                        {formBuilderData.fields.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                                <Plus className="h-8 w-8 mb-2" />
                                                <p>Add fields from the left panel</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {formBuilderData.fields.map((field, idx) => (
                                                    <div key={idx} className="group relative bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors">
                                                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleRemoveField(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={field.label}
                                                                    onChange={e => handleUpdateField(idx, { label: e.target.value })}
                                                                    className="bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none font-medium text-gray-700 w-full"
                                                                    placeholder="Field Label"
                                                                />
                                                                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={field.required}
                                                                        onChange={e => handleUpdateField(idx, { required: e.target.checked })}
                                                                    />
                                                                    Required
                                                                </label>
                                                            </div>

                                                            {/* Field Preview */}
                                                            <div className="pointer-events-none opacity-60">
                                                                {field.type === 'textarea' ? (
                                                                    <textarea className="w-full h-20 border rounded p-2" disabled></textarea>
                                                                ) : field.type === 'select' || field.type === 'checkbox' ? (
                                                                    <select className="w-full border rounded p-2" disabled><option>Options...</option></select>
                                                                ) : (
                                                                    <input type={field.type} className="w-full border rounded p-2" disabled />
                                                                )}
                                                            </div>

                                                            {/* Options Editor for Select/Checkbox */}
                                                            {(field.type === 'select' || field.type === 'checkbox') && (
                                                                <div className="mt-2">
                                                                    <p className="text-xs font-semibold text-gray-500 mb-1">Options (comma separated)</p>
                                                                    <input
                                                                        type="text"
                                                                        value={field.options?.join(', ')}
                                                                        onChange={e => handleUpdateField(idx, { options: e.target.value.split(',').map(s => s.trim()) })}
                                                                        className="w-full text-sm border rounded px-2 py-1"
                                                                        placeholder="Option 1, Option 2"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg">Cancel</button>
                            <button onClick={handleFormSubmit} disabled={submitting} className="px-6 py-2 bg-green-600 text-white rounded-lg shadow font-medium">
                                {submitting ? 'Saving...' : 'Save Form'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submissions Modal */}
            {viewingSubmissions && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">
                                Submissions: {viewingSubmissions.title}
                            </h2>
                            <button onClick={() => setViewingSubmissions(null)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            {loadingSubmissions ? (
                                <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-green-500" /></div>
                            ) : submissions.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">No submissions yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                                                {viewingSubmissions.fields.map((f, i) => (
                                                    <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate max-w-[150px]">{f.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {submissions.map((sub, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(sub.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {sub.submittedBy?.name || sub.submitterIdentifier || 'Anonymous'}
                                                    </td>
                                                    {viewingSubmissions.fields.map((f, i) => (
                                                        <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {typeof sub.data[f.label] === 'object' ? JSON.stringify(sub.data[f.label]) : String(sub.data[f.label] || '-')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

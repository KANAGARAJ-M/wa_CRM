import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Plus, Trash2, Save, Loader2, Building, LayoutGrid,
    MessageCircle, Check, X, Eye, EyeOff, AlertCircle, RefreshCw, Wifi, WifiOff, Link, Lock, Unlock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
    const { clearCompany } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [whatsappConfigs, setWhatsappConfigs] = useState([]);
    const [companyProfile, setCompanyProfile] = useState({
        name: '', address: '', phone: '', website: ''
    });
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState('');
    const [showTokens, setShowTokens] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [subscriptionStatus, setSubscriptionStatus] = useState([]);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [subscribing, setSubscribing] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [unlockPassword, setUnlockPassword] = useState('');
    const [storedPassword, setStoredPassword] = useState('Openthelock');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            const data = response.data.data;
            setWhatsappConfigs(data.whatsappConfigs || []);
            setCompanyProfile({
                name: data.name || '',
                address: data.address || '',
                phone: data.phone || '',
                website: data.website || ''
            });
            setProducts(data.products || []);
            if (data.settingsPassword) {
                setStoredPassword(data.settingsPassword);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleAddConfig = () => {
        setWhatsappConfigs([
            ...whatsappConfigs,
            {
                name: `Account ${whatsappConfigs.length + 1}`,
                apiKey: '',
                accessToken: '',
                phoneNumberId: '',
                businessAccountId: '',
                webhookVerifyToken: 'meta_integration_1121',
                isEnabled: false
            }
        ]);
    };

    const handleRemoveConfig = (index) => {
        if (confirm('Are you sure you want to remove this WhatsApp configuration?')) {
            setWhatsappConfigs(whatsappConfigs.filter((_, i) => i !== index));
        }
    };

    const handleConfigChange = (index, field, value) => {
        const updated = [...whatsappConfigs];
        updated[index][field] = value;
        setWhatsappConfigs(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            await api.put('/settings', {
                whatsappConfigs,
                products,
                ...companyProfile
            });
            setSuccess('Settings saved successfully!');
            setIsLocked(true);
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const toggleShowToken = (index) => {
        setShowTokens(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const handleAddProduct = () => {
        if (newProduct.trim()) {
            setProducts([...products, newProduct.trim()]);
            setNewProduct('');
        }
    };

    const handleRemoveProduct = (index) => {
        setProducts(products.filter((_, i) => i !== index));
    };

    const checkSubscriptionStatus = async () => {
        setCheckingStatus(true);
        setError('');
        try {
            const response = await api.get('/whatsapp/subscription-status');
            setSubscriptionStatus(response.data.results || []);
            const allSubscribed = response.data.results?.every(r => r.isSubscribed);
            if (allSubscribed && response.data.results.length > 0) {
                setSuccess('All accounts are subscribed to receive messages!');
                setTimeout(() => setSuccess(''), 3000);
            } else if (response.data.results.length === 0) {
                setError('No WhatsApp accounts configured. Please add an account first.');
            }
        } catch (error) {
            console.error('Error checking subscription status:', error);
            setError('Failed to check subscription status: ' + (error.response?.data?.message || error.message));
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleUnlock = () => {
        if (unlockPassword === storedPassword) {
            setIsLocked(false);
            setShowPasswordPrompt(false);
            setUnlockPassword('');
            setSuccess('Settings unlocked for editing');
            setTimeout(() => setSuccess(''), 3000);
        } else {
            setError('Incorrect password');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleLock = () => {
        setIsLocked(true);
        setSuccess('Settings locked');
        setTimeout(() => setSuccess(''), 3000);
    };

    const subscribeToMessages = async () => {
        setSubscribing(true);
        setError('');
        try {
            const response = await api.post('/whatsapp/subscribe');
            const results = response.data.results || [];
            const allSuccess = results.every(r => r.success);

            if (allSuccess) {
                setSuccess('Successfully subscribed all accounts to receive messages!');
                // Refresh status after subscribing
                await checkSubscriptionStatus();
            } else {
                const failed = results.filter(r => !r.success);
                setError(`Some accounts failed to subscribe: ${failed.map(f => f.name + (f.error?.message ? ` - ${f.error.message}` : '')).join(', ')}`);
            }
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Error subscribing:', error);
            setError('Failed to subscribe: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubscribing(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full bg-gray-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-100 overflow-y-auto">
            {/* Content */}
            <div className="max-w-4xl mx-auto p-6">
                {/* Alerts */}
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-fadeIn">
                        <AlertCircle className="h-5 w-5" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-fadeIn">
                        <Check className="h-5 w-5" />
                        {success}
                    </div>
                )}

                {/* Company Profile */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Building className="h-5 w-5 text-gray-700" />
                            <h2 className="text-lg font-semibold text-gray-800">Company Profile</h2>
                        </div>
                        <button
                            onClick={clearCompany}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Switch Workspace
                        </button>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <input
                                type="text"
                                value={companyProfile.name}
                                onChange={(e) => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                            <input
                                type="text"
                                value={companyProfile.website}
                                onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                                placeholder="https://example.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="text"
                                value={companyProfile.phone}
                                onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <input
                                type="text"
                                value={companyProfile.address}
                                onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                    </div>
                </div>


                {/* Products Management */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <LayoutGrid className="h-5 w-5 text-gray-700" />
                            <h2 className="text-lg font-semibold text-gray-800">Products / Services</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newProduct}
                                onChange={(e) => setNewProduct(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddProduct()}
                                placeholder="Add a product or service..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            <button
                                onClick={handleAddProduct}
                                disabled={!newProduct.trim()}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>

                        {products.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No products added yet.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {products.map((product, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-gray-700">
                                        <span>{product}</span>
                                        <button
                                            onClick={() => handleRemoveProduct(index)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {/* Webhook Subscription Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <Link className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-800">Webhook Subscription Status</h2>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={checkSubscriptionStatus}
                                disabled={checkingStatus}
                                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-70"
                            >
                                {checkingStatus ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4" />
                                        Check Status
                                    </>
                                )}
                            </button>
                            <button
                                onClick={subscribeToMessages}
                                disabled={subscribing || whatsappConfigs.length === 0}
                                className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-70"
                            >
                                {subscribing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Subscribing...
                                    </>
                                ) : (
                                    <>
                                        <Wifi className="h-4 w-4" />
                                        Subscribe All
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {subscriptionStatus.length === 0 ? (
                            <div className="text-center py-6 text-gray-500">
                                <Wifi className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                <p>Click "Check Status" to verify if your accounts are subscribed to receive WhatsApp messages.</p>
                                <p className="text-sm mt-2 text-gray-400">Subscription is required to receive incoming messages via webhook.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {subscriptionStatus.map((status, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-center justify-between p-4 rounded-lg border ${status.isSubscribed
                                            ? 'bg-green-50 border-green-200'
                                            : status.error
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-yellow-50 border-yellow-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {status.isSubscribed ? (
                                                <Wifi className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <WifiOff className="h-5 w-5 text-red-500" />
                                            )}
                                            <div>
                                                <h4 className="font-medium text-gray-800">{status.name || `Account ${index + 1}`}</h4>
                                                <p className="text-sm text-gray-500">WABA ID: {status.businessAccountId || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {status.isSubscribed ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                                                    <Check className="h-3 w-3" />
                                                    Subscribed
                                                </span>
                                            ) : status.error ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                                                    <X className="h-3 w-3" />
                                                    Error
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Not Subscribed
                                                </span>
                                            )}
                                            {status.error && (
                                                <p className="text-xs text-red-500 mt-1">{status.error.message || status.error}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* WhatsApp Configurations */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <MessageCircle className="h-5 w-5 text-green-600" />
                            <h2 className="text-lg font-semibold text-gray-800">WhatsApp Business Accounts</h2>
                            {isLocked ? (
                                <button
                                    onClick={() => setShowPasswordPrompt(true)}
                                    className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5 text-xs font-bold border border-amber-200"
                                >
                                    <Lock className="h-3.5 w-3.5" />
                                    LOCKED
                                </button>
                            ) : (
                                <button
                                    onClick={handleLock}
                                    className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1.5 text-xs font-bold border border-green-200"
                                >
                                    <Unlock className="h-3.5 w-3.5" />
                                    UNLOCKED
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddConfig}
                                disabled={isLocked}
                                className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${isLocked
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                    }`}
                            >
                                <Plus className="h-4 w-4" />
                                Add Account
                            </button>
                        </div>
                    </div>

                    {/* Password Prompt Modal */}
                    {showPasswordPrompt && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50">
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <Lock className="h-5 w-5" />
                                        <h3 className="font-bold uppercase tracking-wider text-sm">Security Verification</h3>
                                    </div>
                                    <button onClick={() => setShowPasswordPrompt(false)} className="text-gray-400 hover:text-gray-600">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <p className="text-sm text-gray-600 text-center">
                                        Sensitive fields are locked. Please enter the master password to unlock editing.
                                    </p>
                                    <div>
                                        <input
                                            type="password"
                                            value={unlockPassword}
                                            onChange={(e) => setUnlockPassword(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                                            autoFocus
                                            placeholder="Enter Password"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center text-lg tracking-widest"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowPasswordPrompt(false)}
                                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUnlock}
                                            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-bold shadow-lg shadow-amber-600/20"
                                        >
                                            Unlock
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-6 space-y-6">
                        {whatsappConfigs.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No WhatsApp accounts configured.</p>
                                <p className="text-sm mt-2">Add an account to start sending messages.</p>
                            </div>
                        ) : (
                            whatsappConfigs.map((config, index) => (
                                <div
                                    key={index}
                                    className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50"
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-700">Account {index + 1}</h3>
                                        <div className="flex items-center gap-2">
                                            <label className={`flex items-center gap-2 ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input
                                                    type="checkbox"
                                                    disabled={isLocked}
                                                    checked={config.isEnabled}
                                                    onChange={(e) => handleConfigChange(index, 'isEnabled', e.target.checked)}
                                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500 disabled:bg-gray-200"
                                                />
                                                <span className="text-sm text-gray-600">Enabled</span>
                                            </label>
                                            <button
                                                onClick={() => handleRemoveConfig(index)}
                                                disabled={isLocked}
                                                className={`p-2 rounded-lg transition-colors ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Account Name
                                            </label>
                                            <input
                                                type="text"
                                                value={config.name}
                                                onChange={(e) => handleConfigChange(index, 'name', e.target.value)}
                                                placeholder="e.g., Sales Team"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                                                Phone Number ID
                                                {isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                                            </label>
                                            <input
                                                type="text"
                                                readOnly={isLocked}
                                                value={config.phoneNumberId}
                                                onChange={(e) => handleConfigChange(index, 'phoneNumberId', e.target.value)}
                                                placeholder="From Meta Developer Portal"
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${isLocked ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white border-gray-300'}`}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                                                Business Account ID
                                                {isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                                            </label>
                                            <input
                                                type="text"
                                                readOnly={isLocked}
                                                value={config.businessAccountId}
                                                onChange={(e) => handleConfigChange(index, 'businessAccountId', e.target.value)}
                                                placeholder="WABA ID from Meta"
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${isLocked ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white border-gray-300'}`}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                                                Webhook Verify Token
                                                {isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                                            </label>
                                            <input
                                                type="text"
                                                readOnly={isLocked}
                                                value={config.webhookVerifyToken}
                                                onChange={(e) => handleConfigChange(index, 'webhookVerifyToken', e.target.value)}
                                                placeholder="Your custom verify token"
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${isLocked ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white border-gray-300'}`}
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                                                Access Token
                                                {isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showTokens[index] ? 'text' : 'password'}
                                                    readOnly={isLocked}
                                                    value={config.accessToken}
                                                    onChange={(e) => handleConfigChange(index, 'accessToken', e.target.value)}
                                                    placeholder="Permanent token from Meta"
                                                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${isLocked ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white border-gray-300'}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => toggleShowToken(index)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showTokens[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full md:w-auto px-6 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Settings
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-800 mb-3">Setup Instructions</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                        <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Meta Developer Portal</a></li>
                        <li>Create or select your app and add WhatsApp Product</li>
                        <li>In WhatsApp &gt; API Setup, get your Phone Number ID</li>
                        <li>Generate a permanent access token (System User token recommended)</li>
                        <li>Configure your webhook URL: <code className="bg-blue-100 px-2 py-0.5 rounded">https://your-domain.com/whatsapp</code></li>
                        <li>Use the Webhook Verify Token you set above</li>
                    </ol>
                </div>
            </div>
        </div >
    );
}

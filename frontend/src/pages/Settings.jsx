import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Plus, Trash2, Save, Loader2, Building, LayoutGrid,
    MessageCircle, Check, X, Eye, EyeOff, AlertCircle, RefreshCw, Wifi, WifiOff, Link, Lock, Unlock,
    ShoppingBag, CreditCard, MessageSquare, FileText, Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
    const { clearCompany } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    // General Settings
    const [companyProfile, setCompanyProfile] = useState({
        name: '', address: '', phone: '', website: ''
    });

    // WhatsApp Settings
    const [whatsappConfigs, setWhatsappConfigs] = useState([]);
    const [showTokens, setShowTokens] = useState({});
    const [showAdvanced, setShowAdvanced] = useState({});

    // Integrations Settings
    const [metaCatalogConfig, setMetaCatalogConfig] = useState({
        catalogId: '', accessToken: ''
    });
    const [autoReplyConfig, setAutoReplyConfig] = useState({
        enabled: false, message: ''
    });
    const [paymentConfig, setPaymentConfig] = useState({
        provider: 'manual', enabled: false, details: {}
    });
    const [clientFormConfig, setClientFormConfig] = useState({
        enabled: false, formLink: ''
    });

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

            // General
            setCompanyProfile({
                name: data.name || '',
                address: data.address || '',
                phone: data.phone || '',
                website: data.website || ''
            });

            // WhatsApp
            setWhatsappConfigs(data.whatsappConfigs || []);

            // Integrations
            if (data.metaCatalogConfig) setMetaCatalogConfig(data.metaCatalogConfig);
            if (data.autoReplyConfig) setAutoReplyConfig(data.autoReplyConfig);
            if (data.paymentConfig) setPaymentConfig(data.paymentConfig);
            if (data.clientFormConfig) setClientFormConfig(data.clientFormConfig);

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
                isEnabled: false,
                catalogId: '',
                catalogAccessToken: ''
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
                metaCatalogConfig,
                autoReplyConfig,
                paymentConfig,
                clientFormConfig,
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

    const toggleAdvanced = (index) => {
        setShowAdvanced(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const handleLinkCatalog = async (index) => {
        const config = whatsappConfigs[index];
        if (!config.phoneNumberId) {
            alert('Phone Number ID is required first.');
            return;
        }

        if (!confirm(`This will connect the Catalog to the WhatsApp Business Account for ${config.name}. Continue?`)) return;

        try {
            const res = await api.post('/whatsapp/link-catalog', {
                phoneNumberId: config.phoneNumberId,
                catalogId: config.catalogId // Optional, backend handles fallback
            });

            let msg = res.data.message;
            if (res.data.connectedCatalogs && res.data.connectedCatalogs.length > 0) {
                const ids = res.data.connectedCatalogs.map(c => c.id).join(', ');
                msg += `\n\n✅ Verified Connected Catalogs: ${ids}`;
            } else {
                msg += `\n\n⚠️ Warning: No connected catalogs found after linking.`;
            }
            alert(msg);
        } catch (error) {
            console.error('Link catalog error:', error);
            alert('Failed to link catalog: ' + (error.response?.data?.message || error.message));
        }
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

    const subscribeToMessages = async (businessAccountId = null) => {
        setSubscribing(true);
        setError('');
        try {
            const response = await api.post('/whatsapp/subscribe', { businessAccountId });
            const results = response.data.results || [];
            const allSuccess = results.every(r => r.success);

            if (allSuccess) {
                setSuccess(businessAccountId ? 'Successfully subscribed account!' : 'Successfully subscribed all accounts to receive messages!');
                // Refresh status after subscribing
                await checkSubscriptionStatus();
            } else {
                const failed = results.filter(r => !r.success);
                setError(`Failed to subscribe: ${failed.map(f => f.name + (f.error?.message ? ` - ${f.error.message}` : '')).join(', ')}`);
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
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
                    <div className="flex gap-2">
                        {isLocked ? (
                            <button
                                onClick={() => setShowPasswordPrompt(true)}
                                className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-2 text-sm font-bold border border-amber-200"
                            >
                                <Lock className="h-4 w-4" />
                                Locked
                            </button>
                        ) : (
                            <button
                                onClick={handleLock}
                                className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2 text-sm font-bold border border-green-200"
                            >
                                <Unlock className="h-4 w-4" />
                                Unlocked
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

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

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'general'
                            ? 'bg-white text-green-600 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Building className="h-4 w-4" />
                        General Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('whatsapp')}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'whatsapp'
                            ? 'bg-white text-green-600 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp Accounts
                    </button>
                    <button
                        onClick={() => setActiveTab('integrations')}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'integrations'
                            ? 'bg-white text-green-600 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Integrations
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {activeTab === 'general' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-800">Company Profile</h2>
                                <button
                                    onClick={clearCompany}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                                >
                                    <LayoutGrid className="h-3 w-3" />
                                    Switch Workspace
                                </button>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={companyProfile.website}
                                            onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                                            placeholder="https://example.com"
                                            className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
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
                    )}

                    {activeTab === 'whatsapp' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Webhook Subscription Status */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <Link className="h-5 w-5 text-blue-600" />
                                        <h2 className="text-lg font-semibold text-gray-800">Webhook Subscription Status</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={checkSubscriptionStatus}
                                            disabled={checkingStatus}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-70 border border-blue-200"
                                        >
                                            {checkingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                            Verify Sub
                                        </button>
                                        <button
                                            onClick={() => subscribeToMessages()}
                                            disabled={subscribing || whatsappConfigs.length === 0}
                                            className="px-3 py-1.5 bg-green-50 text-green-600 text-sm rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2 disabled:opacity-70 border border-green-200"
                                        >
                                            {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                                            Subscribe All
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6">
                                    {subscriptionStatus.length === 0 ? (
                                        <p className="text-gray-500 text-center text-sm">Check status to see webhook health.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {subscriptionStatus.map((status, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        {status.isSubscribed ? <Check className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-700">{status.name}</span>
                                                            {!status.isSubscribed && (
                                                                <span className="text-[10px] text-red-500 font-medium">Not receiving messages</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.isSubscribed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {status.isSubscribed ? 'Active' : 'Error'}
                                                        </span>
                                                        {!status.isSubscribed && (
                                                            <button
                                                                onClick={() => subscribeToMessages(status.businessAccountId)}
                                                                disabled={subscribing}
                                                                className="px-2 py-1 bg-amber-500 text-white text-[10px] uppercase font-bold rounded hover:bg-amber-600 transition-colors flex items-center gap-1"
                                                            >
                                                                {subscribing ? <Loader2 className="h-2 w-2 animate-spin" /> : <Wifi className="h-2 w-2" />}
                                                                Auto Sub
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <MessageCircle className="h-5 w-5 text-green-600" />
                                        <h2 className="text-lg font-semibold text-gray-800">Accounts Configuration</h2>
                                    </div>
                                    <button
                                        onClick={handleAddConfig}
                                        disabled={isLocked}
                                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${isLocked
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                                            }`}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Account
                                    </button>
                                </div>
                                <div className="p-6 space-y-6">
                                    {whatsappConfigs.length === 0 ? (
                                        <div className="text-center py-10 text-gray-500">
                                            <p>No WhatsApp accounts configured.</p>
                                        </div>
                                    ) : (
                                        whatsappConfigs.map((config, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-semibold text-gray-700">Account {index + 1}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                disabled={isLocked}
                                                                checked={config.isEnabled}
                                                                onChange={(e) => handleConfigChange(index, 'isEnabled', e.target.checked)}
                                                                className="rounded text-green-600 focus:ring-green-500"
                                                            />
                                                            <span className="text-sm text-gray-600">Enabled</span>
                                                        </label>
                                                        <button
                                                            onClick={() => handleRemoveConfig(index)}
                                                            disabled={isLocked}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <input
                                                        type="text"
                                                        value={config.name}
                                                        onChange={(e) => handleConfigChange(index, 'name', e.target.value)}
                                                        placeholder="Account Name"
                                                        disabled={isLocked}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={config.phoneNumberId}
                                                        onChange={(e) => handleConfigChange(index, 'phoneNumberId', e.target.value)}
                                                        placeholder="Phone Number ID"
                                                        disabled={isLocked}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={config.businessAccountId}
                                                        onChange={(e) => handleConfigChange(index, 'businessAccountId', e.target.value)}
                                                        placeholder="Business Account ID"
                                                        disabled={isLocked}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500"
                                                    />
                                                    <div className="relative">
                                                        <input
                                                            type={showTokens[index] ? 'text' : 'password'}
                                                            value={config.accessToken}
                                                            onChange={(e) => handleConfigChange(index, 'accessToken', e.target.value)}
                                                            placeholder="Access Token"
                                                            disabled={isLocked}
                                                            className="w-full px-3 py-2 border rounded-lg focus:ring-green-500"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleShowToken(index)}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                                                        >
                                                            {showTokens[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={config.webhookVerifyToken || ''}
                                                        onChange={(e) => handleConfigChange(index, 'webhookVerifyToken', e.target.value)}
                                                        placeholder="Webhook Verify Token"
                                                        disabled={isLocked}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500"
                                                    />
                                                </div>

                                                {/* Advanced Settings Checkbox */}
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAdvanced(index)}
                                                        className="text-xs text-green-600 font-medium hover:underline flex items-center gap-1"
                                                    >
                                                        {showAdvanced[index] ? 'Hide Advanced Options' : 'Show Advanced Options (Custom Catalog, etc.)'}
                                                    </button>
                                                </div>

                                                {/* Advanced Settings Panel */}
                                                {showAdvanced[index] && (
                                                    <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 mt-2 animate-fadeIn">
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Detailed Configuration (Optional)</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Specific Catalog ID</label>
                                                                <input
                                                                    type="text"
                                                                    value={config.catalogId || ''}
                                                                    onChange={(e) => handleConfigChange(index, 'catalogId', e.target.value)}
                                                                    placeholder="Override Default Catalog ID"
                                                                    disabled={isLocked}
                                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Catalog Access Token</label>
                                                                <input
                                                                    type="password"
                                                                    value={config.catalogAccessToken || ''}
                                                                    onChange={(e) => handleConfigChange(index, 'catalogAccessToken', e.target.value)}
                                                                    placeholder="Override Token (if different)"
                                                                    disabled={isLocked}
                                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleLinkCatalog(index)}
                                                                className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-100 flex items-center gap-1"
                                                            >
                                                                <Link className="h-3 w-3" />
                                                                Link Catalog to WhatsApp Account
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 mt-2">
                                                            If set, products will also be synced to this specific catalog when you push updates.
                                                            Useful if this phone number belongs to a different Business Manager.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'integrations' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Meta Catalog Integration */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
                                    <div className="flex items-center gap-3">
                                        <ShoppingBag className="h-5 w-5 text-blue-600" />
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-800">Default Meta Catalog</h2>
                                            <p className="text-xs text-gray-500">Sync products with WhatsApp Commerce Manager (Default)</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        {isLocked && <Lock className="h-4 w-4 text-amber-500 absolute -left-6 top-1/2 -translate-y-1/2" />}
                                    </div>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Catalog ID</label>
                                        <input
                                            type="text"
                                            value={metaCatalogConfig.catalogId}
                                            onChange={(e) => setMetaCatalogConfig({ ...metaCatalogConfig, catalogId: e.target.value })}
                                            disabled={isLocked}
                                            placeholder="fb_catalog_id"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 disabled:bg-gray-100"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Catalog Access Token</label>
                                        <div className="relative">
                                            <input
                                                type={showTokens['meta_catalog'] ? 'text' : 'password'}
                                                value={metaCatalogConfig.accessToken}
                                                onChange={(e) => setMetaCatalogConfig({ ...metaCatalogConfig, accessToken: e.target.value })}
                                                disabled={isLocked}
                                                placeholder="Permanent Access Token"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 disabled:bg-gray-100 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => toggleShowToken('meta_catalog')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showTokens['meta_catalog'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">System User Token with 'catalog_management' permission is recommended.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Auto Reply Integration */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-green-50 to-white">
                                    <div className="flex items-center gap-3">
                                        <MessageSquare className="h-5 w-5 text-green-600" />
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-800">Auto Reply</h2>
                                            <p className="text-xs text-gray-500">Automated responses for new inquiries</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={autoReplyConfig.enabled}
                                            onChange={(e) => setAutoReplyConfig({ ...autoReplyConfig, enabled: e.target.checked })}
                                            disabled={isLocked}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                                <div className="p-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
                                    <textarea
                                        value={autoReplyConfig.message}
                                        onChange={(e) => setAutoReplyConfig({ ...autoReplyConfig, message: e.target.value })}
                                        disabled={isLocked}
                                        rows={3}
                                        placeholder="Hi! Thanks for contacting us. We will get back to you shortly."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 disabled:bg-gray-100"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">This message will be sent automatically to new conversations.</p>
                                </div>
                            </div>

                            {/* Payment Integration */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="h-5 w-5 text-purple-600" />
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-800">Payment Gateway</h2>
                                            <p className="text-xs text-gray-500">Collect payments via WhatsApp links</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={paymentConfig.enabled}
                                            onChange={(e) => setPaymentConfig({ ...paymentConfig, enabled: e.target.checked })}
                                            disabled={isLocked}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                                <div className="p-6">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                                        <select
                                            value={paymentConfig.provider}
                                            onChange={(e) => setPaymentConfig({ ...paymentConfig, provider: e.target.value })}
                                            disabled={isLocked}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 disabled:bg-gray-100"
                                        >
                                            <option value="manual">Manual / Bank Transfer</option>
                                            <option value="stripe">Stripe</option>
                                            <option value="razorpay">Razorpay</option>
                                        </select>
                                    </div>
                                    {paymentConfig.provider === 'stripe' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Publishable Key</label>
                                                <input
                                                    type="text"
                                                    value={paymentConfig.details?.publishableKey || ''}
                                                    onChange={(e) => setPaymentConfig({
                                                        ...paymentConfig,
                                                        details: { ...paymentConfig.details, publishableKey: e.target.value }
                                                    })}
                                                    disabled={isLocked}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                                                <input
                                                    type="password"
                                                    value={paymentConfig.details?.secretKey || ''}
                                                    onChange={(e) => setPaymentConfig({
                                                        ...paymentConfig,
                                                        details: { ...paymentConfig.details, secretKey: e.target.value }
                                                    })}
                                                    disabled={isLocked}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {paymentConfig.provider === 'manual' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Details / Payment Instructions</label>
                                            <textarea
                                                value={paymentConfig.details?.instructions || ''}
                                                onChange={(e) => setPaymentConfig({
                                                    ...paymentConfig,
                                                    details: { ...paymentConfig.details, instructions: e.target.value }
                                                })}
                                                disabled={isLocked}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 disabled:bg-gray-100"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Client Forms Integration */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-orange-50 to-white">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-orange-600" />
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-800">Client Forms</h2>
                                            <p className="text-xs text-gray-500">External form links for client data collection</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={clientFormConfig.enabled}
                                            onChange={(e) => setClientFormConfig({ ...clientFormConfig, enabled: e.target.checked })}
                                            disabled={isLocked}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                    </label>
                                </div>
                                <div className="p-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Form URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="url"
                                            value={clientFormConfig.formLink}
                                            onChange={(e) => setClientFormConfig({ ...clientFormConfig, formLink: e.target.value })}
                                            disabled={isLocked}
                                            placeholder="https://forms.google.com/..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 disabled:bg-gray-100"
                                        />
                                        <a
                                            href={clientFormConfig.formLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`px-3 py-2 bg-gray-100 rounded-lg text-gray-600 hover:text-orange-600 flex items-center justify-center ${!clientFormConfig.formLink ? 'pointer-events-none opacity-50' : ''}`}
                                        >
                                            <Link className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Dynamic Instructions */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6 animate-fadeIn">
                    {activeTab === 'general' && (
                        <div>
                            <h3 className="font-semibold text-blue-800 mb-3">Company Profile Setup</h3>
                            <p className="text-sm text-blue-700">These details are used for billing and communication contexts. Valid website and address help with WhatsApp Business verification.</p>
                        </div>
                    )}

                    {activeTab === 'whatsapp' && (
                        <div>
                            <h3 className="font-semibold text-blue-800 mb-3">WhatsApp API Setup Instructions</h3>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                                <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Meta Developer Portal</a></li>
                                <li>Select your App &gt; WhatsApp &gt; API Setup</li>
                                <li>Copy the <strong>Phone Number ID</strong> and <strong>Business Account ID</strong></li>
                                <li>Generate a <strong>Permanent Access Token</strong> (System User) for production use</li>
                                <li>For Webhooks, use the verify token: <code className="bg-blue-100 px-2 py-0.5 rounded">meta_integration_1121</code></li>
                            </ol>
                        </div>
                    )}

                    {activeTab === 'integrations' && (
                        <div>
                            <h3 className="font-semibold text-blue-800 mb-3">Meta Catalog & Auto-Reply Setup</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-2">How to Connect Meta Catalog</h4>
                                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                                        <li>Go to <strong>Meta Business Settings</strong> &gt; <strong>Data Sources</strong> &gt; <strong>Catalogs</strong>.</li>
                                        <li>Copy your <strong>Catalog ID</strong> from the top of the page.</li>
                                        <li>Go to <strong>Users</strong> &gt; <strong>System Users</strong>. Create a new System User (e.g., "CRM Sync").</li>
                                        <li>Click <strong>Add Assets</strong> and assign the Catalog with <strong>Manage Catalog</strong> permission.</li>
                                        <li>Click <strong>Generate New Token</strong>, select the App, and ensure <code>catalog_management</code> scope is checked.</li>
                                        <li>Paste this token above. This allows the CRM to read your product list.</li>
                                        <li><strong>Important:</strong> To use these products in WhatsApp, go to <strong>WhatsApp Manager</strong> &gt; <strong>Catalog</strong> and connect this catalog to your WhatsApp Business Account.</li>
                                    </ol>
                                </div>
                                <div className="border-t border-blue-200 pt-3">
                                    <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-2">Auto-Reply & Tools</h4>
                                    <p className="text-sm text-blue-700">Enable "Auto Reply" to send an immediate greeting to new customers. For Payments, configure your provider details manually or use Stripe keys.</p>
                                </div>
                            </div>
                        </div>
                    )}
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
            </div>
        </div >
    );
}

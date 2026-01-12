import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    ArrowLeft, Settings as SettingsIcon, Plus, Trash2, Save, Loader2,
    MessageCircle, Check, X, Eye, EyeOff, AlertCircle, RefreshCw, Wifi, WifiOff, Link
} from 'lucide-react';

export default function Settings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [whatsappConfigs, setWhatsappConfigs] = useState([]);
    const [showTokens, setShowTokens] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [subscriptionStatus, setSubscriptionStatus] = useState([]);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            setWhatsappConfigs(response.data.data?.whatsappConfigs || []);
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
            await api.put('/settings', { whatsappConfigs });
            setSuccess('Settings saved successfully!');
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
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-4">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <SettingsIcon className="h-6 w-6" />
                        <h1 className="text-xl font-semibold">Settings</h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto p-4">
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
                        </div>
                        <button
                            onClick={handleAddConfig}
                            className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Account
                        </button>
                    </div>

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
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={config.isEnabled}
                                                    onChange={(e) => handleConfigChange(index, 'isEnabled', e.target.checked)}
                                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                                />
                                                <span className="text-sm text-gray-600">Enabled</span>
                                            </label>
                                            <button
                                                onClick={() => handleRemoveConfig(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Phone Number ID
                                            </label>
                                            <input
                                                type="text"
                                                value={config.phoneNumberId}
                                                onChange={(e) => handleConfigChange(index, 'phoneNumberId', e.target.value)}
                                                placeholder="From Meta Developer Portal"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Business Account ID
                                            </label>
                                            <input
                                                type="text"
                                                value={config.businessAccountId}
                                                onChange={(e) => handleConfigChange(index, 'businessAccountId', e.target.value)}
                                                placeholder="WABA ID from Meta"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Webhook Verify Token
                                            </label>
                                            <input
                                                type="text"
                                                value={config.webhookVerifyToken}
                                                onChange={(e) => handleConfigChange(index, 'webhookVerifyToken', e.target.value)}
                                                placeholder="Your custom verify token"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Access Token
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showTokens[index] ? 'text' : 'password'}
                                                    value={config.accessToken}
                                                    onChange={(e) => handleConfigChange(index, 'accessToken', e.target.value)}
                                                    placeholder="Permanent token from Meta"
                                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
        </div>
    );
}

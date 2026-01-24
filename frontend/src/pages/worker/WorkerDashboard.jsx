import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { MessageSquare, Phone, Clock, LogOut, PhoneCall, Calendar, CheckCircle, Target, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

export default function WorkerDashboard() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [followUps, setFollowUps] = useState([]);
    const [recentCalls, setRecentCalls] = useState([]);
    const [showCallModal, setShowCallModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [activeTab, setActiveTab] = useState('leads');
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [callForm, setCallForm] = useState({
        status: 'completed',
        outcome: 'other',
        duration: 0,
        notes: '',
        followUpDate: '',
        followUpNotes: '',
        priority: 'medium'
    });
    const [savingCall, setSavingCall] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [leadsRes, statsRes, callsRes, followUpsRes] = await Promise.all([
                api.get('/worker/leads'),
                api.get('/worker/stats'),
                api.get('/worker/calls?limit=10'),
                api.get('/worker/follow-ups')
            ]);
            setLeads(leadsRes.data.data || []);
            setStats(statsRes.data.data);
            setRecentCalls(callsRes.data.data || []);
            setFollowUps(followUpsRes.data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const openCallModal = (lead) => {
        setSelectedLead(lead);
        setCallForm({ status: 'completed', outcome: 'other', duration: 0, notes: '', followUpDate: '', followUpNotes: '', priority: 'medium' });
        setShowCallModal(true);
    };

    const initiateCall = (phone) => {
        window.location.href = `tel:${phone}`;
    };

    const saveCallLog = async () => {
        if (!selectedLead) return;
        setSavingCall(true);
        try {
            await api.post('/worker/calls', {
                leadId: selectedLead._id,
                phoneNumber: selectedLead.phone,
                leadName: selectedLead.name,
                ...callForm,
                duration: parseInt(callForm.duration) || 0
            });
            setShowCallModal(false);
            fetchData();
            alert('Call logged successfully!');
        } catch (error) {
            console.error('Error saving call:', error);
            alert('Failed to save call log');
        } finally {
            setSavingCall(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = { 'completed': 'bg-green-100 text-green-700', 'missed': 'bg-red-100 text-red-700', 'no-answer': 'bg-yellow-100 text-yellow-700', 'busy': 'bg-orange-100 text-orange-700', 'callback-requested': 'bg-blue-100 text-blue-700', 'converted': 'bg-emerald-100 text-emerald-700' };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const getOutcomeColor = (outcome) => {
        const colors = { 'interested': 'bg-green-100 text-green-700', 'not-interested': 'bg-red-100 text-red-700', 'follow-up': 'bg-blue-100 text-blue-700', 'callback': 'bg-yellow-100 text-yellow-700', 'converted': 'bg-emerald-100 text-emerald-700' };
        return colors[outcome] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-green-500/20">W</div>
                    <div>
                        <h1 className="font-bold text-gray-900">Worker Portal</h1>
                        <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors px-4 py-2 hover:bg-red-50 rounded-lg">
                        <LogOut className="h-5 w-5" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </header>

            {/* Stats Section */}
            {stats && (
                <div className="px-6 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div><p className="text-sm text-gray-500">Today's Calls</p><p className="text-2xl font-bold text-gray-900">{stats.todayCalls}</p></div>
                                <div className="p-2 bg-blue-100 rounded-lg"><PhoneCall className="h-5 w-5 text-blue-600" /></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div><p className="text-sm text-gray-500">Total Calls</p><p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p></div>
                                <div className="p-2 bg-green-100 rounded-lg"><Phone className="h-5 w-5 text-green-600" /></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div><p className="text-sm text-gray-500">Assigned Leads</p><p className="text-2xl font-bold text-gray-900">{stats.totalLeads}</p></div>
                                <div className="p-2 bg-purple-100 rounded-lg"><MessageSquare className="h-5 w-5 text-purple-600" /></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div><p className="text-sm text-gray-500">Conversions</p><p className="text-2xl font-bold text-gray-900">{stats.conversions}</p><p className="text-xs text-gray-400">{stats.conversionRate}% rate</p></div>
                                <div className="p-2 bg-emerald-100 rounded-lg"><Target className="h-5 w-5 text-emerald-600" /></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-fit">
                        {[{ id: 'leads', label: 'My Leads', icon: MessageSquare }, { id: 'calls', label: 'Recent Calls', icon: Phone }, { id: 'followups', label: 'Follow-ups', icon: Calendar }].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-green-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'}`}>
                                <tab.icon className="h-4 w-4" /><span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="p-6 max-w-5xl mx-auto">
                {loading ? (
                    <div className="text-center py-10"><RefreshCw className="h-8 w-8 text-green-500 animate-spin mx-auto mb-4" /><p className="text-gray-500">Loading...</p></div>
                ) : (
                    <>
                        {activeTab === 'leads' && (
                            leads.length === 0 ? (
                                <div className="text-center py-16 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
                                    <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4"><MessageSquare className="h-8 w-8 text-gray-300" /></div>
                                    <h3 className="text-lg font-medium text-gray-900">No leads assigned</h3>
                                    <p className="text-sm text-gray-400 mt-1">Leads assigned to you will appear here.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {leads.map(lead => (
                                        <div key={lead._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all group">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">{lead.name[0].toUpperCase()}</div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 text-lg">{lead.name}</h3>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-500 mt-1">
                                                            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{lead.phone}</span>
                                                            <span className="hidden sm:inline text-gray-300">•</span>
                                                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{format(new Date(lead.updatedAt), 'MMM d, h:mm a')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 w-full md:w-auto">
                                                    <button onClick={() => { initiateCall(lead.phone); openCallModal(lead); }} className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95">
                                                        <Phone className="h-4 w-4" />Call
                                                    </button>
                                                    <button onClick={() => navigate('/worker/chat', { state: { lead } })} className="flex-1 md:flex-none px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all active:scale-95">
                                                        <MessageSquare className="h-4 w-4" />Chat
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {activeTab === 'calls' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="divide-y divide-gray-100">
                                    {recentCalls.map(call => (
                                        <div key={call._id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">{call.leadId?.name?.[0]?.toUpperCase() || call.leadName?.[0]?.toUpperCase() || 'L'}</div>
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">{call.leadId?.name || call.leadName}</h4>
                                                        <p className="text-sm text-gray-500">{call.phoneNumber}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(call.status)}`}>{call.status?.replace('-', ' ')}</span>
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getOutcomeColor(call.outcome)}`}>{call.outcome?.replace('-', ' ')}</span>
                                                        </div>
                                                        {call.notes && <p className="text-sm text-gray-600 mt-2">{call.notes}</p>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">{format(new Date(call.createdAt), 'MMM d, h:mm a')}</p>
                                                    {call.duration > 0 && <p className="text-xs text-gray-400 mt-1">{Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {recentCalls.length === 0 && <div className="text-center py-12 text-gray-500"><Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>No call history yet</p></div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'followups' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="divide-y divide-gray-100">
                                    {followUps.map(followUp => (
                                        <div key={followUp._id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="h-10 w-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold">{followUp.leadId?.name?.[0]?.toUpperCase() || 'L'}</div>
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">{followUp.leadId?.name || 'Unknown Lead'}</h4>
                                                        <p className="text-sm text-gray-500">{followUp.phoneNumber}</p>
                                                        {followUp.followUpNotes && <p className="text-sm text-gray-600 mt-2">{followUp.followUpNotes}</p>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-orange-600">{format(new Date(followUp.followUpDate), 'MMM d, h:mm a')}</p>
                                                    <button onClick={() => { const lead = leads.find(l => l._id === followUp.leadId?._id); if (lead) { initiateCall(lead.phone); openCallModal(lead); }}} className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">Call Now</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {followUps.length === 0 && <div className="text-center py-12 text-gray-500"><CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" /><p>No pending follow-ups</p></div>}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Call Log Modal */}
            {showCallModal && selectedLead && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Log Call</h2>
                            <button onClick={() => setShowCallModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg"><p className="font-medium text-gray-900">{selectedLead.name}</p><p className="text-sm text-gray-500">{selectedLead.phone}</p></div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Call Status</label>
                                <select value={callForm.status} onChange={(e) => setCallForm({ ...callForm, status: e.target.value })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500">
                                    <option value="completed">Completed</option><option value="missed">Missed</option><option value="no-answer">No Answer</option><option value="busy">Busy</option><option value="callback-requested">Callback Requested</option><option value="not-interested">Not Interested</option><option value="converted">Converted</option>
                                </select></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                                <select value={callForm.outcome} onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500">
                                    <option value="other">Other</option><option value="interested">Interested</option><option value="not-interested">Not Interested</option><option value="follow-up">Follow Up Required</option><option value="callback">Callback Requested</option><option value="converted">Converted</option><option value="wrong-number">Wrong Number</option><option value="not-reachable">Not Reachable</option>
                                </select></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
                                <input type="number" value={callForm.duration} onChange={(e) => setCallForm({ ...callForm, duration: e.target.value })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500" placeholder="0" min="0" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea value={callForm.notes} onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500" rows="3" placeholder="Add call notes..." /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date (Optional)</label>
                                <input type="datetime-local" value={callForm.followUpDate} onChange={(e) => setCallForm({ ...callForm, followUpDate: e.target.value })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500" /></div>
                            {callForm.followUpDate && <div><label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Notes</label>
                                <textarea value={callForm.followUpNotes} onChange={(e) => setCallForm({ ...callForm, followUpNotes: e.target.value })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500" rows="2" placeholder="What to discuss in follow-up..." /></div>}
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select value={callForm.priority} onChange={(e) => setCallForm({ ...callForm, priority: e.target.value })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500">
                                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                                </select></div>
                            <div className="flex justify-end gap-3 mt-6 pt-2">
                                <button type="button" onClick={() => setShowCallModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                <button onClick={saveCallLog} disabled={savingCall} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 disabled:opacity-50">{savingCall ? 'Saving...' : 'Save Call Log'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

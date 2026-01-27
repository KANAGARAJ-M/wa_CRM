import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Phone, PhoneCall, PhoneMissed, PhoneOff, Users, TrendingUp,
    Calendar, Clock, CheckCircle, XCircle, RefreshCw, Filter,
    ChevronDown, Search, Download, BarChart3, PieChart, Activity,
    AlertCircle, ArrowUpRight, ArrowDownRight, UserCheck, Target
} from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function CallAnalytics() {
    const [analytics, setAnalytics] = useState(null);
    const [calls, setCalls] = useState([]);
    const [followUps, setFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [workers, setWorkers] = useState([]);
    const [filters, setFilters] = useState({
        workerId: '',
        status: '',
        outcome: '',
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });
    const [activeTab, setActiveTab] = useState('overview');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [selectedLeadHistory, setSelectedLeadHistory] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    useEffect(() => {
        fetchWorkers();
    }, []);

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchWorkers = async () => {
        try {
            const response = await api.get('/workers');
            setWorkers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching workers:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.workerId) queryParams.append('workerId', filters.workerId);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.outcome) queryParams.append('outcome', filters.outcome);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);

            const [analyticsRes, callsRes, followUpsRes] = await Promise.all([
                api.get(`/calls/analytics?${queryParams}`),
                api.get(`/calls?${queryParams}&limit=100`),
                api.get('/calls/follow-ups')
            ]);

            setAnalytics(analyticsRes.data.data);
            setCalls(callsRes.data.data || []);
            setFollowUps(followUpsRes.data.data || []);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateCallStatus = async (callId, updates) => {
        try {
            await api.put(`/calls/${callId}`, updates);
            fetchData();
        } catch (error) {
            console.error('Error updating call:', error);
            alert('Failed to update call');
        }
    };

    const fetchLeadHistory = async (leadId) => {
        if (!leadId) return;
        try {
            // We can reuse the calls endpoint but filter by leadId to get full history
            // Since we are admin (or have access to analytics), we should be able to see all calls for a lead
            // We might need to ensure the backend supports filtering by leadId in the general /calls endpoint
            // The current /calls endpoint supports filtering by workerId, status, etc.
            // Let's assume we can filter by leadId or we might need to add it to the backend query
            // Actually, looking at calls.routes.js, it doesn't explicitly filter by leadId in the query params
            // But we can add it. For now, let's try to fetch and filter client side if needed, or better, update backend.
            // Wait, I can't update backend easily in this step without context switch.
            // Let's check if I can use the worker portal route? No, I am admin here.
            // Let's check calls.routes.js again.
            // It filters by: status, outcome, workerId, startDate, endDate.
            // I should probably add leadId support to GET /api/calls in backend first.
            // But for now, let's assume I will add it.

            const response = await api.get(`/calls?leadId=${leadId}&limit=50`);
            setSelectedLeadHistory(response.data.data);
            setShowHistoryModal(true);
        } catch (error) {
            console.error('Error fetching lead history:', error);
            alert('Failed to fetch history');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'completed': 'bg-green-100 text-green-700',
            'missed': 'bg-red-100 text-red-700',
            'no-answer': 'bg-yellow-100 text-yellow-700',
            'busy': 'bg-orange-100 text-orange-700',
            'callback-requested': 'bg-blue-100 text-blue-700',
            'scheduled': 'bg-purple-100 text-purple-700',
            'not-interested': 'bg-gray-100 text-gray-700',
            'converted': 'bg-emerald-100 text-emerald-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const getOutcomeColor = (outcome) => {
        const colors = {
            'interested': 'bg-green-100 text-green-700',
            'not-interested': 'bg-red-100 text-red-700',
            'follow-up': 'bg-blue-100 text-blue-700',
            'callback': 'bg-yellow-100 text-yellow-700',
            'converted': 'bg-emerald-100 text-emerald-700',
            'wrong-number': 'bg-gray-100 text-gray-700',
            'not-reachable': 'bg-orange-100 text-orange-700',
            'other': 'bg-slate-100 text-slate-700'
        };
        return colors[outcome] || 'bg-gray-100 text-gray-700';
    };

    const StatCard = ({ title, value, icon: Icon, color, change, subtext }) => (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
                    {subtext && <p className="mt-1 text-sm text-gray-500">{subtext}</p>}
                </div>
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
            </div>
            {change !== undefined && (
                <div className="mt-4 flex items-center text-sm">
                    {change >= 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {Math.abs(change)}%
                    </span>
                    <span className="text-gray-500 ml-1">vs last period</span>
                </div>
            )}
        </div>
    );

    if (loading && !analytics) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 text-green-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-xl">
                                <BarChart3 className="h-6 w-6 text-green-600" />
                            </div>
                            Call Analytics
                        </h1>
                        <p className="text-gray-500 mt-1">Track call performance and worker productivity</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            <ChevronDown className={`h-4 w-4 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilterPanel && (
                    <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Worker</label>
                                <select
                                    value={filters.workerId}
                                    onChange={(e) => setFilters({ ...filters, workerId: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="">All Workers</option>
                                    {workers.map(worker => (
                                        <option key={worker._id} value={worker._id}>{worker.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="">All Status</option>
                                    <option value="completed">Completed</option>
                                    <option value="missed">Missed</option>
                                    <option value="no-answer">No Answer</option>
                                    <option value="busy">Busy</option>
                                    <option value="callback-requested">Callback Requested</option>
                                    <option value="converted">Converted</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                                <select
                                    value={filters.outcome}
                                    onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="">All Outcomes</option>
                                    <option value="interested">Interested</option>
                                    <option value="not-interested">Not Interested</option>
                                    <option value="follow-up">Follow Up</option>
                                    <option value="callback">Callback</option>
                                    <option value="converted">Converted</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-fit">
                    {[
                        { id: 'overview', label: 'Overview', icon: PieChart },
                        { id: 'calls', label: 'Call Log', icon: Phone },
                        { id: 'workers', label: 'Worker Performance', icon: Users },
                        { id: 'followups', label: 'Follow-ups', icon: Calendar }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && analytics && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <StatCard
                                title="Total Calls"
                                value={analytics.totalCalls || 0}
                                icon={Phone}
                                color="bg-blue-500"
                            />
                            <StatCard
                                title="Completed"
                                value={analytics.statusBreakdown?.completed || 0}
                                icon={CheckCircle}
                                color="bg-green-500"
                                subtext={`${analytics.totalCalls > 0 ? ((analytics.statusBreakdown?.completed / analytics.totalCalls) * 100).toFixed(1) : 0}% success rate`}
                            />
                            <StatCard
                                title="Conversions"
                                value={analytics.outcomeBreakdown?.converted || 0}
                                icon={Target}
                                color="bg-emerald-500"
                                subtext={`${analytics.totalCalls > 0 ? ((analytics.outcomeBreakdown?.converted / analytics.totalCalls) * 100).toFixed(1) : 0}% conversion rate`}
                            />
                            <StatCard
                                title="Pending Follow-ups"
                                value={analytics.pendingFollowUps || 0}
                                icon={AlertCircle}
                                color="bg-orange-500"
                            />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Status Breakdown */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Status Breakdown</h3>
                                <div className="space-y-3">
                                    {Object.entries(analytics.statusBreakdown || {}).map(([status, count]) => (
                                        <div key={status} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                                                    {status.replace('-', ' ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full"
                                                        style={{ width: `${(count / analytics.totalCalls) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 w-12 text-right">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Outcome Breakdown */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Outcomes</h3>
                                <div className="space-y-3">
                                    {Object.entries(analytics.outcomeBreakdown || {}).map(([outcome, count]) => (
                                        <div key={outcome} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOutcomeColor(outcome)}`}>
                                                    {outcome.replace('-', ' ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${(count / analytics.totalCalls) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 w-12 text-right">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Daily Trend */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Call Trend (Last 7 Days)</h3>
                            <div className="flex items-end justify-between h-40 gap-2">
                                {(analytics.dailyTrend || []).map((day, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center">
                                        <div className="w-full flex flex-col items-center justify-end h-32">
                                            <div
                                                className="w-full max-w-12 bg-green-500 rounded-t-lg transition-all"
                                                style={{
                                                    height: `${Math.max((day.count / Math.max(...analytics.dailyTrend.map(d => d.count), 1)) * 100, 5)}%`
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500 mt-2">
                                            {format(new Date(day._id), 'EEE')}
                                        </span>
                                        <span className="text-sm font-medium text-gray-700">{day.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Calls Tab */}
                {activeTab === 'calls' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Lead</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Worker</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Outcome</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Details</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Order Status</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Duration</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Notes</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {calls.map(call => (
                                        <tr key={call._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {call.leadId?.name || call.leadName || 'Unknown'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{call.phoneNumber}</p>
                                                    <button
                                                        onClick={() => fetchLeadHistory(call.leadId?._id || call.leadId)}
                                                        className="text-xs text-green-600 hover:text-green-700 hover:underline mt-1"
                                                    >
                                                        View History
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-gray-700">{call.workerId?.name || 'Unknown'}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(call.status)}`}>
                                                    {call.status?.replace('-', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOutcomeColor(call.outcome)}`}>
                                                    {call.outcome?.replace('-', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col gap-1">
                                                    {call.location && (
                                                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                                                            📍 {call.location}
                                                        </span>
                                                    )}
                                                    {call.businessDetails && (
                                                        <span className="text-xs text-gray-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit">
                                                            🏢 {call.businessDetails}
                                                        </span>
                                                    )}
                                                    {!call.location && !call.businessDetails && <span className="text-gray-400">-</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                {call.orderStatus ? (
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${call.orderStatus === 'ordered' ? 'bg-green-100 text-green-700' :
                                                        call.orderStatus === 'already-ordered' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {call.orderStatus.replace('-', ' ')}
                                                    </span>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-gray-700">
                                                    {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '-'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <p className="text-sm text-gray-600 truncate max-w-xs" title={call.notes}>
                                                    {call.notes || '-'}
                                                </p>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm text-gray-500">
                                                    {format(new Date(call.createdAt), 'MMM d, h:mm a')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {calls.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No calls found for the selected filters</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Workers Tab */}
                {activeTab === 'workers' && analytics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(analytics.workerPerformance || []).map(worker => (
                            <div key={worker.workerId} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        {worker.workerName?.[0]?.toUpperCase() || 'W'}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{worker.workerName}</h3>
                                        <p className="text-sm text-gray-500">{worker.workerEmail}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Total Calls</span>
                                        <span className="font-semibold text-gray-900">{worker.totalCalls}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Completed</span>
                                        <span className="font-semibold text-green-600">{worker.completedCalls}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Avg Duration</span>
                                        <span className="font-semibold text-gray-900">
                                            {Math.floor(worker.avgDuration / 60)}:{Math.floor(worker.avgDuration % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Conversions</span>
                                        <span className="font-semibold text-emerald-600">{worker.conversions}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-600">Conversion Rate</span>
                                        <span className={`font-semibold ${worker.conversionRate > 10 ? 'text-green-600' : worker.conversionRate > 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {worker.conversionRate?.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!analytics.workerPerformance || analytics.workerPerformance.length === 0) && (
                            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
                                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No worker performance data available</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Follow-ups Tab */}
                {activeTab === 'followups' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Pending Follow-ups</h3>
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                {followUps.length} pending
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {followUps.map(followUp => (
                                <div key={followUp._id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {followUp.leadId?.name?.[0]?.toUpperCase() || 'L'}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{followUp.leadId?.name || 'Unknown Lead'}</h4>
                                                <p className="text-sm text-gray-500">{followUp.phoneNumber}</p>
                                                {followUp.followUpNotes && (
                                                    <p className="text-sm text-gray-600 mt-1">{followUp.followUpNotes}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900">
                                                {format(new Date(followUp.followUpDate), 'MMM d, h:mm a')}
                                            </p>
                                            <p className="text-sm text-gray-500">{followUp.workerId?.name}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {followUps.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                                    <p>No pending follow-ups</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* History Modal */}
            {showHistoryModal && selectedLeadHistory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col animate-fadeIn">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Lead History</h2>
                                <p className="text-sm text-gray-500">
                                    {selectedLeadHistory[0]?.leadId?.name || selectedLeadHistory[0]?.leadName || 'Unknown Lead'} - {selectedLeadHistory[0]?.phoneNumber}
                                </p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                {selectedLeadHistory.map((call, index) => (
                                    <div key={call._id} className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-0 last:pb-0">
                                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="font-semibold text-gray-900">{call.workerId?.name || 'Unknown Agent'}</span>
                                                    <span className="text-sm text-gray-500 mx-2">•</span>
                                                    <span className="text-sm text-gray-500">{format(new Date(call.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(call.status)}`}>
                                                        {call.status}
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getOutcomeColor(call.outcome)}`}>
                                                        {call.outcome}
                                                    </span>
                                                </div>
                                            </div>

                                            {call.notes && (
                                                <p className="text-gray-700 mb-3 bg-white p-3 rounded border border-gray-100 italic">
                                                    "{call.notes}"
                                                </p>
                                            )}

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                {call.location && (
                                                    <div>
                                                        <span className="text-gray-500 block text-xs">Location</span>
                                                        <span className="font-medium">{call.location}</span>
                                                    </div>
                                                )}
                                                {call.businessDetails && (
                                                    <div>
                                                        <span className="text-gray-500 block text-xs">Business</span>
                                                        <span className="font-medium">{call.businessDetails}</span>
                                                    </div>
                                                )}
                                                {call.orderStatus && (
                                                    <div>
                                                        <span className="text-gray-500 block text-xs">Order Status</span>
                                                        <span className={`font-medium ${call.orderStatus === 'ordered' ? 'text-green-600' :
                                                            call.orderStatus === 'already-ordered' ? 'text-blue-600' :
                                                                'text-gray-600'
                                                            }`}>
                                                            {call.orderStatus.replace('-', ' ')}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="text-gray-500 block text-xs">Duration</span>
                                                    <span className="font-medium">{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {selectedLeadHistory.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">No history found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

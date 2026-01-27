import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Users, MessageSquare, CheckCircle, TrendingUp,
    BarChart3, PieChart, Activity, Calendar
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart as RePieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { format, subDays, isSameDay, parseISO, startOfDay } from 'date-fns';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalLeads: 0,
        newLeads: 0,
        convertedLeads: 0,
        totalWorkers: 0
    });
    const [leadsByStage, setLeadsByStage] = useState([]);
    const [leadsBySource, setLeadsBySource] = useState([]);
    const [leadsTrend, setLeadsTrend] = useState([]);
    const [recentLeads, setRecentLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [leadsRes, workersRes] = await Promise.all([
                api.get('/leads?limit=1000'), // Fetch enough leads for analytics
                api.get('/workers')
            ]);

            const leads = leadsRes.data.data || [];
            const workers = workersRes.data.data || [];

            // Calculate Stats
            const totalLeads = leads.length;
            const newLeads = leads.filter(l => l.stage === 'new').length;
            const convertedLeads = leads.filter(l => l.stage === 'converted').length;
            const totalWorkers = workers.length;

            setStats({ totalLeads, newLeads, convertedLeads, totalWorkers });

            // Leads by Stage
            const stageCounts = leads.reduce((acc, lead) => {
                const stage = lead.stage || 'unknown';
                acc[stage] = (acc[stage] || 0) + 1;
                return acc;
            }, {});

            const stageData = Object.keys(stageCounts).map(stage => ({
                name: stage.charAt(0).toUpperCase() + stage.slice(1),
                value: stageCounts[stage]
            }));
            setLeadsByStage(stageData);

            // Leads by Source
            const sourceCounts = leads.reduce((acc, lead) => {
                const source = lead.source || 'Manual';
                acc[source] = (acc[source] || 0) + 1;
                return acc;
            }, {});

            const sourceData = Object.keys(sourceCounts).map(source => ({
                name: source,
                value: sourceCounts[source]
            }));
            setLeadsBySource(sourceData);

            // Leads Trend (Last 7 days)
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = subDays(new Date(), 6 - i);
                return startOfDay(d);
            });

            const trendData = last7Days.map(date => {
                const count = leads.filter(lead =>
                    isSameDay(parseISO(lead.createdAt), date)
                ).length;
                return {
                    date: format(date, 'MMM dd'),
                    leads: count
                };
            });
            setLeadsTrend(trendData);

            // Recent Leads
            setRecentLeads(leads.slice(0, 5));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-y-auto bg-gray-50">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-500 mt-1">Overview of your leads and performance</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Leads"
                    value={stats.totalLeads}
                    icon={<Users className="h-6 w-6 text-blue-600" />}
                    bg="bg-blue-50"
                    trend="+12% from last week"
                />
                <StatCard
                    title="New Leads"
                    value={stats.newLeads}
                    icon={<MessageSquare className="h-6 w-6 text-yellow-600" />}
                    bg="bg-yellow-50"
                    trend="Requires attention"
                />
                <StatCard
                    title="Converted"
                    value={stats.convertedLeads}
                    icon={<CheckCircle className="h-6 w-6 text-green-600" />}
                    bg="bg-green-50"
                    trend={`${((stats.convertedLeads / stats.totalLeads) * 100).toFixed(1)}% conversion rate`}
                />
                <StatCard
                    title="Active Agents"
                    value={stats.totalWorkers}
                    icon={<Activity className="h-6 w-6 text-purple-600" />}
                    bg="bg-purple-50"
                    trend="Team is active"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Leads Trend */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-gray-500" />
                        Leads Growth (Last 7 Days)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={leadsTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="leads"
                                    stroke="#10B981"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leads by Stage */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-gray-500" />
                        Leads Distribution
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={leadsByStage}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {leadsByStage.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leads by Source */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-gray-500" />
                        Leads by Source
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={leadsBySource} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Leads */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        Recent Leads
                    </h3>
                    <div className="space-y-4">
                        {recentLeads.map(lead => (
                            <div key={lead._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {lead.name[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{formatLeadTime(lead.createdAt)}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${lead.stage === 'new' ? 'bg-blue-100 text-blue-700' :
                                    lead.stage === 'converted' ? 'bg-green-100 text-green-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {lead.stage}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, bg, trend }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${bg}`}>
                    {icon}
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                    Last 30 days
                </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-1">{value}</h3>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
            </p>
        </div>
    );
}

const formatLeadTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return format(d, 'MMM d, h:mm a');
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { MessageSquare, Phone, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

export default function WorkerDashboard() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchAssignedLeads();
    }, []);

    const fetchAssignedLeads = async () => {
        try {
            const response = await api.get('/worker/leads');
            setLeads(response.data.data);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-green-500/20">
                        W
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900">Worker Portal</h1>
                        <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors px-4 py-2 hover:bg-red-50 rounded-lg"
                >
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </header>

            {/* Content */}
            <main className="p-6 max-w-5xl mx-auto">
                <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    My Assigned Leads
                </h2>

                {loading ? (
                    <div className="text-center py-10">Loading...</div>
                ) : leads.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="h-8 w-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No leads assigned</h3>
                        <p className="text-sm text-gray-400 mt-1">Leads assigned to you will appear here.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {leads.map(lead => (
                            <div key={lead._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between hover:shadow-md transition-all group">
                                <div className="flex items-center gap-4 mb-4 md:mb-0">
                                    <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                        {lead.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-lg">{lead.name}</h3>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-500 mt-1">
                                            <span className="flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5" />
                                                {lead.phone}
                                            </span>
                                            <span className="hidden sm:inline text-gray-300">•</span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                {format(new Date(lead.updatedAt), 'MMM d, h:mm a')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/worker/chat', { state: { lead } })}
                                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all active:scale-95 w-full md:w-auto"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    Open Chat
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

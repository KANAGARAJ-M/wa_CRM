import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Users, Plus, Trash2, Mail, Lock, User, X, Eye, EyeOff } from 'lucide-react';

export default function Workers() {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        try {
            const response = await api.get('/workers');
            setWorkers(response.data.data);
        } catch (error) {
            console.error('Error fetching workers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/workers', formData);
            setShowAddModal(false);
            setFormData({ name: '', email: '', password: '' });
            fetchWorkers();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create agent');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this agent?')) return;
        try {
            await api.delete(`/workers/${id}`);
            fetchWorkers();
        } catch (error) {
            alert('Failed to delete agent');
        }
    };

    return (
        <div className="h-full bg-gray-100 p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="h-6 w-6 text-green-600" />
                        Team Members
                    </h1>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all"
                    >
                        <Plus className="h-5 w-5" />
                        Add Agent
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-10">Loading...</div>
                ) : workers.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No agents found. Add your first team member!</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workers.map(worker => (
                            <div key={worker._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                            {worker.name[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{worker.name}</h3>
                                            <p className="text-sm text-gray-500">{worker.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(worker._id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                                        {worker.customRole?.name || 'Agent'}
                                    </span>
                                    <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-medium">Active</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl animate-fadeIn">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Add New Agent</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text"
                                            required
                                            className="pl-10 w-full border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="John Doe"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="email"
                                            required
                                            className="pl-10 w-full border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="agent@company.com"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            className="pl-10 pr-10 w-full border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                                    >
                                        Create Agent
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

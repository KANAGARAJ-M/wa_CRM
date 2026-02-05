import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { Building, Plus, Loader2, LogOut, ArrowRight, LayoutGrid } from 'lucide-react';

export default function CompanySelection() {
    const { selectCompany, logout, user } = useAuth();
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newCompany, setNewCompany] = useState({ name: '', website: '', phone: '', address: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const res = await api.get('/companies/mine');
            const companyList = res.data.data;
            setCompanies(companyList);

            // Auto-select if user has only one company AND is not a superadmin AND does not have create_company permission
            const hasCreatePerm = user?.customRole?.permissions?.includes('create_company');
            if (companyList.length === 1 && user?.role !== 'superadmin' && !hasCreatePerm) {
                selectCompany(companyList[0]);
                navigate('/');
                return;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (company) => {
        selectCompany(company);
        navigate('/');
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newCompany.name.trim()) return;

        setCreating(true);
        try {
            const res = await api.post('/companies', newCompany);
            setCompanies([...companies, res.data.data]);
            setShowCreate(false);
            setNewCompany({ name: '', website: '', phone: '', address: '' });
            // Optionally auto-select the new company
            // handleSelect(res.data.data);
        } catch (error) {
            console.error('Failed to create company:', error);
            alert('Failed to create company');
        } finally {
            setCreating(false);
        }
    };

    const getCompanyColor = (id) => {
        const colors = [
            { bg: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' },
            { bg: 'bg-emerald-50', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' },
            { bg: 'bg-violet-50', text: 'text-violet-600', gradient: 'from-violet-500 to-purple-600' },
            { bg: 'bg-orange-50', text: 'text-orange-600', gradient: 'from-orange-500 to-rose-600' },
            { bg: 'bg-cyan-50', text: 'text-cyan-600', gradient: 'from-cyan-500 to-blue-600' },
            { bg: 'bg-rose-50', text: 'text-rose-600', gradient: 'from-rose-500 to-pink-600' },
            { bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-600' },
        ];
        // Use the sum of character codes of the ID to pick a color
        const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                    <p className="text-gray-500 font-medium animate-pulse">Loading workspaces...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-100">
                        <LayoutGrid className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-bold text-xl text-gray-800 tracking-tight">WhatsApp CRM</span>
                </div>
                <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-all duration-200"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Select Workspace</h1>
                        <p className="text-gray-500 mt-2 text-lg">Choose a company to manage or create a new one.</p>
                    </div>
                    {(user?.role === 'superadmin' || user?.customRole?.permissions?.includes('create_company')) && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200 shadow-lg shadow-green-100 font-bold"
                        >
                            <Plus className="h-5 w-5" />
                            Create Company
                        </button>
                    )}
                </div>

                {showCreate && (
                    <div className="mb-12 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-6 duration-500">
                        <div className="border-b border-gray-50 px-8 py-5 bg-[#FBFCFE]">
                            <h3 className="font-bold text-gray-800 text-lg">Create New Company</h3>
                        </div>
                        <form onSubmit={handleCreate} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-gray-700">Company Name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={newCompany.name}
                                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-50 focus:border-green-500 transition-all outline-none bg-gray-50/50"
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-gray-700">Website</label>
                                    <input
                                        type="text"
                                        value={newCompany.website}
                                        onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-50 focus:border-green-500 transition-all outline-none bg-gray-50/50"
                                        placeholder="https://acme.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-gray-700">Phone</label>
                                    <input
                                        type="text"
                                        value={newCompany.phone}
                                        onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-50 focus:border-green-500 transition-all outline-none bg-gray-50/50"
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-gray-700">Address</label>
                                    <input
                                        type="text"
                                        value={newCompany.address}
                                        onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-50 focus:border-green-500 transition-all outline-none bg-gray-50/50"
                                        placeholder="123 Business St"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-8 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200 flex items-center gap-2 disabled:opacity-70 font-bold shadow-lg shadow-green-100"
                                >
                                    {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                                    Create and Add
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-4">
                    {companies.map(company => {
                        const style = getCompanyColor(company._id);
                        return (
                            <div
                                key={company._id}
                                onClick={() => handleSelect(company)}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-xl hover:shadow-indigo-50/50 hover:border-indigo-200 transition-all duration-300 group flex items-center gap-6 relative"
                            >
                                <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform duration-300`}>
                                    <span className="text-2xl font-black text-white uppercase">{company.name?.[0]}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-extrabold text-xl text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                            {company.name}
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                                        <p className="text-gray-500 flex items-center gap-1.5 font-medium">
                                            <Building className="h-3.5 w-3.5" />
                                            {company.website || 'No website'}
                                        </p>
                                        <p className="text-gray-400 flex items-center gap-1.5">
                                            Created: {new Date(company.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="mt-2 text-green-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                        Open Workspace
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button className="h-10 w-10 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                                        <ArrowRight className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {companies.length === 0 && !loading && (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                            <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Building className="h-10 w-10 text-indigo-200" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">No workspaces yet</h3>
                            <p className="text-gray-500 mt-2">Create your first company to get started with the CRM.</p>
                            <button
                                onClick={() => setShowCreate(true)}
                                className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all"
                            >
                                Get Started
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

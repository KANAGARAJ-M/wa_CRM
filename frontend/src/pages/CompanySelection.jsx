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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-gradient-to-br from-green-400 to-teal-500 rounded-lg flex items-center justify-center">
                        <LayoutGrid className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-xl text-gray-800">WhatsApp CRM</span>
                </div>
                <button
                    onClick={logout}
                    className="text-sm text-gray-600 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Select Workspace</h1>
                        <p className="text-gray-500 mt-1">Choose a company to manage or create a new one.</p>
                    </div>
                    {(user?.role === 'superadmin' || user?.customRole?.permissions?.includes('create_company')) && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 shadow-sm font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            Create Company
                        </button>
                    )}
                </div>

                {showCreate && (
                    <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-4">
                        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                            <h3 className="font-semibold text-gray-800">Create New Company</h3>
                        </div>
                        <form onSubmit={handleCreate} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={newCompany.name}
                                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                    <input
                                        type="text"
                                        value={newCompany.website}
                                        onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                        placeholder="https://acme.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={newCompany.phone}
                                        onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <input
                                        type="text"
                                        value={newCompany.address}
                                        onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                        placeholder="123 Business St"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-70"
                                >
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Create and Add
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companies.map(company => (
                        <div
                            key={company._id}
                            onClick={() => handleSelect(company)}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-green-400 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="h-5 w-5 text-green-500" />
                            </div>

                            <div className="flex items-start gap-4 mb-4">
                                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Building className="h-6 w-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{company.name}</h3>
                                    <p className="text-sm text-gray-500 truncate">{company.website || 'No website'}</p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                <p className="flex items-center gap-2">
                                    <span className="w-20 text-gray-400">Created:</span>
                                    {new Date(company.createdAt).toLocaleDateString()}
                                </p>
                                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center text-green-600 font-medium">
                                    <span>Open Workspace</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {companies.length === 0 && !loading && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <p>No companies found. Create one to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Shield, Plus, Edit2, Trash2, Check, X,
    AlertCircle, Loader2, Lock, User, Mail, Eye, EyeOff
} from 'lucide-react';

const PERMISSIONS = [
    { id: 'manage_workers', label: 'Manage Agents', description: 'Create, edit, and delete agent accounts' },
    { id: 'assign_leads', label: 'Assign Leads', description: 'Assign leads to agents' },
    { id: 'view_all_leads', label: 'View All Leads', description: 'View leads assigned to any agent' },
    { id: 'view_own_leads', label: 'View Own Leads', description: 'View only leads assigned to self' },
    { id: 'manage_roles', label: 'Manage Roles', description: 'Create and manage roles and permissions' },
    { id: 'view_analytics', label: 'View Analytics', description: 'Access dashboard and analytics reports' },
    { id: 'manage_settings', label: 'Manage Settings', description: 'Configure company and WhatsApp settings' },
    { id: 'export_data', label: 'Export Data', description: 'Export leads and reports to Excel' },
    { id: 'delete_leads', label: 'Delete Leads', description: 'Permanently delete leads' }
];

export default function Roles() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: []
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // User Modal State
    const [showUserModal, setShowUserModal] = useState(false);
    const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', roleId: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);

    // View Users State
    const [viewingRole, setViewingRole] = useState(null);
    const [roleUsers, setRoleUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await api.get('/roles');
            setRoles(response.data.data || []);
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (role = null) => {
        if (role) {
            setEditingRole(role);
            setFormData({
                name: role.name,
                description: role.description || '',
                permissions: role.permissions || []
            });
        } else {
            setEditingRole(null);
            setFormData({
                name: '',
                description: '',
                permissions: []
            });
        }
        setShowModal(true);
        setError('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingRole(null);
        setFormData({ name: '', description: '', permissions: [] });
    };

    const handlePermissionToggle = (permissionId) => {
        setFormData(prev => {
            const newPermissions = prev.permissions.includes(permissionId)
                ? prev.permissions.filter(p => p !== permissionId)
                : [...prev.permissions, permissionId];
            return { ...prev, permissions: newPermissions };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole._id}`, formData);
            } else {
                await api.post('/roles', formData);
            }
            await fetchRoles();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving role:', err);
            setError(err.response?.data?.message || 'Failed to save role');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this role?')) return;

        try {
            await api.delete(`/roles/${id}`);
            fetchRoles();
        } catch (err) {
            console.error('Error deleting role:', err);
            alert('Failed to delete role');
        }
    };

    const handleOpenUserModal = (role) => {
        setUserFormData({
            name: '',
            email: '',
            password: '',
            roleId: role._id
        });
        setShowUserModal(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        setCreatingUser(true);
        try {
            await api.post('/workers', userFormData);
            setShowUserModal(false);
            setUserFormData({ name: '', email: '', password: '', roleId: '' });
            fetchRoles(); // Refresh counts
            alert('User created/assigned successfully');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to create user');
        } finally {
            setCreatingUser(false);
        }
    };

    const handleViewUsers = async (role) => {
        setViewingRole(role);
        setLoadingUsers(true);
        try {
            // Fetch users specifically for this role (from the role's company)
            const response = await api.get(`/roles/${role._id}/users`);
            const users = response.data.data || [];
            setRoleUsers(users);
        } catch (error) {
            console.error('Error fetching role users:', error);
            alert('Failed to load users');
        } finally {
            setLoadingUsers(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-y-auto bg-gray-50">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Roles & Permissions</h1>
                    <p className="text-gray-500 mt-1">Manage access levels for your team members</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 font-medium flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Create Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <div key={role._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <Shield className="h-6 w-6 text-blue-600" />
                                </div>
                                {!role.isSystem && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenModal(role)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(role._id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{role.name}</h3>
                            <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">
                                {role.description || 'No description provided'}
                            </p>

                            <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg">
                                <button
                                    onClick={() => handleViewUsers(role)}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                                >
                                    <User className="h-4 w-4" />
                                    <span className="font-medium">{role.userCount || 0} Users</span>
                                </button>
                                <button
                                    onClick={() => handleOpenUserModal(role)}
                                    className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors border border-green-200"
                                >
                                    + Add User
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Permissions ({role.permissions.length})
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {role.permissions.slice(0, 5).map(p => (
                                        <span key={p} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md border border-gray-200">
                                            {p.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                    {role.permissions.length > 5 && (
                                        <span className="px-2 py-1 bg-gray-50 text-gray-400 text-xs rounded-md border border-gray-200">
                                            +{role.permissions.length - 5} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Role Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fadeIn">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingRole ? 'Edit Role' : 'Create New Role'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                            {error && (
                                <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                                    <AlertCircle className="h-5 w-5" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                        placeholder="e.g. Sales Manager"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                        rows={2}
                                        placeholder="Brief description of this role..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {PERMISSIONS.map(permission => (
                                            <div
                                                key={permission.id}
                                                onClick={() => handlePermissionToggle(permission.id)}
                                                className={`
                                                    p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3
                                                    ${formData.permissions.includes(permission.id)
                                                        ? 'bg-green-50 border-green-200 ring-1 ring-green-500/20'
                                                        : 'bg-white border-gray-200 hover:border-green-300 hover:bg-gray-50'}
                                                `}
                                            >
                                                <div className={`
                                                    mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                                                    ${formData.permissions.includes(permission.id)
                                                        ? 'bg-green-500 border-green-500'
                                                        : 'bg-white border-gray-300'}
                                                `}>
                                                    {formData.permissions.includes(permission.id) && (
                                                        <Check className="h-3.5 w-3.5 text-white" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${formData.permissions.includes(permission.id) ? 'text-green-900' : 'text-gray-700'}`}>
                                                        {permission.label}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {permission.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-all shadow-lg shadow-green-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    editingRole ? 'Update Role' : 'Create Role'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Add User to Role</h2>
                            <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        className="pl-10 w-full border border-gray-200 rounded-xl py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="John Doe"
                                        value={userFormData.name}
                                        onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
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
                                        className="pl-10 w-full border border-gray-200 rounded-xl py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="user@company.com"
                                        value={userFormData.email}
                                        onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
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
                                        className="pl-10 pr-10 w-full border border-gray-200 rounded-xl py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="••••••••"
                                        value={userFormData.password}
                                        onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                                <p>User will be automatically assigned to the company this role belongs to.</p>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowUserModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingUser}
                                    className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-all shadow-lg shadow-green-600/20 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Users Modal */}
            {viewingRole && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fadeIn flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Users in {viewingRole.name}</h2>
                                <p className="text-sm text-gray-500">{roleUsers.length} users assigned</p>
                            </div>
                            <button onClick={() => setViewingRole(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {loadingUsers ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                                </div>
                            ) : roleUsers.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <User className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                                    <p>No users assigned to this role.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {roleUsers.map(user => (
                                        <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                                                    {user.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-800">{user.name}</h4>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
                                                Active
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => setViewingRole(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

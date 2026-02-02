import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    MessageSquare, Settings, LogOut, Menu, X, ChevronLeft,
    Users, MessageCircle, ChevronDown, ChevronRight, Building2, Phone, BarChart3, Shield, Clock, ShoppingBag
} from 'lucide-react';

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [communicationExpanded, setCommunicationExpanded] = useState(true);
    const [companyExpanded, setCompanyExpanded] = useState(true);
    const { user, logout, currentCompany } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Check if current path is under communication
    const isCommunicationActive = location.pathname === '/' ||
        location.pathname === '/chats' ||
        location.pathname === '/leads';

    // Check if current path is under company
    const isCompanyActive = location.pathname.includes('/workers') ||
        location.pathname.includes('/call-analytics');

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:relative inset-y-0 left-0 z-50
                    ${sidebarOpen ? 'w-64' : 'w-20'}
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900
                    text-white flex flex-col
                    transition-all duration-300 ease-in-out
                    shadow-2xl
                `}
            >
                {/* Logo Section */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700/50">
                    {sidebarOpen ? (
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                                <MessageCircle className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg leading-tight">WhatsApp</h1>
                                <p className="text-xs text-gray-400 leading-tight">
                                    {currentCompany?.name || 'CRM Platform'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                                <MessageCircle className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    )}

                    {/* Collapse Button - Desktop Only */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-700/50 transition-colors"
                    >
                        <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Close Button - Mobile Only */}
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-700/50 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {/* Dashboard */}
                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.customRole?.permissions?.includes('view_analytics')) && (
                        <NavLink
                            to="/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 mb-2
                                ${isActive
                                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30'
                                    : 'hover:bg-gray-700/50 text-gray-300 hover:text-white'
                                }`
                            }
                        >
                            <div className={`flex-shrink-0 ${sidebarOpen ? '' : 'mx-auto'}`}>
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            {sidebarOpen && (
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">Dashboard</p>
                                    <p className="text-xs text-gray-500 truncate">Overview & Analytics</p>
                                </div>
                            )}
                        </NavLink>
                    )}

                    {/* Communication Section */}
                    <div>
                        <button
                            onClick={() => {
                                if (sidebarOpen) {
                                    setCommunicationExpanded(!communicationExpanded);
                                } else {
                                    navigate('/chats');
                                }
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                                ${isCommunicationActive
                                    ? 'bg-gradient-to-r from-green-500/20 to-teal-500/20 text-green-400 border border-green-500/30'
                                    : 'hover:bg-gray-700/50 text-gray-300 hover:text-white'
                                }`}
                        >
                            <div className={`flex-shrink-0 ${sidebarOpen ? '' : 'mx-auto'}`}>
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            {sidebarOpen && (
                                <>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="font-medium text-sm">Communication</p>
                                        <p className="text-xs text-gray-500 truncate">Chat & Lead Management</p>
                                    </div>
                                    {communicationExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                </>
                            )}
                        </button>

                        {/* Sub Navigation Items */}
                        {sidebarOpen && communicationExpanded && (
                            <div className="mt-1 ml-4 pl-4 border-l border-gray-700/50 space-y-1">
                                <NavLink
                                    to="/chats"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                                        ${isActive || location.pathname === '/'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                                        }`
                                    }
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="text-sm font-medium">Chats</span>
                                </NavLink>

                                {(user?.role === 'admin' || user?.role === 'superadmin' || user?.customRole?.permissions?.includes('view_all_leads') || user?.customRole?.permissions?.includes('view_own_leads')) && (
                                    <NavLink
                                        to="/leads"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                                            ${isActive
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                                            }`
                                        }
                                    >
                                        <span className="text-sm font-medium">Leads</span>
                                    </NavLink>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Company Section */}
                    {(user?.role === 'admin' || user?.role === 'superadmin' ||
                        user?.customRole?.permissions?.includes('manage_workers') ||
                        user?.customRole?.permissions?.includes('view_analytics') ||
                        user?.customRole?.permissions?.includes('manage_roles')) && (
                            <div className="mt-2">
                                <button
                                    onClick={() => {
                                        if (sidebarOpen) {
                                            setCompanyExpanded(!companyExpanded);
                                        } else {
                                            navigate('/workers');
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                                    ${isCompanyActive
                                            ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30'
                                            : 'hover:bg-gray-700/50 text-gray-300 hover:text-white'
                                        }`}
                                >
                                    <div className={`flex-shrink-0 ${sidebarOpen ? '' : 'mx-auto'}`}>
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    {sidebarOpen && (
                                        <>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="font-medium text-sm">Company</p>
                                                <p className="text-xs text-gray-500 truncate">Management</p>
                                            </div>
                                            {companyExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                            )}
                                        </>
                                    )}
                                </button>

                                {/* Sub Navigation Items */}
                                {sidebarOpen && companyExpanded && (
                                    <div className="mt-1 ml-4 pl-4 border-l border-gray-700/50 space-y-1">
                                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.customRole?.permissions?.includes('manage_workers')) && (
                                            <NavLink
                                                to="/workers"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                                                ${isActive
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                                                    }`
                                                }
                                            >
                                                <Users className="h-4 w-4" />
                                                <span className="text-sm font-medium">Agents</span>
                                            </NavLink>
                                        )}

                                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.customRole?.permissions?.includes('manage_workers')) && (
                                            <NavLink
                                                to="/agent-status"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                                                ${isActive
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                                                    }`
                                                }
                                            >
                                                <Clock className="h-4 w-4" />
                                                <span className="text-sm font-medium">Agent Status</span>
                                            </NavLink>
                                        )}

                                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.customRole?.permissions?.includes('view_analytics')) && (
                                            <NavLink
                                                to="/call-analytics"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                                                ${isActive
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                                                    }`
                                                }
                                            >
                                                <BarChart3 className="h-4 w-4" />
                                                <span className="text-sm font-medium">Call Analytics</span>
                                            </NavLink>
                                        )}

                                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.customRole?.permissions?.includes('manage_roles')) && (
                                            <NavLink
                                                to="/roles"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                                                ${isActive
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                                                    }`
                                                }
                                            >
                                                <Shield className="h-4 w-4" />
                                                <span className="text-sm font-medium">Roles & Permissions</span>
                                            </NavLink>
                                        )}

                                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.customRole?.permissions?.includes('manage_settings')) && (
                                            <NavLink
                                                to="/products"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                                                ${isActive
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                                                    }`
                                                }
                                            >
                                                <ShoppingBag className="h-4 w-4" />
                                                <span className="text-sm font-medium">Products</span>
                                            </NavLink>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    {/* Settings */}
                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.customRole?.permissions?.includes('manage_settings')) && (
                        <NavLink
                            to="/settings"
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                                ${isActive
                                    ? 'bg-gradient-to-r from-green-500/20 to-teal-500/20 text-green-400 border border-green-500/30'
                                    : 'hover:bg-gray-700/50 text-gray-300 hover:text-white'
                                }`
                            }
                        >
                            <div className={`flex-shrink-0 ${sidebarOpen ? '' : 'mx-auto'}`}>
                                <Settings className="h-5 w-5" />
                            </div>
                            {sidebarOpen && (
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">Settings</p>
                                    <p className="text-xs text-gray-500 truncate">WhatsApp Configuration</p>
                                </div>
                            )}
                        </NavLink>
                    )}
                </nav>

                {/* User Section */}
                <div className="p-3 border-t border-gray-700/50">
                    <div className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-800/50 ${!sidebarOpen ? 'justify-center' : ''}`}>
                        <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@example.com'}</p>
                            </div>
                        )}
                    </div>

                    {(user?.role === 'superadmin' || user?.companies?.length > 1 || user?.customRole?.permissions?.includes('create_company')) && (
                        <button
                            onClick={() => navigate('/select-company')}
                            className={`mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all duration-200 ${!sidebarOpen ? 'justify-center' : ''}`}
                            title="Switch Company"
                        >
                            <Building2 className="h-5 w-5 flex-shrink-0" />
                            {sidebarOpen && <span className="text-sm font-medium">Switch Company</span>}
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        className={`mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 ${!sidebarOpen ? 'justify-center' : ''}`}
                    >
                        <LogOut className="h-5 w-5 flex-shrink-0" />
                        {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
                    </button>
                </div>
            </aside >

            {/* Main Content Area */}
            < div className="flex-1 flex flex-col min-w-0 overflow-hidden" >
                {/* Mobile Header */}
                < header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm" >
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <Menu className="h-6 w-6 text-gray-700" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-gradient-to-br from-green-400 to-teal-500 rounded-lg flex items-center justify-center">
                            <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-gray-800">WhatsApp CRM</span>
                    </div>
                    <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                </header >

                {/* Page Content */}
                < main className="flex-1 overflow-hidden" >
                    {children}
                </main >
            </div >
        </div >
    );
}

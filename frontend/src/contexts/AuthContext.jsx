import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [currentCompany, setCurrentCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        const savedCompanyId = localStorage.getItem('companyId');

        if (token && savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);

            // Restore company if valid
            if (savedCompanyId && parsedUser.companies) {
                const found = parsedUser.companies.find(c => (c._id || c) === savedCompanyId);
                if (found) setCurrentCompany(found);
            }

            // Verify token is still valid
            api.get('/auth/me')
                .then(res => {
                    const freshUser = res.data.data;
                    setUser(freshUser);
                    localStorage.setItem('user', JSON.stringify(freshUser));

                    // Re-validate company with fresh data
                    const currentId = localStorage.getItem('companyId');
                    if (currentId && freshUser.companies) {
                        const found = freshUser.companies.find(c => (c._id || c) === currentId);
                        if (found) {
                            setCurrentCompany(found);
                        } else {
                            // Invalid company ID for this user
                            localStorage.removeItem('companyId');
                            setCurrentCompany(null);
                        }
                    }
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('companyId');
                    setUser(null);
                    setCurrentCompany(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user: userData } = response.data.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        // Auto-select removed

        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('companyId');
        setUser(null);
        setCurrentCompany(null);
    };

    const selectCompany = (company) => {
        setCurrentCompany(company);
        localStorage.setItem('companyId', company._id || company);
    };

    const clearCompany = () => {
        setCurrentCompany(null);
        localStorage.removeItem('companyId');
    };

    return (
        <AuthContext.Provider value={{ user, currentCompany, login, logout, selectCompany, clearCompany, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

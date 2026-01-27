import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Chats from './pages/Chats';
import Leads from './pages/Leads';
import Settings from './pages/Settings';
import Workers from './pages/Workers';
import CallAnalytics from './pages/CallAnalytics';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerChat from './pages/worker/WorkerChat';
import CompanySelection from './pages/CompanySelection';
import Dashboard from './pages/Dashboard';
import Roles from './pages/Roles';
import Layout from './components/Layout';

const AdminRoute = ({ children }) => {
  const { user, loading, currentCompany } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role === 'worker') {
    return <Navigate to="/worker/dashboard" />;
  }

  if (!currentCompany) {
    return <Navigate to="/select-company" />;
  }

  return <Layout>{children}</Layout>;
};

const WorkerRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Allow admins to access worker pages? Maybe not for now.
  // if (user.role !== 'worker') {
  //   return <Navigate to="/" />;
  // }

  return children;
};

const CompanyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/chats" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <div className="h-screen bg-gray-100 font-sans text-gray-900">
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/select-company"
            element={
              <CompanyRoute>
                <CompanySelection />
              </CompanyRoute>
            }
          />
          <Route
            path="/"
            element={
              <AdminRoute>
                <Navigate to="/dashboard" replace />
              </AdminRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AdminRoute>
                <Dashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <AdminRoute>
                <Chats />
              </AdminRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <AdminRoute>
                <Leads />
              </AdminRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <AdminRoute>
                <Settings />
              </AdminRoute>
            }
          />
          <Route
            path="/workers"
            element={
              <AdminRoute>
                <Workers />
              </AdminRoute>
            }
          />
          <Route
            path="/call-analytics"
            element={
              <AdminRoute>
                <CallAnalytics />
              </AdminRoute>
            }
          />

          <Route
            path="/roles"
            element={
              <AdminRoute>
                <Roles />
              </AdminRoute>
            }
          />

          {/* Worker Routes */}
          <Route
            path="/worker/dashboard"
            element={
              <WorkerRoute>
                <WorkerDashboard />
              </WorkerRoute>
            }
          />
          <Route
            path="/worker/chat"
            element={
              <WorkerRoute>
                <WorkerChat />
              </WorkerRoute>
            }
          />
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;

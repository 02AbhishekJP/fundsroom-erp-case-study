import { Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import StockMovements from './pages/StockMovements';
import Challans from './pages/Challans';
import ChallanDetail from './pages/ChallanDetail';
import NewChallan from './pages/NewChallan';
import Users from './pages/Users';
import Error404 from './pages/Error404';

// Protected Route Wrapper
const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#030712] relative overflow-hidden">
        {/* Simple loader to avoid flickering before 3D loads */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#030712] to-[#030712]"></div>
        <div className="z-10 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <h2 className="text-xl font-bold tracking-widest text-white mb-2">INITIALIZING</h2>
          <p className="text-blue-400/70 text-xs font-mono tracking-[0.2em] animate-pulse">ESTABLISHING SECURE CONNECTION...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Or to a 403 Forbidden page
  }

  return <Outlet />;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </ToastProvider>
  );
}

// Extract routes to use hooks safely
import { Routes as RouterRoutes, Route } from 'react-router-dom';

const Routes = () => {
  return (
    <RouterRoutes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          
          <Route element={<ProtectedRoute allowedRoles={['admin', 'sales', 'accounts']} />}>
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/challans" element={<Challans />} />
            <Route path="/challans/new" element={<NewChallan />} />
            <Route path="/challans/:id" element={<ChallanDetail />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'sales', 'warehouse', 'accounts']} />}>
            <Route path="/products" element={<Products />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'warehouse', 'accounts']} />}>
            <Route path="/stock-movements" element={<StockMovements />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/users" element={<Users />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="*" element={<Error404 />} />
    </RouterRoutes>
  );
};

export default App;

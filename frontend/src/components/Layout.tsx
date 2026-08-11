import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Activity,
  LogOut,
  Zap,
  Menu,
  Bell,
  Search,
  Plus
} from 'lucide-react';
import { useState } from 'react';
import CommandPalette from './CommandPalette';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'sales', 'warehouse', 'accounts'] },
  { to: '/customers', icon: Users, label: 'Customers', roles: ['admin', 'sales', 'accounts'] },
  { to: '/products', icon: Package, label: 'Inventory', roles: ['admin', 'sales', 'warehouse', 'accounts'] },
  { to: '/stock-movements', icon: Activity, label: 'Stock Log', roles: ['admin', 'warehouse', 'accounts'] },
  { to: '/challans', icon: FileText, label: 'Sales Challans', roles: ['admin', 'sales', 'accounts'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Simulated notifications
  const notifications = [
    { id: 1, title: 'Stock Alert', message: 'Logitech MX Master 3 is running low (2 units left).', time: '10 mins ago', type: 'warning' },
    { id: 2, title: 'New Order', message: 'Order SC-2026-00142 created by Sales Team.', time: '1 hour ago', type: 'info' },
    { id: 3, title: 'System Update', message: 'ERP Core upgraded to v2.4.1.', time: '2 hours ago', type: 'success' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role || ''));
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar fixed lg:static inset-y-0 left-0 z-[100] transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} transition-transform duration-300 ease-in-out`}>
        <div className="sidebar-header h-16 flex items-center px-6 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mr-3 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            <Zap size={18} />
          </div>
          <span className="font-bold tracking-wide text-white text-lg">FUNDSROOM</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Main Menu</div>
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}
              `}
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} className={isActive ? 'text-blue-400' : 'text-gray-400'} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 mb-4 bg-white/5 rounded-lg border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name}</div>
              <div className="text-xs text-blue-400 font-medium capitalize tracking-wide">{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={handleLogout}>
            <LogOut size={16} />
            Disconnect
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content relative z-10 flex flex-col h-screen w-full overflow-hidden">
        {/* Particle Background for the whole app */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          {/* We'll add the 3D particle field here later, keeping it simple for now */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900/0 to-gray-900/0"></div>
        </div>

        <header className="main-header sticky top-0 z-30 h-16 bg-[#111827]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="p-2 rounded-md hover:bg-white/10 lg:hidden text-gray-300"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            
            <div className="hidden sm:flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-400 w-64 cursor-text hover:border-white/20 transition-colors">
              <Search size={16} />
              <span>Search (Ctrl+K)</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 relative">
            <button 
              className="p-2 text-gray-400 hover:text-white transition-colors relative"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"></span>
            </button>

            {/* Notification Dropdown */}
            {notificationsOpen && (
              <div className="absolute top-full mt-4 right-12 w-80 bg-surface-glass backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="p-3 border-b border-white/10 bg-black/40 flex justify-between items-center">
                  <span className="text-sm font-bold text-white">System Alerts</span>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">3 New</span>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.map(n => (
                    <div key={n.id} className="p-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-bold ${
                          n.type === 'warning' ? 'text-amber-400' : 
                          n.type === 'success' ? 'text-emerald-400' : 'text-blue-400'
                        }`}>{n.title}</span>
                        <span className="text-[10px] text-gray-500">{n.time}</span>
                      </div>
                      <p className="text-xs text-gray-300">{n.message}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2 text-center border-t border-white/10 bg-black/20 hover:bg-white/5 cursor-pointer transition-colors">
                  <span className="text-xs text-gray-400 font-medium">Mark all as read</span>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative z-10">
          <Outlet />
        </div>

        {/* Floating Action Button */}
        {['admin', 'sales', 'warehouse'].includes(user?.role || '') && (
          <div className="fixed bottom-6 right-6 z-40 group">
            <div className={`absolute bottom-full right-0 mb-4 flex flex-col items-end gap-3 transition-all duration-300 ${fabOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
              {['admin', 'sales'].includes(user?.role || '') && (
                <button className="flex items-center gap-3 px-4 py-2 bg-surface-glass backdrop-blur-md border border-white/10 rounded-full shadow-lg text-white hover:bg-white/10 whitespace-nowrap" onClick={() => { navigate('/challans/new'); setFabOpen(false); }}>
                  <span>New Challan</span>
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center"><FileText size={16} /></div>
                </button>
              )}
              {['admin', 'sales'].includes(user?.role || '') && (
                <button className="flex items-center gap-3 px-4 py-2 bg-surface-glass backdrop-blur-md border border-white/10 rounded-full shadow-lg text-white hover:bg-white/10 whitespace-nowrap" onClick={() => { navigate('/customers?new=true'); setFabOpen(false); }}>
                  <span>New Customer</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Users size={16} /></div>
                </button>
              )}
              {['admin', 'warehouse'].includes(user?.role || '') && (
                <button className="flex items-center gap-3 px-4 py-2 bg-surface-glass backdrop-blur-md border border-white/10 rounded-full shadow-lg text-white hover:bg-white/10 whitespace-nowrap" onClick={() => { navigate('/products?new=true'); setFabOpen(false); }}>
                  <span>New Product</span>
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center"><Package size={16} /></div>
                </button>
              )}
            </div>
            <button 
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] text-white transition-all duration-300 ${fabOpen ? 'bg-red-500 rotate-45 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-500'}`}
              onClick={() => setFabOpen(!fabOpen)}
            >
              <Plus size={24} />
            </button>
          </div>
        )}
        
        {/* Global Command Palette */}
        <CommandPalette />
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import CustomerModal from '../components/CustomerModal';
import { Users as UsersIcon, Search, MapPin, Mail, Phone, Calendar, Building, CheckCircle2, ShieldAlert, ChevronRight, Plus, Edit2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  gst: string | null;
  address: string | null;
  status: 'lead' | 'active' | 'inactive';
  type: 'retail' | 'wholesale' | 'distributor';
  follow_up_date: string | null;
  notes?: string | null;
  created_at: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { showToast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const canEdit = ['admin', 'sales'].includes(user?.role || '');

  // Check for ?new=true from FAB
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditingCustomer(null);
      setModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, typeFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let url = '/customers?limit=50';
      if (search) url += `&search=${search}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&type=${typeFilter}`;
      
      const res = await api.get(url);
      setCustomers(res.data.data);
    } catch (err) {
      showToast('error', 'Failed to fetch network nodes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async (data: any) => {
    if (editingCustomer) {
      await api.put(`/customers/${editingCustomer.id}`, data);
      showToast('success', 'Client updated successfully.');
    } else {
      await api.post('/customers', data);
      showToast('success', 'Client registered successfully.');
    }
    fetchCustomers();
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'lead': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'inactive': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'wholesale': return <Building size={14} className="mr-1.5" />;
      case 'distributor': return <UsersIcon size={14} className="mr-1.5" />;
      default: return <MapPin size={14} className="mr-1.5" />;
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between z-10 shrink-0 border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <UsersIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Client Network</h1>
            <p className="text-xs text-indigo-300/70 font-mono">B2B RELATIONS & DISTRIBUTORS</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search Name, Company, GST..." 
              className="input-glass pl-9 h-10 text-sm border-indigo-500/20 focus:border-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select 
            className="input-glass h-10 text-sm border-indigo-500/20 w-32 bg-[#111827]/80"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="lead">Leads</option>
            <option value="inactive">Inactive</option>
          </select>

          <select 
            className="input-glass h-10 text-sm border-indigo-500/20 w-32 bg-[#111827]/80"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="wholesale">Wholesale</option>
            <option value="distributor">Distributor</option>
            <option value="retail">Retail</option>
          </select>

          {canEdit && (
            <button
              className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2"
              onClick={() => { setEditingCustomer(null); setModalOpen(true); }}
            >
              <Plus size={16} /> Add Client
            </button>
          )}
        </div>
      </div>

      {/* Network Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <ShieldAlert size={48} className="mb-4 text-indigo-600/50" />
            <h3 className="text-lg font-medium text-white mb-1">No nodes found</h3>
            <p>Expand search parameters or register a new client.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customers.map((customer) => (
              <div key={customer.id} className="glass-card group hover:border-indigo-500/40 relative overflow-hidden flex flex-col h-[280px] cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>
                
                {/* Holographic background effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-lg shadow-inner group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all">
                    {customer.company ? customer.company[0].toUpperCase() : customer.name[0].toUpperCase()}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(customer.status)} flex items-center`}>
                    {customer.status === 'active' && <CheckCircle2 size={12} className="mr-1" />}
                    {customer.status.toUpperCase()}
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative z-10 flex-1">
                  <h3 className="text-lg font-bold text-white leading-tight mb-1 truncate">{customer.company || customer.name}</h3>
                  {customer.company && <div className="text-sm text-indigo-300/80 font-medium mb-4">{customer.name}</div>}
                  
                  <div className="space-y-2 mt-4">
                    {customer.email && (
                      <div className="flex items-center text-xs text-gray-400">
                        <Mail size={14} className="mr-2 text-gray-500" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center text-xs text-gray-400">
                        <Phone size={14} className="mr-2 text-gray-500" />
                        {customer.phone}
                      </div>
                    )}
                    <div className="flex items-center text-xs text-gray-400">
                      <div className="flex items-center text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-wider text-[10px] font-bold border border-indigo-500/20">
                        {getTypeIcon(customer.type)}
                        {customer.type}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                  <div className="text-[10px] font-mono text-gray-500 flex items-center">
                    {customer.follow_up_date ? (
                      <>
                        <Calendar size={12} className="mr-1 text-amber-500/70" /> 
                        <span className="text-amber-500/70">NXT: {new Date(customer.follow_up_date).toLocaleDateString()}</span>
                      </>
                    ) : (
                      <>GST: {customer.gst || 'N/A'}</>
                    )}
                  </div>
                  {canEdit ? (
                    <button
                      className="text-indigo-400 hover:text-indigo-300 flex items-center text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded transition-colors group/btn"
                      onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setModalOpen(true); }}
                    >
                      <Edit2 size={12} className="mr-1" /> Edit <ChevronRight size={14} className="ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  ) : (
                    <span className="text-indigo-400/50 flex items-center text-xs font-medium px-2 py-1">
                      Details <ChevronRight size={14} className="ml-1" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCustomer(null); }}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
      />
    </div>
  );
}

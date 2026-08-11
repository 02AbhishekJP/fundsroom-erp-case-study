import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { FileText, Search, Printer, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';

interface Challan {
  id: string;
  challan_number: string;
  customer_name: string;
  customer_company: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  total_amount: string;
  created_at: string;
  created_by_name: string;
}

export default function Challans() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const canCreate = ['admin', 'sales'].includes(user?.role || '');

  useEffect(() => {
    fetchChallans();
  }, [search, statusFilter]);

  const fetchChallans = async () => {
    setLoading(true);
    try {
      let url = '/challans?limit=50';
      if (search) url += `&search=${search}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const res = await api.get(url);
      setChallans(res.data.data);
    } catch (err) {
      showToast('error', 'Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'confirmed': 
        return { 
          icon: <CheckCircle size={14} className="mr-1.5" />, 
          class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
        };
      case 'draft': 
        return { 
          icon: <Clock size={14} className="mr-1.5" />, 
          class: 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
        };
      case 'cancelled': 
        return { 
          icon: <XCircle size={14} className="mr-1.5" />, 
          class: 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
        };
      default: 
        return { icon: null, class: 'bg-gray-500/10 text-gray-400 border-gray-500/30' };
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between z-10 shrink-0 border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Sales Orders</h1>
            <p className="text-xs text-cyan-300/70 font-mono">CHALLAN MANAGEMENT SYSTEM</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search SC-Number or Client..." 
              className="input-glass pl-9 h-10 text-sm border-cyan-500/20 focus:border-cyan-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select 
            className="input-glass h-10 text-sm border-cyan-500/20 w-36 bg-[#111827]/80"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {canCreate && (
            <button
              className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2"
              onClick={() => navigate('/challans/new')}
            >
              <Plus size={16} /> New Challan
            </button>
          )}
        </div>
      </div>

      {/* List View */}
      <div className="glass-card flex-1 p-0 overflow-hidden flex flex-col border-cyan-500/20">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : challans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
              <FileText size={48} className="mb-4 text-cyan-600/50" />
              <h3 className="text-lg font-medium text-white mb-1">No orders found</h3>
              <p>Try adjusting your search filters.</p>
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-cyan-200/50">Challan ID</th>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-cyan-200/50">Client</th>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-cyan-200/50">Date & Agent</th>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-right text-cyan-200/50">Amount</th>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-center text-cyan-200/50">Status</th>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-right text-cyan-200/50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {challans.map((challan) => {
                  const statusInfo = getStatusDisplay(challan.status);
                  return (
                    <tr key={challan.id} className="group hover:bg-cyan-500/5 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-shadow"></div>
                          <span className="font-mono text-cyan-100 font-medium tracking-wide">{challan.challan_number}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-white">{challan.customer_company || challan.customer_name}</div>
                        {challan.customer_company && <div className="text-xs text-gray-400">{challan.customer_name}</div>}
                      </td>
                      <td className="py-4">
                        <div className="text-sm text-gray-300">{new Date(challan.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-cyan-400/70">{challan.created_by_name}</div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="font-semibold text-white tracking-wide">₹{Number(challan.total_amount).toLocaleString()}</div>
                      </td>
                      <td className="py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wider border ${statusInfo.class}`}>
                          {statusInfo.icon}
                          {challan.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors tooltip" title="Print/Export">
                            <Printer size={16} />
                          </button>
                          <button
                            className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium transition-colors"
                            onClick={() => navigate(`/challans/${challan.id}`)}
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer info */}
        {!loading && challans.length > 0 && (
          <div className="px-6 py-3 border-t border-white/5 bg-black/20 flex justify-between items-center text-xs text-gray-400">
            <span>Showing {challans.length} records</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              Live Sync Active
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

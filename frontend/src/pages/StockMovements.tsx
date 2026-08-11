import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  User,
  Calendar,
} from 'lucide-react';

interface StockMovement {
  id: string;
  product_id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string | null;
  product_name: string;
  product_sku: string;
  current_stock: number;
  created_by_name: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    fetchMovements();
  }, [pagination.page, typeFilter]);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      let url = `/stock-movements?page=${pagination.page}&limit=20`;
      if (typeFilter) url += `&type=${typeFilter}`;

      const res = await api.get(url);
      setMovements(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast('error', 'Failed to fetch stock movements.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = search
    ? movements.filter(
        (m) =>
          m.product_name.toLowerCase().includes(search.toLowerCase()) ||
          m.product_sku.toLowerCase().includes(search.toLowerCase()) ||
          (m.reason && m.reason.toLowerCase().includes(search.toLowerCase()))
      )
    : movements;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">

      {/* Header & Controls */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between z-10 shrink-0 border-violet-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Stock Movements</h1>
            <p className="text-xs text-violet-300/70 font-mono">INVENTORY AUDIT TRAIL</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by product or reason..."
              className="input-glass pl-9 h-10 text-sm border-violet-500/20 focus:border-violet-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                typeFilter === '' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => { setTypeFilter(''); setPagination(p => ({ ...p, page: 1 })); }}
            >
              ALL
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                typeFilter === 'IN' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => { setTypeFilter('IN'); setPagination(p => ({ ...p, page: 1 })); }}
            >
              <ArrowDownCircle size={14} /> IN
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                typeFilter === 'OUT' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => { setTypeFilter('OUT'); setPagination(p => ({ ...p, page: 1 })); }}
            >
              <ArrowUpCircle size={14} /> OUT
            </button>
          </div>
        </div>
      </div>

      {/* Movements List */}
      <div className="glass-card flex-1 p-0 overflow-hidden flex flex-col border-violet-500/20">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
              <Activity size={48} className="mb-4 text-violet-600/50" />
              <h3 className="text-lg font-medium text-white mb-1">No movements found</h3>
              <p>Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="p-4 sm:px-6 hover:bg-violet-500/5 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    {/* Direction Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        movement.type === 'IN'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {movement.type === 'IN' ? (
                        <ArrowDownCircle size={20} />
                      ) : (
                        <ArrowUpCircle size={20} />
                      )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="font-medium text-white text-sm truncate">
                            {movement.product_name}
                          </h4>
                          <span className="text-[10px] font-mono text-gray-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                            {movement.product_sku}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wider border ${
                              movement.type === 'IN'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {movement.type === 'IN' ? '+' : '-'}{movement.quantity} units
                          </span>
                        </div>
                      </div>

                      {movement.reason && (
                        <p className="text-sm text-gray-400 mt-1 truncate">{movement.reason}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {movement.created_by_name || 'System'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(movement.created_at)} at {formatTime(movement.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package size={12} />
                          Current: {movement.current_stock} units
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {!loading && pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-white/5 bg-black/20 flex justify-between items-center text-xs text-gray-400">
            <span>
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
            </span>
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-white font-medium px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Live sync */}
        {!loading && filteredMovements.length > 0 && (
          <div className="px-6 py-2 border-t border-white/5 bg-black/10 flex justify-end items-center text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              Audit Trail Sync
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

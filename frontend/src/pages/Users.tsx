import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { Shield, ShieldAlert, CheckCircle2, Key, UserPlus } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (err) {
      showToast('error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'admin': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30';
      case 'sales': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'warehouse': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'accounts': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between z-10 shrink-0 border-fuchsia-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Access Control</h1>
            <p className="text-xs text-fuchsia-300/70 font-mono">PERSONNEL MANAGEMENT</p>
          </div>
        </div>

        <button className="btn btn-primary bg-fuchsia-600 hover:bg-fuchsia-500 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.4)]">
          <UserPlus size={16} /> Add Personnel
        </button>
      </div>

      <div className="glass-card flex-1 p-0 overflow-hidden flex flex-col border-fuchsia-500/20">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="w-10 h-10 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin" />
            </div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-fuchsia-200/50">Personnel</th>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-fuchsia-200/50">Email</th>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-fuchsia-200/50 text-center">Clearance Level</th>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-fuchsia-200/50 text-center">Status</th>
                  <th className="bg-[#111827]/80 sticky top-0 backdrop-blur-md text-right text-fuchsia-200/50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="group hover:bg-fuchsia-500/5 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-900 to-indigo-900 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300 font-bold text-xs">
                          {u.name[0]}
                        </div>
                        <div className="font-medium text-white">{u.name}</div>
                      </div>
                    </td>
                    <td className="py-4 text-gray-300">{u.email}</td>
                    <td className="py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(u.role)}`}>
                        {u.role === 'admin' && <Key size={10} className="mr-1" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center text-emerald-400 text-xs font-medium"><CheckCircle2 size={14} className="mr-1"/> ACTIVE</span>
                      ) : (
                        <span className="inline-flex items-center text-red-400 text-xs font-medium"><ShieldAlert size={14} className="mr-1"/> SUSPENDED</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <button className="px-3 py-1.5 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/20 text-fuchsia-400 rounded text-xs font-medium transition-colors opacity-50 group-hover:opacity-100">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

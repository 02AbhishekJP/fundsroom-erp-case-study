import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import CustomerModal from '../components/CustomerModal';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  FileText,
  Edit2,
  Send,
  MessageSquare,
  TrendingUp,
  ShoppingCart,
  IndianRupee,
  Clock,
  User,
  Hash,
} from 'lucide-react';

interface FollowUpNote {
  id: string;
  note: string;
  follow_up_date: string | null;
  created_by_name: string;
  created_at: string;
}

interface ChallanRecord {
  id: string;
  challan_number: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  total_amount: string;
  created_at: string;
}

interface CustomerStats {
  total_challans: string;
  confirmed_challans: string;
  total_spent: string;
}

interface CustomerData {
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
  notes: string | null;
  created_by_name: string;
  created_at: string;
  follow_up_notes: FollowUpNote[];
  challans: ChallanRecord[];
  stats: CustomerStats;
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  // Add note form
  const [newNote, setNewNote] = useState('');
  const [noteFollowUp, setNoteFollowUp] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Edit modal
  const [modalOpen, setModalOpen] = useState(false);

  const canEdit = ['admin', 'sales'].includes(user?.role || '');

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to load customer.');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      await api.post(`/customers/${id}/notes`, {
        note: newNote.trim(),
        follow_up_date: noteFollowUp || null,
      });
      showToast('success', 'Follow-up note added.');
      setNewNote('');
      setNoteFollowUp('');
      fetchCustomer(); // Refresh data
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to add note.');
    } finally {
      setAddingNote(false);
    }
  };

  const handleSaveCustomer = async (data: any) => {
    await api.put(`/customers/${id}`, data);
    showToast('success', 'Client updated successfully.');
    fetchCustomer();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'lead': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'inactive': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getChallanStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'draft': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'cancelled': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-mono tracking-wider">LOADING CLIENT PROFILE...</p>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const initials = customer.company
    ? customer.company[0].toUpperCase()
    : customer.name[0].toUpperCase();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10 max-w-7xl mx-auto">

      {/* Back Navigation + Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">{customer.company || customer.name}</h1>
          <p className="text-sm text-indigo-300/70 font-mono">CLIENT INTELLIGENCE PROFILE</p>
        </div>
        {canEdit && (
          <button
            className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2"
            onClick={() => setModalOpen(true)}
          >
            <Edit2 size={16} /> Edit Client
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="glass-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row gap-8 relative z-10">
          {/* Avatar + Basic Info */}
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-3xl shadow-[0_0_25px_rgba(99,102,241,0.2)] shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{customer.name}</h2>
              {customer.company && (
                <div className="text-sm text-indigo-300/80 font-medium flex items-center gap-1.5 mt-1">
                  <Building size={14} /> {customer.company}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border tracking-wider ${getStatusColor(customer.status)}`}>
                  {customer.status === 'active' && <CheckCircle2 size={12} className="inline mr-1" />}
                  {customer.status.toUpperCase()}
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold border bg-indigo-500/10 text-indigo-400 border-indigo-500/20 tracking-wider uppercase">
                  {customer.type}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customer.email && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Mail size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase">Email</div>
                  <div className="truncate">{customer.email}</div>
                </div>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Phone size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase">Phone</div>
                  <div>{customer.phone}</div>
                </div>
              </div>
            )}
            {customer.gst && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Hash size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase">GST Number</div>
                  <div className="font-mono">{customer.gst}</div>
                </div>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase">Address</div>
                  <div className="truncate">{customer.address}</div>
                </div>
              </div>
            )}
            {customer.follow_up_date && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase">Next Follow-up</div>
                  <div className="text-cyan-400 font-medium">{new Date(customer.follow_up_date).toLocaleDateString()}</div>
                </div>
              </div>
            )}
            {customer.notes && (
              <div className="flex items-start gap-3 text-sm text-gray-300 sm:col-span-2">
                <div className="w-9 h-9 rounded-lg bg-gray-500/10 border border-gray-500/20 flex items-center justify-center text-gray-400 shrink-0">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase">Notes</div>
                  <div className="text-gray-400">{customer.notes}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card flex items-center gap-4 py-5 hover:border-cyan-500/30">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <ShoppingCart size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{customer.stats.total_challans}</div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Orders</div>
          </div>
        </div>
        <div className="glass-card flex items-center gap-4 py-5 hover:border-emerald-500/30">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{customer.stats.confirmed_challans}</div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Confirmed</div>
          </div>
        </div>
        <div className="glass-card flex items-center gap-4 py-5 hover:border-blue-500/30">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <IndianRupee size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">₹{Number(customer.stats.total_spent).toLocaleString()}</div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Revenue</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Notes + Challans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Follow-up Notes */}
        <div className="glass-card p-0 overflow-hidden flex flex-col border-indigo-500/20">
          <div className="p-5 border-b border-white/10 bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                <MessageSquare size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Follow-up Notes</h3>
                <p className="text-[10px] text-gray-500 font-mono uppercase">CRM INTERACTION LOG</p>
              </div>
            </div>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold">
              {customer.follow_up_notes.length}
            </span>
          </div>

          {/* Add Note Form */}
          {canEdit && (
            <form onSubmit={handleAddNote} className="p-4 border-b border-white/10 bg-black/10">
              <textarea
                className="input-glass min-h-[70px] resize-none text-sm mb-3"
                placeholder="Add a follow-up note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                disabled={addingNote}
              />
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  className="input-glass text-sm flex-1"
                  value={noteFollowUp}
                  onChange={(e) => setNoteFollowUp(e.target.value)}
                  placeholder="Follow-up date (optional)"
                  disabled={addingNote}
                />
                <button
                  type="submit"
                  className="btn btn-primary px-4 py-2 text-sm shrink-0"
                  disabled={!newNote.trim() || addingNote}
                >
                  {addingNote ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {addingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </form>
          )}

          {/* Notes Timeline */}
          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[400px]">
            {customer.follow_up_notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <MessageSquare size={32} className="mb-3 opacity-40" />
                <p className="text-sm">No follow-up notes yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {customer.follow_up_notes.map((note) => (
                  <div key={note.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                        <User size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{note.created_by_name || 'System'}</span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{note.note}</p>
                        {note.follow_up_date && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-cyan-400/80">
                            <Calendar size={12} />
                            Follow-up: {new Date(note.follow_up_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Challan History */}
        <div className="glass-card p-0 overflow-hidden flex flex-col border-cyan-500/20">
          <div className="p-5 border-b border-white/10 bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 border border-cyan-500/30">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Order History</h3>
                <p className="text-[10px] text-gray-500 font-mono uppercase">CHALLAN RECORDS</p>
              </div>
            </div>
            <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold">
              {customer.challans.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[400px]">
            {customer.challans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FileText size={32} className="mb-3 opacity-40" />
                <p className="text-sm">No orders placed yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {customer.challans.map((challan) => (
                  <div
                    key={challan.id}
                    className="p-4 hover:bg-cyan-500/5 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/challans/${challan.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-shadow" />
                        <span className="font-mono text-cyan-100 font-medium tracking-wide text-sm">
                          {challan.challan_number}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${getChallanStatusColor(challan.status)}`}>
                        {challan.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 ml-[18px]">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(challan.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-semibold text-white">₹{Number(challan.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Edit Modal */}
      <CustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCustomer}
        customer={customer}
      />
    </div>
  );
}

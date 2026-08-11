import { useState, useEffect } from 'react';
import { X, Users, Save, Loader2 } from 'lucide-react';

interface Customer {
  id?: string;
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
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  customer?: Customer | null;
}

export default function CustomerModal({ isOpen, onClose, onSave, customer }: CustomerModalProps) {
  const isEdit = !!customer;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    gst: '',
    address: '',
    status: 'lead' as string,
    type: 'retail' as string,
    follow_up_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        company: customer.company || '',
        gst: customer.gst || '',
        address: customer.address || '',
        status: customer.status || 'lead',
        type: customer.type || 'retail',
        follow_up_date: customer.follow_up_date ? customer.follow_up_date.split('T')[0] : '',
        notes: customer.notes || '',
      });
    } else {
      setForm({
        name: '', email: '', phone: '', company: '', gst: '', address: '',
        status: 'lead', type: 'retail', follow_up_date: '', notes: '',
      });
    }
    setError('');
  }, [customer, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        gst: form.gst || null,
        address: form.address || null,
        follow_up_date: form.follow_up_date || null,
        notes: form.notes || null,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Client' : 'New Client'}</h2>
              <p className="text-xs text-gray-400">{isEdit ? `Editing ${customer?.company || customer?.name}` : 'Register a new client node'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="form-group">
              <label>Contact Name *</label>
              <input
                name="name"
                className="input-glass"
                placeholder="e.g. Amit Sharma"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            {/* Company */}
            <div className="form-group">
              <label>Company</label>
              <input
                name="company"
                className="input-glass"
                placeholder="e.g. ABC Electronics"
                value={form.company}
                onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email</label>
              <input
                name="email"
                type="email"
                className="input-glass"
                placeholder="e.g. amit@company.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            {/* Phone */}
            <div className="form-group">
              <label>Phone</label>
              <input
                name="phone"
                className="input-glass"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={handleChange}
                pattern="\d{10}"
                maxLength={10}
                minLength={10}
                title="Phone number must be exactly 10 digits"
              />
            </div>

            {/* GST */}
            <div className="form-group">
              <label>GST Number</label>
              <input
                name="gst"
                className="input-glass"
                placeholder="e.g. 27ABCDE1234F"
                value={form.gst}
                onChange={handleChange}
                minLength={12}
                maxLength={12}
                title="GST number must be exactly 12 characters or left empty"
              />
            </div>

            {/* Type */}
            <div className="form-group">
              <label>Client Type</label>
              <select name="type" className="input-glass bg-[#111827]/80" value={form.type} onChange={handleChange}>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="distributor">Distributor</option>
              </select>
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <select name="status" className="input-glass bg-[#111827]/80" value={form.status} onChange={handleChange}>
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Follow-up Date */}
            <div className="form-group">
              <label>Follow-up Date</label>
              <input
                name="follow_up_date"
                type="date"
                className="input-glass"
                value={form.follow_up_date}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Address - full width */}
          <div className="form-group mt-4">
            <label>Address</label>
            <textarea
              name="address"
              className="input-glass min-h-[60px] resize-none"
              placeholder="Full address..."
              value={form.address}
              onChange={handleChange}
            />
          </div>

          {/* Notes - full width */}
          <div className="form-group mt-4">
            <label>Notes</label>
            <textarea
              name="notes"
              className="input-glass min-h-[60px] resize-none"
              placeholder="Internal notes about this client..."
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="btn btn-ghost px-4 py-2">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary px-6 py-2 flex items-center gap-2" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : (isEdit ? 'Update Client' : 'Register Client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

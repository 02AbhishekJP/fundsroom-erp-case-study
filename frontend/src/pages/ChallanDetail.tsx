import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Building,
  Mail,
  Phone,
  Package,
  AlertTriangle,
  ShieldCheck,
  Undo2,
  Loader2,
  IndianRupee,
  Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChallanItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  product_name: string;
  product_sku: string;
  total_price: string;
  current_stock: number;
  product_active: boolean;
}

interface ChallanData {
  id: string;
  challan_number: string;
  customer_id: string;
  customer_name: string;
  customer_company: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: 'draft' | 'confirmed' | 'cancelled';
  total_amount: string;
  notes: string | null;
  created_by_name: string;
  confirmed_by_name: string | null;
  cancelled_by_name: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  items: ChallanItem[];
}

interface StockError {
  product_name: string;
  product_sku: string;
  available: number;
  requested: number;
  shortage: number;
}

export default function ChallanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [challan, setChallan] = useState<ChallanData | null>(null);
  const [loading, setLoading] = useState(true);

  // Action state
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [stockErrors, setStockErrors] = useState<StockError[]>([]);

  const canAct = ['admin', 'sales'].includes(user?.role || '');

  const fetchChallan = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/challans/${id}`);
      setChallan(res.data.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to load challan.');
      navigate('/challans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchChallan();
  }, [id]);

  const handleConfirm = async () => {
    setConfirming(true);
    setStockErrors([]);
    try {
      const res = await api.put(`/challans/${id}/confirm`);
      showToast('success', res.data.message);

      // Show low stock warnings
      if (res.data.data?.low_stock_warnings?.length > 0) {
        res.data.data.low_stock_warnings.forEach((w: any) => {
          showToast('warning', `⚠️ Low stock: ${w.product_name} (${w.current_stock} remaining)`);
        });
      }

      fetchChallan();
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setStockErrors(err.response.data.errors);
        showToast('error', 'Insufficient stock. See details below.');
      } else {
        showToast('error', err.response?.data?.message || 'Failed to confirm challan.');
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await api.put(`/challans/${id}/cancel`);
      showToast('success', res.data.message);
      setShowCancelConfirm(false);
      fetchChallan();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to cancel challan.');
    } finally {
      setCancelling(false);
    }
  };

  const generatePDF = () => {
    if (!challan) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text('FUNDSROOM ERP', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Sales Challan / Invoice', 14, 30);
    
    // Challan details
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text(`Challan No: ${challan.challan_number}`, 14, 45);
    doc.text(`Date: ${new Date(challan.created_at).toLocaleDateString()}`, 14, 52);
    doc.text(`Status: ${challan.status.toUpperCase()}`, 14, 59);

    // Billed to
    doc.setFontSize(11);
    doc.text('Billed To:', 120, 45);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(challan.customer_company || challan.customer_name, 120, 52);
    if (challan.customer_email) doc.text(challan.customer_email, 120, 57);
    if (challan.customer_phone) doc.text(challan.customer_phone, 120, 62);

    // Line items table
    const tableColumn = ["SKU", "Product", "Qty", "Unit Price", "Total"];
    const tableRows = challan.items.map(item => [
      item.product_sku,
      item.product_name,
      item.quantity,
      `Rs. ${Number(item.unit_price).toLocaleString()}`,
      `Rs. ${Number(item.total_price).toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 75,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212] }, // Cyan color
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY || 75;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Amount: Rs. ${Number(challan.total_amount).toLocaleString()}`, 14, finalY + 15);

    // Watermark if draft or cancelled
    if (challan.status !== 'confirmed') {
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(60);
      doc.text(challan.status.toUpperCase(), 105, finalY + 50, { align: 'center', angle: 45 });
    }

    doc.save(`${challan.challan_number}.pdf`);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          icon: <CheckCircle size={18} />,
          class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
          label: 'CONFIRMED',
        };
      case 'draft':
        return {
          icon: <Clock size={18} />,
          class: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
          label: 'DRAFT',
        };
      case 'cancelled':
        return {
          icon: <XCircle size={18} />,
          class: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          glow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]',
          label: 'CANCELLED',
        };
      default:
        return {
          icon: null,
          class: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
          glow: '',
          label: status.toUpperCase(),
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-mono tracking-wider">LOADING CHALLAN DATA...</p>
        </div>
      </div>
    );
  }

  if (!challan) return null;

  const statusConfig = getStatusConfig(challan.status);
  const totalQty = challan.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">

      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/challans')}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
              {challan.challan_number}
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold tracking-wider border ${statusConfig.class} ${statusConfig.glow}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>
          <p className="text-sm text-cyan-300/70 font-mono mt-1">SALES CHALLAN DETAILS</p>
        </div>
        
        <button
          onClick={generatePDF}
          className="btn text-sm px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-2"
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>

      {/* Challan Header Card */}
      <div className="glass-card relative overflow-hidden border-cyan-500/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* Customer Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Client Information</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-white">
                <Building size={16} className="text-cyan-400" />
                <span className="font-semibold">{challan.customer_company || challan.customer_name}</span>
              </div>
              {challan.customer_company && (
                <div className="flex items-center gap-2.5 text-gray-300 text-sm">
                  <User size={16} className="text-gray-500" />
                  {challan.customer_name}
                </div>
              )}
              {challan.customer_email && (
                <div className="flex items-center gap-2.5 text-gray-400 text-sm">
                  <Mail size={16} className="text-gray-500" />
                  {challan.customer_email}
                </div>
              )}
              {challan.customer_phone && (
                <div className="flex items-center gap-2.5 text-gray-400 text-sm">
                  <Phone size={16} className="text-gray-500" />
                  {challan.customer_phone}
                </div>
              )}
            </div>
          </div>

          {/* Order Meta */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Details</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Created by</span>
                <span className="text-white font-medium">{challan.created_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created on</span>
                <span className="text-white">{new Date(challan.created_at).toLocaleDateString()}</span>
              </div>
              {challan.confirmed_by_name && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Confirmed by</span>
                  <span className="text-emerald-400 font-medium">{challan.confirmed_by_name}</span>
                </div>
              )}
              {challan.confirmed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Confirmed on</span>
                  <span className="text-emerald-400">{new Date(challan.confirmed_at).toLocaleDateString()}</span>
                </div>
              )}
              {challan.cancelled_by_name && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Cancelled by</span>
                  <span className="text-rose-400 font-medium">{challan.cancelled_by_name}</span>
                </div>
              )}
              {challan.cancelled_at && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Cancelled on</span>
                  <span className="text-rose-400">{new Date(challan.cancelled_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {challan.notes && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
            <p className="text-sm text-gray-300">{challan.notes}</p>
          </div>
        )}
      </div>

      {/* Stock Errors Alert */}
      {stockErrors.length > 0 && (
        <div className="glass-card p-0 overflow-hidden border-rose-500/30 bg-rose-500/5">
          <div className="p-4 border-b border-rose-500/20 bg-rose-500/10 flex items-center gap-3">
            <AlertTriangle size={20} className="text-rose-400" />
            <div>
              <h3 className="font-bold text-rose-400">Insufficient Stock</h3>
              <p className="text-xs text-rose-300/70">The following products do not have enough stock to fulfill this order.</p>
            </div>
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-rose-300/70 border-b border-rose-500/20">
                  <th className="text-left pb-2 font-medium">Product</th>
                  <th className="text-right pb-2 font-medium">Available</th>
                  <th className="text-right pb-2 font-medium">Requested</th>
                  <th className="text-right pb-2 font-medium">Shortage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-500/10">
                {stockErrors.map((err, i) => (
                  <tr key={i}>
                    <td className="py-2">
                      <div className="text-white font-medium">{err.product_name}</div>
                      <div className="text-xs text-rose-300/60 font-mono">{err.product_sku}</div>
                    </td>
                    <td className="py-2 text-right text-amber-400 font-mono">{err.available}</td>
                    <td className="py-2 text-right text-white font-mono">{err.requested}</td>
                    <td className="py-2 text-right text-rose-400 font-bold font-mono">-{err.shortage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Line Items Table */}
      <div className="glass-card p-0 overflow-hidden border-cyan-500/20">
        <div className="p-5 border-b border-white/10 bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 border border-cyan-500/30">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Line Items</h3>
              <p className="text-[10px] text-gray-500 font-mono uppercase">PRODUCT SNAPSHOT DATA</p>
            </div>
          </div>
          <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold">
            {challan.items.length} items · {totalQty} units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="bg-[#111827]/80 text-cyan-200/50">Product</th>
                <th className="bg-[#111827]/80 text-cyan-200/50">SKU</th>
                <th className="bg-[#111827]/80 text-right text-cyan-200/50">Qty</th>
                <th className="bg-[#111827]/80 text-right text-cyan-200/50">Unit Price</th>
                <th className="bg-[#111827]/80 text-right text-cyan-200/50">Line Total</th>
                <th className="bg-[#111827]/80 text-right text-cyan-200/50">Current Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {challan.items.map((item) => (
                <tr key={item.id} className="hover:bg-cyan-500/5 transition-colors">
                  <td className="py-4">
                    <span className="font-medium text-white">{item.product_name}</span>
                  </td>
                  <td className="py-4">
                    <span className="font-mono text-gray-400 text-xs bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                      {item.product_sku}
                    </span>
                  </td>
                  <td className="py-4 text-right font-bold text-white">{item.quantity}</td>
                  <td className="py-4 text-right text-gray-300">₹{Number(item.unit_price).toLocaleString()}</td>
                  <td className="py-4 text-right font-semibold text-cyan-400">₹{Number(item.total_price).toLocaleString()}</td>
                  <td className="py-4 text-right">
                    <span className={`font-mono text-sm ${
                      item.current_stock === 0
                        ? 'text-rose-400'
                        : item.current_stock <= 10
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {item.current_stock}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/10">
                <td colSpan={4} className="py-4 text-right font-bold text-gray-400 uppercase tracking-wider text-xs">
                  Total Amount
                </td>
                <td className="py-4 text-right">
                  <span className="text-xl font-bold text-white flex items-center justify-end gap-1">
                    <IndianRupee size={16} className="text-cyan-400" />
                    {Number(challan.total_amount).toLocaleString()}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      {canAct && challan.status !== 'cancelled' && (
        <div className="glass-card border-cyan-500/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {challan.status === 'draft' && (
            <button
              className="btn text-sm px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex-1 sm:flex-none"
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {confirming ? 'Confirming...' : 'Confirm Challan'}
            </button>
          )}

          {!showCancelConfirm ? (
            <button
              className="btn text-sm px-6 py-3 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30 flex-1 sm:flex-none"
              onClick={() => setShowCancelConfirm(true)}
            >
              <XCircle size={16} />
              Cancel Challan
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-1 sm:flex-none p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
              <span className="text-sm text-rose-300">
                {challan.status === 'confirmed' ? 'This will restore stock. ' : ''}
                Are you sure?
              </span>
              <button
                className="btn text-xs px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/50 ml-auto"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
              <button
                className="btn text-xs px-3 py-1.5 btn-ghost"
                onClick={() => setShowCancelConfirm(false)}
              >
                No
              </button>
            </div>
          )}

          {challan.status === 'draft' && (
            <p className="text-xs text-gray-500 sm:ml-auto">
              <ShieldCheck size={12} className="inline mr-1" />
              Confirming will deduct stock for all items.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

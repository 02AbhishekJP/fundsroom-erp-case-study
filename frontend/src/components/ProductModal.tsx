import { useState, useEffect } from 'react';
import { X, Package, Save, Loader2, Image as ImageIcon } from 'lucide-react';

interface Product {
  id?: string;
  sku: string;
  name: string;
  category: string;
  description?: string;
  price: string | number;
  stock_quantity?: number;
  min_stock_alert?: number;
  warehouse_location?: string;
  is_active?: boolean;
  image_url?: string;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  product?: Product | null; // null = create mode
}

export default function ProductModal({ isOpen, onClose, onSave, product }: ProductModalProps) {
  const isEdit = !!product;

  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: '',
    description: '',
    price: '',
    stock_quantity: '0',
    min_stock_alert: '10',
    warehouse_location: '',
    is_active: true,
    image_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setForm({
        sku: product.sku || '',
        name: product.name || '',
        category: product.category || '',
        description: product.description || '',
        price: String(product.price || ''),
        stock_quantity: String(product.stock_quantity ?? 0),
        min_stock_alert: String(product.min_stock_alert ?? 10),
        warehouse_location: product.warehouse_location || '',
        is_active: product.is_active ?? true,
        image_url: product.image_url || '',
      });
    } else {
      setForm({
        sku: '', name: '', category: '', description: '', price: '',
        stock_quantity: '0', min_stock_alert: '10', warehouse_location: '',
        is_active: true, image_url: '',
      });
    }
    setError('');
  }, [product, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sku || !form.name || !form.price) {
      setError('SKU, Name, and Price are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity) || 0,
        min_stock_alert: parseInt(form.min_stock_alert) || 10,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save product.');
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
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Product' : 'New Product'}</h2>
              <p className="text-xs text-gray-400">{isEdit ? `Editing ${product?.sku}` : 'Add a new asset to inventory'}</p>
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
            {/* SKU */}
            <div className="form-group">
              <label>SKU *</label>
              <input
                name="sku"
                className="input-glass"
                placeholder="e.g. JBL-HS-002"
                value={form.sku}
                onChange={handleChange}
                disabled={isEdit}
              />
            </div>

            {/* Name */}
            <div className="form-group">
              <label>Product Name *</label>
              <input
                name="name"
                className="input-glass"
                placeholder="e.g. JBL Tune 770NC"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            {/* Category */}
            <div className="form-group">
              <label>Category</label>
              <input
                name="category"
                className="input-glass"
                placeholder="e.g. Headsets, Keyboards"
                value={form.category}
                onChange={handleChange}
              />
            </div>

            {/* Price */}
            <div className="form-group">
              <label>Price (₹) *</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                className="input-glass"
                placeholder="e.g. 5999.00"
                value={form.price}
                onChange={handleChange}
              />
            </div>

            {/* Stock Quantity */}
            <div className="form-group">
              <label>Stock Quantity</label>
              <input
                name="stock_quantity"
                type="number"
                min="0"
                className="input-glass"
                value={form.stock_quantity}
                onChange={handleChange}
                disabled={isEdit}
              />
              {isEdit && <p className="text-[10px] text-gray-500 mt-1">Use stock adjustments to change quantity</p>}
            </div>

            {/* Min Stock Alert */}
            <div className="form-group">
              <label>Min Stock Alert</label>
              <input
                name="min_stock_alert"
                type="number"
                min="0"
                className="input-glass"
                value={form.min_stock_alert}
                onChange={handleChange}
              />
            </div>

            {/* Warehouse Location */}
            <div className="form-group">
              <label>Warehouse Location</label>
              <input
                name="warehouse_location"
                className="input-glass"
                placeholder="e.g. Warehouse A - Shelf 1"
                value={form.warehouse_location}
                onChange={handleChange}
              />
            </div>

            {/* Active */}
            <div className="form-group flex items-center gap-3 pt-6">
              <input
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
                className="w-5 h-5 rounded bg-black/40 border-white/20 text-blue-500 focus:ring-blue-500 accent-blue-500"
              />
              <label className="!mb-0 cursor-pointer">Active</label>
            </div>
          </div>

          {/* Image URL - full width */}
          <div className="form-group mt-4">
            <label className="flex items-center gap-2"><ImageIcon size={14} /> Product Image URL</label>
            <input
              name="image_url"
              className="input-glass"
              placeholder="https://example.com/product-image.png"
              value={form.image_url}
              onChange={handleChange}
            />
            {form.image_url && (
              <div className="mt-2 h-24 w-24 rounded-lg border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
                <img src={form.image_url} alt="Preview" className="max-h-full max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>

          {/* Description - full width */}
          <div className="form-group mt-4">
            <label>Description</label>
            <textarea
              name="description"
              className="input-glass min-h-[80px] resize-none"
              placeholder="Product description..."
              value={form.description}
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
              {saving ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

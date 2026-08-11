import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, ArrowRight, Save, User, Package, FileText, CheckCircle, Plus, Minus, Trash2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price: string;
  stock_quantity: number;
}

interface CartItem extends Product {
  cart_quantity: number;
}

export default function NewChallan() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers?status=active&limit=100'),
          api.get('/products?active_only=true&limit=100')
        ]);
        setCustomers(custRes.data.data);
        setProducts(prodRes.data.data);
      } catch (error) {
        showToast('error', 'Failed to load data for challan creation.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showToast]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.cart_quantity < product.stock_quantity) {
        setCart(cart.map(item => item.id === product.id ? { ...item, cart_quantity: item.cart_quantity + 1 } : item));
      } else {
        showToast('warning', 'Cannot exceed available stock.');
      }
    } else {
      if (product.stock_quantity > 0) {
        setCart([...cart, { ...product, cart_quantity: 1 }]);
      } else {
        showToast('error', 'Product is out of stock.');
      }
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.cart_quantity + delta;
        if (newQty > 0 && newQty <= item.stock_quantity) {
          return { ...item, cart_quantity: newQty };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.cart_quantity), 0);

  const handleSubmit = async () => {
    if (!selectedCustomer || cart.length === 0) return;
    
    setSubmitting(true);
    try {
      const payload = {
        customer_id: selectedCustomer,
        notes,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.cart_quantity
        }))
      };
      
      const res = await api.post('/challans', payload);
      showToast('success', res.data.message);
      navigate('/challans');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to create challan.');
      setSubmitting(false);
    }
  };

  const currentCustomer = customers.find(c => c.id === selectedCustomer);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate('/challans')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Sales Order</h1>
          <p className="text-sm text-cyan-300/70 font-mono">DRAFT CHALLAN INITIALIZATION</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between relative before:absolute before:top-1/2 before:left-8 before:right-8 before:h-[2px] before:bg-white/10 before:-z-10">
        {[
          { num: 1, label: 'Client', icon: User },
          { num: 2, label: 'Items', icon: Package },
          { num: 3, label: 'Review', icon: FileText }
        ].map((s) => {
          const isActive = step === s.num;
          const isPast = step > s.num;
          return (
            <div key={s.num} className="flex flex-col items-center gap-2 bg-[#030712] px-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                isActive ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 
                isPast ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 
                'bg-white/5 border-white/10 text-gray-500'
              }`}>
                {isPast ? <CheckCircle size={18} /> : <s.icon size={18} />}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-cyan-400' : isPast ? 'text-emerald-400' : 'text-gray-500'}`}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div></div>
      ) : (
        <div className="glass-card flex-1 min-h-[400px]">
          
          {/* STEP 1: Select Customer */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <h2 className="text-xl font-bold text-white mb-4">Select Client</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customers.map(c => (
                  <div 
                    key={c.id}
                    onClick={() => setSelectedCustomer(c.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedCustomer === c.id 
                      ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="font-bold text-white">{c.company || c.name}</div>
                    {c.company && <div className="text-sm text-gray-400">{c.name}</div>}
                    <div className="text-xs text-gray-500 mt-2">{c.email || 'No email provided'}</div>
                  </div>
                ))}
                {customers.length === 0 && <div className="col-span-2 text-center py-8 text-gray-500">No active clients found. Please create one first.</div>}
              </div>
            </div>
          )}

          {/* STEP 2: Add Products */}
          {step === 2 && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Add Inventory</h2>
                <div className="text-sm font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  Total: ₹{totalAmount.toLocaleString()}
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                {/* Product List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Available Assets</h3>
                  {products.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                      <div>
                        <div className="font-medium text-white text-sm">{p.name}</div>
                        <div className="text-xs text-gray-400 flex gap-2">
                          <span className="font-mono">{p.sku}</span>
                          <span className={p.stock_quantity > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {p.stock_quantity} in stock
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => addToCart(p)}
                        disabled={p.stock_quantity === 0}
                        className="p-2 rounded-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Cart */}
                <div className="bg-[#0f172a] rounded-xl border border-white/10 p-4 flex flex-col max-h-[400px]">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Selected Items ({cart.length})</h3>
                  
                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm">
                      <Package size={32} className="mb-2 opacity-50" />
                      No items selected
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex-1 truncate pr-2">
                            <div className="font-medium text-white text-sm truncate">{item.name}</div>
                            <div className="text-xs text-cyan-400 font-medium">₹{Number(item.price).toLocaleString()}</div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center bg-black/50 rounded-lg border border-white/10">
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-white text-gray-400"><Minus size={14} /></button>
                              <span className="w-6 text-center text-sm font-bold text-white">{item.cart_quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-white text-gray-400"><Plus size={14} /></button>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="text-rose-400 hover:text-rose-300 p-1"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="animate-in slide-in-from-right-4 fade-in">
              <h2 className="text-xl font-bold text-white mb-6">Review Order</h2>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <FileText size={100} />
                </div>
                
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Client Details</h3>
                <div className="font-bold text-lg text-white">{currentCustomer?.company || currentCustomer?.name}</div>
                {currentCustomer?.company && <div className="text-sm text-gray-400">{currentCustomer?.name}</div>}
                <div className="text-sm text-gray-500">{currentCustomer?.email}</div>
                
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Order Items</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/10">
                        <th className="text-left pb-2 font-medium">Item</th>
                        <th className="text-right pb-2 font-medium">Qty</th>
                        <th className="text-right pb-2 font-medium">Price</th>
                        <th className="text-right pb-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {cart.map(item => (
                        <tr key={item.id}>
                          <td className="py-3 font-medium text-white">{item.name}</td>
                          <td className="py-3 text-right">{item.cart_quantity}</td>
                          <td className="py-3 text-right">₹{Number(item.price).toLocaleString()}</td>
                          <td className="py-3 text-right font-bold text-cyan-400">₹{(parseFloat(item.price) * item.cart_quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/10">
                        <td colSpan={3} className="py-4 text-right font-bold text-gray-400 uppercase tracking-wider">Total Amount</td>
                        <td className="py-4 text-right font-bold text-lg text-white">₹{totalAmount.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="form-group">
                <label>Additional Notes (Optional)</label>
                <textarea 
                  className="input-glass h-24 resize-none" 
                  placeholder="Enter any internal notes or instructions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/10">
            <button 
              className={`btn btn-ghost ${step === 1 ? 'invisible' : ''}`}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} /> Back
            </button>
            
            {step < 3 ? (
              <button 
                className="btn btn-primary bg-cyan-600 hover:bg-cyan-500 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !selectedCustomer) || (step === 2 && cart.length === 0)}
              >
                Next Step <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Creating Draft...' : 'Save Draft Challan'} <Save size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

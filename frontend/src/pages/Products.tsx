import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Package, Search, Filter, Edit2, AlertCircle, Plus, ArrowUpDown, Minus } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import ProductModal from '../components/ProductModal';
import { useSearchParams } from 'react-router-dom';

// --- 3D Product Image Billboard ---
function ProductImageBillboard({ imageUrl, fallbackColor }: { imageUrl?: string; fallbackColor: string }) {
  const groupRef = React.useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      loader.load(
        imageUrl,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          setTexture(tex);
        },
        undefined,
        () => setTexture(null)
      );
    } else {
      setTexture(null);
    }
  }, [imageUrl]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
    }
  });

  if (texture) {
    const aspect = texture.image ? (texture.image as any).width / (texture.image as any).height : 1;
    const h = 2.2;
    const w = h * aspect;
    return (
      <group ref={groupRef}>
        <Float speed={2} rotationIntensity={0.15} floatIntensity={0.3}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
          </mesh>
          {/* Subtle glow behind the image */}
          <mesh position={[0, 0, -0.05]}>
            <planeGeometry args={[w + 0.3, h + 0.3]} />
            <meshBasicMaterial color={fallbackColor} transparent opacity={0.08} />
          </mesh>
        </Float>
      </group>
    );
  }

  // Fallback: generic product box
  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
        <mesh>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial color={fallbackColor} roughness={0.2} metalness={0.8} envMapIntensity={1} />
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(1.2, 1.2, 1.2)]} />
            <lineBasicMaterial color="#ffffff" opacity={0.5} transparent />
          </lineSegments>
        </mesh>
      </Float>
    </group>
  );
}

// --- Stock Adjustment Modal ---
function StockModal({ product, isOpen, onClose, onSave }: { product: any; isOpen: boolean; onClose: () => void; onSave: () => void }) {
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || parseInt(quantity) < 1) return;
    setSaving(true);
    try {
      await api.post(`/products/${product.id}/stock`, {
        type,
        quantity: parseInt(quantity),
        reason: reason || undefined,
      });
      showToast('success', `Stock ${type === 'IN' ? 'added' : 'removed'} successfully.`);
      onSave();
      onClose();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Stock adjustment failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/10 bg-black/40">
          <h2 className="text-lg font-bold text-white">Stock Adjustment</h2>
          <p className="text-xs text-gray-400">{product.name} — Current: {product.stock_quantity} units</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setType('IN')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${type === 'IN' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
              <Plus size={14} className="inline mr-1" /> Stock In
            </button>
            <button type="button" onClick={() => setType('OUT')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${type === 'OUT' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
              <Minus size={14} className="inline mr-1" /> Stock Out
            </button>
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input type="number" min="1" className="input-glass" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Enter quantity" />
          </div>
          <div className="form-group">
            <label>Reason (optional)</label>
            <input className="input-glass" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Manual restock" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost px-4 py-2">Cancel</button>
            <button type="submit" className="btn btn-primary px-6 py-2" disabled={saving}>
              {saving ? 'Saving...' : 'Adjust Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- Main Component ---
interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description?: string;
  price: string;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
  warehouse_location?: string;
  image_url?: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'out'>('all');

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);

  const { showToast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for ?new=true from FAB
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditingProduct(null);
      setProductModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [search, category, filterMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/products?limit=50`;
      if (search) url += `&search=${search}`;
      if (category) url += `&category=${category}`;
      if (filterMode === 'low') url += `&low_stock=true`;
      if (filterMode === 'out') url += `&out_of_stock=true`;

      const [prodRes, catRes] = await Promise.all([
        api.get(url),
        api.get('/products/categories')
      ]);

      setProducts(prodRes.data.data);
      setCategories(catRes.data.data.map((c: any) => c.category).filter(Boolean));
    } catch (err) {
      showToast('error', 'Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (data: any) => {
    if (editingProduct) {
      await api.put(`/products/${editingProduct.id}`, data);
      showToast('success', 'Product updated successfully.');
    } else {
      await api.post('/products', data);
      showToast('success', 'Product created successfully.');
    }
    fetchData();
  };

  const canEdit = ['admin', 'warehouse'].includes(user?.role || '');

  const getStockStatus = (stock: number, min: number) => {
    if (stock === 0) return { label: 'OUT OF STOCK', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', meshColor: '#ef4444' };
    if (stock <= min) return { label: 'LOW STOCK', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', meshColor: '#f59e0b' };
    return { label: 'IN STOCK', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', meshColor: '#3b82f6' };
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Inventory Hub</h1>
            <p className="text-xs text-blue-300/70 font-mono">ASSET TRACKING & VISUALIZATION</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search SKU or Name..." 
              className="input-glass pl-9 h-10 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select 
              className="input-glass pl-9 h-10 text-sm appearance-none pr-8 bg-[#111827]/80"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterMode === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setFilterMode('all')}
            >
              ALL
            </button>
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterMode === 'low' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setFilterMode('low')}
            >
              LOW
            </button>
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterMode === 'out' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setFilterMode('out')}
            >
              DEPLETED
            </button>
          </div>

          {canEdit && (
            <button
              className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2"
              onClick={() => { setEditingProduct(null); setProductModalOpen(true); }}
            >
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Grid View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <AlertCircle size={48} className="mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-white mb-1">No assets found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const status = getStockStatus(product.stock_quantity, product.min_stock_alert);
              
              return (
                <div key={product.id} className={`glass-card p-0 overflow-hidden flex flex-col group relative ${!product.is_active ? 'opacity-60' : ''}`}>
                  
                  {/* Status indicator line top */}
                  <div className={`h-1 w-full ${status.bg} border-b ${status.border}`}></div>

                  {/* 3D Visualization Window */}
                  <div className="h-48 relative bg-gradient-to-b from-black/20 to-transparent border-b border-white/5 overflow-hidden">
                    <div className="absolute top-3 left-3 z-10">
                      <span className="text-[10px] font-mono tracking-wider text-gray-500 bg-black/40 px-2 py-1 rounded border border-white/5 backdrop-blur-md">
                        {product.sku}
                      </span>
                    </div>
                    
                    <div className="absolute inset-0 cursor-move">
                      <Canvas camera={{ position: [0, 0.5, 4], fov: 45 }}>
                        <ambientLight intensity={0.6} />
                        <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
                        <Environment preset="city" />
                        <ProductImageBillboard imageUrl={product.image_url} fallbackColor={status.meshColor} />
                        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={5} blur={1.5} far={4} color="#000" />
                      </Canvas>
                    </div>

                    <div className="absolute bottom-3 right-3 z-10 flex flex-col items-end">
                      <div className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider backdrop-blur-md border ${status.bg} ${status.color} ${status.border}`}>
                        {status.label}
                      </div>
                    </div>
                  </div>

                  {/* Details Panel */}
                  <div className="p-5 flex flex-col flex-1 relative z-10 bg-surface-glass">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-white text-base truncate pr-2 flex-1" title={product.name}>
                        {product.name}
                      </h3>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-4">{product.category || 'Uncategorized'}</div>
                    
                    <div className="mt-auto flex justify-between items-end pt-4 border-t border-white/5">
                      <div>
                        <div className="text-[10px] text-gray-500 font-medium uppercase mb-0.5">Asset Value</div>
                        <div className="text-blue-400 font-semibold">₹{Number(product.price).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500 font-medium uppercase mb-0.5">Available Units</div>
                        <div className={`text-xl font-bold font-mono tracking-tight ${status.color}`}>
                          {product.stock_quantity}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover overlay actions */}
                  {canEdit && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-20 pointer-events-none group-hover:pointer-events-auto">
                      <button
                        className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-transform hover:scale-110"
                        title="Edit Product"
                        onClick={() => { setEditingProduct(product); setProductModalOpen(true); }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-transform hover:scale-110"
                        title="Adjust Stock"
                        onClick={() => { setStockProduct(product); setStockModalOpen(true); }}
                      >
                        <ArrowUpDown size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={productModalOpen}
        onClose={() => { setProductModalOpen(false); setEditingProduct(null); }}
        onSave={handleSaveProduct}
        product={editingProduct}
      />

      {/* Stock Adjustment Modal */}
      <StockModal
        product={stockProduct}
        isOpen={stockModalOpen}
        onClose={() => { setStockModalOpen(false); setStockProduct(null); }}
        onSave={fetchData}
      />
    </div>
  );
}

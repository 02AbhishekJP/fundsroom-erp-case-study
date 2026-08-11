import React, { useEffect, useState } from 'react';
import api from '../api';
import { Users, FileText, AlertTriangle, TrendingUp, Activity, ArrowRight, Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// --- Dashboard Types ---
interface DashboardData {
  customers: { total: number; active: number; leads: number; inactive: number; };
  products: { total: number; total_stock: number; low_stock: number; out_of_stock: number; total_value: number; };
  low_stock_items: Array<{ id: string; name: string; sku: string; stock_quantity: number; min_stock_alert: number; category: string; warehouse_location: string; }>;
  out_of_stock_items: Array<{ id: string; name: string; sku: string; category: string; warehouse_location: string; }>;
  challans: { total: number; draft: number; confirmed: number; cancelled: number; total_revenue: number; today: number; };
  recent_challans: Array<{ challan_number: string; status: string; total_amount: number; created_at: string; customer_name: string; }>;
  recent_movements: Array<{ id: string; type: string; quantity: number; reason: string; created_at: string; product_name: string; product_sku: string; }>;
}

// --- 3D Operations Core Visualization ---
function OperationsCore() {
  const meshRef = React.useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Sphere ref={meshRef} args={[1.5, 64, 64]} scale={1}>
          <MeshDistortMaterial 
            color="#1e3a8a" 
            attach="material" 
            distort={0.4} 
            speed={2} 
            roughness={0.2} 
            metalness={0.8}
            envMapIntensity={2}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </Sphere>
        
        {/* Orbiting rings */}
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[2.5, 0.02, 16, 100]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
        </mesh>
        <mesh rotation-y={Math.PI / 3} rotation-x={Math.PI / 2}>
          <torusGeometry args={[3.5, 0.01, 16, 100]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.2} />
        </mesh>
      </Float>
      <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2} far={4} color="#000" />
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#3b82f6" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
    </group>
  );
}

// --- UI Components ---
function KPICard({ title, value, subtext, icon: Icon, colorClass, highlight }: any) {
  return (
    <div className="glass-card flex flex-col justify-between relative overflow-hidden group h-full">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${colorClass}`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-2.5 rounded-lg border backdrop-blur-md ${colorClass} bg-opacity-10 border-opacity-20`}>
          <Icon size={20} className="text-current" />
        </div>
        {highlight && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full border backdrop-blur-md ${highlight.colorClass} bg-opacity-10 border-opacity-20 text-current shadow-[0_0_10px_currentColor]`}>
            {highlight.text}
          </span>
        )}
      </div>
      
      <div className="relative z-10">
        <h3 className="text-gray-400 text-sm font-medium tracking-wide uppercase mb-1">{title}</h3>
        <div className="text-3xl font-bold text-white mb-2">{value}</div>
        <p className="text-xs text-gray-500 font-medium">{subtext}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-blue-400 font-medium animate-pulse tracking-wide">Syncing Operations Data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Command Center
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </h1>
          <p className="text-gray-400 mt-1">Real-time overview of your logistics and sales operations.</p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-sm text-gray-400 font-medium">System Status</div>
          <div className="text-emerald-400 text-sm font-bold tracking-wide">OPTIMAL</div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Revenue (Confirmed)"
          value={`₹${Number(data?.challans?.total_revenue || 0).toLocaleString()}`}
          subtext={`${data?.challans?.confirmed || 0} Confirmed Challans`}
          icon={TrendingUp}
          colorClass="bg-emerald-500 text-emerald-400 border-emerald-500"
          highlight={{ text: "TODAY: " + (data?.challans?.today || 0), colorClass: "bg-blue-500 text-blue-400 border-blue-500" }}
        />
        <KPICard 
          title="Inventory Assets"
          value={`₹${Number(data?.products?.total_value || 0).toLocaleString()}`}
          subtext={`${data?.products?.total_stock?.toLocaleString() || 0} units across ${data?.products?.total || 0} SKUs`}
          icon={Box}
          colorClass="bg-blue-500 text-blue-400 border-blue-500"
        />
        <KPICard 
          title="Client Network"
          value={data?.customers?.total || 0}
          subtext={`${data?.customers?.active || 0} Active • ${data?.customers?.leads || 0} Leads`}
          icon={Users}
          colorClass="bg-indigo-500 text-indigo-400 border-indigo-500"
        />
        <KPICard 
          title="Stock Alerts"
          value={(data?.products?.low_stock || 0) + (data?.products?.out_of_stock || 0)}
          subtext={`${data?.products?.out_of_stock || 0} Out of stock, ${data?.products?.low_stock || 0} Low`}
          icon={AlertTriangle}
          colorClass={Number(data?.products?.low_stock || 0) + Number(data?.products?.out_of_stock || 0) > 0 ? "bg-red-500 text-red-400 border-red-500" : "bg-emerald-500 text-emerald-400 border-emerald-500"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
        {/* 3D Visualization Area */}
        <div className="lg:col-span-2 glass-card p-0 relative overflow-hidden group border border-blue-500/20">
          <div className="absolute inset-x-0 top-0 p-6 z-10 pointer-events-none flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-blue-400" /> operations_core.obj
              </h3>
              <p className="text-xs text-blue-300/70 font-mono tracking-wider mt-1">REAL-TIME DATA VISUALIZATION</p>
            </div>
          </div>
          <div className="absolute inset-0 z-0">
            <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
              <OperationsCore />
            </Canvas>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6 z-10 pointer-events-none bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
            <div className="font-mono text-xs text-gray-400">
              [RENDER ENGINE: R3F]
            </div>
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-75"></span>
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse delay-150"></span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-card flex flex-col h-full border border-red-500/20">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" />
              Critical Inventory
            </h3>
            <Link to="/products?low_stock=true" className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {data?.out_of_stock_items?.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-white text-sm truncate pr-2">{item.name}</div>
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white tracking-wider">DEPLETED</span>
                </div>
                <div className="text-xs text-red-300 font-mono">{item.sku}</div>
              </div>
            ))}
            
            {data?.low_stock_items?.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-white text-sm truncate pr-2">{item.name}</div>
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 tracking-wider border border-amber-500/30">{item.stock_quantity} / {item.min_stock_alert}</span>
                </div>
                <div className="text-xs text-amber-300/70 font-mono">{item.sku}</div>
              </div>
            ))}

            {(!data?.out_of_stock_items?.length && !data?.low_stock_items?.length) && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                  <Box size={20} />
                </div>
                <p className="text-sm font-medium">All inventory levels optimal.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Challans */}
        <div className="glass-card flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-blue-400" />
              Latest Sales Orders
            </h3>
            <Link to="/challans" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              Go to Sales <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="table-container flex-1 border-none bg-transparent">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="bg-transparent border-b border-white/5 pl-0">Challan #</th>
                  <th className="bg-transparent border-b border-white/5">Customer</th>
                  <th className="bg-transparent border-b border-white/5 text-right">Amount</th>
                  <th className="bg-transparent border-b border-white/5 pr-0 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recent_challans?.map((ch, idx) => (
                  <tr key={idx} className="group cursor-pointer">
                    <td className="pl-0 border-b border-white/5 group-last:border-none py-3">
                      <div className="font-mono text-xs text-blue-300">{ch.challan_number}</div>
                    </td>
                    <td className="border-b border-white/5 group-last:border-none py-3">
                      <div className="text-sm font-medium text-gray-200 truncate max-w-[120px] sm:max-w-[180px]">{ch.customer_name || 'N/A'}</div>
                    </td>
                    <td className="border-b border-white/5 group-last:border-none py-3 text-right">
                      <div className="text-sm font-semibold text-white">₹{Number(ch.total_amount).toLocaleString()}</div>
                    </td>
                    <td className="pr-0 border-b border-white/5 group-last:border-none py-3 text-right">
                      <span className={`badge badge-${ch.status}`}>{ch.status}</span>
                    </td>
                  </tr>
                ))}
                {(!data?.recent_challans?.length) && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-sm text-gray-500 border-none">No recent orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Movements Timeline */}
        <div className="glass-card flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-indigo-400" />
              Inventory Pulse
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative before:absolute before:inset-y-0 before:left-[15px] before:w-[2px] before:bg-white/5">
            {data?.recent_movements?.map((movement, idx) => (
              <div key={idx} className="relative pl-10 py-3 group">
                <div className={`absolute left-0 top-4 w-8 h-8 rounded-full border-2 bg-[#111827] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110
                  ${movement.type === 'IN' ? 'border-emerald-500/50 text-emerald-400' : 'border-rose-500/50 text-rose-400'}
                `}>
                  {movement.type === 'IN' ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium text-white text-sm truncate">{movement.product_name}</div>
                    <div className={`text-xs font-bold px-1.5 py-0.5 rounded ${movement.type === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {movement.type === 'IN' ? '+' : '-'}{movement.quantity}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-[10px] text-gray-400 font-mono tracking-wide">{movement.product_sku}</div>
                    <div className="text-[10px] text-gray-500">{new Date(movement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              </div>
            ))}
            {(!data?.recent_movements?.length) && (
              <div className="flex flex-col items-center justify-center h-full text-center text-sm text-gray-500">
                No recent stock movements.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

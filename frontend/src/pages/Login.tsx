import React, { useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Zap, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Float, Sparkles, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// 3D Box geometry representing a product
function ProductBox({ position, color, speed = 1 }: { position: [number, number, number], color: string, speed?: number }) {
  const ref = React.useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3 * speed) * 0.2;
      ref.current.rotation.y = state.clock.elapsedTime * 0.1 * speed;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 * speed) * 0.5;
    }
  });

  return (
    <Float floatIntensity={2} rotationIntensity={1}>
      <mesh ref={ref} position={position} castShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color={color} roughness={0.1} metalness={0.8} envMapIntensity={1} />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.5, 1.5, 1.5)]} />
          <lineBasicMaterial color="#ffffff" opacity={0.2} transparent />
        </lineSegments>
      </mesh>
    </Float>
  );
}

// 3D Scene Background
function SceneBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#3b82f6" />
        <spotLight position={[-10, -10, -10]} angle={0.15} penumbra={1} intensity={1} color="#8b5cf6" />
        
        <Environment preset="city" />
        
        <Sparkles count={200} scale={20} size={2} speed={0.4} opacity={0.3} color="#3b82f6" />
        
        <group position={[-4, 0, -2]}>
          <ProductBox position={[-2, 2, -1]} color="#1e3a8a" speed={0.8} />
          <ProductBox position={[1, -1, 1]} color="#3b82f6" speed={1.2} />
          <ProductBox position={[-1, -2, -2]} color="#0ea5e9" speed={0.5} />
        </group>
        
        <ContactShadows position={[0, -4, 0]} opacity={0.5} scale={30} blur={2} far={10} color="#000" />
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('error', 'Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      showToast('success', 'Authentication successful. Initializing operations core...');
      
      // Start zoom transition
      setIsZooming(true);
      
      // Delay navigation for transition effect
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err: any) {
      setIsLoading(false);
      showToast('error', err.response?.data?.message || 'Login failed. Please check credentials.');
      
      // Shake animation on error
      const form = document.getElementById('login-form');
      if (form) {
        form.classList.add('animate-shake');
        setTimeout(() => form.classList.remove('animate-shake'), 500);
      }
    }
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('password123');
  };

  return (
    <div className={`relative h-screen w-full overflow-hidden bg-[#030712] transition-transform duration-1000 ${isZooming ? 'scale-[5] opacity-0' : 'scale-100 opacity-100'}`}>
      <SceneBackground />
      
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4 sm:p-8 sm:justify-end">
        <div className="w-full max-w-md glass-card animate-in fade-in slide-in-from-right-10 duration-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Zap size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">FUNDSROOM</h1>
              <p className="text-xs text-blue-400 font-medium tracking-widest uppercase">Operations Intelligence Platform</p>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Welcome Back</h2>
          <p className="text-gray-400 text-sm mb-8">Sign in to access your 3D command center.</p>

          <form id="login-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="form-group">
              <label>Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  className="input-glass pl-10"
                  placeholder="admin@fundsroom.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isZooming}
                />
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-glass pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isZooming}
                />
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full py-3 mt-4 relative overflow-hidden group"
              disabled={isLoading || isZooming}
            >
              <span className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                Initialize Session
              </span>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">Quick Access Nodes</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn btn-ghost text-xs py-1.5 justify-start bg-white/5 hover:bg-white/10 border border-white/5"
                onClick={() => handleQuickLogin('admin@fundsroom.com')}
                disabled={isLoading || isZooming}
              >
                👑 Admin Core
              </button>
              <button
                type="button"
                className="btn btn-ghost text-xs py-1.5 justify-start bg-white/5 hover:bg-white/10 border border-white/5"
                onClick={() => handleQuickLogin('sales@fundsroom.com')}
                disabled={isLoading || isZooming}
              >
                💼 Sales Hub
              </button>
              <button
                type="button"
                className="btn btn-ghost text-xs py-1.5 justify-start bg-white/5 hover:bg-white/10 border border-white/5"
                onClick={() => handleQuickLogin('warehouse@fundsroom.com')}
                disabled={isLoading || isZooming}
              >
                📦 Warehouse
              </button>
              <button
                type="button"
                className="btn btn-ghost text-xs py-1.5 justify-start bg-white/5 hover:bg-white/10 border border-white/5"
                onClick={() => handleQuickLogin('accounts@fundsroom.com')}
                disabled={isLoading || isZooming}
              >
                📊 Accounts
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

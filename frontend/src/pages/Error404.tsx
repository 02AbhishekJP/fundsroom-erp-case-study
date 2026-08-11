import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';
import { ArrowLeft, Home } from 'lucide-react';
import * as THREE from 'three';
import { useRef } from 'react';

function Floating404() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        {/* We use a simple TorusKnot as a placeholder for 3D text to avoid loading external fonts */}
        <mesh>
          <torusKnotGeometry args={[1.5, 0.4, 100, 16]} />
          <meshPhysicalMaterial 
            color="#3b82f6" 
            metalness={0.9} 
            roughness={0.1} 
            clearcoat={1} 
            envMapIntensity={2}
          />
        </mesh>
      </Float>
    </group>
  );
}

export default function Error404() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#030712] relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#030712] to-[#030712] z-0"></div>
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-10 opacity-60">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#3b82f6" />
          <Environment preset="city" />
          <Floating404 />
        </Canvas>
      </div>
      
      {/* Content Overlay */}
      <div className="z-20 flex flex-col items-center text-center p-8 max-w-lg glass-card border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 mb-2">
          404
        </h1>
        <div className="h-1 w-16 bg-red-500 rounded-full mb-6 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Sector Not Found</h2>
        <p className="text-gray-400 mb-8 font-mono text-sm">
          ERR_FILE_NOT_FOUND: The requested operations sector does not exist or you lack clearance to view it.
        </p>
        
        <div className="flex gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="btn bg-white/5 hover:bg-white/10 border border-white/10 text-white"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-primary"
          >
            <Home size={16} /> Return to Core
          </button>
        </div>
      </div>
      
      {/* Decorative tech elements */}
      <div className="absolute bottom-6 left-6 text-[10px] font-mono text-red-500/50 tracking-[0.3em]">
        SYS_STATUS: OFFLINE
      </div>
      <div className="absolute top-6 right-6 text-[10px] font-mono text-gray-600 tracking-[0.2em] flex flex-col items-end">
        <span>SECTOR: UNKNOWN</span>
        <span>COORD: {Math.random().toFixed(4)} : {Math.random().toFixed(4)}</span>
      </div>
    </div>
  );
}

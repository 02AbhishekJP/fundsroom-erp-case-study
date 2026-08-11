import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-md text-sm font-medium animate-in slide-in-from-right-8 fade-in
              ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : ''}
              ${toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : ''}
              ${toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : ''}
              ${toast.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : ''}
            `}
          >
            {toast.message}
            <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-white/10 rounded-full transition-colors ml-4">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

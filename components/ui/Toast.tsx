import { useState, useEffect, createContext, useContext, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'loading' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    loading: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    if (type !== 'loading') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    }
  }, []);

  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    loading: (msg: string) => addToast(msg, 'loading'),
    info: (msg: string) => addToast(msg, 'info'),
  };

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    loading: 'bg-blue-600',
    info: 'bg-gray-700',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${bgColors[t.type]} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm animate-fade-in`}
          >
            {t.type === 'loading' && <span className="mr-2 animate-spin inline-block">⏳</span>}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: {
        success: (msg: string) => console.log('Toast:', msg),
        error: (msg: string) => console.error('Toast:', msg),
        loading: (msg: string) => console.log('Toast:', msg),
        info: (msg: string) => console.log('Toast:', msg),
      }
    };
  }
  return context;
}

export const toast = {
  success: (msg: string) => console.log('Toast:', msg),
  error: (msg: string) => console.error('Toast:', msg),
  loading: (msg: string) => console.log('Toast:', msg),
};

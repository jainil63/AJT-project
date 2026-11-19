import React, { createContext, useState, useCallback, useEffect } from 'react';
import Toast from '../components/common/Toast';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Allows the native Android shell to surface its own toasts through the same
  // styled component the web app uses — keeps the UX consistent. Native dispatches:
  //   window.dispatchEvent(new CustomEvent('clinic:show-toast', { detail: { message, type, duration } }))
  useEffect(() => {
    const handler = (event) => {
      const { message, type = 'info', duration = 2000 } = event.detail || {};
      if (message) showToast(message, type, duration);
    };
    window.addEventListener('clinic:show-toast', handler);
    return () => window.removeEventListener('clinic:show-toast', handler);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:top-6 z-[9999] flex flex-col gap-3 sm:min-w-[280px] sm:max-w-md pt-safe pr-safe pointer-events-none [&>*]:pointer-events-auto">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

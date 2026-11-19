import React, { createContext, useState, useContext } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const ConfirmContext = createContext();

export const ConfirmProvider = ({ children }) => {
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    resolve: null,
    type: 'danger'
  });

  const confirm = (options) => {
    return new Promise((resolve) => {
      setDialogConfig({
        isOpen: true,
        title: options.title || 'Are you sure?',
        message: options.message || 'This action cannot be undone.',
        type: options.type || 'danger',
        resolve
      });
    });
  };

  const handleConfirm = () => {
    dialogConfig.resolve(true);
    setDialogConfig({ ...dialogConfig, isOpen: false });
  };

  const handleCancel = () => {
    dialogConfig.resolve(false);
    setDialogConfig({ ...dialogConfig, isOpen: false });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

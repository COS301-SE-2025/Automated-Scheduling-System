import React from 'react';
import Button from './Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'outline';
  onConfirm: () => void;
  onCancel: () => void;
  isBusy?: boolean;
  error?: string | null;
  showCancel?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  isBusy = false,
  error,
  showCancel = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow-xl w-full max-w-md">
        <h3 className="text-lg font-semibold text-custom-text dark:text-dark-text mb-3">{title}</h3>
        <div className="text-sm text-custom-text dark:text-dark-text mb-4">{message}</div>
        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
        <div className="flex justify-end gap-3">
          {showCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
              {cancelLabel}
            </Button>
          )}
          <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={isBusy}>
            {isBusy ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

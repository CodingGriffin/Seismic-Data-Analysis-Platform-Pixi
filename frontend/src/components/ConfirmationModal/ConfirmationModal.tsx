import React from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';

interface ConfirmationModalProps {
  title: string;
  message: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  isOpen,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger'
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">{title}</h5>
          <Button
            variant="secondary"
            className="btn-close"
            onClick={onCancel}
            aria-label="Close"
          />
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
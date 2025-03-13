import React, { ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    children, 
    className = ''
}) => {
    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop show" />
            <div className="modal show d-block">
                <div className={`modal-dialog ${className}`}>
                    {children}
                </div>
            </div>
        </>
    );
};
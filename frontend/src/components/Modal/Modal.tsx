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
            <div className="modal-backdrop show" onClick={onClose}/>
            <div className="modal show d-block">
                <div className={`modal-dialog modal-dialog-centered ${className}`}>
                    {children}
                </div>
            </div>
        </>
    );
};
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmação",
  message,
  confirmText = "SIM, EXCLUIR",
  cancelText = "CANCELAR"
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-confirmation">
      <div className="modal-content" style={{ maxWidth: '400px', padding: 0, overflow: 'hidden' }}>
        <div className="unified-header" style={{ background: 'var(--primary-red)', borderRadius: '0', margin: 0, height: '70px' }}>
          <span className="header-dot">●</span> {title}
        </div>
        
        <div className="modal-body" style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-gray)', marginBottom: '2.5rem', fontWeight: 500, lineHeight: 1.5 }}>
            {message}
          </p>
          
          <div className="modal-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <button className="btn-confirm" style={{ background: 'var(--primary-red)', width: '100%', border: 'none', color: 'var(--white)', fontWeight: 900, height: '50px', borderRadius: '25px', cursor: 'pointer', fontSize: '1rem' }} onClick={onConfirm}>
               {confirmText}
             </button>
             <button className="btn-cancel" style={{ width: '100%', background: 'transparent', border: '2px solid var(--border-dark)', color: 'var(--text-gray)', fontWeight: 900, height: '50px', borderRadius: '25px', cursor: 'pointer', fontSize: '1rem' }} onClick={onClose}>
               {cancelText}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

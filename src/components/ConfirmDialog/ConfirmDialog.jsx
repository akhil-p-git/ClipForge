import React from 'react';
import './ConfirmDialog.css';

function ConfirmDialog({ 
  isOpen, 
  message = "Are you sure?", 
  onConfirm, 
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonStyle = "danger" // "danger" or "primary"
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <h3>Confirm Action</h3>
          <button className="close-button" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="confirm-dialog-content">
          <p>{message}</p>
        </div>
        <div className="confirm-dialog-footer">
          <button className="cancel-button" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`confirm-button ${confirmButtonStyle}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

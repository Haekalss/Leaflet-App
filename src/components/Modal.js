'use client';

import { useState, useCallback, useEffect } from 'react';

export default function Modal({ isOpen, onClose, type, marker, onSave, onDelete }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Use a key to reset the component when modal opens with different data
  const modalKey = `${type}-${marker?._id || 'new'}-${isOpen}`;

  // initialize form content when modal opens (deferred to avoid cascading renders)
  useEffect(() => {
    if (!isOpen) {
      Promise.resolve().then(() => {
        setTitle('');
        setDescription('');
        setShowDeleteConfirm(false);
      });
      return;
    }
    if (type === 'edit' && marker) {
      Promise.resolve().then(() => {
        setTitle(marker.title || '');
        // sanitize leading backslashes or unintended escapes from stored data
        setDescription((marker.description || '').replace(/^\\+/, ''));
      });
    } else {
      Promise.resolve().then(() => {
        setTitle('');
        setDescription('');
      });
    }
  }, [isOpen, type, marker]);

  const handleSave = () => {
    if (!title.trim()) return;
    // sanitize description before saving
    onSave({ title, description: (description || '').replace(/^\\+/, '') });
    // Reset form after save
    setTitle('');
    setDescription('');
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  const handleClose = useCallback(() => {
    setTitle('');
    setDescription('');
    setShowDeleteConfirm(false);
    onClose();
  }, [onClose]);

  // Close on ESC key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  };

  const deleteOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
  };

  const modalStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  };

  const titleStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const textareaStyle = {
    ...inputStyle,
    resize: 'none',
    fontFamily: 'inherit',
  };

  const buttonGroupStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  };

  const buttonBaseStyle = {
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  };

  const primaryButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  };

  const secondaryButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: 'transparent',
    color: '#374151',
    border: '1px solid #d1d5db',
  };

  const deleteButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#ef4444',
    color: '#ffffff',
  };

  const disabledButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#d1d5db',
    color: '#6b7280',
    cursor: 'not-allowed',
  };

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label={type === 'create' ? 'Create Marker' : 'Edit Marker'}
    >
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            {type === 'create' ? 'Add New Marker' : 'Edit Marker'}
          </h2>
          <button
            onClick={handleClose}
            style={closeButtonStyle}
            aria-label="Close"
            onMouseEnter={(e) => e.target.style.color = '#4b5563'}
            onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
          >
            <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
            placeholder="Enter marker title"
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={textareaStyle}
            rows="3"
            placeholder="Enter description (optional)"
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>
        
        <div style={buttonGroupStyle}>
          {type === 'edit' && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={deleteButtonStyle}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              Delete
            </button>
          )}
          <button
            onClick={handleClose}
            style={secondaryButtonStyle}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            style={title.trim() ? primaryButtonStyle : disabledButtonStyle}
            onMouseEnter={(e) => {
              if (title.trim()) e.target.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              if (title.trim()) e.target.style.backgroundColor = '#3b82f6';
            }}
          >
            {type === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {/* Delete confirmation overlay on top */}
      {showDeleteConfirm && (
        <div
          style={deleteOverlayStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(false);
          }}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '12px',
            }}>
              Delete Marker?
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px',
            }}>
              Are you sure you want to delete &quot;{marker?.title}&quot;? This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
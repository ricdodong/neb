// POModals.js
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FILE_BASE, ENDPOINTS, PO_TERMS, PO_STATUS } from './poReceivesConfig';
import { getFixedUrl } from './POFormComponents';

// ============================================================================
// LIGHTBOX GALLERY MODAL WITH SMART ORIENTATION DETECTION, ZOOM, & PAN
// ============================================================================
export const DocumentLightboxModal = React.memo(({ images, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const touchStartDistRef = useRef(null);

  const rawItem = images[currentIndex] || { frameurl: '', label: 'Document' };
  const currentItem = {
    ...rawItem,
    frameurl: getFixedUrl(rawItem.frameurl)
  };

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });

    if (currentItem.frameurl) {
      const img = new Image();
      img.src = currentItem.frameurl;
      img.onload = () => {
        if (img.naturalWidth > img.naturalHeight * 1.3) {
          setRotation(90);
        } else {
          setRotation(0);
        }
      };
    }
  }, [currentIndex, currentItem.frameurl]);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    
    setScale((prevScale) => {
      const newScale = Math.min(Math.max(prevScale * zoomFactor, 1), 5);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      touchStartDistRef.current = dist;
      setScale((prev) => Math.min(Math.max(prev * factor, 1), 5));
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    setIsDragging(false);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.95)',
        backdropFilter: 'blur(12px)',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: 'linear-gradient(to bottom, rgba(3,7,18,0.9), transparent)',
          zIndex: 1310
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#38bdf8', fontWeight: '800', fontSize: '15px' }}>{currentItem.label}</span>
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>({currentIndex + 1} of {images.length})</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
            title="Rotate Image 90°"
          >
            🔄 Rotate ({rotation}°)
          </button>
          <button 
            onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
            title="Reset Zoom"
          >
            🔍 {Math.round(scale * 100)}%
          </button>
          <button 
            onClick={onClose}
            style={{ background: '#ef4444', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          ref={imageRef}
          src={currentItem.frameurl} 
          alt={currentItem.label}
          style={{
            maxHeight: '82vh',
            maxWidth: '85vw',
            objectFit: 'contain',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'
          }}
        />

        {images.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1)); }}
              style={{
                position: 'absolute',
                left: '20px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid #334155',
                color: '#fff',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              ❮
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1)); }}
              style={{
                position: 'absolute',
                right: '20px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid #334155',
                color: '#fff',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              ❯
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div 
          style={{
            position: 'absolute',
            bottom: '16px',
            display: 'flex',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(15, 23, 42, 0.85)',
            borderRadius: '12px',
            border: '1px solid #1e293b',
            zIndex: 1310
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <div 
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '6px',
                overflow: 'hidden',
                border: currentIndex === idx ? '2px solid #38bdf8' : '2px solid transparent',
                cursor: 'pointer',
                opacity: currentIndex === idx ? 1 : 0.6,
                transition: 'all 0.2s'
              }}
            >
              <img src={getFixedUrl(img.frameurl)} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// DOCUMENT GALLERY / LIGHTBOX MODAL
// ============================================================================
export const DocumentGalleryModal = React.memo(({ row, onClose, onOpenLightbox }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!row) return null;

  // Helper to format attachment values correctly using FILE_BASE
  const formatAttachmentUrl = (path) => {
    if (!path) return null;
    // If path already starts with http/https, blob, or data, use getFixedUrl directly
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
      return getFixedUrl(path);
    }
    // Otherwise prepend FILE_BASE, ensuring proper slash separation
    const cleanBase = FILE_BASE.endsWith('/') ? FILE_BASE.slice(0, -1) : FILE_BASE;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return getFixedUrl(`${cleanBase}${cleanPath}`);
  };

  const documents = [
    row.po_attachment ? { frameurl: formatAttachmentUrl(row.po_attachment), label: 'Purchase Order (PO)' } : null,
    row.dr_attachment ? { frameurl: formatAttachmentUrl(row.dr_attachment), label: 'Delivery Receipt (DR)' } : null,
    row.invoice_attachment ? { frameurl: formatAttachmentUrl(row.invoice_attachment), label: 'Sales Invoice (SI)' } : null
  ].filter(Boolean);

  const poRef = row.batch_reference || row.po_number || 'N/A';

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '16px'
        }}
        onClick={onClose}
      >
        <div 
          style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '90vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2937', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🖼️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#fff' }}>Verified Document Gallery</h3>
                <span style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'monospace' }}>Record: {poRef}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ padding: '24px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {documents.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No document attachments found for this record.
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    if (onOpenLightbox) {
                      onOpenLightbox(documents, idx);
                    } else {
                      setLightboxIndex(idx);
                    }
                  }}
                  style={{
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ height: '160px', width: '100%', background: '#000', overflow: 'hidden', position: 'relative' }}>
                    <img src={doc.frameurl} alt={doc.label} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,7,18,0.8), transparent)', display: 'flex', alignItems: 'flex-end', padding: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>🔍 Click to Expand & Zoom</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>{doc.label}</span>
                    <span style={{ fontSize: '10px', color: '#00ff88', fontWeight: '600' }}>✓ Verified Staged File</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid #1f2937', background: '#0f172a', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: '#1f2937', color: '#cbd5e1', border: '1px solid #374151', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              Close Gallery
            </button>
          </div>
        </div>
      </div>

      {lightboxIndex !== null && !onOpenLightbox && (
        <DocumentLightboxModal 
          images={documents}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
});

// ============================================================================
// DOCUMENT VIEWER MODAL (ALIAS / WRAPPER FOR BACKWARD COMPATIBILITY)
// ============================================================================
export const DocumentViewerModal = React.memo(({ viewDocsRow, styles, onClose, onOpenLightbox }) => {
  return (
    <DocumentGalleryModal 
      row={viewDocsRow} 
      onClose={onClose} 
      onOpenLightbox={onOpenLightbox} 
    />
  );
});

export const UploadModal = React.memo(({ activeInspectionBatch, styles, onClose }) => {
  if (!activeInspectionBatch) return null;

  const batchUrl = ENDPOINTS.mobileUploadsBatch(activeInspectionBatch);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h4 style={styles.modalTitle}>DOCUMENT ATTACHMENT BRIDGE</h4>
          <button style={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <p style={styles.modalInstructions}>Processing attachment stream targets specifically for PO Number:</p>
          <div style={styles.modalBadgeDisplay}><code>{activeInspectionBatch}</code></div>
          <div style={styles.modalQrWrapper}>
            <QRCodeSVG value={batchUrl} size={160} bgColor={"#111827"} fgColor={"#00ff88"} level={"M"} includeMargin={false} />
          </div>
          <p style={styles.modalInstructions}>Scan the grid code directly with a mobile device context, or trigger the deployment route below.</p>
          <a href={batchUrl} target="_blank" rel="noopener noreferrer" style={styles.modalActionLink}>
            📸 LAUNCH LINKED CAMERA TERMINAL
          </a>
        </div>
      </div>
    </div>
  );
});

export const EditRecordModal = React.memo(({ editingRow, clients, styles, onClose, onSave }) => {
  const [editFormData, setEditFormData] = useState({
    batch_reference: '',
    customer_id: '',
    amount: '',
    po_date: '',
    po_terms: 'COD',
    status: 'pending',
    remarks: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingRow) {
      setEditFormData({
        batch_reference: editingRow.batch_reference || editingRow.po_number || '',
        customer_id: editingRow.customer_id || '',
        amount: editingRow.amount || '',
        po_date: editingRow.po_date || new Date().toISOString().split('T')[0],
        po_terms: editingRow.po_terms || 'COD',
        status: editingRow.status || 'pending',
        remarks: editingRow.remarks || ''
      });
      setErrorMsg('');
    }
  }, [editingRow]);

  if (!editingRow) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    try {
      await onSave(editFormData);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update PO record');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.editModalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h4 style={styles.modalTitle}>EDIT PURCHASE ORDER RECORD</h4>
          <button style={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>

        {errorMsg && (
          <div style={{ ...styles.alert, ...styles.alertError }}>
            ❌ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>PO Number (Reference)</label>
            <input
              type="text"
              name="batch_reference"
              value={editFormData.batch_reference}
              onChange={handleChange}
              style={styles.input}
              required
              readOnly
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Customer / Client</label>
            <select
              name="customer_id"
              value={editFormData.customer_id}
              onChange={handleChange}
              style={styles.select}
              required
            >
              <option value="">-- Select Client --</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Total PO Value Amount (PHP)</label>
            <input
              type="number"
              name="amount"
              step="0.01"
              value={editFormData.amount}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>PO Document Date</label>
              <input
                type="date"
                name="po_date"
                value={editFormData.po_date}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contract Terms</label>
              <select
                name="po_terms"
                value={editFormData.po_terms}
                onChange={handleChange}
                style={styles.select}
              >
                {PO_TERMS.map(term => (
                  <option key={term.value} value={term.value}>{term.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Pipeline Status</label>
            <select
              name="status"
              value={editFormData.status}
              onChange={handleChange}
              style={styles.select}
            >
              {PO_STATUS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Notes / Remarks</label>
            <textarea
              name="remarks"
              value={editFormData.remarks}
              onChange={handleChange}
              style={styles.textarea}
              placeholder="Enter remarks or notes..."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{ ...styles.submitBtn, ...(isSaving ? styles.submitBtnLoading : {}) }}
            >
              {isSaving ? 'UPDATING...' : 'UPDATE RECORD'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={styles.closeActionBtn}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
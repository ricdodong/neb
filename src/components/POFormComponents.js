import React, { useState, useMemo, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FILE_BASE, PO_TERMS, PO_STATUS, formatPHP } from './poReceivesConfig';

// ============================================================================
// HELPER: PHILIPPINE PO CREDIT TERMS & DUE DATE CALCULATOR
// ============================================================================
export const getDueDateInfo = (poDate, terms, status) => {
  if (status === 'served') {
    return { 
      label: 'COMPLETED', 
      dueDateStr: 'Fulfilled',
      color: '#00ff88', 
      bg: 'rgba(0, 255, 136, 0.12)', 
      borderColor: 'rgba(0, 255, 136, 0.3)',
      isOverdue: false 
    };
  }

  const startDate = new Date(poDate);
  if (isNaN(startDate.getTime())) {
    return { 
      label: 'NO DATE', 
      dueDateStr: 'N/A',
      color: '#94a3b8', 
      bg: 'rgba(148, 163, 184, 0.1)', 
      borderColor: '#334155',
      isOverdue: false 
    };
  }

  const daysMatch = terms ? terms.match(/\d+/) : null;
  const creditDays = daysMatch ? parseInt(daysMatch[0], 10) : 0;

  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + creditDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const dueDateStr = dueDate.toISOString().split('T')[0];

  if (diffDays < 0) {
    return { 
      label: `OVERDUE (${Math.abs(diffDays)}d)`, 
      dueDateStr,
      color: '#f87171', 
      bg: 'rgba(239, 68, 68, 0.15)', 
      borderColor: 'rgba(239, 68, 68, 0.4)',
      isOverdue: true 
    };
  } else if (diffDays <= 3) {
    return { 
      label: `DUE SOON (${diffDays}d)`, 
      dueDateStr,
      color: '#fbbf24', 
      bg: 'rgba(245, 158, 11, 0.15)', 
      borderColor: 'rgba(245, 158, 11, 0.4)',
      isOverdue: false 
    };
  } else {
    return { 
      label: `${diffDays} DAYS LEFT`, 
      dueDateStr,
      color: '#38bdf8', 
      bg: 'rgba(56, 189, 248, 0.12)', 
      borderColor: 'rgba(56, 189, 248, 0.3)',
      isOverdue: false 
    };
  }
};

// ============================================================================
// LIGHTBOX GALLERY MODAL WITH SMART ROTATION, MOUSE/TOUCH ZOOM, & PAN
// ============================================================================
const DocumentLightboxModal = ({ images, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const touchStartDistRef = useRef(null);

  const currentItem = images[currentIndex] || { url: '', label: 'Document' };

  // Reset zoom, position, and calculate smart auto-rotation on image change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });

    if (currentItem.url) {
      const img = new Image();
      img.src =  currentItem.url;
      img.onload = () => {
        // Smart orientation detection: if image is landscape (width > height), 
        // document scans might require a 90deg adjustment depending on layout, 
        // or if it's tall vs wide. Standardizing document readability: 
        // If width > height substantially, it's typically sideways.
        if (img.naturalWidth > img.naturalHeight * 1.3) {
          setRotation(90); // Automatically align horizontal documents upright
        } else {
          setRotation(0);
        }
      };
    }
  }, [currentIndex, currentItem.url]);

  // Handle Wheel Zoom (centered on cursor position)
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    
    setScale((prevScale) => {
      const newScale = Math.min(Math.max(prevScale * zoomFactor, 1), 5);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 }); // Reset pan when fully zoomed out
      }
      return newScale;
    });
  };

  // Handle Dragging / Panning when Zoomed
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

  // Handle Touch Gestures for Pinch-to-Zoom & Pan on Mobile
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
      {/* Top Header Controls */}
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

      {/* Main Lightbox Viewport */}
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
          src={FILE_BASE + currentItem.url} 
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

        {/* Navigation Arrows */}
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

      {/* Bottom Thumbnail Strip */}
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
              <img src={FILE_BASE + img.url} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STUNNING GALLERY & DOCUMENT VIEWER MODAL
// ============================================================================
const DocumentGalleryModal = ({ row, onClose }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!row) return null;

  const documents = [
    row.po_attachment ? { url: row.po_attachment, label: 'Purchase Order (PO)' } : null,
    row.dr_attachment ? { url: row.dr_attachment, label: 'Delivery Receipt (DR)' } : null,
    row.invoice_attachment ? { url: row.invoice_attachment, label: 'Sales Invoice (SI)' } : null
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
          {/* Header */}
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

          {/* Gallery Grid Body */}
          <div style={{ padding: '24px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {documents.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No document attachments found for this record.
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div 
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
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
                    <img src={FILE_BASE + doc.url} alt={doc.label} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
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

          {/* Footer */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid #1f2937', background: '#0f172a', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: '#1f2937', color: '#cbd5e1', border: '1px solid #374151', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              Close Gallery
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal Layer */}
      {lightboxIndex !== null && (
        <DocumentLightboxModal 
          images={documents}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};

// ============================================================================
// 1. PO FORM SECTION
// ============================================================================
export const POFormSection = React.memo(({ formData, clients, stagingStatus, loading, styles, onInputChange, onSubmit }) => {
  const bothStaged = stagingStatus.po_attachment && stagingStatus.dr_attachment;

  return (
    <div className="po-form-container" style={styles.card}>
      <h3 style={styles.cardTitle}>PO Metadata Parameters</h3>
      <form onSubmit={onSubmit} style={styles.form}>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>PO Number</label>
          <input 
            type="text" 
            name="batch_reference"
            placeholder="Enter Physical PO Number (e.g. PO-2026-001)"
            value={formData.batch_reference} 
            onChange={onInputChange} 
            style={styles.input} 
            required 
          />
          {formData.batch_reference.trim() !== '' && (
            <span style={{ 
              color: bothStaged ? '#00ff88' : '#fbbf24', 
              fontSize: '11px', 
              fontWeight: '700', 
              marginTop: '4px' 
            }}>
              {bothStaged ? '✓ BOTH PO & DR STAGED — READY TO SAVE RECORD' : '⚠️ BOTH PO AND DR MUST BE SCANNED/STAGED TO ENABLE SAVING'}
            </span>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Select Client / Customer Link</label>
          <select 
            name="customer_id" 
            value={formData.customer_id} 
            onChange={onInputChange} 
            style={styles.select}
            required
          >
            <option value="">-- Choose Corporate Account --</option>
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
            placeholder="0.00"
            value={formData.amount} 
            onChange={onInputChange} 
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
              value={formData.po_date} 
              onChange={onInputChange} 
              style={styles.input}
              required 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Contract Terms</label>
            <select 
              name="po_terms" 
              value={formData.po_terms} 
              onChange={onInputChange} 
              style={styles.select}
            >
              {PO_TERMS.map(term => (
                <option key={term.value} value={term.value}>{term.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Initial Pipeline Status</label>
          <select 
            name="status" 
            value={formData.status} 
            onChange={onInputChange} 
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
            placeholder="Enter optional notes or remarks for this PO receive..."
            value={formData.remarks || ''}
            onChange={onInputChange}
            style={styles.textarea}
          />
        </div>

        <button 
          type="submit" 
          style={{ ...styles.submitBtn, ...(loading || !bothStaged || !formData.batch_reference.trim() ? styles.submitBtnLoading : {}) }}
          disabled={loading || !bothStaged || !formData.batch_reference.trim()}
          title={!bothStaged ? "Both PO and DR attachments must be scanned via mobile before saving" : "Save Record"}
        >
          {loading ? 'COMMITTING TRANSACTION...' : bothStaged ? 'SAVE PURCHASE ORDER RECORD' : '🔒 PENDING BOTH ATTACHMENTS (PO & DR)'}
        </button>
      </form>
    </div>
  );
});

// ============================================================================
// 2. PO SCANNER SECTION
// ============================================================================
export const POScannerSection = React.memo(({ mobileScannerUrl, stagingStatus, batchReference, styles }) => (
  <div className="po-qr-container" style={{ ...styles.card, ...styles.scannerCard }}>
    <h3 style={styles.cardTitle}>Active Transaction Session</h3>
    <p style={styles.scannerInstructions}>
      Scan the target route mapping using a mobile device node to attach camera document snaps seamlessly.
    </p>
    <div style={styles.qrContainer}>
      {mobileScannerUrl && batchReference ? (
        <QRCodeSVG value={mobileScannerUrl} size={140} bgColor={"#13151a"} fgColor={"#00ff88"} level={"M"} includeMargin={false} />
      ) : (
        <div style={styles.syncText}>Enter PO Number...</div>
      )}
    </div>

    <a 
      href={mobileScannerUrl || '#'}
      target={mobileScannerUrl ? "_blank" : "_self"} 
      rel="noopener noreferrer" 
      style={{ ...styles.redirectBtn, ...(!mobileScannerUrl || !batchReference ? styles.redirectBtnDisabled : {}) }}
      onClick={(e) => (!mobileScannerUrl || !batchReference) && e.preventDefault()}
    >
      📸 OPEN CAMERA LINK
    </a>

    <div style={styles.stagingRow}>
      <div style={{ ...styles.stagedIndicator, color: stagingStatus.po_attachment ? '#00ff88' : '#475569', borderColor: stagingStatus.po_attachment ? '#00ff88' : '#222' }}>
        {stagingStatus.po_attachment ? '✓ PO STAGED' : '⌛ PO PENDING'}
      </div>
      <div style={{ ...styles.stagedIndicator, color: stagingStatus.dr_attachment ? '#38bdf8' : '#475569', borderColor: stagingStatus.dr_attachment ? '#38bdf8' : '#222' }}>
        {stagingStatus.dr_attachment ? '✓ DR STAGED' : '⌛ DR PENDING'}
      </div>
    </div>

    <div style={styles.batchBadge}>
      <span style={styles.badgeLabel}>ACTIVE TRACK STAMP</span>
      <code style={styles.badgeCode}>{batchReference || 'AWAITING PO NUMBER'}</code>
    </div>
  </div>
));

// ============================================================================
// 3. ENHANCED PO DETAILS MODAL
// ============================================================================
const PODetailsModal = ({ row, userRole, styles, onClose, onViewDocs, onUploadBatch, onEditRow }) => {
  if (!row) return null;

  const poRef = row.batch_reference || row.po_number || 'N/A';
  const hasDocs = row.po_attachment || row.dr_attachment || row.invoice_attachment;
  const dueInfo = getDueDateInfo(row.po_date, row.po_terms, row.status);

  const modalStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '16px'
  };

  const cardStyle = {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '92vh',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  };

  const valueBoxStyle = {
    background: '#090d16',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f8fafc',
    fontSize: '14px'
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2937', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#fff' }}>Purchase Order Details</h3>
              <span style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'monospace' }}>{poRef}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Body Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', padding: '20px', overflowY: 'auto' }}>
          <div>
            <span style={styles.label}>PO Reference Number</span>
            <div style={{ ...valueBoxStyle, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 'bold' }}>{poRef}</div>
          </div>

          <div>
            <span style={styles.label}>Customer / Client</span>
            <div style={valueBoxStyle}>{row.customer_name || row.customer_id || 'N/A'}</div>
          </div>

          <div>
            <span style={styles.label}>PO Date</span>
            <div style={valueBoxStyle}>{row.po_date || 'N/A'}</div>
          </div>

          <div>
            <span style={styles.label}>Credit Terms & Due Date</span>
            <div style={{ ...valueBoxStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={styles.termsBadge}>{row.po_terms || 'COD'}</span>
              <span style={{ fontSize: '12px', color: dueInfo.color, fontWeight: '700' }}>
                {dueInfo.dueDateStr}
              </span>
            </div>
          </div>

          <div>
            <span style={styles.label}>Total Amount</span>
            <div style={{ ...valueBoxStyle, fontFamily: 'monospace', fontWeight: 'bold', color: '#00ff88' }}>{formatPHP(row.amount)}</div>
          </div>

          <div>
            <span style={styles.label}>Delivery Schedule Status</span>
            <div style={{ ...valueBoxStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ ...styles.statusBadge, ...(row.status === 'served' ? styles.statusServed : styles.statusPending) }}>{row.status}</span>
              <span style={{ fontSize: '11px', fontWeight: '800', color: dueInfo.color, background: dueInfo.bg, padding: '3px 8px', borderRadius: '4px', border: `1px solid ${dueInfo.borderColor}` }}>
                {dueInfo.label}
              </span>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <span style={styles.label}>Attachment Health Check</span>
            <div style={{ ...valueBoxStyle, display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: row.po_attachment ? '#00ff88' : '#f87171', fontSize: '13px', fontWeight: '600' }}>
                {row.po_attachment ? '✓ PO Document Staged' : '❌ PO Attachment Missing'}
              </span>
              <span style={{ color: row.dr_attachment ? '#38bdf8' : '#f87171', fontSize: '13px', fontWeight: '600' }}>
                {row.dr_attachment ? '✓ DR Document Staged' : '❌ DR Attachment Missing'}
              </span>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <span style={styles.label}>Notes / Remarks</span>
            <div style={{ ...valueBoxStyle, minHeight: '50px', color: row.remarks ? '#e2e8f0' : '#64748b' }}>
              {row.remarks || 'No notes or remarks recorded.'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1f2937', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto' }}>
            {hasDocs ? (
              <button type="button" onClick={() => onViewDocs(row)} style={{ ...styles.viewAttachmentBtn, padding: '10px 14px', fontSize: '12px' }}>
                🖼️ View Gallery
              </button>
            ) : null}

            <button onClick={() => onUploadBatch(poRef)} style={{ ...styles.rowAttachmentBtn, padding: '10px 14px', fontSize: '12px' }}>
              {row.po_attachment ? '🔄 Re-upload' : '📄 Scan Attachment'}
            </button>

            {userRole === 'admin' && (
              <button onClick={() => onEditRow(row)} style={{ ...styles.editBtn, padding: '10px 14px', fontSize: '12px' }}>
                ✏️ Edit Record
              </button>
            )}
          </div>

          <button onClick={onClose} style={{ background: '#1f2937', color: '#cbd5e1', border: '1px solid #374151', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN PO HISTORY TABLE WITH KPI, SEARCH BAR, & WRAPPED FILTERS
// ============================================================================
export const POHistoryTable = React.memo(({ poHistory, isSyncing, userRole, styles, onRefresh, onViewDocs, onUploadBatch, onEditRow }) => {
  const [selectedRow, setSelectedRow] = useState(null);
  const [galleryRow, setGalleryRow] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState(''); 

  const metrics = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let dueSoonOrOverdue = 0;
    let missingDocs = 0;

    poHistory.forEach((row) => {
      if (row.status === 'served') {
        completed += 1;
      } else {
        pending += 1;
        const due = getDueDateInfo(row.po_date, row.po_terms, row.status);
        if (due.isOverdue || due.label.includes('DUE SOON')) {
          dueSoonOrOverdue += 1;
        }
      }

      if (!row.po_attachment || !row.dr_attachment) {
        missingDocs += 1;
      }
    });

    return { total: poHistory.length, completed, pending, dueSoonOrOverdue, missingDocs };
  }, [poHistory]);

  const filteredHistory = useMemo(() => {
    return poHistory.filter((row) => {
      let matchesTab = true;
      if (activeFilter === 'pending') matchesTab = row.status !== 'served';
      else if (activeFilter === 'served') matchesTab = row.status === 'served';
      else if (activeFilter === 'attention') {
        const due = getDueDateInfo(row.po_date, row.po_terms, row.status);
        matchesTab = row.status !== 'served' && (due.isOverdue || due.label.includes('DUE SOON'));
      }
      else if (activeFilter === 'missing_docs') {
        matchesTab = !row.po_attachment || !row.dr_attachment;
      }

      if (!matchesTab) return false;
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      const poRef = (row.batch_reference || row.po_number || '').toLowerCase();
      const customer = (row.customer_name || row.customer_id || '').toLowerCase();

      return poRef.includes(query) || customer.includes(query);
    });
  }, [poHistory, activeFilter, searchQuery]);

  return (
    <div style={styles.tableSection}>
      <style>{`
        @media (max-width: 640px) {
          .po-desktop-table-wrapper { display: none !important; }
          .po-mobile-card-list { display: flex !important; }
          .po-metrics-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .po-filter-tabs-container { flex-wrap: wrap !important; }
        }
        @media (min-width: 641px) {
          .po-desktop-table-wrapper { display: block !important; }
          .po-mobile-card-list { display: none !important; }
          .po-filter-tabs-container { flex-wrap: nowrap !important; }
        }
      `}</style>

      <div style={styles.tableHeaderContainer}>
        <div>
          <h3 style={styles.tableTitle}>Registered Purchase Orders Ledger</h3>
          <p style={{ margin: '4px 0 0 12px', fontSize: '12px', color: '#64748b' }}>
            💡 Tap any PO record to view full contract details and perform attachments/edits.
          </p>
        </div>
        <button onClick={onRefresh} disabled={isSyncing} style={{ ...styles.refreshBtn, ...(isSyncing ? styles.refreshBtnDisabled : {}) }}>
          <span style={{ display: 'inline-block', transform: isSyncing ? 'rotate(360deg)' : 'none', transition: 'transform 1s linear infinite' }}>🔄</span> 
          {isSyncing ? 'Syncing...' : 'Sync Logs'}
        </button>
      </div>

      <div className="po-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#111827', border: '1px solid #1f2937', padding: '12px 16px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>TOTAL POs</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginTop: '4px' }}>{metrics.total}</div>
        </div>
        <div style={{ background: '#111827', border: '1px solid #1f2937', padding: '12px 16px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>PENDING DELIVERIES</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>{metrics.pending}</div>
        </div>
        <div style={{ background: '#111827', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '12px 16px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '700' }}>DUE SOON / OVERDUE</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fbbf24', marginTop: '4px' }}>{metrics.dueSoonOrOverdue}</div>
        </div>
        <div style={{ background: '#111827', border: '1px solid #1f2937', padding: '12px 16px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', color: '#00ff88', fontWeight: '700' }}>COMPLETED</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#00ff88', marginTop: '4px' }}>{metrics.completed}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by PO Number (e.g. PO-2026-001) or Customer Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 14px 10px 38px',
              color: '#0f172a',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        <div className="po-filter-tabs-container" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'all', label: `All (${metrics.total})` },
            { id: 'pending', label: `Pending (${metrics.pending})` },
            { id: 'attention', label: `⚠️ Needs Attention (${metrics.dueSoonOrOverdue})` },
            { id: 'served', label: `Completed (${metrics.completed})` },
            { id: 'missing_docs', label: `Missing Docs (${metrics.missingDocs})` }
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                style={{
                  background: isActive ? '#1e293b' : '#0f172a',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  border: `1px solid ${isActive ? '#38bdf8' : '#1e293b'}`,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="po-desktop-table-wrapper" style={{ ...styles.tableWrapper, overflowX: 'auto' }}>
        <table style={{ ...styles.table, width: '100%' }}>
          <thead>
            <tr>
              <th style={styles.th}>PO Number</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>PO Date</th>
              <th style={styles.th}>Terms & Schedule</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Status</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.emptyTd}>No purchase orders matched your search or filter criteria.</td>
              </tr>
            ) : (
              filteredHistory.map((row, idx) => {
                const uniqueKey = (row.batch_reference || row.po_number || row.id || `row-${idx}`).toString().trim().toLowerCase();
                const isHovered = hoveredIndex === idx;
                const due = getDueDateInfo(row.po_date, row.po_terms, row.status);

                return (
                  <tr 
                    key={uniqueKey} 
                    style={{ ...styles.tableRow, cursor: 'pointer', background: isHovered ? '#1e293b' : '#111827', transition: 'background 0.2s ease' }}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => setSelectedRow(row)}
                  >
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>
                      {row.batch_reference || row.po_number || 'N/A'}
                    </td>
                    <td style={styles.td}>
                      {row.customer_name || row.customer_id || 'N/A'}
                    </td>
                    <td style={styles.td}>
                      {row.po_date || 'N/A'}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '12px', color: '#e2e8f0' }}>{row.po_terms || 'COD'}</span>
                        <span style={{ fontSize: '10px', color: due.color, fontWeight: '700' }}>
                          {due.dueDateStr !== 'N/A' && due.dueDateStr !== 'Fulfilled' ? `Due: ${due.dueDateStr}` : ''}
                        </span>
                      </div>
                    </td>
                    <td style={styles.tdAmount}>
                      {formatPHP(row.amount)}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ ...styles.statusBadge, ...(row.status === 'served' ? styles.statusServed : styles.statusPending) }}>
                          {row.status}
                        </span>
                        {row.status !== 'served' && (
                          <span style={{ fontSize: '10px', fontWeight: '800', color: due.color, background: due.bg, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${due.borderColor}` }}>
                            {due.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: '600' }}>
                        View Details →
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="po-mobile-card-list" style={{ flexDirection: 'column', gap: '12px', width: '100%' }}>
        {filteredHistory.length === 0 ? (
          <div style={{ ...styles.emptyTd, background: '#111827', borderRadius: '8px', border: '1px solid #1f2937' }}>
            No purchase orders matched your search or filter criteria.
          </div>
        ) : (
          filteredHistory.map((row, idx) => {
            const uniqueKey = (row.batch_reference || row.po_number || row.id || `mob-${idx}`).toString().trim().toLowerCase();
            const due = getDueDateInfo(row.po_date, row.po_terms, row.status);

            return (
              <div
                key={uniqueKey}
                onClick={() => setSelectedRow(row)}
                style={{
                  background: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8', fontSize: '14px' }}>
                    {row.batch_reference || row.po_number || 'N/A'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ ...styles.statusBadge, ...(row.status === 'served' ? styles.statusServed : styles.statusPending), fontSize: '10px' }}>
                      {row.status}
                    </span>
                    {row.status !== 'served' && (
                      <span style={{ fontSize: '9px', fontWeight: '800', color: due.color, background: due.bg, padding: '2px 5px', borderRadius: '4px', border: `1px solid ${due.borderColor}` }}>
                        {due.label}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>
                  {row.customer_name || row.customer_id || 'N/A'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>📅 {row.po_date || 'N/A'}</span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>Terms: {row.po_terms || 'COD'}</span>
                  </div>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#00ff88', fontSize: '14px' }}>
                    {formatPHP(row.amount)}
                  </span>
                </div>

                <div style={{ textAlign: 'right', fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>
                  Tap for details →
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Production Details Modal */}
      {selectedRow && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <PODetailsModal 
            row={selectedRow}
            userRole={userRole}
            styles={styles}
            onClose={() => setSelectedRow(null)}
            onViewDocs={(r) => {
              setGalleryRow(r);
            }}
            onUploadBatch={(ref) => {
              onUploadBatch(ref);
            }}
            onEditRow={(r) => {
              onEditRow(r);
            }}
          />
        </div>
      )}

      {/* Stunning Gallery Grid Modal */}
      {galleryRow && (
        <DocumentGalleryModal 
          row={galleryRow}
          onClose={() => setGalleryRow(null)}
        />
      )}
    </div>
  );
});
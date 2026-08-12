// POModals.js
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FILE_BASE, ENDPOINTS, PO_TERMS, PO_STATUS } from './poReceivesConfig';
import { getFixedUrl } from './POFormComponents';

// ============================================================================
// DOCUMENT GALLERY / LIGHTBOX MODAL
// ============================================================================
export const DocumentGalleryModal = React.memo(({ row, onClose, onOpenLightbox }) => {
  if (!row) return null;

  const documents = [
    row.po_attachment ? { frameurl: getFixedUrl(`${FILE_BASE}${row.po_attachment}`), label: 'Purchase Order (PO)' } : null,
    row.dr_attachment ? { frameurl: getFixedUrl(`${FILE_BASE}${row.dr_attachment}`), label: 'Delivery Receipt (DR)' } : null,
    row.invoice_attachment ? { frameurl: getFixedUrl(`${FILE_BASE}${row.invoice_attachment}`), label: 'Sales Invoice (SI)' } : null
  ].filter(Boolean);

  const poRef = row.batch_reference || row.po_number || 'N/A';

  return (
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
                onClick={() => onOpenLightbox ? onOpenLightbox(documents, idx) : null}
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
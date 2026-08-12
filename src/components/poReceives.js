import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// ============================================================================
// CONSTANTS & ENDPOINTS (RESTORED TO ORIGINAL)
// ============================================================================
const API_BASE = process.env.REACT_APP_API_BASE || '';
const FILE_BASE = process.env.REACT_APP_FILE_BASE || 'http://localhost:5000/uploads/';

const ENDPOINTS = {
  clients: `${API_BASE}/api/po-receives/clients`,
  history: `${API_BASE}/api/po-receives/history`,
  records: `${API_BASE}/api/po-receives`,
  updateRecord: (ref) => `${API_BASE}/api/po-receives/${encodeURIComponent(ref)}`,
  checkStaging: (ref) => `${API_BASE}/api/po-receives/check-staging/${encodeURIComponent(ref)}`,
  serverInfo: `${API_BASE}/api/server-info`,
  mobileUploads2: (ref) => `/#/mobile-upload2/${encodeURIComponent(ref)}`,
  mobileUploadsBatch: (ref) => `/#/mobile-upload/${encodeURIComponent(ref)}`,
};

const PO_TERMS = [
  { value: 'COD', label: 'Cash On Delivery (COD)' },
  { value: 'NET7', label: 'Net 7 Days' },
  { value: 'NET15', label: 'Net 15 Days' },
  { value: 'NET30', label: 'Net 30 Days' },
  { value: 'NET60', label: 'Net 60 Days' },
];

const PO_STATUS = [
  { value: 'pending', label: 'Pending Verification' },
  { value: 'verified', label: 'Verified & Logged' },
  { value: 'fulfilled', label: 'Fulfilled / Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const SUCCESS_MESSAGE_DURATION = 4000;
const POLLING_INTERVAL = 3000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const getInitialFormData = () => ({
  batch_reference: '',
  customer_id: '',
  amount: '',
  po_date: new Date().toISOString().split('T')[0],
  po_terms: 'COD',
  status: 'pending',
  remarks: '',
});

const parseApiResponse = async (res) => {
  try {
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Invalid JSON response from server' };
  }
};

const enforceUniqueRecords = (records) => {
  const seen = new Set();
  return (records || []).filter((row) => {
    const key = (row.batch_reference || row.po_number || '').toString().trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ============================================================================
// STYLING SYSTEM (OPTIMIZED FOR UI & RESPONSIVENESS)
// ============================================================================
const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    minHeight: '100vh',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#00ff88',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
    fontSize: '14px',
  },
  alertError: {
    backgroundColor: '#450a0a',
    border: '1px solid #dc2626',
    color: '#fca5a5',
  },
  alertSuccess: {
    backgroundColor: '#022c22',
    border: '1px solid #059669',
    color: '#6ee7b7',
  },
  layoutGrid: {
    display: 'flex',
    gap: '20px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#f1f5f9',
    marginTop: 0,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    minWidth: '220px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  select: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
    width: '100%',
  },
  textarea: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    minHeight: '70px',
    resize: 'vertical',
    boxSizing: 'border-box',
    width: '100%',
  },
  submitBtn: {
    backgroundColor: '#00ff88',
    color: '#0f172a',
    fontWeight: '700',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 18px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '6px',
    width: '100%',
  },
  submitBtnDisabled: {
    backgroundColor: '#334155',
    color: '#64748b',
    cursor: 'not-allowed',
  },
  scannerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
    boxSizing: 'border-box',
  },
  qrCard: {
    padding: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '10px',
    border: '1px solid #334155',
    marginBottom: '14px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  badgeSuccess: {
    backgroundColor: '#022c22',
    color: '#00ff88',
    border: '1px solid #059669',
  },
  badgePending: {
    backgroundColor: '#451a03',
    color: '#fbbf24',
    border: '1px solid #d97706',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    position: 'relative',
    maxWidth: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px',
  },
  th: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    padding: '12px 14px',
    fontWeight: '600',
    borderBottom: '1px solid #334155',
    whiteSpace: 'nowrap',
  },
  stickyTh: {
    position: 'sticky',
    right: 0,
    backgroundColor: '#1e293b',
    zIndex: 10,
    boxShadow: '-6px 0 12px rgba(0, 0, 0, 0.4)',
  },
  td: {
    padding: '12px 14px',
    borderBottom: '1px solid #1e293b',
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
  },
  stickyTd: {
    position: 'sticky',
    right: 0,
    backgroundColor: '#0f172a',
    zIndex: 5,
    boxShadow: '-6px 0 12px rgba(0, 0, 0, 0.4)',
  },
  btnGroup: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  actionBtn: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.2s',
  },
  btnPrimary: { backgroundColor: '#3b82f6', color: '#fff' },
  btnSecondary: { backgroundColor: '#10b981', color: '#fff' },
  btnWarning: { backgroundColor: '#f59e0b', color: '#0f172a' },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    width: '100%',
    maxWidth: '500px',
    padding: '20px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    boxSizing: 'border-box',
  },
  editModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    width: '100%',
    maxWidth: '600px',
    padding: '20px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  largeModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    width: '95vw',
    maxWidth: '1200px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    boxSizing: 'border-box',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid #334155',
    paddingBottom: '12px',
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#00ff88',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    cursor: 'pointer',
  },
  documentViewerGrid: {
    display: 'flex',
    gap: '16px',
    flex: 1,
    minHeight: 0,
  },
  documentFrameContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155',
    overflow: 'hidden',
  },
  frameToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  frameContent: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  closeActionBtn: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  footerRefText: {
    color: '#94a3b8',
    fontSize: '13px',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  modalInstructions: {
    fontSize: '13px',
    color: '#cbd5e1',
    margin: '8px 0',
  },
  modalBadgeDisplay: {
    backgroundColor: '#0f172a',
    padding: '6px 12px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  modalQrWrapper: {
    padding: '16px',
    backgroundColor: '#111827',
    borderRadius: '10px',
    border: '1px solid #334155',
    marginBottom: '16px',
  },
  modalActionLink: {
    display: 'inline-block',
    marginTop: '12px',
    color: '#00ff88',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '13px',
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const DocumentFrame = React.memo(({
  docType, frameUrl, zoom, pan, styles,
  onZoomIn, onZoomOut, onZoomReset,
  onDragStart, onDragMove, onDragEnd
}) => {
  return (
    <div style={styles.documentFrameContainer} className="po-doc-frame">
      <div style={styles.frameToolbar}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>{docType}</span>
        {frameUrl && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={{ ...styles.actionBtn, backgroundColor: '#334155' }} onClick={onZoomOut}>–</button>
            <button style={{ ...styles.actionBtn, backgroundColor: '#334155' }} onClick={onZoomReset}>Reset</button>
            <button style={{ ...styles.actionBtn, backgroundColor: '#334155' }} onClick={onZoomIn}>+</button>
          </div>
        )}
      </div>
      <div 
        style={styles.frameContent}
        className="pan-canvas-grab"
        onMouseDown={(e) => onDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
        onMouseUp={onDragEnd}
        onTouchStart={(e) => e.touches[0] && onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => e.touches[0] && onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
      >
        {frameUrl ? (
          <img
            src={frameUrl}
            alt={docType}
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: zoom === 1 ? 'transform 0.2s ease' : 'none',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div style={{ color: '#64748b', fontSize: '13px' }}>No Document Attached</div>
        )}
      </div>
    </div>
  );
});

const POFormSection = React.memo(({ formData, clients, stagingStatus, loading, styles, onInputChange, onSubmit }) => {
  const isReady = stagingStatus.po_attachment && stagingStatus.dr_attachment;

  return (
    <div className="po-form-container" style={styles.card}>
      <h3 style={styles.sectionTitle}>📋 Create PO Entry</h3>
      <form onSubmit={onSubmit} style={styles.form}>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>PO Reference Batch #</label>
            <input
              type="text"
              name="batch_reference"
              value={formData.batch_reference}
              onChange={onInputChange}
              placeholder="e.g. PO-2026-889"
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Client / Customer</label>
            <select
              name="customer_id"
              value={formData.customer_id}
              onChange={onInputChange}
              style={styles.select}
              required
            >
              <option value="">-- Select Client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Total Amount (PHP)</label>
            <input
              type="number"
              step="0.01"
              name="amount"
              value={formData.amount}
              onChange={onInputChange}
              placeholder="0.00"
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>PO Date</label>
            <input
              type="date"
              name="po_date"
              value={formData.po_date}
              onChange={onInputChange}
              style={styles.input}
              required
            />
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Contract Terms</label>
            <select name="po_terms" value={formData.po_terms} onChange={onInputChange} style={styles.select}>
              {PO_TERMS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Initial Status</label>
            <select name="status" value={formData.status} onChange={onInputChange} style={styles.select}>
              {PO_STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Remarks / Order Details</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={onInputChange}
            placeholder="Enter additional remarks..."
            style={styles.textarea}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !isReady}
          style={{
            ...styles.submitBtn,
            ...(!isReady || loading ? styles.submitBtnDisabled : {}),
          }}
        >
          {loading ? 'SAVING RECORD...' : isReady ? 'SAVE PO ENTRY' : 'SCAN ATTACHMENTS TO UNLOCK'}
        </button>
      </form>
    </div>
  );
});

const POScannerSection = React.memo(({ mobileScannerUrl, stagingStatus, batchReference, styles }) => {
  return (
    <div className="po-qr-container" style={styles.card}>
      <div style={styles.scannerContainer}>
        <h3 style={styles.sectionTitle}>📱 Document Attachment Bridge</h3>
        {batchReference.trim() ? (
          <>
            <div style={styles.qrCard}>
              <QRCodeSVG
                value={mobileScannerUrl}
                size={140}
                bgColor="#0f172a"
                fgColor="#00ff88"
                level="M"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <span style={{ ...styles.badge, ...(stagingStatus.po_attachment ? styles.badgeSuccess : styles.badgePending) }}>
                PO: {stagingStatus.po_attachment ? '✓ Ready' : 'Pending'}
              </span>
              <span style={{ ...styles.badge, ...(stagingStatus.dr_attachment ? styles.badgeSuccess : styles.badgePending) }}>
                DR: {stagingStatus.dr_attachment ? '✓ Ready' : 'Pending'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
              Scan QR code with your mobile device to attach Delivery Receipt and Purchase Order photos.
            </p>
          </>
        ) : (
          <div style={{ color: '#64748b', fontSize: '13px', margin: 'auto 0' }}>
            Enter a PO Reference Batch Number above to activate mobile document scanning.
          </div>
        )}
      </div>
    </div>
  );
});

const POHistoryTable = React.memo(({
  poHistory, isSyncing, userRole, styles,
  onRefresh, onViewDocs, onUploadBatch, onEditRow
}) => {
  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ ...styles.sectionTitle, margin: 0 }}>📜 PO Log History ({poHistory.length})</h3>
        <button
          onClick={onRefresh}
          disabled={isSyncing}
          style={{ ...styles.actionBtn, backgroundColor: '#334155', color: '#f8fafc' }}
        >
          {isSyncing ? 'Syncing...' : '🔄 Refresh Logs'}
        </button>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>PO / Batch Reference</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Terms</th>
              <th style={styles.th}>Status</th>
              <th style={{ ...styles.th, ...styles.stickyTh }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {poHistory.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ ...styles.td, textAlign: 'center', color: '#64748b' }}>
                  No PO records logged yet.
                </td>
              </tr>
            ) : (
              poHistory.map((row, idx) => {
                const ref = row.batch_reference || row.po_number || `REF-${idx}`;
                return (
                  <tr key={ref} className="po-table-row">
                    <td style={{ ...styles.td, fontWeight: '600', color: '#00ff88' }}>{ref}</td>
                    <td style={styles.td}>{row.customer_name || row.customer_id || '-'}</td>
                    <td style={styles.td}>₱{parseFloat(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={styles.td}>{row.po_date || '-'}</td>
                    <td style={styles.td}>{row.po_terms || 'COD'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...styles.badgeSuccess }}>
                        {row.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, ...styles.stickyTd }} className="po-sticky-cell">
                      <div style={styles.btnGroup}>
                        <button
                          style={{ ...styles.actionBtn, ...styles.btnPrimary }}
                          onClick={() => onViewDocs(row)}
                          title="View Attached Documents"
                        >
                          👁️ View
                        </button>
                        <button
                          style={{ ...styles.actionBtn, ...styles.btnSecondary }}
                          onClick={() => onUploadBatch(ref)}
                          title="Mobile Scanner Bridge"
                        >
                          📱 Upload
                        </button>
                        {userRole === 'admin' && (
                          <button
                            style={{ ...styles.actionBtn, ...styles.btnWarning }}
                            onClick={() => onEditRow(row)}
                            title="Edit Record"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const DocumentViewerModal = React.memo(({ 
  viewDocsRow, styles, onClose, 
  drZoom, poZoom, drPan, poPan, 
  onDrZoomIn, onDrZoomOut, onDrZoomReset,
  onPoZoomIn, onPoZoomOut, onPoZoomReset,
  onDrDragStart, onDrDragMove, onDrDragEnd,
  onPoDragStart, onPoDragMove, onPoDragEnd
}) => {
  if (!viewDocsRow) return null;

  const drUrl = viewDocsRow.dr_attachment ? `${FILE_BASE}${viewDocsRow.dr_attachment}` : '';
  const poUrl = viewDocsRow.po_attachment ? `${FILE_BASE}${viewDocsRow.po_attachment}` : '';

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div className="po-large-modal-content" style={styles.largeModalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h4 style={styles.modalTitle}>ATTACHED DOCUMENTS ({viewDocsRow.customer_name || 'Account Logs'})</h4>
          <button style={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        
        <div className="po-docs-viewer-grid" style={styles.documentViewerGrid}>
          <DocumentFrame
            docType="DR (Delivery Receipt)"
            frameUrl={drUrl}
            zoom={drZoom}
            pan={drPan}
            styles={styles}
            onZoomIn={onDrZoomIn}
            onZoomOut={onDrZoomOut}
            onZoomReset={onDrZoomReset}
            onDragStart={onDrDragStart}
            onDragMove={onDrDragMove}
            onDragEnd={onDrDragEnd}
          />
          <DocumentFrame
            docType="PO (Purchase Order)"
            frameUrl={poUrl}
            zoom={poZoom}
            pan={poPan}
            styles={styles}
            onZoomIn={onPoZoomIn}
            onZoomOut={onPoZoomOut}
            onZoomReset={onPoZoomReset}
            onDragStart={onPoDragStart}
            onDragMove={onPoDragMove}
            onDragEnd={onPoDragEnd}
          />
        </div>
        
        <div style={styles.modalFooter}>
          <span style={styles.footerRefText}>PO Number: {viewDocsRow.batch_reference || viewDocsRow.po_number}</span>
          <button style={styles.closeActionBtn} onClick={onClose}>Dismiss Canvas View</button>
        </div>
      </div>
    </div>
  );
});

const UploadModal = React.memo(({ activeInspectionBatch, styles, onClose }) => {
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

const EditRecordModal = React.memo(({ editingRow, clients, styles, onClose, onSave }) => {
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
              style={{ ...styles.submitBtn, ...(isSaving ? styles.submitBtnDisabled : {}) }}
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

// ============================================================================
// MAIN ROOT COMPONENT
// ============================================================================

const POReceives = () => {
  const [userRole] = useState('admin');
  const [clients, setClients] = useState([]);
  const [poHistory, setPoHistory] = useState([]); 
  const [formData, setFormData] = useState(getInitialFormData());
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stagingStatus, setStagingStatus] = useState({ po_attachment: false, dr_attachment: false });
  const [activeInspectionBatch, setActiveInspectionBatch] = useState(null);
  const [viewDocsRow, setViewDocsRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);

  const isSubmittingRef = useRef(false);

  // Zoom and pan states for document viewers
  const [drZoom, setDrZoom] = useState(DEFAULT_ZOOM);
  const [poZoom, setPoZoom] = useState(DEFAULT_ZOOM);
  const [drPan, setDrPan] = useState({ x: 0, y: 0 });
  const [poPan, setPoPan] = useState({ x: 0, y: 0 });
  const [isDraggingDr, setIsDraggingDr] = useState(false);
  const [isDraggingPo, setIsDraggingPo] = useState(false);

  const dragStartDr = useRef({ x: 0, y: 0 });
  const dragStartPo = useRef({ x: 0, y: 0 });

  // ========== Notifications ==========
  const showNotice = useCallback((type, text) => {
    setMessage({ type, text });
    if (type === 'success') {
      setTimeout(() => setMessage({ type: '', text: '' }), SUCCESS_MESSAGE_DURATION);
    }
  }, []);

  // ========== API Calls ==========
  const fetchPoHistory = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(ENDPOINTS.history);
      const data = await parseApiResponse(res);
      if (res.ok) {
        setPoHistory(enforceUniqueRecords(data));
      } else {
        throw new Error(data.error || 'Failed to retrieve history logs');
      }
    } catch (err) {
      console.error("Failed to fetch PO history:", err);
      showNotice('error', err.message || 'Could not refresh logs. Server unreachable.');
    } finally {
      setIsSyncing(false);
    }
  }, [showNotice]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.clients);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load clients');
      setClients(data);
    } catch (err) {
      showNotice('error', `Error loading clients: ${err.message}`);
    }
  }, [showNotice]);

  const fetchServerInfo = useCallback(async () => {
    try {
      await fetch(ENDPOINTS.serverInfo);
    } catch (err) {
      console.error("Failed to fetch server info:", err);
    }
  }, []);

  const checkStagingStatus = useCallback(async () => {
    if (!formData.batch_reference.trim()) return;
    try {
      const res = await fetch(ENDPOINTS.checkStaging(formData.batch_reference.trim()));
      const data = await parseApiResponse(res);
      if (res.ok) {
        setStagingStatus({
          po_attachment: !!data.po_attachment,
          dr_attachment: !!data.dr_attachment
        });
      }
    } catch (err) {
      console.error("Failed to check staging status:", err);
    }
  }, [formData.batch_reference]);

  // ========== Lifecycle Effects ==========
  useEffect(() => {
    setStagingStatus({ po_attachment: false, dr_attachment: false });
    fetchClients();
    fetchServerInfo();
    fetchPoHistory();
  }, [fetchClients, fetchPoHistory, fetchServerInfo]);

  // Active polling to check staging status
  useEffect(() => {
    if (!formData.batch_reference.trim()) return;
    const interval = setInterval(checkStagingStatus, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [formData.batch_reference, checkStagingStatus]);

  // Global mouse release safety for pan/drag events
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingDr(false);
      setIsDraggingPo(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  // Reset zoom when modal closes
  useEffect(() => {
    if (!viewDocsRow) {
      setDrZoom(DEFAULT_ZOOM);
      setPoZoom(DEFAULT_ZOOM);
      setDrPan({ x: 0, y: 0 });
      setPoPan({ x: 0, y: 0 });
    }
  }, [viewDocsRow]);

  // ========== Input Handler ==========
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!stagingStatus.po_attachment || !stagingStatus.dr_attachment) {
      showNotice('error', 'Both PO and DR attachments must be scanned/staged before saving the record.');
      return;
    }

    if (loading || isSubmittingRef.current || !formData.batch_reference.trim()) return;

    isSubmittingRef.current = true;
    setLoading(true);
    setMessage({ type: '', text: '' });

    const cleanRef = formData.batch_reference.trim();
    const payload = {
      ...formData,
      batch_reference: cleanRef,
      amount: parseFloat(formData.amount) || 0,
    };

    try {
      const existingRow = poHistory.find(row => {
        const ref = (row.batch_reference || row.po_number || '').toString().trim().toLowerCase();
        return ref === cleanRef.toLowerCase();
      });

      let res, result;

      if (existingRow) {
        res = await fetch(ENDPOINTS.updateRecord(cleanRef), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(ENDPOINTS.records, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      result = await parseApiResponse(res);

      if (!res.ok || result.success === false) {
        throw new Error(result.error || 'Failed to save or update purchase order record');
      }

      showNotice('success', `PO successfully saved & updated: ${cleanRef}`);
      
      setPoHistory(prev => {
        const filtered = prev.filter(row => {
          const ref = (row.batch_reference || row.po_number || '').toString().trim().toLowerCase();
          return ref !== cleanRef.toLowerCase();
        });
        return enforceUniqueRecords([result.data || payload, ...filtered]);
      });

      setFormData(getInitialFormData());
      setStagingStatus({ po_attachment: false, dr_attachment: false });
      
      fetchPoHistory(); 

    } catch (err) {
      showNotice('error', err.message);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [formData, stagingStatus, loading, poHistory, showNotice, fetchPoHistory]);

  // ========== Update Record Handler ==========
  const handleUpdateRecord = useCallback(async (updatedData) => {
    const cleanRef = updatedData.batch_reference.trim();
    const selectedClient = clients.find(c => String(c.id) === String(updatedData.customer_id));
    const payload = {
      ...updatedData,
      amount: parseFloat(updatedData.amount) || 0,
      customer_name: selectedClient ? selectedClient.name : updatedData.customer_id
    };

    const res = await fetch(ENDPOINTS.updateRecord(cleanRef), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await parseApiResponse(res);

    if (!res.ok || result.success === false) {
      throw new Error(result.error || 'Failed to update record');
    }

    showNotice('success', `PO record successfully updated: ${cleanRef}`);

    setPoHistory(prev => prev.map(row => {
      const ref = (row.batch_reference || row.po_number || '').toString().trim().toLowerCase();
      if (ref === cleanRef.toLowerCase()) {
        return { ...row, ...payload, ...(result.data || {}) };
      }
      return row;
    }));

    fetchPoHistory();
  }, [clients, fetchPoHistory, showNotice]);

  // ========== Zoom Handlers ==========
  const adjustZoom = useCallback((setZoom, setPan, factor) => {
    setZoom(prev => {
      const next = Math.min(Math.max(prev + factor, DEFAULT_ZOOM), MAX_ZOOM);
      if (next === DEFAULT_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const adjustDrZoom = useCallback((factor) => adjustZoom(setDrZoom, setDrPan, factor), [adjustZoom]);
  const adjustPoZoom = useCallback((factor) => adjustZoom(setPoZoom, setPoPan, factor), [adjustZoom]);

  // ========== Pan Handlers ==========
  const startDrDrag = useCallback((clientX, clientY) => {
    if (drZoom <= DEFAULT_ZOOM) return;
    setIsDraggingDr(true);
    dragStartDr.current = { x: clientX - drPan.x, y: clientY - drPan.y };
  }, [drZoom, drPan]);

  const moveDrDrag = useCallback((clientX, clientY) => {
    if (!isDraggingDr) return;
    setDrPan({
      x: clientX - dragStartDr.current.x,
      y: clientY - dragStartDr.current.y
    });
  }, [isDraggingDr]);

  const startPoDrag = useCallback((clientX, clientY) => {
    if (poZoom <= DEFAULT_ZOOM) return;
    setIsDraggingPo(true);
    dragStartPo.current = { x: clientX - poPan.x, y: clientY - poPan.y };
  }, [poZoom, poPan]);

  const movePoDrag = useCallback((clientX, clientY) => {
    if (!isDraggingPo) return;
    setPoPan({
      x: clientX - dragStartPo.current.x,
      y: clientY - dragStartPo.current.y
    });
  }, [isDraggingPo]);

  const mobileScannerUrl = formData.batch_reference.trim() ? ENDPOINTS.mobileUploads2(formData.batch_reference.trim()) : '';

  return (
    <div style={styles.container}>
      <style dangerouslySetInnerHTML={{__html: `
        .po-master-grid { flex-direction: row; }
        .po-form-container { flex: 1 1 58%; min-width: 320px; }
        .po-qr-container { flex: 1 1 38%; min-width: 280px; }
        .pan-canvas-grab { cursor: grab; }
        .pan-canvas-grab:active { cursor: grabbing; }
        
        input:focus, select:focus, textarea:focus {
          border-color: #00ff88 !important;
          box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.15) !important;
        }
        
        /* Table Sticky Actions Cell Hover Fix */
        .po-table-row:hover td {
          background-color: #1e293b !important;
        }
        .po-table-row:hover .po-sticky-cell {
          background-color: #1e293b !important;
        }

        button:hover {
          opacity: 0.9;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .po-master-grid { flex-direction: column !important; }
          .po-form-container, .po-qr-container { flex: 1 1 100% !important; width: 100% !important; box-sizing: border-box !important; }
        }

        @media (max-width: 768px) {
          .po-docs-viewer-grid { flex-direction: column !important; overflow-y: auto !important; }
          .po-doc-frame { flex: 0 0 auto !important; height: 380px !important; margin-bottom: 12px; }
          .po-large-modal-content { max-height: 95vh !important; overflow-y: auto !important; }
        }
      `}} />

      <div style={styles.header}>
        <h2 style={styles.title}>Incoming Purchase Orders</h2>
        <p style={styles.subtitle}>Log corporate PO entries and attach scanned physical files synchronously via mobile or local device terminal.</p>
      </div>

      {message.text && (
        <div style={{ ...styles.alert, ...(message.type === 'error' ? styles.alertError : styles.alertSuccess) }}>
          <span style={{ marginRight: '8px' }}>{message.type === 'error' ? '❌' : '✅'}</span>
          {message.text}
        </div>
      )}

      <div className="po-master-grid" style={styles.layoutGrid}>
        <POFormSection 
          formData={formData}
          clients={clients}
          stagingStatus={stagingStatus}
          loading={loading}
          styles={styles}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
        />
        <POScannerSection
          mobileScannerUrl={mobileScannerUrl}
          stagingStatus={stagingStatus}
          batchReference={formData.batch_reference}
          styles={styles}
        />
      </div>

      <POHistoryTable
        poHistory={poHistory}
        isSyncing={isSyncing}
        userRole={userRole}
        styles={styles}
        onRefresh={fetchPoHistory}
        onViewDocs={setViewDocsRow}
        onUploadBatch={setActiveInspectionBatch}
        onEditRow={setEditingRow}
      />

      <UploadModal 
        activeInspectionBatch={activeInspectionBatch}
        styles={styles}
        onClose={() => setActiveInspectionBatch(null)}
      />

      <EditRecordModal
        editingRow={editingRow}
        clients={clients}
        styles={styles}
        onClose={() => setEditingRow(null)}
        onSave={handleUpdateRecord}
      />

      <DocumentViewerModal
        viewDocsRow={viewDocsRow}
        styles={styles}
        onClose={() => setViewDocsRow(null)}
        drZoom={drZoom}
        poZoom={poZoom}
        drPan={drPan}
        poPan={poPan}
        onDrZoomIn={() => adjustDrZoom(ZOOM_STEP)}
        onDrZoomOut={() => adjustDrZoom(-ZOOM_STEP)}
        onDrZoomReset={() => { setDrZoom(DEFAULT_ZOOM); setDrPan({ x: 0, y: 0 }); }}
        onPoZoomIn={() => adjustPoZoom(ZOOM_STEP)}
        onPoZoomOut={() => adjustPoZoom(-ZOOM_STEP)}
        onPoZoomReset={() => { setPoZoom(DEFAULT_ZOOM); setPoPan({ x: 0, y: 0 }); }}
        onDrDragStart={startDrDrag}
        onDrDragMove={moveDrDrag}
        onDrDragEnd={() => setIsDraggingDr(false)}
        onPoDragStart={startPoDrag}
        onPoDragMove={movePoDrag}
        onPoDragEnd={() => setIsDraggingPo(false)}
      />
    </div>
  );
};

export default POReceives;
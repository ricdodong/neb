import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// ============================================================================
// CONSTANTS
// ============================================================================
const API_BASE = 'https://dpsapi.ricalgen.eu.org';
const FILE_BASE = 'https://jadefile.ricalgen.eu.org';
const ENDPOINTS = {
  clients: `${API_BASE}/api/po-receives/clients`,
  history: `${API_BASE}/api/po-receives/history`,
  records: `${API_BASE}/api/po-receives`,
  checkStaging: (ref) => `${API_BASE}/api/po-receives/check-staging/${encodeURIComponent(ref)}`,
  serverInfo: `${API_BASE}/api/server-info`,
  mobileUploads2: (ref) => `/#/mobile-upload2/${encodeURIComponent(ref)}`,
  mobileUploadsBatch: (ref) => `/#/mobile-upload/${encodeURIComponent(ref)}`,
};

const POLLING_INTERVAL = 3000;
const SUCCESS_MESSAGE_DURATION = 6000;
const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

const PO_TERMS = [
  { value: 'COD', label: 'Cash on Delivery (COD)' },
  { value: 'Terms-15', label: 'Terms 15 Days' },
  { value: 'Terms-30', label: 'Terms 30 Days' },
  { value: 'Terms-60', label: 'Terms 60 Days' },
  { value: 'Dated-Check', label: 'Post-Dated Check' },
];

const PO_STATUS = [
  { value: 'pending', label: 'Pending Review / Unserved' },
  { value: 'served', label: 'Served / Stock Transferred' },
];

// ============================================================================
// STYLES - REFINE HIGH-CONTRAST DESIGN SYSTEM
// ============================================================================
const styles = {
  container: { padding:'24px', background:'#0a0b0d', color:'#f8fafc', minHeight:'100vh', fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', boxSizing:'border-box' },
  header: { marginBottom:'32px', borderBottom:'1px solid #1e293b', paddingBottom:'20px' },
  title: { fontSize:'24px', fontWeight:'800', letterSpacing:'-0.02em', color:'#fff', margin:'0 0 8px 0', textTransform:'uppercase' },
  subtitle: { fontSize:'14px', color:'#94a3b8', margin:0, lineHeight:'1.5' },
  layoutGrid: { display:'flex', gap:'24px', alignItems:'start', width:'100%' },
  card: { background:'#111827', border:'1px solid #1f2937', borderRadius:'12px', padding:'24px', boxSizing:'border-box', boxShadow:'0 10px 15px -3px rgba(0,0,0,.3)', width:'100%' },
  scannerCard: { border:'1px solid #374151', background:'#13151a', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' },
  cardTitle: { fontSize:'14px', fontWeight:'700', color:'#00ff88', margin:'0 0 24px 0', alignSelf:'flex-start', textTransform:'uppercase', letterSpacing:'0.05em', borderLeft:'3px solid #00ff88', paddingLeft:'10px' },
  form: { display:'flex', flexDirection:'column', gap:'20px' },
  formRow: { display:'flex', gap:'20px', flexWrap:'wrap', width:'100%' },
  formGroup: { display:'flex', flexDirection:'column', gap:'8px', flex:'1 1', minWidth:0 },
  label: { fontSize:'12px', fontWeight:'600', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.03em' },
  input: { background:'#1f2937', border:'1px solid #374151', borderRadius:'6px', padding:'12px 14px', color:'#fff', fontSize:'14px', width:'100%', boxSizing:'border-box' },
  inputError: { borderColor:'#ef4444', background:'rgba(239, 68, 68, 0.05)' },
  select: { background:'#1f2937', border:'1px solid #374151', borderRadius:'6px', padding:'12px 14px', color:'#fff', fontSize:'14px', width:'100%', boxSizing:'border-box', cursor:'pointer' },
  submitBtn: { background:'#00ff88', color:'#0b0f19', border:'none', borderRadius:'6px', padding:'16px 20px', fontSize:'14px', fontWeight:'700', cursor:'pointer', width:'100%' },
  submitBtnLoading: { background:'#1e293b', color:'#64748b', cursor:'not-allowed' },
  redirectBtn: { display:'block', background:'rgba(0,255,136,.05)', color:'#00ff88', border:'1px solid #00ff88', borderRadius:'6px', padding:'14px 20px', textDecoration:'none', textAlign:'center', width:'100%' },
  redirectBtnDisabled: { borderColor:'#1e293b', color:'#475569', background:'transparent', cursor:'not-allowed' },
  scannerInstructions: { fontSize:'13px', color:'#94a3b8', lineHeight:'1.6', margin:'0 0 24px 0' },
  qrContainer: { background:'#090d16', padding:'16px', borderRadius:'12px', border:'1px solid #1f2937', marginBottom:'24px', display:'inline-flex', alignItems:'center', justifyContent:'center', minHeight:'172px' },
  syncText: { width:140, height:140, display:'flex', alignItems:'center', justifyContent:'center', color:'#475569', fontSize:'13px' },
  batchBadge: { background:'#0f172a', border:'1px solid #1e293b', padding:'14px', borderRadius:'6px', width:'100%', textAlign:'left', boxSizing:'border-box' },
  badgeLabel: { display:'block', fontSize:'10px', color:'#64748b', fontWeight:'700' },
  badgeCode: { color:'#38bdf8', fontFamily:'monospace', fontSize:'13px', fontWeight:'600', wordBreak:'break-all' },
  tableSection: { marginTop:'32px', background:'#111827', border:'1px solid #1f2937', borderRadius:'12px', padding:'24px', boxSizing:'border-box' },
  tableHeaderContainer: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' },
  tableTitle: { fontSize:'14px', fontWeight:'700', color:'#fff', textTransform:'uppercase', borderLeft:'3px solid #38bdf8', paddingLeft:'10px' },
  refreshBtn: { background:'#1f2937', border:'1px solid #374151', color:'#cbd5e1', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'8px', transition:'background 0.2s' },
  refreshBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  tableWrapper: { width:'100%', overflowX:'auto', border:'1px solid #1f2937', borderRadius:'8px' },
  table: { width:'100%', borderCollapse:'collapse', textAlign:'left', minWidth:'850px' },
  th: { padding:'16px', borderBottom:'2px solid #1f2937', color:'#94a3b8', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', background:'#0f172a' },
  tableRow: { borderBottom:'1px solid #1f2937', background:'#111827' },
  td: { padding:'16px', fontSize:'14px', color:'#e2e8f0' },
  tdAmount: { padding:'16px', fontSize:'14px', color:'#fff', fontWeight:'600', fontFamily:'monospace' },
  tdRight: { padding:'16px', textAlign:'right' },
  emptyTd: { padding:'48px', textAlign:'center', color:'#64748b', fontStyle:'italic' },
  termsBadge: { background:'#1f2937', padding:'4px 8px', borderRadius:'4px', border:'1px solid #374151' },
  statusBadge: { padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase' },
  statusPending: { background:'rgba(245,158,11,.1)', color:'#fbbf24', border:'1px solid rgba(245,158,11,.2)' },
  statusServed: { background:'rgba(16,185,129,.1)', color:'#34d399', border:'1px solid rgba(16,185,129,.2)' },
  modalOverlay: { position:'fixed', inset:0, background:'rgba(3,7,18,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px', boxSizing:'border-box' },
  modalContent: { background:'#111827', border:'1px solid #1f2937', borderRadius:'16px', width:'100%', maxWidth:'420px', padding:'32px', boxSizing:'border-box' },
  modalHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #1f2937', paddingBottom:'16px', marginBottom:'24px' },
  modalTitle: { fontSize:'14px', fontWeight:'800', color:'#00ff88', textTransform:'uppercase' },
  modalCloseBtn: { background:'transparent', border:'none', color:'#94a3b8', fontSize:'22px', cursor:'pointer' },
  modalBody: { display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' },
  modalInstructions: { fontSize:'13px', color:'#94a3b8', lineHeight:'1.6' },
  alert: { padding:'14px 18px', borderRadius:'8px', fontSize:'14px', fontWeight:'600', display:'flex', alignItems:'center', marginBottom: '20px', boxSizing:'border-box' },
  alertError: { background:'rgba(220,38,38,.1)', color:'#fca5a5', border:'1px solid rgba(220,38,38,.2)' },
  alertSuccess: { background:'rgba(16,185,129,.1)', color:'#a7f3d0', border:'1px solid rgba(16,185,129,.2)' },
  closeActionBtn: { background:'#1f2937', color:'#fff', border:'1px solid #374151', padding:'10px 20px', borderRadius:'6px', cursor:'pointer' },
  stagingRow: { display:'flex', width:'100%', gap:'10px', marginTop:'12px', justifyContent:'space-between' },
  stagedIndicator: { flex:1, padding:'10px', borderRadius:'6px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', border:'1px solid #222', background:'#14161d', textAlign:'center' },
  largeModalContent: { background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', width: '100%', maxWidth: '1100px', height: '85vh', display: 'flex', flexDirection: 'column', boxSizing:'border-box' },
  documentViewerGrid: { display: 'flex', gap: '16px', padding: '16px', flex: 1, minHeight: 0, boxSizing:'border-box' },
  documentFrame: { background: '#090d16', border: '1px solid #1f2937', borderRadius: '8px', display: 'flex', flexDirection: 'column', flex: '1 1 50%', minHeight: 0, boxSizing:'border-box' },
  docFrameHeader: { background: '#0f172a', padding: '10px 16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px 8px 0 0', boxSizing:'border-box' },
  docFrameTitle: { fontSize: '12px', color: '#94a3b8', fontWeight: '700', margin: 0 },
  zoomControls: { display: 'flex', alignItems: 'center', gap: '6px' },
  zoomBtn: { background: '#1f2937', border: '1px solid #374151', color: '#cbd5e1', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  zoomIndicator: { fontSize: '11px', color: '#64748b', width: '42px', textAlign: 'center', fontFamily: 'monospace' },
  imageCanvas: { flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'default' },
  embeddedDocImg: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transition: 'transform 0.1s ease-out', userSelect: 'none' },
  imgFallbackText: { color: '#475569', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' },
  modalFooter: { background: '#0f172a', padding: '16px', borderTop: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 16px 16px', boxSizing:'border-box' },
  footerRefText: { fontSize: '12px', color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all' },
  modalActionLink: { display: 'block', width: '100%', background: '#00ff88', color: '#0b0f19', textAlign: 'center', textDecoration: 'none', fontSize: '13px', fontWeight: '700', padding: '12px', borderRadius: '6px', textTransform: 'uppercase', marginTop: '16px', boxSizing: 'border-box' },
  modalBadgeDisplay: { background: '#0f172a', padding: '10px', border: '1px solid #1f2937', borderRadius: '6px', width: '100%', boxSizing: 'border-box', textAlign: 'center', marginTop: '8px', wordBreak: 'break-all', fontFamily: 'monospace', color: '#38bdf8' },
  modalQrWrapper: { background: '#090d16', padding: '16px', border: '1px solid #1f2937', borderRadius: '12px', margin: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  viewAttachmentBtn: { background: '#1e3a8a', color: '#60a5fa', border: '1px solid #2563eb', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  rowAttachmentBtn: { background: 'transparent', border: '1px solid #0284c7', color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  mutedText: { color: '#4b5563', fontSize: '14px' },
  errorHint: { color: '#ef4444', fontSize: '11px', fontWeight: '700', marginTop: '4px' },
  successHint: { color: '#00ff88', fontSize: '11px', fontWeight: '700', marginTop: '4px' }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatPHP = (val) => {
  const numericVal = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(numericVal || 0);
};

const getInitialFormData = () => ({
  batch_reference: '',
  customer_id: '',
  amount: '',
  po_date: new Date().toISOString().split('T')[0],
  po_terms: 'COD',
  status: 'pending'
});

// Strict unique deduplication mapped strictly by lowercase batch_reference key
const enforceUniqueRecords = (items) => {
  if (!Array.isArray(items)) return [];
  const map = new Map();
  items.forEach((item, index) => {
    const rawRef = item.batch_reference || item.po_number || item.id || `row-${index}`;
    const key = rawRef.toString().trim().toLowerCase();
    if (key && !map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const POFormSection = React.memo(({ formData, clients, isDuplicate, loading, styles, onInputChange, onSubmit }) => (
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
          style={{ 
            ...styles.input, 
            ...(isDuplicate ? styles.inputError : {}) 
          }} 
          required 
        />
        {isDuplicate && (
          <span style={styles.errorHint}>⚠️ DUPLICATE PO NUMBER DETECTED IN RECORDS</span>
        )}
        {!isDuplicate && formData.batch_reference.trim() !== '' && (
          <span style={styles.successHint}>✓ PO NUMBER IS AVAILABLE</span>
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

      <button 
        type="submit" 
        style={{ ...styles.submitBtn, ...(loading || isDuplicate || !formData.batch_reference.trim() ? styles.submitBtnLoading : {}) }}
        disabled={loading || isDuplicate || !formData.batch_reference.trim()}
      >
        {loading ? 'COMMITTING TRANSACTION...' : 'SAVE PURCHASE ORDER RECORD'}
      </button>
    </form>
  </div>
));

const POScannerSection = React.memo(({ mobileScannerUrl, stagingStatus, batchReference, styles }) => (
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

const POHistoryTable = React.memo(({ poHistory, isSyncing, styles, onRefresh, onViewDocs, onUploadBatch }) => (
  <div style={styles.tableSection}>
    <div style={styles.tableHeaderContainer}>
      <h3 style={styles.tableTitle}>Registered Purchase Orders Ledger</h3>
      <button 
        onClick={onRefresh} 
        disabled={isSyncing}
        style={{ 
          ...styles.refreshBtn, 
          ...(isSyncing ? styles.refreshBtnDisabled : {}) 
        }}
      >
        <span style={{ 
          display: 'inline-block', 
          transform: isSyncing ? 'rotate(360deg)' : 'none', 
          transition: 'transform 1s linear infinite' 
        }}>
          🔄
        </span> 
        {isSyncing ? 'Syncing...' : 'Sync Logs'}
      </button>
    </div>
    
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>PO Number</th>
            <th style={styles.th}>Customer</th>
            <th style={styles.th}>PO Date</th>
            <th style={styles.th}>Terms</th>
            <th style={styles.th}>Amount</th>
            <th style={styles.th}>PO Status</th>
            <th style={styles.th}>Attached Files</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Action Controller</th>
          </tr>
        </thead>
        <tbody>
          {poHistory.length === 0 ? (
            <tr>
              <td colSpan="8" style={styles.emptyTd}>No recorded purchase order transactions saved in this session cluster logs.</td>
            </tr>
          ) : (
            poHistory.map((row, idx) => {
              const uniqueKey = (row.batch_reference || row.po_number || row.id || `row-${idx}`).toString().trim().toLowerCase();
              return (
                <tr key={uniqueKey} style={styles.tableRow}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>{row.batch_reference || row.po_number || 'N/A'}</td>
                  <td style={styles.td}>{row.customer_name || row.customer_id || 'N/A'}</td>
                  <td style={styles.td}>{row.po_date}</td>
                  <td style={styles.td}><span style={styles.termsBadge}>{row.po_terms}</span></td>
                  <td style={styles.tdAmount}>{formatPHP(row.amount)}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...(row.status === 'served' ? styles.statusServed : styles.statusPending) }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {row.po_attachment || row.dr_attachment ? (
                      <button type="button" onClick={() => onViewDocs(row)} style={styles.viewAttachmentBtn}>👁️ View Docs</button>
                    ) : (
                      <span style={styles.mutedText}>—</span>
                    )}
                  </td>
                  <td style={styles.tdRight}>
                    <button onClick={() => onUploadBatch(row.batch_reference || row.po_number)} style={styles.rowAttachmentBtn}>
                      {row.po_attachment ? '🔄 Re-upload' : '📄 Scan / Upload'}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
));

const DocumentFrame = React.memo(({
  docType,
  frameUrl,
  zoom,
  pan,
  styles,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onDragStart,
  onDragMove,
  onDragEnd
}) => (
  <div className="po-doc-frame" style={styles.documentFrame}>
    <div style={styles.docFrameHeader}>
      <h5 style={styles.docFrameTitle}>{docType} ATTACHMENT</h5>
      {frameUrl && (
        <div style={styles.zoomControls}>
          <button style={styles.zoomBtn} onClick={onZoomOut}>—</button>
          <span style={styles.zoomIndicator}>{Math.round(zoom * 100)}%</span>
          <button style={styles.zoomBtn} onClick={onZoomIn}>+</button>
          <button style={styles.zoomBtn} onClick={onZoomReset}>↺</button>
        </div>
      )}
    </div>
    <div 
      className={zoom > 1 ? "pan-canvas-grab" : ""}
      style={styles.imageCanvas}
      onMouseDown={(e) => onDragStart(e.clientX, e.clientY)}
      onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
      onTouchStart={(e) => e.touches.length === 1 && onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => e.touches.length === 1 && onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={onDragEnd}
    >
      {frameUrl ? (
        <img 
          src={frameUrl} 
          alt={`${docType} Frame`}
          draggable="false"
          style={{ 
            ...styles.embeddedDocImg, 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` 
          }}
          onError={(e) => { e.target.style.display = 'none'; if(e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }}
        />
      ) : null}
      <div style={{...styles.imgFallbackText, display: frameUrl ? 'none' : 'block'}}>
        ⚠️ No Digital {docType} File Parsed
      </div>
    </div>
  </div>
));

const DocumentViewerModal = React.memo(({ 
  viewDocsRow, 
  styles, 
  onClose, 
  drZoom, 
  poZoom, 
  drPan, 
  poPan, 
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const POReceives = () => {
  const [clients, setClients] = useState([]);
  const [poHistory, setPoHistory] = useState([]); 
  const [formData, setFormData] = useState(getInitialFormData());
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stagingStatus, setStagingStatus] = useState({ po_attachment: false, dr_attachment: false });
  const [activeInspectionBatch, setActiveInspectionBatch] = useState(null);
  const [viewDocsRow, setViewDocsRow] = useState(null);

  // Instant Ref Lock to prevent rapid fire multi-submissions before state processes
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
      if (res.ok) {
        const data = await res.json();
        setPoHistory(enforceUniqueRecords(data));
      } else {
        throw new Error('Failed to retrieve history logs');
      }
    } catch (err) {
      console.error("Failed to fetch PO history:", err);
      showNotice('error', 'Could not refresh logs. Server unreachable.');
    } finally {
      setIsSyncing(false);
    }
  }, [showNotice]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.clients);
      if (!res.ok) throw new Error('Failed to load clients');
      const data = await res.json();
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
      if (res.ok) {
        const data = await res.json();
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

  // Reset zoom when modal closes
  useEffect(() => {
    if (!viewDocsRow) {
      setDrZoom(DEFAULT_ZOOM);
      setPoZoom(DEFAULT_ZOOM);
      setDrPan({ x: 0, y: 0 });
      setPoPan({ x: 0, y: 0 });
    }
  }, [viewDocsRow]);

  // ========== Duplicate Check & Input Handler ==========
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'batch_reference') {
        const query = value.trim().toLowerCase();
        if (query === '') {
          setIsDuplicate(false);
        } else {
          const exists = poHistory.some(row => {
            const ref = (row.batch_reference || row.po_number || '').toString().trim().toLowerCase();
            return ref === query;
          });
          setIsDuplicate(exists);
        }
      }
      
      return updated;
    });
  }, [poHistory]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Strict block guard using both State and immediate Ref lock
    if (isDuplicate || loading || isSubmittingRef.current || !formData.batch_reference.trim()) return;

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
      const res = await fetch(ENDPOINTS.records, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok || result.success === false) {
        throw new Error(result.error || 'Failed to save purchase order');
      }

      showNotice('success', `PO successfully saved: ${cleanRef}`);
      
      // Instantly push and deduplicate records on client state list
      setPoHistory(prev => enforceUniqueRecords([result.data || payload, ...prev]));

      setFormData(getInitialFormData());
      setIsDuplicate(false);
      setStagingStatus({ po_attachment: false, dr_attachment: false });
      
      fetchPoHistory(); 

    } catch (err) {
      showNotice('error', err.message);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [formData, isDuplicate, loading, showNotice, fetchPoHistory]);

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
        .po-form-container { flex: 0 0 62%; }
        .po-qr-container { flex: 0 0 38%; }
        .pan-canvas-grab { cursor: grab; }
        .pan-canvas-grab:active { cursor: grabbing; }
        
        input:focus, select:focus {
          border-color: #00ff88 !important;
          box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.15) !important;
        }
        tr:hover {
          background: #1f2937 !important;
        }
        button:hover {
          opacity: 0.9;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 992px) {
          .po-master-grid { flex-direction: column !important; }
          .po-form-container, .po-qr-container { flex: 1 1 100% !important; width: 100% !important; box-sizing: border-box !important; }
          .po-docs-viewer-grid { flex-direction: column !important; overflow-y: auto !important; }
          .po-doc-frame { flex: 0 0 auto !important; height: 500px !important; margin-bottom: 15px; }
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
          isDuplicate={isDuplicate}
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
        styles={styles}
        onRefresh={fetchPoHistory}
        onViewDocs={setViewDocsRow}
        onUploadBatch={setActiveInspectionBatch}
      />

      <UploadModal 
        activeInspectionBatch={activeInspectionBatch}
        styles={styles}
        onClose={() => setActiveInspectionBatch(null)}
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
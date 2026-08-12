import React from 'react';

// ============================================================================
// CONSTANTS & ENDPOINTS
// ============================================================================
export const API_BASE = 'https://dpsapi.ricalgen.eu.org';
export const FILE_BASE = 'https://jadefile.ricalgen.eu.org';

export const ENDPOINTS = {
  clients: `${API_BASE}/api/po-receives/clients`,
  history: `${API_BASE}/api/po-receives/history`,
  records: `${API_BASE}/api/po-receives`,
  updateRecord: (ref) => `${API_BASE}/api/po-receives/${encodeURIComponent(ref)}`,
  checkStaging: (ref) => `${API_BASE}/api/po-receives/check-staging/${encodeURIComponent(ref)}`,
  serverInfo: `${API_BASE}/api/server-info`,
  mobileUploads2: (ref) => `/#/mobile-upload2/${encodeURIComponent(ref)}`,
  mobileUploadsBatch: (ref) => `/#/mobile-upload/${encodeURIComponent(ref)}`,
};

export const POLLING_INTERVAL = 3000;
export const SUCCESS_MESSAGE_DURATION = 6000;
export const DEFAULT_ZOOM = 1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 0.25;

export const PO_TERMS = [
  { value: 'COD', label: 'Cash on Delivery (COD)' },
  { value: 'Terms-15', label: 'Terms 15 Days' },
  { value: 'Terms-30', label: 'Terms 30 Days' },
  { value: 'Terms-60', label: 'Terms 60 Days' },
  { value: 'Dated-Check', label: 'Post-Dated Check' },
];

export const PO_STATUS = [
  { value: 'pending', label: 'Pending Review / Unserved' },
  { value: 'served', label: 'Served / Stock Transferred' },
];

// ============================================================================
// STYLES
// ============================================================================
export const styles = {
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
  textarea: { background:'#1f2937', border:'1px solid #374151', borderRadius:'6px', padding:'12px 14px', color:'#fff', fontSize:'14px', width:'100%', boxSizing:'border-box', minHeight:'80px', resize:'vertical' },
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
  
  tableWrapper: { 
    width:'100%', 
    overflowX:'auto', 
    border:'1px solid #1f2937', 
    borderRadius:'8px', 
    position: 'relative'
  },
  table: { width:'100%', borderCollapse:'collapse', textAlign:'left', minWidth:'1000px' },
  th: { padding:'16px', borderBottom:'2px solid #1f2937', color:'#94a3b8', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', background:'#0f172a' },
  
  thAction: { 
    padding: '16px', 
    borderBottom: '2px solid #1f2937', 
    color: '#94a3b8', 
    fontSize: '11px', 
    fontWeight: '700', 
    textTransform: 'uppercase', 
    background: '#0f172a',
    position: 'sticky',
    right: 0,
    zIndex: 2,
    textAlign: 'right',
    boxShadow: '-6px 0 12px rgba(0,0,0,0.4)'
  },
  
  tableRow: { 
    borderBottom:'1px solid #1f2937', 
    background:'#111827',
    position: 'relative'
  },
  
  td: { padding:'16px', fontSize:'14px', color:'#e2e8f0', whiteSpace: 'nowrap' },
  tdAmount: { padding:'16px', fontSize:'14px', color:'#fff', fontWeight:'600', fontFamily:'monospace', whiteSpace: 'nowrap' },
  tdRight: { padding:'16px', textAlign:'right' },
  
  tdRightSticky: { 
    padding: '16px', 
    textAlign: 'right',
    position: 'sticky',
    right: 0,
    background: '#111827',
    zIndex: 1,
    boxShadow: '-6px 0 12px rgba(0,0,0,0.4)'
  },
  
  actionButtonGroup: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'nowrap'
  },

  emptyTd: { padding:'48px', textAlign:'center', color:'#64748b', fontStyle:'italic' },
  termsBadge: { background:'#1f2937', padding:'4px 8px', borderRadius:'4px', border:'1px solid #374151' },
  statusBadge: { padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase' },
  statusPending: { background:'rgba(245,158,11,.1)', color:'#fbbf24', border:'1px solid rgba(245,158,11,.2)' },
  statusServed: { background:'rgba(16,185,129,.1)', color:'#34d399', border:'1px solid rgba(16,185,129,.2)' },
  modalOverlay: { position:'fixed', inset:0, background:'rgba(3,7,18,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px', boxSizing:'border-box' },
  modalContent: { background:'#111827', border:'1px solid #1f2937', borderRadius:'16px', width:'100%', maxWidth:'420px', padding:'32px', boxSizing:'border-box' },
  editModalContent: { background:'#111827', border:'1px solid #1f2937', borderRadius:'16px', width:'100%', maxWidth:'600px', padding:'32px', boxSizing:'border-box', maxHeight:'90vh', overflowY:'auto' },
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
  rowAttachmentBtn: { background: 'transparent', border: '1px solid #0284c7', color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  editBtn: { background: 'rgba(234,179,8,.1)', border: '1px solid rgba(234,179,8,.3)', color: '#facc15', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  mutedText: { color: '#4b5563', fontSize: '14px' },
  successHint: { color: '#00ff88', fontSize: '11px', fontWeight: '700', marginTop: '4px' }
};

// ============================================================================
// UTILITIES
// ============================================================================
export const formatPHP = (val) => {
  const numericVal = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(numericVal || 0);
};

export const getInitialFormData = () => ({
  batch_reference: '',
  customer_id: '',
  amount: '',
  po_date: new Date().toISOString().split('T')[0],
  po_terms: 'COD',
  status: 'pending',
  remarks: ''
});

export const enforceUniqueRecords = (items) => {
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

export const parseApiResponse = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(text || `Server returned invalid response (Status: ${res.status})`);
  }
};
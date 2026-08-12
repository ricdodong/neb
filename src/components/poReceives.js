import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  styles, 
  ENDPOINTS, 
  POLLING_INTERVAL, 
  SUCCESS_MESSAGE_DURATION, 
  DEFAULT_ZOOM, 
  MAX_ZOOM, 
  ZOOM_STEP, 
  getInitialFormData, 
  enforceUniqueRecords, 
  parseApiResponse 
} from './poReceivesConfig';
import { POFormSection, POScannerSection, POHistoryTable } from './POFormComponents';
import { DocumentViewerModal, UploadModal, EditRecordModal } from './POModals';

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

  useEffect(() => {
    if (!formData.batch_reference.trim()) return;
    const interval = setInterval(checkStagingStatus, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [formData.batch_reference, checkStagingStatus]);

  useEffect(() => {
    if (!viewDocsRow) {
      setDrZoom(DEFAULT_ZOOM);
      setPoZoom(DEFAULT_ZOOM);
      setDrPan({ x: 0, y: 0 });
      setPoPan({ x: 0, y: 0 });
    }
  }, [viewDocsRow]);

  // ========== Handlers ==========
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

  // ========== Zoom & Pan Handlers ==========
  const adjustZoom = useCallback((setZoom, setPan, factor) => {
    setZoom(prev => {
      const next = Math.min(Math.max(prev + factor, DEFAULT_ZOOM), MAX_ZOOM);
      if (next === DEFAULT_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const adjustDrZoom = useCallback((factor) => adjustZoom(setDrZoom, setDrPan, factor), [adjustZoom]);
  const adjustPoZoom = useCallback((factor) => adjustZoom(setPoZoom, setPoPan, factor), [adjustZoom]);

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
        
        input:focus, select:focus, textarea:focus {
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
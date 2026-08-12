import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FILE_BASE, ENDPOINTS, PO_TERMS, PO_STATUS } from './poReceivesConfig';

export const DocumentFrame = React.memo(({
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

export const DocumentViewerModal = React.memo(({ 
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
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PO_TERMS, PO_STATUS, formatPHP } from './poReceivesConfig';

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
// 3. PO HISTORY TABLE SECTION (WITH HOVER SLIDE FIX)
// ============================================================================
export const POHistoryTable = React.memo(({ poHistory, isSyncing, userRole, styles, onRefresh, onViewDocs, onUploadBatch, onEditRow }) => {
  const [hoveredRowKey, setHoveredRowKey] = useState(null);

  return (
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
      
      <div style={{ ...styles.tableWrapper, overflowX: 'auto', position: 'relative' }}>
        <table style={{ ...styles.table, tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '140px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '180px' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={styles.th}>PO Number</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>PO Date</th>
              <th style={styles.th}>Terms</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>PO Status</th>
              <th style={styles.th}>Notes / Remarks</th>
              <th style={styles.th}>Attached Files</th>
              <th style={styles.thAction}>Action Controller</th>
            </tr>
          </thead>
          <tbody>
            {poHistory.length === 0 ? (
              <tr>
                <td colSpan="9" style={styles.emptyTd}>No recorded purchase order transactions saved in this session cluster logs.</td>
              </tr>
            ) : (
              poHistory.map((row, idx) => {
                const uniqueKey = (row.batch_reference || row.po_number || row.id || `row-${idx}`).toString().trim().toLowerCase();
                const isHovered = hoveredRowKey === uniqueKey;

                // Shift row left smoothly on hover so the sticky action controller reveals hidden items
                const slideStyle = {
                  transform: isHovered ? 'translateX(-220px)' : 'translateX(0)',
                  transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  willChange: 'transform'
                };

                return (
                  <tr 
                    key={uniqueKey} 
                    style={styles.tableRow}
                    onMouseEnter={() => setHoveredRowKey(uniqueKey)}
                    onMouseLeave={() => setHoveredRowKey(null)}
                  >
                    <td style={{ ...styles.td, ...slideStyle, fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>
                      {row.batch_reference || row.po_number || 'N/A'}
                    </td>
                    <td style={{ ...styles.td, ...slideStyle }}>
                      {row.customer_name || row.customer_id || 'N/A'}
                    </td>
                    <td style={{ ...styles.td, ...slideStyle }}>
                      {row.po_date}
                    </td>
                    <td style={{ ...styles.td, ...slideStyle }}>
                      <span style={styles.termsBadge}>{row.po_terms}</span>
                    </td>
                    <td style={{ ...styles.tdAmount, ...slideStyle }}>
                      {formatPHP(row.amount)}
                    </td>
                    <td style={{ ...styles.td, ...slideStyle }}>
                      <span style={{ ...styles.statusBadge, ...(row.status === 'served' ? styles.statusServed : styles.statusPending) }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, ...slideStyle, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.remarks || <span style={styles.mutedText}>—</span>}
                    </td>
                    <td style={{ ...styles.td, ...slideStyle }}>
                      {row.po_attachment || row.dr_attachment ? (
                        <button type="button" onClick={() => onViewDocs(row)} style={styles.viewAttachmentBtn}>👁️ View Docs</button>
                      ) : (
                        <span style={styles.mutedText}>—</span>
                      )}
                    </td>
                    <td style={styles.tdRightSticky}>
                      <div style={styles.actionButtonGroup}>
                        {userRole === 'admin' && (
                          <button onClick={() => onEditRow(row)} style={styles.editBtn}>
                            ✏️ Edit
                          </button>
                        )}
                        <button onClick={() => onUploadBatch(row.batch_reference || row.po_number)} style={styles.rowAttachmentBtn}>
                          {row.po_attachment ? '🔄 Re-upload' : '📄 Scan'}
                        </button>
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
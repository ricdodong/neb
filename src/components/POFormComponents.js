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
// 3. PO DETAILS MODAL (PRODUCTION UI)
// ============================================================================
const PODetailsModal = ({ row, userRole, styles, onClose, onViewDocs, onUploadBatch, onEditRow }) => {
  if (!row) return null;

  const poRef = row.batch_reference || row.po_number || 'N/A';
  const hasDocs = row.po_attachment || row.dr_attachment;

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
    maxWidth: '640px',
    maxHeight: '90vh',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  };

  const headerStyle = {
    padding: '16px 20px',
    borderBottom: '1px solid #1f2937',
    background: '#0f172a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    padding: '20px',
    overflowY: 'auto'
  };

  const itemStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  };

  const fullWidthStyle = {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  };

  const valueBoxStyle = {
    background: '#090d16',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f8fafc',
    fontSize: '14px'
  };

  const footerStyle = {
    padding: '16px 20px',
    borderTop: '1px solid #1f2937',
    background: '#0f172a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📋</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#fff' }}>
                Purchase Order Details
              </h3>
              <span style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'monospace' }}>
                {poRef}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#94a3b8', 
              fontSize: '20px', 
              cursor: 'pointer' 
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Details Grid */}
        <div style={gridStyle}>
          <div style={itemStyle}>
            <span style={styles.label}>PO Reference Number</span>
            <div style={{ ...valueBoxStyle, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 'bold' }}>
              {poRef}
            </div>
          </div>

          <div style={itemStyle}>
            <span style={styles.label}>Customer / Client</span>
            <div style={valueBoxStyle}>
              {row.customer_name || row.customer_id || 'N/A'}
            </div>
          </div>

          <div style={itemStyle}>
            <span style={styles.label}>PO Document Date</span>
            <div style={valueBoxStyle}>
              {row.po_date || 'N/A'}
            </div>
          </div>

          <div style={itemStyle}>
            <span style={styles.label}>Contract Terms</span>
            <div style={valueBoxStyle}>
              <span style={styles.termsBadge}>{row.po_terms || 'COD'}</span>
            </div>
          </div>

          <div style={itemStyle}>
            <span style={styles.label}>Total Amount</span>
            <div style={{ ...valueBoxStyle, fontFamily: 'monospace', fontWeight: 'bold', color: '#00ff88' }}>
              {formatPHP(row.amount)}
            </div>
          </div>

          <div style={itemStyle}>
            <span style={styles.label}>Pipeline Status</span>
            <div style={{ ...valueBoxStyle, display: 'flex', alignItems: 'center' }}>
              <span style={{ ...styles.statusBadge, ...(row.status === 'served' ? styles.statusServed : styles.statusPending) }}>
                {row.status}
              </span>
            </div>
          </div>

          <div style={fullWidthStyle}>
            <span style={styles.label}>Attached Files Status</span>
            <div style={{ ...valueBoxStyle, display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: row.po_attachment ? '#00ff88' : '#64748b', fontSize: '13px', fontWeight: '600' }}>
                {row.po_attachment ? '✓ PO Attached' : '❌ PO Missing'}
              </span>
              <span style={{ color: row.dr_attachment ? '#38bdf8' : '#64748b', fontSize: '13px', fontWeight: '600' }}>
                {row.dr_attachment ? '✓ DR Attached' : '❌ DR Missing'}
              </span>
            </div>
          </div>

          <div style={fullWidthStyle}>
            <span style={styles.label}>Notes / Remarks</span>
            <div style={{ ...valueBoxStyle, minHeight: '50px', color: row.remarks ? '#e2e8f0' : '#64748b' }}>
              {row.remarks || 'No notes or remarks provided for this transaction.'}
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div style={footerStyle}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto' }}>
            {hasDocs ? (
              <button 
                type="button" 
                onClick={() => onViewDocs(row)} 
                style={{ ...styles.viewAttachmentBtn, padding: '10px 14px', fontSize: '12px' }}
              >
                👁️ View Docs
              </button>
            ) : null}

            <button 
              onClick={() => onUploadBatch(poRef)} 
              style={{ ...styles.rowAttachmentBtn, padding: '10px 14px', fontSize: '12px' }}
            >
              {row.po_attachment ? '🔄 Re-upload' : '📄 Scan'}
            </button>

            {userRole === 'admin' && (
              <button 
                onClick={() => onEditRow(row)} 
                style={{ ...styles.editBtn, padding: '10px 14px', fontSize: '12px' }}
              >
                ✏️ Edit
              </button>
            )}
          </div>

          <button 
            onClick={onClose} 
            style={{ 
              background: '#1f2937', 
              color: '#cbd5e1', 
              border: '1px solid #374151', 
              padding: '10px 18px', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. RESPONSIVE PO HISTORY TABLE SECTION (AUTO MOBILE CARDS)
// ============================================================================
export const POHistoryTable = React.memo(({ poHistory, isSyncing, userRole, styles, onRefresh, onViewDocs, onUploadBatch, onEditRow }) => {
  const [selectedRow, setSelectedRow] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const handleRowClick = (row) => {
    setSelectedRow(row);
  };

  return (
    <div style={styles.tableSection}>
      {/* Inject CSS Media Query Rules */}
      <style>{`
        @media (max-width: 640px) {
          .po-desktop-table-wrapper { display: none !important; }
          .po-mobile-card-list { display: flex !important; }
        }
        @media (min-width: 641px) {
          .po-desktop-table-wrapper { display: block !important; }
          .po-mobile-card-list { display: none !important; }
        }
      `}</style>

      <div style={styles.tableHeaderContainer}>
        <div>
          <h3 style={styles.tableTitle}>Registered Purchase Orders Ledger</h3>
          <p style={{ margin: '4px 0 0 12px', fontSize: '12px', color: '#64748b' }}>
            💡 Tap any record to view details & perform actions.
          </p>
        </div>
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

      {/* ------------------------------------------------------------------ */}
      {/* A. DESKTOP TABLE VIEW (> 640px)                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="po-desktop-table-wrapper" style={{ ...styles.tableWrapper, overflowX: 'auto' }}>
        <table style={{ ...styles.table, width: '100%' }}>
          <thead>
            <tr>
              <th style={styles.th}>PO Number</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>PO Date</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Status</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {poHistory.length === 0 ? (
              <tr>
                <td colSpan="6" style={styles.emptyTd}>No recorded purchase order transactions saved in this session cluster logs.</td>
              </tr>
            ) : (
              poHistory.map((row, idx) => {
                const uniqueKey = (row.batch_reference || row.po_number || row.id || `row-${idx}`).toString().trim().toLowerCase();
                const isHovered = hoveredIndex === idx;

                const rowStyle = {
                  ...styles.tableRow,
                  cursor: 'pointer',
                  background: isHovered ? '#1e293b' : '#111827',
                  transition: 'background 0.2s ease'
                };

                return (
                  <tr 
                    key={uniqueKey} 
                    style={rowStyle}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => handleRowClick(row)}
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
                    <td style={styles.tdAmount}>
                      {formatPHP(row.amount)}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, ...(row.status === 'served' ? styles.statusServed : styles.statusPending) }}>
                        {row.status}
                      </span>
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

      {/* ------------------------------------------------------------------ */}
      {/* B. MOBILE RESPONSIVE CARD LIST (<= 640px)                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="po-mobile-card-list" style={{ flexDirection: 'column', gap: '12px', width: '100%' }}>
        {poHistory.length === 0 ? (
          <div style={{ ...styles.emptyTd, background: '#111827', borderRadius: '8px', border: '1px solid #1f2937' }}>
            No recorded purchase order transactions saved.
          </div>
        ) : (
          poHistory.map((row, idx) => {
            const uniqueKey = (row.batch_reference || row.po_number || row.id || `mob-${idx}`).toString().trim().toLowerCase();

            return (
              <div
                key={uniqueKey}
                onClick={() => handleRowClick(row)}
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
                {/* Top Row: PO Number & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8', fontSize: '14px' }}>
                    {row.batch_reference || row.po_number || 'N/A'}
                  </span>
                  <span style={{ ...styles.statusBadge, ...(row.status === 'served' ? styles.statusServed : styles.statusPending), fontSize: '10px' }}>
                    {row.status}
                  </span>
                </div>

                {/* Customer Name */}
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>
                  {row.customer_name || row.customer_id || 'N/A'}
                </div>

                {/* Bottom Row: Date & Amount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '8px', marginTop: '2px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    📅 {row.po_date || 'N/A'}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#00ff88', fontSize: '14px' }}>
                    {formatPHP(row.amount)}
                  </span>
                </div>

                {/* Tap Prompt Footer */}
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
        <PODetailsModal 
          row={selectedRow}
          userRole={userRole}
          styles={styles}
          onClose={() => setSelectedRow(null)}
          onViewDocs={(r) => {
            setSelectedRow(null);
            onViewDocs(r);
          }}
          onUploadBatch={(ref) => {
            setSelectedRow(null);
            onUploadBatch(ref);
          }}
          onEditRow={(r) => {
            setSelectedRow(null);
            onEditRow(r);
          }}
        />
      )}
    </div>
  );
});
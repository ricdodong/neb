import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'https://dpsapi.ricalgen.eu.org';
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB Chunks for large high-res camera captures

const MobileUpload = () => {
    const { batchRef } = useParams();
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [docType, setDocType] = useState('receipt'); // receipt | dr | po | si | ci | qr
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    
    // On-Screen Debug Console State
    const [logs, setLogs] = useState([]);

    const logDebug = (msg, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[${timestamp}] [${type.toUpperCase()}] ${msg}`;
        
        // Print to actual browser console
        if (type === 'error') console.error(entry);
        else if (type === 'warn') console.warn(entry);
        else console.log(entry);

        // Append to on-screen log box
        setLogs((prev) => [...prev.slice(-40), entry]);
    };

    useEffect(() => {
        logDebug(`MobileUpload mounted. Batch Reference: ${batchRef || 'UNDEFINED'}`);
        if (!batchRef) {
            logDebug('WARNING: No batchRef found in route params!', 'warn');
        }
    }, [batchRef]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        logDebug(`File selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB, ${selectedFile.type})`);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        
        if (!file) {
            logDebug('Upload canceled: No file selected.', 'warn');
            setStatus('PLEASE SELECT A FILE');
            return;
        }

        if (!batchRef) {
            logDebug('Upload canceled: Missing batch reference.', 'error');
            setStatus('INVALID BATCH REFERENCE');
            return;
        }

        setUploading(true);
        setProgress(0);
        setStatus('INITIALIZING UPLOAD...');

        const startTime = Date.now();

        try {
            // ROUTE 1: PO / DR STAGING UPLOAD (Chunked Stitching Workflow)
            if (docType === 'dr' || docType === 'po') {
                logDebug(`Starting Chunked Upload Workflow for Type: [${docType.toUpperCase()}]`);

                const uploadId = `mobile_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

                logDebug(`File divided into ${totalChunks} chunk(s) (Upload ID: ${uploadId})`);

                for (let i = 0; i < totalChunks; i++) {
                    const start = i * CHUNK_SIZE;
                    const end = Math.min(file.size, start + CHUNK_SIZE);
                    const chunkBlob = file.slice(start, end);

                    const chunkForm = new FormData();
                    chunkForm.append('uploadId', uploadId);
                    chunkForm.append('chunkIndex', i.toString());
                    chunkForm.append('chunk', chunkBlob, file.name);

                    logDebug(`Transmitting Chunk ${i + 1}/${totalChunks} (${(chunkBlob.size / 1024).toFixed(1)} KB)...`);

                    const chunkRes = await axios.post(`${API_BASE}/api/po/upload-chunk`, chunkForm, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        withCredentials: true,
                        onUploadProgress: (progressEvent) => {
                            const currentChunkProgress = (progressEvent.loaded / progressEvent.total);
                            const totalProgress = Math.round(((i + currentChunkProgress) / totalChunks) * 100);
                            setProgress(totalProgress);
                        }
                    });

                    if (!chunkRes.data || !chunkRes.data.success) {
                        throw new Error(`Chunk ${i} upload rejected by Worker.`);
                    }
                }

                logDebug('All chunks sent successfully. Triggering backend stitching...');
                setStatus('STITCHING & SAVING...');

                const finalizePayload = {
                    uploadId,
                    totalChunks,
                    filename: file.name,
                    batch_reference: batchRef,
                    type: docType // 'dr' or 'po'
                };

                const finalizeRes = await axios.post(`${API_BASE}/api/po/finalize-staging`, finalizePayload, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                });

                if (finalizeRes.data && finalizeRes.data.success) {
                    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                    logDebug(`Staging complete in ${duration}s. Staged Path: ${finalizeRes.data.stagingPath || finalizeRes.data.stagedPath}`);
                    setStatus('ATTACHED TO PO SUCCESSFULLY');
                } else {
                    throw new Error(finalizeRes.data.error || 'Finalization failed.');
                }

            } 
            // ROUTE 2: STANDARD RECEIPT / INVOICE ATTACHMENT
            else {
                logDebug(`Starting Direct Upload Workflow for Type: [${docType.toUpperCase()}]`);

                const formData = new FormData();
                formData.append('image', file);
                formData.append('batch_reference', batchRef);
                formData.append('type', docType);

                const res = await axios.post(`${API_BASE}/api/po/attach-scan`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    withCredentials: true,
                    onUploadProgress: (progressEvent) => {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(percent);
                    }
                });

                if (res.data && res.data.success) {
                    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                    logDebug(`Direct attachment successful in ${duration}s.`);
                    setStatus('ATTACHED TO DATABASE SUCCESSFULLY');
                } else {
                    throw new Error(res.data.error || 'Direct upload rejected.');
                }
            }

        } catch (err) {
            const errDetail = err.response?.data?.error || err.message || 'Unknown network error';
            logDebug(`ERROR: ${errDetail}`, 'error');
            setStatus(`UPLOAD FAILED: ${errDetail}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ background: '#050505', color: '#fff', padding: '20px', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            {/* BRANDING HEADER */}
            <h1 style={{ fontWeight: '900', letterSpacing: '-1px', fontStyle: 'italic', marginBottom: '20px' }}>
                DPS <span style={{ color: '#00ff88', fontStyle: 'normal', textShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}>system</span>
            </h1>

            {/* MAIN UPLOADER CARD */}
            <div style={{ 
                background: '#080808',
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                padding: '24px', 
                borderRadius: '20px',
                boxShadow: 'inset 0 0 20px #000'
            }}>
                <h3 style={{ fontWeight: '900', margin: '0 0 5px 0' }}>System Scan Tool</h3>
                <p style={{ color: '#00ff88', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px', wordBreak: 'break-all' }}>
                    Batch Ref: {batchRef || 'NONE'}
                </p>
                
                <form onSubmit={handleUpload}>
                    {/* DOCUMENT TYPE SELECTOR */}
                    <label style={{ display: 'block', textAlign: 'left', fontSize: '11px', color: '#888', marginTop: '15px', fontWeight: 'bold' }}>
                        DOCUMENT TYPE
                    </label>
                    <select 
                        value={docType} 
                        onChange={(e) => {
                            setDocType(e.target.value);
                            logDebug(`DocType changed to: ${e.target.value}`);
                        }} 
                        style={{ margin: '8px 0 15px 0', display: 'block', width: '100%', background: '#121212', color: '#fff', border: '1px solid #333', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
                    >
                        <option value="dr">Delivery Receipt (DR)</option>
                        <option value="po">Purchase Order (PO)</option>
                        <option value="si">Sales Invoice (SI)</option>
                        <option value="ci">Charge Invoice (CI)</option>
                    </select>

                    {/* CAPTURE INPUT */}
                    <label style={{ display: 'block', textAlign: 'left', fontSize: '11px', color: '#888', marginTop: '10px', fontWeight: 'bold' }}>
                        CAPTURE / SELECT IMAGE
                    </label>
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleFileChange} 
                        style={{ margin: '8px 0 15px 0', display: 'block', width: '100%', background: '#121212', color: '#fff', border: '1px solid #333', padding: '10px', borderRadius: '8px', fontSize: '13px' }} 
                    />

                    {/* PREVIEW IMAGE CONTAINER */}
                    {previewUrl && (
                        <div style={{ margin: '15px 0', textAlign: 'center', background: '#000', padding: '10px', borderRadius: '8px', border: '1px dashed #333' }}>
                            <img src={previewUrl} alt="Scan Preview" style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '4px', objectFit: 'contain' }} />
                        </div>
                    )}

                    {/* PROGRESS BAR */}
                    {uploading && (
                        <div style={{ background: '#222', borderRadius: '10px', overflow: 'hidden', height: '10px', margin: '15px 0' }}>
                            <div style={{ background: '#00ff88', height: '100%', width: `${progress}%`, transition: 'width 0.2s' }} />
                        </div>
                    )}

                    {/* SUBMIT BUTTON */}
                    <button 
                        type="submit" 
                        disabled={uploading || !batchRef} 
                        style={{ 
                            background: uploading ? '#222' : '#00ff88', 
                            color: uploading ? '#888' : '#000', 
                            border: 'none', 
                            padding: '15px', 
                            borderRadius: '8px', 
                            fontWeight: '900', 
                            width: '100%', 
                            cursor: uploading ? 'not-allowed' : 'pointer', 
                            marginTop: '10px',
                            letterSpacing: '0.5px'
                        }}
                    >
                        {uploading ? `UPLOADING (${progress}%)...` : 'ATTACH TO DATABASE'}
                    </button>
                </form>

                {/* STATUS ALERT */}
                {status && (
                    <div style={{ 
                        marginTop: '15px', 
                        padding: '10px', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        textAlign: 'center',
                        background: status.includes('SUCCESSFUL') ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                        color: status.includes('SUCCESSFUL') ? '#00ff88' : '#ff4444',
                        border: `1px solid ${status.includes('SUCCESSFUL') ? '#00ff88' : '#ff4444'}`
                    }}>
                        {status}
                    </div>
                )}
            </div>

            {/* VALIDATION FOOTER */}
            <p style={{ marginTop: '15px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
                ID Verification: <span style={{ color: batchRef ? '#00ff88' : '#ff4444', fontWeight: 'bold' }}>{batchRef ? 'VALID' : 'MISSING'}</span>
            </p>

            {/* ON-SCREEN DEBUG CONSOLE */}
            <div style={{ marginTop: '25px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>INSPECT / DEBUG CONSOLE</span>
                    <button 
                        onClick={() => setLogs([])} 
                        style={{ background: 'transparent', border: '1px solid #333', color: '#aaa', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        CLEAR
                    </button>
                </div>
                <div style={{ 
                    background: '#000', 
                    border: '1px solid #1a1a1a', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    height: '160px', 
                    overflowY: 'auto', 
                    fontFamily: 'monospace', 
                    fontSize: '10px', 
                    color: '#00ff88',
                    whiteSpace: 'pre-wrap'
                }}>
                    {logs.length === 0 ? (
                        <span style={{ color: '#444' }}>Console ready. Interacting with uploader will print logs here...</span>
                    ) : (
                        logs.map((log, idx) => (
                            <div key={idx} style={{ 
                                color: log.includes('ERROR') ? '#ff4444' : log.includes('WARN') ? '#ffbb00' : '#00ff88',
                                marginBottom: '3px'
                            }}>
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileUpload;
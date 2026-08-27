import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const MobileUpload2 = () => {
    const { batchRef } = useParams();
    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState('po');
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

    // Helper to convert raw files into clean bytes
    const fileToUint8Array = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result));
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        setStatus('PROCESSING FILE...');

        try {
            const rawBytes = await fileToUint8Array(file);
            const uploadId = `mobile-${Date.now()}`;
            
            // Step 1: Upload chunk to Cloudflare storage
            const chunkFormData = new FormData();
            chunkFormData.append('uploadId', uploadId);
            chunkFormData.append('chunkIndex', '0');
            chunkFormData.append('chunk', new Blob([rawBytes], { type: file.type }));

            await axios.post('https://dpsapi.ricalgen.eu.org/api/po/upload-chunk', chunkFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setStatus('SAVING TO DATABASE...');

            // Step 2: Finalize payload (Adjust keys if your backend expects camelCase like batchReference)
            const finalizePayload = {
                uploadId: uploadId,
                totalChunks: 1,
                filename: file.name,
                batch_reference: batchRef, // Double-check if your worker expects batchReference
                type: docType             // Double-check if your worker expects docType or documentType
            };

            const response = await axios.post(
                'https://dpsapi.ricalgen.eu.org/api/po/finalize-staging', 
                finalizePayload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (response.data && (response.data.success || response.data.message)) {
                setStatus('UPLOAD & DATABASE RECORD SUCCESSFUL ✅');
                setFile(null);
            } else {
                setStatus(`FAILED: ${response.data.error || 'Server processing error'}`);
            }
        } catch (err) {
            console.error('Upload Error Details:', err.response || err);
            const serverErrorMessage = err.response?.data?.error || err.response?.data?.message || err.message;
            setStatus(`UPLOAD FAILED: ${serverErrorMessage}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ background: '#050505', color: '#fff', padding: '20px', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontWeight: '900', letterSpacing: '-1px', fontStyle: 'italic', marginBottom: '30px' }}>
                DPS <span style={{ color: '#00ff88', fontStyle: 'normal', textShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}>system</span>
            </h1>
            
            <div style={{ 
                background: '#080808',
                border: '1px solid rgba(255, 255, 255, 0.05)', 
                padding: '30px', 
                borderRadius: '24px',
                boxShadow: 'inset 4px 4px 10px #000'
            }}>
                <h3 style={{ fontWeight: '900', margin: '0 0 5px 0' }}>PO Logistics Attacher</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '25px' }}>
                    Target Batch Reference: <span style={{ color: '#00ff88', fontFamily: 'monospace', fontWeight: 'bold' }}>{batchRef}</span>
                </p>

                <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '1.5px', color: '#888', display: 'block', marginBottom: '8px' }}>DOCUMENT TYPE</label>
                        <select 
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '12px' }}
                        >
                            <option value="po">Purchase Order Form (PO)</option>
                            <option value="dr">Delivery Receipt (DR)</option>
                            <option value="ci">Charge Invoice (CI)</option>
                            <option value="si">Sales Invoice (SI)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '1.5px', color: '#888', display: 'block', marginBottom: '8px' }}>CAPTURE ATTACHMENT</label>
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            onChange={(e) => setFile(e.target.files[0])} 
                            style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '12px' }}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={uploading || !file}
                        style={{ 
                            background: uploading || !file ? '#222' : '#080808', 
                            color: uploading || !file ? '#555' : '#00ff88', 
                            border: uploading || !file ? '1px solid transparent' : '1px solid rgba(0, 255, 136, 0.2)',
                            padding: '15px', 
                            borderRadius: '14px', 
                            fontWeight: 'bold',
                            letterSpacing: '1px',
                            cursor: uploading || !file ? 'not-allowed' : 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        {uploading ? 'UPLOADING...' : 'UPLOAD ATTACHMENT'}
                    </button>
                </form>

                {status && (
                    <div style={{ 
                        marginTop: '25px', 
                        padding: '15px', 
                        background: 'rgba(255,255,255,0.02)', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        borderRadius: '12px',
                        textAlign: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                    }}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileUpload2;
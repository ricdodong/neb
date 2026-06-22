import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const MobileUpload = () => {
    const { id } = useParams(); // Matches the route :id
    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState('receipt');
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setStatus('Uploading...');

        const formData = new FormData();
        formData.append('image', file);
        formData.append('batch_reference', id); // Your API expects batch_reference
        formData.append('type', docType);

        try {
            // Using your existing worker endpoint
            await axios.post('https://dpsapi.ricalgen.eu.org/api/transactions/attach-scan', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatus('ATTACHED SUCCESSFULLY');
        } catch (err) {
            setStatus('UPLOAD FAILED');
            console.error(err);
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
                <h3 style={{ fontWeight: '900', margin: '0 0 5px 0' }}>System Scan Tool</h3>
                <p style={{ fontSize: '12px', color: '#00ff88' }}>Target ID: {id}</p>
                
                <form onSubmit={handleUpload}>
                    <label style={{ display: 'block', textAlign: 'left', fontSize: '12px', color: '#888', marginTop: '10px' }}>DOCUMENT TYPE</label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ margin: '15px 0', display: 'block', width: '100%', background: '#222', color: '#fff', border: '1px solid #333', padding: '12px', borderRadius: '5px' }}>
                        <option value="receipt">Official Receipt</option>
                        <option value="dr">Delivery Receipt (DR)</option>
                        <option value="si">Sales Invoice (SI)</option>
                        <option value="ci">Charge Invoice (CI)</option>
                        <option value="qr">QR Payment Proof</option>
                    </select>

                    <label style={{ display: 'block', textAlign: 'left', fontSize: '12px', color: '#888', marginTop: '10px' }}>CAPTURE IMAGE</label>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files[0])} style={{ margin: '15px 0', display: 'block', width: '100%', background: '#222', color: '#fff', border: '1px solid #333', padding: '12px', borderRadius: '5px' }} />
                    
                    <button type="submit" disabled={uploading} style={{ background: '#00ff88', color: '#000', border: 'none', padding: '15px', borderRadius: '5px', fontWeight: 'bold', width: '100%', cursor: 'pointer', marginTop: '10px' }}>
                        {uploading ? 'UPLOADING...' : 'ATTACH TO DATABASE'}
                    </button>
                </form>
            </div>
            <p style={{ marginTop: '20px', fontSize: '10px', color: '#444' }}>ID Verification: {id ? 'VALID' : 'MISSING'}</p>
        </div>
    );
};

export default MobileUpload;
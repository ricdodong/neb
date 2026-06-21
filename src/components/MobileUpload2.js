import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const MobileUpload2 = () => {
    const { batchRef } = useParams();
    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState('po');
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('batch_reference', batchRef);
        formData.append('type', docType);

        try {
            // This maps to your finalize-po-staging Worker endpoint
            const response = await axios.post('https://dpsapi.ricalgen.eu.org/api/transactions/finalize-po-staging', formData);
            if (response.data.success) {
                setStatus('UPLOAD SUCCESSFUL');
            }
        } catch (err) {
            setStatus('UPLOAD FAILED');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ background: '#080808', color: '#fff', padding: '20px', minHeight: '100vh' }}>
            <h1>DPS <span style={{ color: '#00ff88' }}>system</span></h1>
            <div style={{ border: '1px solid #00ff88', padding: '20px', borderRadius: '15px' }}>
                <h3>PO Document Attacher</h3>
                <p>Batch Key: {batchRef}</p>
                <form onSubmit={handleUpload}>
                    <label>DOCUMENT TARGET</label>
                    <select onChange={(e) => setDocType(e.target.value)}>
                        <option value="po">Purchase Order Form</option>
                        <option value="dr">Delivery Receipt</option>
                    </select>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files[0])} />
                    <button type="submit" disabled={uploading}>{uploading ? 'UPLOADING...' : 'STAGE FILE'}</button>
                </form>
                <div style={{marginTop: '20px'}}>{status}</div>
            </div>
        </div>
    );
};

export default MobileUpload2;
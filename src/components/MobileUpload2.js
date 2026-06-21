import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const MobileUpload2 = () => {
    const { batchRef } = useParams();
    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState('po');
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('INITIALIZING...');

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);

        // Using FormData to stream the file to your Cloudflare Worker
        const formData = new FormData();
        formData.append('image', file);
        formData.append('batch_reference', batchRef);
        formData.append('type', docType);

        try {
            // Pointing to your new Cloudflare Worker URL
            const response = await axios.post('https://dpsapi.ricalgen.eu.org/api/transactions/finalize-po-staging', formData);
            if (response.data.success) {
                setStatus('UPLOAD SUCCESSFUL');
            }
        } catch (err) {
            setStatus('UPLOAD FAILED');
            console.error(err);
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
                    <button type="submit" disabled={uploading}>
                        {uploading ? 'UPLOADING...' : 'STAGE FILE'}
                    </button>
                </form>
                <div>{status}</div>
            </div>
        </div>
    );
};

export default MobileUpload2;
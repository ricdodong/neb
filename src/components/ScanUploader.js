import React, { useState } from 'react';
import axios from 'axios';
import { Camera, Upload, CheckCircle, XCircle } from 'lucide-react';
const BASE_URL = 'https://dpsapi.ricalgen.eu.org';
const ScanUploader = ({ transactionId, onComplete, onClose }) => {
    const [file, setFile] = useState(null);
    // Default to receipt, but we'll include the others now
    const [type, setType] = useState('receipt'); 
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);

    // All available types matching your DB columns
    const docTypes = ['dr', 'ci', 'si', 'qr', 'receipt'];

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleUpload = async () => {
        if (!file) return alert("Please select an image first.");
        if (!transactionId) return alert("Error: Missing Transaction ID.");

        const formData = new FormData();
        formData.append('image', file);
        formData.append('transaction_id', transactionId);
        formData.append('type', type);

        setUploading(true);
        try {
            // Note: Use your environment IP if testing on a real mobile device
            const res = await axios.post(`${BASE_URL}/transactions/attach-scan`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success) {
                alert(`${type.toUpperCase()} attached successfully!`);
                onComplete();
            }
        } catch (err) {
            console.error("Upload failed", err);
            alert(`Upload failed: ${err.response?.data?.error || "Check server connection"}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#111] border border-[#00ff88]/30 p-6 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex flex-col">
                        <h2 className="text-[#00ff88] text-xl font-bold tracking-widest">ATTACH SCAN</h2>
                        <span className="text-gray-500 text-xs">ID: {transactionId}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Expanded Type Selection */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {docTypes.map((t) => (
                        <button
                            key={t}
                            onClick={() => setType(t)}
                            className={`py-2 rounded text-xs font-bold border transition-all ${
                                type === t 
                                ? 'bg-[#00ff88] text-black border-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.3)]' 
                                : 'text-gray-400 border-gray-800 hover:border-gray-600'
                            }`}
                        >
                            {t.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-800 rounded-lg p-4 text-center hover:border-[#00ff88]/50 transition-colors relative min-h-[200px] flex items-center justify-center">
                    {preview ? (
                        <img src={preview} alt="Preview" className="max-h-44 mx-auto rounded shadow-lg" />
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <Camera size={40} className="text-gray-600" />
                            <p className="text-gray-400 text-sm">Select {type.toUpperCase()} image</p>
                        </div>
                    )}
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full mt-6 bg-[#00ff88] text-black py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                >
                    {uploading ? "UPLOADING..." : <><Upload size={18} /> SAVE ATTACHMENT</>}
                </button>
            </div>
        </div>
    );
};

export default ScanUploader;
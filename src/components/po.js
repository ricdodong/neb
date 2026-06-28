import React, { useState } from 'react';

const PurchaseOrderManager = () => {
  const [formData, setFormData] = useState({
    batch_ref: '',
    cust_id: '',
    amount: 0,
    po_date: new Date().toISOString().split('T')[0],
    terms: 'COD'
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = "https://dpsapi.ricalgen.eu.org";

  const handleUploadAndSave = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please attach the PO document.");
    setLoading(true);

    try {
      // 1. Get Presigned URL
      const { uploadUrl, key } = await fetch(`${API_BASE}/api/upload-url`).then(r => r.json());

      // 2. Upload to R2
      await fetch(uploadUrl, { method: 'PUT', body: file });

      // 3. Save Metadata to D1
      await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, action: 'INSERT', key })
      });

      alert('PO successfully registered in system.');
    } catch (err) {
      console.error(err);
      alert('Error processing PO.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">Client PO Registration</h2>
      
      <form onSubmit={handleUploadAndSave} className="space-y-4">
        <input 
          className="w-full border p-2 rounded" 
          placeholder="Batch/PO Reference Number" 
          onChange={e => setFormData({...formData, batch_ref: e.target.value})} 
          required 
        />
        
        <input 
          className="w-full border p-2 rounded" 
          placeholder="Customer ID" 
          type="number"
          onChange={e => setFormData({...formData, cust_id: e.target.value})} 
          required 
        />

        <input 
          className="w-full border p-2 rounded" 
          placeholder="Amount" 
          type="number" 
          step="0.01"
          onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} 
        />

        <select 
          className="w-full border p-2 rounded" 
          onChange={e => setFormData({...formData, terms: e.target.value})}
        >
          <option value="COD">Cash on Delivery (COD)</option>
          <option value="Net 30">Net 30</option>
          <option value="Due on Receipt">Due on Receipt</option>
        </select>

        <div className="border-t pt-4">
          <label className="block text-sm font-semibold mb-2">Attach PO Document:</label>
          <input 
            type="file" 
            className="w-full" 
            onChange={e => setFile(e.target.files[0])} 
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Register Purchase Order'}
        </button>
      </form>
    </div>
  );
};

export default PurchaseOrderManager;
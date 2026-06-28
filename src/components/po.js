import React, { useState } from 'react';

const PurchaseOrderManager = () => {
  const [form, setForm] = useState({ 
    batch_ref: '', cust_id: '', amount: 0, 
    po_date: new Date().toISOString().split('T')[0], terms: 'COD' 
  });
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const API = "https://dpsapi.ricalgen.eu.org";

    // 1. Submit Metadata
    await fetch(`${API}/api/po-receives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    // 2. Handle File Upload via existing Chunk Logic
    const uploadId = crypto.randomUUID();
    const fd = new FormData();
    fd.append("uploadId", uploadId);
    fd.append("chunkIndex", 0);
    fd.append("chunk", file);
    await fetch(`${API}/api/transactions/upload-chunk`, { method: 'POST', body: fd });

    await fetch(`${API}/api/transactions/finalize-po-staging`, {
      method: 'POST',
      body: JSON.stringify({ uploadId, totalChunks: 1, filename: file.name, batch_reference: form.batch_ref, type: 'po' })
    });

    alert('PO Registered and Attached!');
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Register Client PO</h2>
      <input className="w-full border p-2 mb-2" placeholder="Batch/PO Reference" onChange={e => setForm({...form, batch_ref: e.target.value})} />
      <input className="w-full border p-2 mb-2" type="number" placeholder="Amount" onChange={e => setForm({...form, amount: e.target.value})} />
      <input type="file" className="w-full mb-4" onChange={e => setFile(e.target.files[0])} />
      <button className="bg-blue-600 text-white px-4 py-2 rounded">Submit PO</button>
    </form>
  );
};
export default PurchaseOrderManager;
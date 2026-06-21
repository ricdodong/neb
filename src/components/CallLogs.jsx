import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const CallLogs = () => {
    const [logs, setLogs] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [customerItems, setCustomerItems] = useState([]);
    const [selectedTxId, setSelectedTxId] = useState('');
    
    const [sortConfig, setSortConfig] = useState({ key: 'date_logged', direction: 'desc' });
    const [filters, setFilters] = useState({ search: '', customer: '', status: '' });

    const [formData, setFormData] = useState({
        customer_id: '',
        item_id: '',
        serial_number: '',
        problem: '',
        status: 'pending'
    });

    // --- API Helpers ---
    const fetchLogs = async () => {
        try {
            const res = await axios.get(`https://api.ricalgen.eu.org/api/call-logs?t=${Date.now()}`);
            setLogs(res.data);
        } catch (err) { /* Silent fail for interval fetching */ }
    };

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('https://api.ricalgen.eu.org/api/customers');
            setCustomers(res.data);
        } catch (err) { console.error("Error fetching customers:", err); }
    };

    const fetchItemsByCustomer = async (customerId) => {
        try {
            const res = await axios.get(`https://api.ricalgen.eu.org/api/customers/${customerId}/repairable`);
            setCustomerItems(res.data);
        } catch (err) { console.error("Error fetching customer history:", err); }
    };

    // --- Lifecycle ---
    useEffect(() => {
        fetchLogs();
        fetchCustomers();
        const interval = setInterval(fetchLogs, 10000); 
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (formData.customer_id) {
            fetchItemsByCustomer(formData.customer_id);
        } else {
            setCustomerItems([]);
            setSelectedTxId('');
            setFormData(prev => ({ ...prev, item_id: '', serial_number: '' }));
        }
    }, [formData.customer_id]);

    // --- Sorting and Filtering Logic ---
    const processedLogs = useMemo(() => {
        let filtered = [...logs];
        if (filters.search) {
            const term = filters.search.toLowerCase();
            filtered = filtered.filter(log => 
                log.customer_name?.toLowerCase().includes(term) ||
                log.item_name?.toLowerCase().includes(term) ||
                log.problem?.toLowerCase().includes(term)
            );
        }
        if (filters.customer) filtered = filtered.filter(log => log.customer_name === filters.customer);
        if (filters.status) filtered = filtered.filter(log => log.status === filters.status);

        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [logs, filters, sortConfig]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('https://api.ricalgen.eu.org/api/call-logs', formData);
            setFormData({ customer_id: '', item_id: '', serial_number: '', problem: '', status: 'pending' });
            setSelectedTxId('');
            fetchLogs(); 
        } catch (err) { alert("Error saving log"); }
    };

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'resolved': return 'bg-success';
            case 'fixing': return 'bg-warning text-dark';
            default: return 'bg-danger';
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="row g-4">
                {/* FORM SECTION */}
                <div className="col-md-3">
                    <div className="card shadow-sm border-0 sticky-top" style={{ top: '20px' }}>
                        <div className="card-header bg-primary text-white py-3">
                            <h6 className="mb-0 fw-bold"><i className="fas fa-plus-circle me-2"></i>New Problem Log</h6>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Customer</label>
                                    <select className="form-select form-select-sm" value={formData.customer_id} onChange={(e) => setFormData({...formData, customer_id: e.target.value})} required>
                                        <option value="">Select Customer</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Item</label>
                                    <select className="form-select form-select-sm" value={selectedTxId} onChange={(e) => {
                                        const txId = e.target.value;
                                        setSelectedTxId(txId);
                                        const record = customerItems.find(item => String(item.transaction_id || item.id) === String(txId));
                                        if (record) setFormData(prev => ({ ...prev, item_id: record.item_id || record.id, serial_number: record.serial_number }));
                                    }} disabled={!formData.customer_id} required>
                                        <option value="">Select Item</option>
                                        {customerItems.map((item, idx) => (
                                            <option key={idx} value={item.transaction_id || item.id}>{item.item_name} (SN: {item.serial_number})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Problem Description</label>
                                    <textarea className="form-control form-control-sm" rows="3" value={formData.problem} onChange={(e) => setFormData({...formData, problem: e.target.value})} placeholder="Describe the issue..." required />
                                </div>
                                <button type="submit" className="btn btn-primary btn-sm w-100 fw-bold">SUBMIT LOG</button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* TABLE SECTION */}
                <div className="col-md-9">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white py-3">
                            <h6 className="fw-bold mb-0 text-primary">Service Activity Logs</h6>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light tiny fw-bold text-uppercase">
                                        <tr>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Item Details</th>
                                            <th>Problem</th>
                                            <th>Tech Notes</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="small">
                                        {processedLogs.map(log => (
                                            <tr key={log.id}>
                                                <td className="text-muted">{new Date(log.date_logged).toLocaleDateString()}</td>
                                                <td className="fw-bold">{log.customer_name}</td>
                                                <td>
                                                    <div className="fw-bold">{log.item_name}</div>
                                                    <code className="tiny text-muted">{log.serial_number}</code>
                                                </td>
                                                <td style={{ maxWidth: '250px' }} className="text-wrap">
                                                    {log.problem || <span className="text-muted italic">No description</span>}
                                                </td>
                                                <td style={{ maxWidth: '200px' }} className="text-wrap text-info">
                                                    {log.notes ? (
                                                        <span><i className="fas fa-comment-dots me-1"></i>{log.notes}</span>
                                                    ) : <span className="text-muted opacity-50">--</span>}
                                                </td>
                                                <td>
                                                    <span className={`badge rounded-pill ${getStatusBadge(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {processedLogs.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="text-center py-4 text-muted">No logs found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CallLogs;
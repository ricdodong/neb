import React, { useState, useEffect } from 'react';
import axios from 'axios';
const BASE_URL = 'https://dpsapi.ricalgen.eu.org';

    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // State for Editing
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [editData, setEditData] = useState({ status: '', notes: '' });

    const fetchTickets = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get(`${BASE_URL}/api/call-logs?t=${Date.now()}`);
            setTickets(res.data);
        } catch (err) {
            console.error("Error loading service tickets:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
        // Auto-refresh every 30 seconds to catch new logs from the front desk
        const interval = setInterval(fetchTickets, 30000);
        return () => clearInterval(interval);
    }, []);

    // Open Edit Modal
    const handleRowClick = (ticket) => {
        setSelectedTicket(ticket);
        setEditData({ 
            status: ticket.status, 
            notes: ticket.notes || '' 
        });
    };

    // Submit Changes
    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${BASE_URL}/api/call-logs/${selectedTicket.id}`, editData);
            setSelectedTicket(null); 
            fetchTickets(); 
        } catch (err) {
            alert("Update failed. Check if server is running.");
        }
    };

    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'resolved': return { color: '#00ff88', border: '1px solid #00ff88', backgroundColor: 'rgba(0, 255, 136, 0.1)' };
            case 'fixing': return { color: '#ffd600', border: '1px solid #ffd600', backgroundColor: 'rgba(255, 214, 0, 0.1)' };
            case 'pending': return { color: '#ff3d00', border: '1px solid #ff3d00', backgroundColor: 'rgba(255, 61, 0, 0.1)' };
            default: return { color: '#ffffff', border: '1px solid #ffffff' };
        }
    };

    return (
        <div className="fade-in container-fluid py-4">
            <div className="sidebar-user-box p-4 rounded-4 shadow-lg border border-white border-opacity-10" style={{ background: '#111' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h5 className="fw-900 text-white mb-0 uppercase tracking-widest small">Repair Queue & Diagnostics</h5>
                        <p className="text-muted tiny-text mb-0">Update repair status and technician notes</p>
                    </div>
                    <button className="btn btn-sm btn-outline-light border-opacity-25" onClick={fetchTickets}>
                        <i className="fas fa-sync-alt me-2"></i> REFRESH
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="table table-dark table-hover border-0 align-middle">
                        <thead>
                            <tr className="tiny-text text-uppercase border-bottom border-white border-opacity-25">
                                <th className="border-0 pb-3 text-white-50">ID</th>
                                <th className="border-0 pb-3 text-white-50">Client</th>
                                <th className="border-0 pb-3 text-white-50">Device</th>
                                <th className="border-0 pb-3 text-white-50">Problem Reported</th>
                                <th className="border-0 pb-3 text-white-50">Tech Notes</th>
                                <th className="border-0 pb-3 text-white-50">Status</th>
                                <th className="border-0 pb-3 text-end text-white-50">Action</th>
                            </tr>
                        </thead>
                        <tbody className="small">
                            {isLoading && tickets.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-5 text-muted">Loading queue...</td></tr>
                            ) : tickets.map(t => (
                                <tr key={t.id} className="border-bottom border-white border-opacity-10">
                                    <td className="fw-bold py-3 text-white">#T-{t.id}</td>
                                    <td className="text-white">{t.customer_name}</td>
                                    <td>
                                        <div className="fw-bold text-white small">{t.item_name}</div>
                                        <div className="tiny-text text-white-50">{t.serial_number}</div>
                                    </td>
                                    <td className="text-white-50 small" style={{maxWidth: '200px'}}>
                                        {t.problem}
                                    </td>
                                    <td className="text-info small" style={{maxWidth: '200px'}}>
                                        {t.notes ? (
                                            <span><i className="fas fa-tools me-1 tiny-text"></i> {t.notes}</span>
                                        ) : (
                                            <span className="opacity-25 italic">No notes yet</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className="badge rounded-pill px-3 text-uppercase tiny-text" style={getStatusStyle(t.status)}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="text-end">
                                        <button className="btn btn-sm btn-primary py-1 px-3 fw-bold tiny-text" onClick={() => handleRowClick(t)}>
                                            DIAGNOSE
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DIAGNOSTIC MODAL */}
            {selectedTicket && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border border-white border-opacity-10 text-white shadow-2xl" style={{ background: '#1a1a1a' }}>
                            <div className="modal-header border-bottom border-white border-opacity-10 py-3">
                                <h6 className="modal-title uppercase tracking-widest text-white fw-bold">Diagnostic Update: #T-{selectedTicket.id}</h6>
                                <button className="btn-close btn-close-white" onClick={() => setSelectedTicket(null)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body p-4">
                                    <div className="mb-4 bg-dark p-3 rounded border border-white border-opacity-5">
                                        <label className="tiny-text text-primary uppercase fw-bold mb-1 d-block">Customer Issue</label>
                                        <p className="small mb-0 text-white-50">{selectedTicket.problem}</p>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="tiny-text text-white-50 uppercase mb-2 d-block fw-bold">Repair Status</label>
                                        <select 
                                            className="form-select bg-dark text-white border-secondary shadow-none"
                                            value={editData.status}
                                            onChange={(e) => setEditData({...editData, status: e.target.value})}
                                        >
                                            <option value="pending">Pending Review</option>
                                            <option value="fixing">Fixing / In Progress</option>
                                            <option value="resolved">Resolved / Done</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="tiny-text text-white-50 uppercase mb-2 d-block fw-bold">Technician Notes</label>
                                        <textarea 
                                            className="form-control bg-dark text-white border-secondary shadow-none"
                                            rows="4"
                                            placeholder="Update what was fixed or parts needed..."
                                            value={editData.notes}
                                            onChange={(e) => setEditData({...editData, notes: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-top border-white border-opacity-10 p-3">
                                    <button type="button" className="btn btn-sm btn-link text-white-50 text-decoration-none" onClick={() => setSelectedTicket(null)}>CANCEL</button>
                                    <button type="submit" className="btn btn-sm btn-primary px-4 fw-bold">SAVE CHANGES</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

export default ServiceCenter;
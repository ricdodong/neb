import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';
const FILE_URL = 'https://jadefile.ricalgen.eu.org/';

const SupplierManagement = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [returnHistory, setReturnHistory] = useState([]);
    const [expandedRow, setExpandedRow] = useState(null);
    
    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contact: '',
        email: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');
    
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/suppliers`);
            setSuppliers(res.data);
        } catch (err) {
            console.error("Error loading suppliers", err);
        }
    };

    const handleSelectSupplier = async (supplier) => {
        setSelectedSupplier(supplier);
        setExpandedRow(null); 
        
        try {
            const [ledgerRes, returnRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/suppliers/${supplier.id}/history`),
                axios.get(`${BASE_URL}/api/suppliers/${supplier.id}/service-calls`)
            ]);
            setPurchaseHistory(ledgerRes.data);
            setReturnHistory(returnRes.data);
        } catch (err) {
            console.error("Error fetching supplier details", err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddSupplier = async (e) => {
        e.preventDefault();
        setModalError('');

        if (!formData.name.trim() || !formData.contact.trim()) {
            setModalError('Supplier Name and Contact No are required.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/suppliers/add`, formData);
            await fetchSuppliers();
            
            // Automatically select the newly created supplier if returned
            if (res.data && res.data.id) {
                handleSelectSupplier(res.data);
            }

            // Reset and close modal
            setFormData({ name: '', address: '', contact: '', email: '' });
            setShowAddModal(false);
        } catch (err) {
            console.error("Error adding supplier", err);
            setModalError(err.response?.data?.message || 'Failed to save supplier. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'fixed':
            case 'resolved':
            case 'paid':
            case 'refunded':
                return 'bg-success';
            case 'fixing':
            case 'repairing':
            case 'in progress':
            case 'processing':
                return 'bg-warning text-dark';
            case 'pending':
            case 'waiting':
                return 'bg-danger';
            case 'cancelled':
            case 'returned':
                return 'bg-secondary';
            default:
                return 'bg-secondary';
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedSupplier) return;

        const formDataObj = new FormData();
        formDataObj.append('image', file);

        try {
            const res = await axios.post(`${BASE_URL}/api/suppliers/${selectedSupplier.id}/upload-photo`, formDataObj, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setSelectedSupplier({ ...selectedSupplier, profile_picture: res.data.imageUrl });
            fetchSuppliers(); 
            alert("Supplier logo/picture updated!");
        } catch (err) {
            console.error("Upload failed", err);
            alert("Error uploading image");
        }
    };

    const toggleRow = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedHistory = useMemo(() => {
        const groups = {};
        purchaseHistory.forEach((item, index) => {
            const rawName = item.item_name || "Unknown Item";
            const normalizedKey = rawName.trim().toLowerCase(); 
            if (!groups[normalizedKey]) {
                groups[normalizedKey] = {
                    displayId: `group-${normalizedKey.replace(/[^a-z0-9]/g, '-')}`, 
                    item_name: rawName.trim(),
                    qty: 0,
                    transactions: [] 
                };
            }
            groups[normalizedKey].qty += 1;
            groups[normalizedKey].transactions.push({
                id: item.id || `row-${index}`, 
                purchase_date: item.purchase_date,
                serial_number: item.serial_number,
                srp_amount: item.srp_amount,
                or_number: item.or_number,
                payment_status: item.payment_status,
                warranty_period: item.warranty_period
            });
        });
        return Object.values(groups);
    }, [purchaseHistory]);
    
    return (
        <div className="container-fluid py-4 bg-light min-vh-100 rounded">
            <div className="row g-4">
                {/* Sidebar: Supplier List */}
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        {/* Refined Professional Header */}
                        <div className="card-header bg-white border-0 py-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h5 className="mb-0 fw-bold text-dark">Supplier Directory</h5>
                                    <span className="text-muted small">{suppliers.length} Total Suppliers</span>
                                </div>
                                <button 
                                    className="btn btn-primary btn-sm d-flex align-items-center gap-1 px-3 shadow-sm"
                                    onClick={() => setShowAddModal(true)}
                                >
                                    <i className="fas fa-truck"></i> Add Supplier
                                </button>
                            </div>
                            <div className="input-group shadow-sm rounded">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="fas fa-search text-muted"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0 ps-0"
                                    placeholder="Search suppliers..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="list-group list-group-flush" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {filteredSuppliers.length > 0 ? (
                                filteredSuppliers.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleSelectSupplier(s)}
                                        className={`list-group-item list-group-item-action py-3 px-4 border-0 mb-1 mx-2 rounded-3 transition-all ${selectedSupplier?.id === s.id ? 'bg-primary text-white shadow' : ''}`}
                                    >
                                        <div className="d-flex align-items-center">
                                            <div className="flex-grow-1">
                                                <h6 className={`mb-0 fw-bold ${selectedSupplier?.id === s.id ? 'text-white' : 'text-dark'}`}>{s.name}</h6>
                                                <small className={selectedSupplier?.id === s.id ? 'text-white-50' : 'text-muted'}>
                                                    <i className="fas fa-phone-alt me-1 tiny"></i> {s.contact || 'No Contact'}
                                                </small>
                                            </div>
                                            {s.profile_picture && <i className={`fas fa-image ms-2 ${selectedSupplier?.id === s.id ? 'text-white-50' : 'text-muted'}`}></i>}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <small>No suppliers found</small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content: Detailed View */}
                <div className="col-md-8">
                    {selectedSupplier ? (
                        <div className="animate-fade-in">
                            {/* Profile Header */}
                            <div className="card bg-dark text-white border-0 mb-4 p-4 shadow">
                                <div className="d-flex align-items-center">
                                    <div className="position-relative me-4" style={{ cursor: 'pointer' }} onClick={() => fileInputRef.current.click()}>
                                        {selectedSupplier.profile_picture ? (
                                            <img 
                                                src={`${FILE_URL}${selectedSupplier.profile_picture}`} 
                                                alt="Supplier Logo" 
                                                className="rounded-circle border border-3 border-primary shadow-sm" 
                                                style={{ width: '100px', height: '100px', objectFit: 'cover' }} 
                                            />
                                        ) : (
                                            <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center border border-3 border-primary" style={{ width: '100px', height: '100px' }}>
                                                <i className="fas fa-warehouse fa-3x opacity-50"></i>
                                            </div>
                                        )}
                                        <div className="position-absolute bottom-0 end-0 bg-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center border border-white border-2" style={{ width: '32px', height: '32px' }}>
                                            <i className="fas fa-camera fa-xs text-white"></i>
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleImageUpload} 
                                            className="d-none" 
                                            accept="image/*" 
                                        />
                                    </div>

                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <h2 className="fw-bold mb-1">{selectedSupplier.name}</h2>
                                                <div className="mb-2 d-flex flex-wrap gap-2">
                                                    <span className="badge bg-primary px-3 py-2 rounded-pill">
                                                        <i className="fas fa-phone-alt me-2"></i> {selectedSupplier.contact || 'N/A'}
                                                    </span>
                                                    {selectedSupplier.email && (
                                                        <span className="badge bg-secondary px-3 py-2 rounded-pill">
                                                            <i className="fas fa-envelope me-2"></i> {selectedSupplier.email}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mb-0 opacity-75">
                                                    <i className="fas fa-map-marker-alt me-2 text-danger"></i>{selectedSupplier.address || 'No address provided'}
                                                </p>
                                            </div>
                                            <i className="fas fa-boxes fa-3x opacity-25 d-none d-sm-block"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Supply/Purchase History */}
                            <div className="card shadow-sm border-0 mb-4 overflow-hidden">
                                <div className="card-header bg-white fw-bold py-3 border-bottom">
                                    <i className="fas fa-shopping-bag me-2 text-primary"></i>Supply & Procurement Ledger
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="ps-4" style={{ width: '85%' }}>Item Description</th>
                                                <th className="text-center pe-4">Qty</th> 
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupedHistory.length > 0 ? (
                                                groupedHistory.map((group) => (
                                                    <React.Fragment key={group.displayId}>
                                                        <tr onClick={() => toggleRow(group.displayId)} style={{ cursor: 'pointer' }} className={expandedRow === group.displayId ? 'table-primary-subtle' : ''}>
                                                            <td className="fw-bold py-3 ps-4">
                                                                <i className={`fas fa-caret-${expandedRow === group.displayId ? 'down' : 'right'} me-2 text-primary`}></i>
                                                                {group.item_name}
                                                            </td>
                                                            <td className="text-center py-3 pe-4">
                                                                <span className="badge bg-primary rounded-pill px-3">{group.qty}</span>
                                                            </td>
                                                        </tr>

                                                        {expandedRow === group.displayId && (
                                                            <tr>
                                                                <td colSpan="2" className="p-0 border-start border-primary border-4">
                                                                    <div className="bg-light p-4">
                                                                        <table className="table table-sm table-bordered bg-white mb-0 shadow-sm rounded">
                                                                            <thead className="table-secondary tiny text-uppercase">
                                                                                <tr>
                                                                                    <th className="ps-2">Date</th>
                                                                                    <th>OR Number</th>
                                                                                    <th>Serial Number</th>
                                                                                    <th>Unit Price</th>
                                                                                    <th>Status</th>
                                                                                    <th>Warranty</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {group.transactions.map((t) => (
                                                                                    <tr key={t.id}>
                                                                                        <td className="fw-bold ps-2">{t.purchase_date ? new Date(t.purchase_date).toLocaleDateString() : 'N/A'}</td>
                                                                                        <td><span className="badge bg-light text-dark border">{t.or_number || 'N/A'}</span></td>
                                                                                        <td><code className="text-dark fw-bold">{t.serial_number || 'N/A'}</code></td>
                                                                                        <td>₱{Number(t.srp_amount || 0).toLocaleString()}</td>
                                                                                        <td>
                                                                                            <span className={`badge ${getStatusBadgeClass(t.payment_status)}`}>
                                                                                                {t.payment_status}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="text-muted small">{t.warranty_period || '1 Year'}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                <tr><td colSpan="2" className="text-center py-5 text-muted">No records found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Return & Refund Logs */}
                            <div className="card shadow-sm border-0">
                                <div className="card-header bg-white fw-bold py-3 border-bottom">
                                    <i className="fas fa-undo-alt me-2 text-warning"></i>Return & Refund Logs
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="ps-4">Date</th>
                                                <th>Description</th>
                                                <th className="pe-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {returnHistory.length > 0 ? (
                                                returnHistory.map(item => (
                                                    <tr key={item.id}>
                                                        <td className="ps-4">{new Date(item.date_logged).toLocaleDateString()}</td>
                                                        <td>
                                                            <div className="fw-bold">{item.item_name || 'Return Item'}</div>
                                                            <div className="text-muted small">{item.problem || item.description}</div>
                                                        </td>
                                                        <td className="pe-4">
                                                            <span className={`badge shadow-sm ${getStatusBadgeClass(item.status)}`}>
                                                                {item.status || 'Pending'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan="3" className="text-center py-5 text-muted">No return & refund records found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-5 text-muted bg-white shadow-sm rounded border">
                            <div className="mb-4 bg-light rounded-circle p-4">
                                <i className="fas fa-warehouse fa-5x opacity-25 text-primary"></i>
                            </div>
                            <h3>Supplier Manager</h3>
                            <p className="max-width-400">Please select a supplier from the directory to view their procurement history, return & refund logs, and account details.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Supplier Modal */}
            {showAddModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title fw-bold">
                                    <i className="fas fa-truck me-2"></i>Add New Supplier
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={() => setShowAddModal(false)}
                                    disabled={submitting}
                                ></button>
                            </div>
                            <form onSubmit={handleAddSupplier}>
                                <div className="modal-body p-4">
                                    {modalError && (
                                        <div className="alert alert-danger py-2 small mb-3">
                                            <i className="fas fa-exclamation-circle me-1"></i> {modalError}
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold small text-muted">Supplier's Name <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light"><i className="fas fa-building text-muted"></i></span>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                name="name"
                                                placeholder="Enter company or supplier name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold small text-muted">Address</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light"><i className="fas fa-map-marker-alt text-muted"></i></span>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                name="address"
                                                placeholder="Enter complete address"
                                                value={formData.address}
                                                onChange={handleInputChange} 
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold small text-muted">Contact No <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light"><i className="fas fa-phone-alt text-muted"></i></span>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                name="contact"
                                                placeholder="e.g. 09123456789"
                                                value={formData.contact}
                                                onChange={handleInputChange}
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold small text-muted">Email</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light"><i className="fas fa-envelope text-muted"></i></span>
                                            <input 
                                                type="email" 
                                                className="form-control" 
                                                name="email"
                                                placeholder="e.g. supplier@example.com"
                                                value={formData.email}
                                                onChange={handleInputChange} 
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light px-4 py-3">
                                    <button 
                                        type="button" 
                                        className="btn btn-outline-secondary px-4" 
                                        onClick={() => setShowAddModal(false)}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary px-4 shadow-sm"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-save me-2"></i> Save Supplier
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierManagement;
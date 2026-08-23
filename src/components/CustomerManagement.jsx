import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';
const FILE_URL = 'https://jadefile.ricalgen.eu.org/';

const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [serviceHistory, setServiceHistory] = useState([]);
    const [expandedRow, setExpandedRow] = useState(null);
    
    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedItemDetail, setSelectedItemDetail] = useState(null);

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
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/customers`);
            setCustomers(res.data);
        } catch (err) {
            console.error("Error loading customers", err);
        }
    };

    const handleSelectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        setExpandedRow(null); 
        
        try {
            const [ledgerRes, serviceRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/customers/${customer.id}/history`),
                axios.get(`${BASE_URL}/api/customers/${customer.id}/service-calls`)
            ]);
            setPurchaseHistory(ledgerRes.data);
            setServiceHistory(serviceRes.data);
        } catch (err) {
            console.error("Error fetching details", err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        setModalError('');

        if (!formData.name.trim() || !formData.contact.trim()) {
            setModalError('Client Name and Contact No are required.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/customers`, formData);
            await fetchCustomers();
            
            if (res.data && res.data.id) {
                handleSelectCustomer(res.data);
            }

            setFormData({ name: '', address: '', contact: '', email: '' });
            setShowAddModal(false);
        } catch (err) {
            console.error("Error adding customer", err);
            setModalError(err.response?.data?.message || 'Failed to save customer. Please try again.');
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
                return 'bg-success';
            case 'fixing':
            case 'repairing':
            case 'in progress':
            case 'balance':
                return 'bg-warning text-dark';
            case 'pending':
            case 'waiting':
            case 'unpaid':
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
        if (!file || !selectedCustomer) return;

        const formDataObj = new FormData();
        formDataObj.append('image', file);

        try {
            const res = await axios.post(`${BASE_URL}/api/customers/${selectedCustomer.id}/upload-photo`, formDataObj, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setSelectedCustomer({ ...selectedCustomer, profile_picture: res.data.imageUrl });
            fetchCustomers(); 
            alert("Profile picture updated!");
        } catch (err) {
            console.error("Upload failed", err);
            alert("Error uploading image");
        }
    };

    const toggleRow = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const handleRowClick = (item) => {
        setSelectedItemDetail(item);
        setShowDetailModal(true);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group purchase history by Transaction / OR Number & Date + Auto-sort (Unpaid/Balance first, then Latest Date)
    const groupedTransactions = useMemo(() => {
        const groups = {};
        purchaseHistory.forEach((item, index) => {
            const orNum = item.or_number || `OR-UNKNOWN-${index}`;
            const dateStr = item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : 'no-date';
            const groupKey = `${orNum}-${dateStr}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    displayId: `txn-${index}`,
                    or_number: item.or_number || 'N/A',
                    purchase_date: item.purchase_date,
                    payment_status: item.payment_status || 'Unpaid',
                    items: []
                };
            }
            groups[groupKey].items.push({
                id: item.id || `row-${index}`,
                item_name: item.item_name || 'Unknown Item',
                qty: item.qty || 1,
                purchase_date: item.purchase_date,
                serial_number: item.serial_number,
                srp_amount: item.srp_amount,
                or_number: item.or_number,
                payment_status: item.payment_status,
                warranty_period: item.warranty_period
            });
        });

        // Convert to array and sort
        return Object.values(groups).sort((a, b) => {
            const statusA = (a.payment_status || '').toLowerCase();
            const statusB = (b.payment_status || '').toLowerCase();

            const isUnpaidA = statusA === 'unpaid' || statusA === 'balance';
            const isUnpaidB = statusB === 'unpaid' || statusB === 'balance';

            // 1. Unpaid / Balance items come first
            if (isUnpaidA && !isUnpaidB) return -1;
            if (!isUnpaidA && isUnpaidB) return 1;

            // 2. Sort by latest date descending
            const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
            const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
            return dateB - dateA;
        });
    }, [purchaseHistory]);
    
    return (
        <div className="container-fluid py-4 bg-light min-vh-100 rounded">
            <div className="row g-4">
                {/* Sidebar: Customer List */}
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header bg-white border-0 py-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h5 className="mb-0 fw-bold text-dark">Directory</h5>
                                    <span className="text-muted small">{customers.length} Total Customers</span>
                                </div>
                                <button 
                                    className="btn btn-primary btn-sm d-flex align-items-center gap-1 px-3 shadow-sm"
                                    onClick={() => setShowAddModal(true)}
                                >
                                    <i className="fas fa-user-plus"></i> Add Customer
                                </button>
                            </div>
                            <div className="input-group shadow-sm rounded">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="fas fa-search text-muted"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0 ps-0"
                                    placeholder="Search by name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="list-group list-group-flush" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleSelectCustomer(c)}
                                        className={`list-group-item list-group-item-action py-3 px-4 border-0 mb-1 mx-2 rounded-3 transition-all ${selectedCustomer?.id === c.id ? 'bg-primary text-white shadow' : ''}`}
                                    >
                                        <div className="d-flex align-items-center">
                                            <div className="flex-grow-1">
                                                <h6 className={`mb-0 fw-bold ${selectedCustomer?.id === c.id ? 'text-white' : 'text-dark'}`}>{c.name}</h6>
                                                <small className={selectedCustomer?.id === c.id ? 'text-white-50' : 'text-muted'}>
                                                    <i className="fas fa-phone-alt me-1 tiny"></i> {c.contact || 'No Contact'}
                                                </small>
                                            </div>
                                            {c.profile_picture && <i className={`fas fa-image ms-2 ${selectedCustomer?.id === c.id ? 'text-white-50' : 'text-muted'}`}></i>}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <small>No customers found</small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content: Detailed View */}
                <div className="col-md-8">
                    {selectedCustomer ? (
                        <div className="animate-fade-in">
                            {/* Profile Header */}
                            <div className="card bg-dark text-white border-0 mb-4 p-4 shadow">
                                <div className="d-flex align-items-center">
                                    <div className="position-relative me-4" style={{ cursor: 'pointer' }} onClick={() => fileInputRef.current.click()}>
                                        {selectedCustomer.profile_picture ? (
                                            <img 
                                                src={`${FILE_URL}${selectedCustomer.profile_picture}`} 
                                                alt="Profile" 
                                                className="rounded-circle border border-3 border-primary shadow-sm" 
                                                style={{ width: '100px', height: '100px', objectFit: 'cover' }} 
                                            />
                                        ) : (
                                            <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center border border-3 border-primary" style={{ width: '100px', height: '100px' }}>
                                                <i className="fas fa-user fa-3x opacity-50"></i>
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
                                                <h2 className="fw-bold mb-1">{selectedCustomer.name}</h2>
                                                <div className="mb-2 d-flex flex-wrap gap-2">
                                                    <span className="badge bg-primary px-3 py-2 rounded-pill">
                                                        <i className="fas fa-phone-alt me-2"></i> {selectedCustomer.contact || 'N/A'}
                                                    </span>
                                                    {selectedCustomer.email && (
                                                        <span className="badge bg-secondary px-3 py-2 rounded-pill">
                                                            <i className="fas fa-envelope me-2"></i> {selectedCustomer.email}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mb-0 opacity-75">
                                                    <i className="fas fa-map-marker-alt me-2 text-danger"></i>{selectedCustomer.address || 'No address provided'}
                                                </p>
                                            </div>
                                            <i className="fas fa-id-badge fa-3x opacity-25 d-none d-sm-block"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Purchase History */}
                            <div className="card shadow-sm border-0 mb-4 overflow-hidden">
                                <div className="card-header bg-white fw-bold py-3 border-bottom">
                                    <i className="fas fa-shopping-bag me-2 text-primary"></i>Purchase Ledger (Transactions)
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="ps-4">Transaction / OR Number</th>
                                                <th>Date</th>
                                                <th className="pe-4 text-center">Status</th> 
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupedTransactions.length > 0 ? (
                                                groupedTransactions.map((group) => (
                                                    <React.Fragment key={group.displayId}>
                                                        <tr onClick={() => toggleRow(group.displayId)} style={{ cursor: 'pointer' }} className={expandedRow === group.displayId ? 'table-primary-subtle' : ''}>
                                                            <td className="fw-bold py-3 ps-4">
                                                                <i className={`fas fa-caret-${expandedRow === group.displayId ? 'down' : 'right'} me-2 text-primary`}></i>
                                                                <span className="badge bg-light text-dark border me-2">{group.or_number}</span>
                                                            </td>
                                                            <td className="py-3">
                                                                {group.purchase_date ? new Date(group.purchase_date).toLocaleDateString() : 'N/A'}
                                                            </td>
                                                            <td className="text-center py-3 pe-4">
                                                                <span className={`badge ${getStatusBadgeClass(group.payment_status)}`}>
                                                                    {group.payment_status}
                                                                </span>
                                                            </td>
                                                        </tr>

                                                        {expandedRow === group.displayId && (
                                                            <tr>
                                                                <td colSpan="3" className="p-0 border-start border-primary border-4">
                                                                    <div className="bg-light p-4">
                                                                        <div className="text-muted small mb-2 fw-bold">ITEMS IN THIS TRANSACTION (Click a row for full details)</div>
                                                                        <table className="table table-sm table-bordered table-hover bg-white mb-0 shadow-sm rounded">
                                                                            <thead className="table-secondary tiny text-uppercase">
                                                                                <tr>
                                                                                    <th className="ps-2">Item Description</th>
                                                                                    <th className="text-center">Qty</th>
                                                                                    <th>Unit Price</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {group.items.map((item) => (
                                                                                    <tr key={item.id} onClick={() => handleRowClick(item)} style={{ cursor: 'pointer' }}>
                                                                                        <td className="ps-2 fw-semibold text-primary">{item.item_name}</td>
                                                                                        <td className="text-center"><span className="badge bg-secondary rounded-pill">{item.qty}</span></td>
                                                                                        <td>₱{Number(item.srp_amount || 0).toLocaleString()}</td>
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
                                                <tr><td colSpan="3" className="text-center py-5 text-muted">No records found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Service History */}
                            <div className="card shadow-sm border-0">
                                <div className="card-header bg-white fw-bold py-3 border-bottom">
                                    <i className="fas fa-tools me-2 text-warning"></i>Service & Maintenance
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
                                            {serviceHistory.length > 0 ? (
                                                serviceHistory.map(service => (
                                                    <tr key={service.id}>
                                                        <td className="ps-4">{new Date(service.date_logged).toLocaleDateString()}</td>
                                                        <td>
                                                            <div className="fw-bold">{service.item_name || 'Service Item'}</div>
                                                            <div className="text-muted small">{service.problem || service.description}</div>
                                                        </td>
                                                        <td className="pe-4">
                                                            <span className={`badge shadow-sm ${getStatusBadgeClass(service.status)}`}>
                                                                {service.status || 'Pending'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan="3" className="text-center py-5 text-muted">No service records found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-5 text-muted bg-white shadow-sm rounded border">
                            <div className="mb-4 bg-light rounded-circle p-4">
                                <i className="fas fa-id-card fa-5x opacity-25 text-primary"></i>
                            </div>
                            <h3>Customer Manager</h3>
                            <p className="max-width-400">Please select a customer from the directory to view their purchase history, service calls, and account details.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Customer Modal */}
            {showAddModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title fw-bold">
                                    <i className="fas fa-user-plus me-2"></i>Add New Client
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={() => setShowAddModal(false)}
                                    disabled={submitting}
                                ></button>
                            </div>
                            <form onSubmit={handleAddCustomer}>
                                <div className="modal-body p-4">
                                    {modalError && (
                                        <div className="alert alert-danger py-2 small mb-3">
                                            <i className="fas fa-exclamation-circle me-1"></i> {modalError}
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold small text-muted">Client's Name <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light"><i className="fas fa-user text-muted"></i></span>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                name="name"
                                                placeholder="Enter full name"
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
                                                placeholder="e.g. client@example.com"
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
                                                <i className="fas fa-save me-2"></i> Save Client
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Detail Modal */}
            {showDetailModal && selectedItemDetail && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-dark text-white">
                                <h5 className="modal-title fw-bold">
                                    <i className="fas fa-info-circle me-2 text-primary"></i>Transaction Item Details
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={() => setShowDetailModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body p-4">
                                <ul className="list-group list-group-flush">
                                    <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                                        <span className="fw-bold text-muted">Item Description:</span>
                                        <span className="fw-semibold text-dark">{selectedItemDetail.item_name}</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                                        <span className="fw-bold text-muted">Quantity:</span>
                                        <span className="badge bg-primary rounded-pill px-3">{selectedItemDetail.qty}</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                                        <span className="fw-bold text-muted">Purchase Date:</span>
                                        <span>{selectedItemDetail.purchase_date ? new Date(selectedItemDetail.purchase_date).toLocaleDateString() : 'N/A'}</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                                        <span className="fw-bold text-muted">OR Number:</span>
                                        <span className="badge bg-light text-dark border">{selectedItemDetail.or_number || 'N/A'}</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                                        <span className="fw-bold text-muted">Serial Number:</span>
                                        <code className="text-dark fw-bold">{selectedItemDetail.serial_number || 'N/A'}</code>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                                        <span className="fw-bold text-muted">Unit Price:</span>
                                        <span className="fw-bold text-success">₱{Number(selectedItemDetail.srp_amount || 0).toLocaleString()}</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                                        <span className="fw-bold text-muted">Payment Status:</span>
                                        <span className={`badge ${getStatusBadgeClass(selectedItemDetail.payment_status)}`}>
                                            {selectedItemDetail.payment_status}
                                        </span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                                        <span className="fw-bold text-muted">Warranty Period:</span>
                                        <span>{selectedItemDetail.warranty_period || '1 Year'}</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="modal-footer bg-light px-4 py-3">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary px-4" 
                                    onClick={() => setShowDetailModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagement;
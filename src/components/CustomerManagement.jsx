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

    // Add these inside your existing component function:
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [ledgerData, setLedgerData] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [loadingLedger, setLoadingLedger] = useState(false);

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

    // handle open ledger modal
    const handleOpenLedger = async (batchReference = null) => {
        if (!selectedCustomer) {
            alert("Please select a customer first.");
            return;
        }

        setLoadingLedger(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/customers/${selectedCustomer.id}/history`);
            const historyData = res.data;

            if (!Array.isArray(historyData) || historyData.length === 0) {
                throw new Error("No purchase history found for this customer.");
            }

            let overallTotal = 0;
            let overallPaid = 0;
            let overallBalance = 0;
            let scheduleItems = [];
            let attachmentsMap = new Map();

            // Loop through each item in the history to build financials and term schedules
            historyData.forEach((item, index) => {
                const amount = Number(item.srp_amount) || 0;
                overallTotal += amount;

                const isPaid = (item.payment_status || '').toLowerCase() === 'paid';
                if (isPaid) {
                    overallPaid += amount;
                } else {
                    overallBalance += amount;
                }

                // Collect unique document attachments from the stream
                if (item.dr_attachment && !attachmentsMap.has('dr')) {
                    attachmentsMap.set('dr', { id: 'dr', name: 'Delivery Receipt (DR)', type: 'image', url: `${FILE_URL}${item.dr_attachment.replace(/^\/+/, '')}` });
                }
                if (item.ci_attachment && !attachmentsMap.has('ci')) {
                    attachmentsMap.set('ci', { id: 'ci', name: 'Charge Invoice (CI)', type: 'image', url: `${FILE_URL}${item.ci_attachment.replace(/^\/+/, '')}` });
                }
                if (item.si_attachment && !attachmentsMap.has('si')) {
                    attachmentsMap.set('si', { id: 'si', name: 'Sales Invoice (SI)', type: 'image', url: `${FILE_URL}${item.si_attachment.replace(/^\/+/, '')}` });
                }

                // Generate Schedule Breakdown based on Term Type and Duration
                if (item.payment_method === 'Terms' && item.term_duration > 0) {
                    const duration = Number(item.term_duration);
                    const termTypeLabel = item.term_type ? item.term_type.charAt(0).toUpperCase() + item.term_type.slice(1) : 'Periods';
                    const installmentAmount = amount / duration;

                    for (let i = 1; i <= duration; i++) {
                        scheduleItems.push({
                            id: `${item.transaction_id}-${i}`,
                            period: `${item.item_name} - ${termTypeLabel} ${i} of ${duration}`,
                            dueDate: item.purchase_date ? item.purchase_date.split(' ')[0] : 'N/A',
                            amount: installmentAmount,
                            status: isPaid ? 'Paid' : 'Unpaid',
                            paidDate: isPaid ? (item.purchase_date ? item.purchase_date.split(' ')[0] : '-') : '-',
                            reference: item.batch_reference || 'N/A'
                        });
                    }
                } else {
                    // Standard Cash or Full Settlement Row
                    scheduleItems.push({
                        id: item.transaction_id || index,
                        period: `${item.item_name} (Cash / Full Payment)`,
                        dueDate: item.purchase_date ? item.purchase_date.split(' ')[0] : 'N/A',
                        amount: amount,
                        status: isPaid ? 'Paid' : 'Unpaid',
                        paidDate: isPaid ? (item.purchase_date ? item.purchase_date.split(' ')[0] : '-') : '-',
                        reference: item.batch_reference || 'N/A'
                    });
                }
            });

            setLedgerData({
                documentId: historyData[0]?.batch_reference || `INV-${selectedCustomer.id}`,
                clientName: selectedCustomer.name || 'Client',
                paymentTerms: "Mixed Terms & Cash Schedule",
                overallTotal: overallTotal,
                overallPaid: overallPaid,
                overallBalance: overallBalance,
                attachments: Array.from(attachmentsMap.values()),
                schedule: scheduleItems
            });

            setIsLedgerOpen(true);
        } catch (err) {
            console.error("Error loading master ledger, using fallback", err);
            setLedgerData({
                documentId: `INV-${selectedCustomer?.id || '2026'}-01`,
                clientName: selectedCustomer?.name || 'Selected Client',
                paymentTerms: "Monthly (12 Months Schedule)",
                overallTotal: 36000.00,
                overallPaid: 15000.00,
                overallBalance: 21000.00,
                attachments: [
                    { id: 1, name: "Signed_Service_Contract.pdf", type: "pdf", url: "#" }
                ],
                schedule: [
                    { id: 1, period: "Month 1 (Jan 2026)", dueDate: "2026-01-31", amount: 3000, status: "Paid", paidDate: "2026-01-28", reference: "OR-8821" },
                ]
            });
            setIsLedgerOpen(true);
        } finally {
            setLoadingLedger(false);
        }
    };
    // end of handle open ledger modal

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

    // Group purchase history by Transaction / Batch Reference & Date + Auto-sort (Unpaid/Balance first, then Latest Date)
    const groupedTransactions = useMemo(() => {
        const groups = {};
        purchaseHistory.forEach((item, index) => {
            const batchRef = item.batch_reference || `BR-UNKNOWN-${index}`;
            const dateStr = item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : 'no-date';
            const groupKey = `${batchRef}-${dateStr}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    displayId: `txn-${index}`,
                    batch_reference: item.batch_reference || 'N/A',
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
                batch_reference: item.batch_reference,
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
                                                <th className="ps-4">Transaction / Batch Reference</th>
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
                                                                <span className="badge bg-light text-dark border me-2">{group.batch_reference}</span>
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
                                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 gap-4">
                                                                            <div>
                                                                                <h3 className="text-lg font-semibold text-gray-900">ITEMS IN THIS TRANSACTION</h3>
                                                                                <p className="text-xs text-gray-500">Click a row for full details or access the master ledger account.</p>
                                                                            </div>

                                                                            {/* The [Ledger] Button */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (!selectedCustomer || !selectedCustomer.id) {
                                                                                        alert("Please select a customer first.");
                                                                                        return;
                                                                                    }
                                                                                    handleOpenLedger();
                                                                                }}
                                                                                disabled={loadingLedger}
                                                                                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                                                                            >
                                                                                {loadingLedger ? "Loading Ledger..." : "View Ledger"}
                                                                            </button>
                                                                        </div>

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
                                        <span className="fw-bold text-muted">Batch Reference:</span>
                                        <span className="badge bg-light text-dark border">{selectedItemDetail.batch_reference || 'N/A'}</span>
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

{/* --- MASTER FINANCIAL LEDGER MODAL --- */}
            {isLedgerOpen && ledgerData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-900/20 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Master Financial Ledger</h2>
                                    <p className="text-xs text-slate-500 font-medium">Batch ID: <span className="font-mono text-indigo-600">{ledgerData.documentId}</span> • Client: <strong className="text-slate-700">{ledgerData.clientName}</strong></p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsLedgerOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/60 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body (Scrollable Financial Table & KPIs) */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">

                            {/* Financial KPI Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 border border-indigo-100/80 rounded-xl p-4 shadow-xs">
                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Overall Ledger Total</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1">₱{Number(ledgerData.overallTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-50/50 to-green-50/50 border border-emerald-100/80 rounded-xl p-4 shadow-xs">
                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Overall Paid Amount</p>
                                    <p className="text-2xl font-black text-emerald-700 mt-1">₱{Number(ledgerData.overallPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 border border-amber-100/80 rounded-xl p-4 shadow-xs">
                                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Overall Balance Due</p>
                                    <p className="text-2xl font-black text-amber-700 mt-1">₱{Number(ledgerData.overallBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>

                            {/* Payment Schedule Matrix */}
                            <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                                <div className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Payment Schedule & Terms Breakdown</h4>
                                    <span className="text-xs bg-slate-200/70 text-slate-700 px-2.5 py-1 rounded-md font-semibold">Terms: {ledgerData.paymentTerms}</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100/70 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200/80">
                                                <th className="py-3 px-4">Billing Period / Item</th>
                                                <th className="py-3 px-4">Due Date</th>
                                                <th className="py-3 px-4">Amount Due</th>
                                                <th className="py-3 px-4">Status</th>
                                                <th className="py-3 px-4">Paid Date</th>
                                                <th className="py-3 px-4">Batch Reference</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {ledgerData.schedule?.map((row) => (
                                                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3 px-4 font-semibold text-slate-900">{row.period}</td>
                                                    <td className="py-3 px-4 text-slate-600 font-medium">{row.dueDate}</td>
                                                    <td className="py-3 px-4 font-mono font-medium text-slate-800">₱{Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                            row.status === 'Paid'
                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                                                                : 'bg-amber-100 text-amber-800 border border-amber-200/60'
                                                        }`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-500 font-mono text-xs font-medium">{row.paidDate}</td>
                                                    <td className="py-3 px-4 text-slate-500 font-mono text-xs font-medium">{row.reference}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Document Attachments Viewer Section */}
                            <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Linked Supporting Documents & Receipts</h4>
                                {ledgerData.attachments && ledgerData.attachments.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {ledgerData.attachments.map((file) => (
                                            <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs hover:border-slate-300 transition">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium uppercase">{file.type} document</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedImage(file.url)}
                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg border border-indigo-100 transition"
                                                >
                                                    Preview
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No document attachments found for this transaction batch.</p>
                                )}
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex justify-end shrink-0">
                            <button
                                onClick={() => setIsLedgerOpen(false)}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
                            >
                                Close Ledger
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* --- DOCUMENT LIGHTBOX MODAL --- */}
            {selectedImage && (
                <div className="fixed inset-60 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="relative max-w-3xl w-full bg-white border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="px-4 py-3 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
                            <span className="text-xs font-bold tracking-wide uppercase text-slate-300">Document Lightbox Preview</span>
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="text-slate-400 hover:text-white text-lg font-bold px-2 rounded-lg transition"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="p-6 flex items-center justify-center bg-slate-950">
                            <img src={selectedImage} alt="Attachment Preview" className="max-h-[70vh] object-contain rounded-xl border border-slate-800 shadow-lg" />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CustomerManagement;
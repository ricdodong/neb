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
        if (!file || !selectedCustomer) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await axios.post(`${BASE_URL}/api/customers/${selectedCustomer.id}/upload-photo`, formData, {
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

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                {/* Sidebar: Customer List */}
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        {/* Refined Professional Header */}
                        <div className="card-header bg-white border-0 py-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0 fw-bold text-dark">Directory</h5>
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill">
                                    <i className="fas fa-users me-2"></i>
                                    {customers.length} Total
                                </span>
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
                                                <div className="mb-2">
                                                    <span className="badge bg-primary px-3 py-2 rounded-pill me-2">
                                                        <i className="fas fa-phone-alt me-2"></i> {selectedCustomer.contact || 'N/A'}
                                                    </span>
                                                </div>
                                                <p className="mb-0 opacity-75">
                                                    <i className="fas fa-map-marker-alt me-2 text-danger"></i>{selectedCustomer.address}
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
                                    <i className="fas fa-shopping-bag me-2 text-primary"></i>Purchase Ledger
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
        </div>
    );
};

export default CustomerManagement;
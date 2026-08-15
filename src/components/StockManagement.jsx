import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';

const StockManagement = () => {
    const [inventory, setInventory] = useState([]);
    const [expandedItemId, setExpandedItemId] = useState(null);
    const [ledgers, setLedgers] = useState({});
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Modal Form State
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        supplier_id: '',
        item_name: '',
        description: '',
        quantity: '',
        ws_price: '',
        srp_amount: '',
        forward_by: '',
        freight_cost: '',
        image_url: '' 
    });

    useEffect(() => {
        fetchInventory();
        fetchSuppliers();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/inventory`);
            setInventory(res.data);
        } catch (err) {
            console.error("Backend unreachable", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/suppliers`);
            setSuppliers(res.data);
        } catch (err) {
            console.error("Error fetching suppliers, using fallbacks", err);
            setSuppliers([
                { id: 1, name: 'Default Supplier Inc.' },
                { id: 2, name: 'Global Logistics Corp.' }
            ]);
        }
    };

    const toggleLedger = async (item) => {
        if (expandedItemId === item.id) {
            setExpandedItemId(null);
            return;
        }

        setExpandedItemId(item.id);
        
        // Fetch only if not already cached
        if (!ledgers[item.id]) {
            setLedgerLoading(true);
            try {
                const res = await axios.get(`${BASE_URL}/api/inventory/${item.id}/ledger`);
                setLedgers(prev => ({ ...prev, [item.id]: res.data }));
            } catch (err) {
                console.error("Error fetching ledger", err);
                setLedgers(prev => ({ ...prev, [item.id]: [] }));
            } finally {
                setLedgerLoading(false);
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleItemSelectChange = (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            setFormData({ ...formData, item_name: '', description: '', srp_amount: '', image_url: '' });
            return;
        }

        const found = inventory.find(i => i.id.toString() === selectedId);
        if (found) {
            setFormData({
                ...formData,
                item_name: found.item_name || '',
                description: found.item_description || '',
                srp_amount: found.srp_amount || '',
                image_url: found.image_url || ''
            });
        }
    };

    const openGoogleImageSearch = () => {
        if (!formData.item_name) return;
        const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(formData.item_name)}`;
        window.open(searchUrl, '_blank');
    };

    const handleSubmitStock = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await axios.post(`${BASE_URL}/api/inventory/add`, formData);

            setShowModal(false);
            setFormData({
                supplier_id: '',
                item_name: '',
                description: '',
                quantity: '',
                ws_price: '',
                srp_amount: '',
                forward_by: '',
                freight_cost: '',
                image_url: ''
            });

            fetchInventory();
        } catch (err) {
            console.error("Error adding stock entry", err);
            alert("Failed to save stock entry. Please check console log.");
        } finally {
            setSubmitting(false);
        }
    };

    const renderStatusBadge = (qty) => {
        if (qty <= 0) {
            return <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-1">OUT OF STOCK</span>;
        } else if (qty <= 2) {
            return <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis px-3 py-1">LOW STOCK</span>;
        }
        return <span className="badge rounded-pill bg-success-subtle text-success px-3 py-1">HEALTHY</span>;
    };

    return (
        <div className="container-fluid px-2 px-md-4 py-4 animate-fade-in">
            <div className="row g-4">
                {/* Master Inventory List */}
                <div className="col-12">
                    <div className="card shadow-sm border-0 rounded-3 mb-4">
                        <div className="card-header bg-white border-bottom-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 py-3 px-3 px-md-4">
                            <div>
                                <h5 className="mb-1 fw-bold text-dark">
                                    <i className="fa fa-boxes text-primary me-2"></i>Current Stock Levels
                                </h5>
                                <p className="text-muted small mb-0">Manage master inventory, track quantities, and review on-hand stock status.</p>
                            </div>
                            <button 
                                className="btn btn-primary btn-sm shadow-sm px-3 py-2 align-self-start align-self-md-auto"
                                onClick={() => setShowModal(true)}
                            >
                                <i className="fa fa-plus-circle me-1"></i> Add / Entry Stocks
                            </button>
                        </div>
                        
                        <div className="card-body p-0">
                            {loading ? (
                                <div className="text-center py-5 text-muted">
                                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                    Loading inventory levels...
                                </div>
                            ) : inventory.length > 0 ? (
                                <>
                                    {/* Desktop Table View */}
                                    <div className="table-responsive d-none d-lg-block">
                                        <table className="table table-hover align-middle mb-0 text-nowrap">
                                            <thead className="table-light text-uppercase fs-7 text-secondary fw-bold">
                                                <tr>
                                                    <th className="py-3 ps-4">Item #</th>
                                                    <th className="py-3">Item Name</th>
                                                    <th className="py-3 text-center">Total Stock</th>
                                                    <th className="py-3 text-center">Sold Out</th>
                                                    <th className="py-3 text-center">Available</th>
                                                    <th className="py-3">Status</th>
                                                    <th className="py-3 text-end pe-4">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {inventory.map(item => {
                                                    const isExpanded = expandedItemId === item.id;
                                                    const itemLedger = ledgers[item.id] || [];

                                                    return (
                                                        <React.Fragment key={item.id}>
                                                            <tr className={isExpanded ? 'table-active' : ''}>
                                                                <td className="ps-4 text-muted fw-semibold">#{item.id}</td>
                                                                <td className="fw-semibold">
                                                                    <div className="d-flex align-items-center">
                                                                        {item.image_url ? (
                                                                            <img 
                                                                                src={item.image_url} 
                                                                                alt={item.item_name} 
                                                                                className="rounded-circle me-3 border bg-light shadow-sm" 
                                                                                style={{width: '38px', height: '38px', objectFit: 'contain'}} 
                                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                                            />
                                                                        ) : (
                                                                            <div className="rounded-circle bg-light text-secondary d-flex align-items-center justify-content-center me-3 border shadow-sm" style={{width: '38px', height: '38px', fontSize: '14px'}}>
                                                                                <i className="fa fa-image"></i>
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <span className="text-dark fw-bold d-block">{item.item_name}</span>
                                                                            {item.item_description && <small className="text-muted text-truncate d-block" style={{maxWidth: '220px'}}>{item.item_description}</small>}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="text-center">
                                                                    <span className="badge bg-light text-dark border px-3 py-2 fw-bold">{item.total_qty || 0}</span>
                                                                </td>
                                                                <td className="text-center">
                                                                    <span className="badge bg-light text-danger border px-3 py-2 fw-bold">{item.soldout_qty || 0}</span>
                                                                </td>
                                                                <td className="text-center">
                                                                    <span className={`fw-bold fs-6 ${item.available_qty === 0 ? 'text-danger' : 'text-primary'}`}>
                                                                        {item.available_qty || 0}
                                                                    </span>
                                                                </td>
                                                                <td>{renderStatusBadge(item.available_qty)}</td>
                                                                <td className="text-end pe-4">
                                                                    <button 
                                                                        className={`btn btn-sm shadow-sm px-3 ${isExpanded ? 'btn-primary' : 'btn-outline-primary'}`}
                                                                        onClick={() => toggleLedger(item)}
                                                                    >
                                                                        <i className={`fa ${isExpanded ? 'fa-chevron-up' : 'fa-history'} me-1`}></i> 
                                                                        {isExpanded ? 'Hide Ledger' : 'View Ledger'}
                                                                    </button>
                                                                </td>
                                                            </tr>

                                                            {/* Inline Ledger Expandable Row */}
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan="7" className="bg-light p-4 border-bottom shadow-inner">
                                                                        <div className="card border-0 shadow-sm rounded-3">
                                                                            <div className="card-header bg-white py-2 px-3 d-flex justify-content-between align-items-center">
                                                                                <span className="fw-bold text-primary small">
                                                                                    <i className="fa fa-list-alt me-1"></i> Movement History for {item.item_name}
                                                                                </span>
                                                                                <button className="btn btn-sm btn-link text-muted p-0" onClick={() => setExpandedItemId(null)}>
                                                                                    <i className="fa fa-times"></i>
                                                                                </button>
                                                                            </div>
                                                                            <div className="card-body p-0">
                                                                                {ledgerLoading ? (
                                                                                    <div className="text-center py-3 text-muted small">
                                                                                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                                                                        Loading movement history...
                                                                                    </div>
                                                                                ) : itemLedger.length > 0 ? (
                                                                                    <div className="table-responsive mb-0">
                                                                                        <table className="table table-sm table-striped mb-0 align-middle text-nowrap small">
                                                                                            <thead className="table-dark text-uppercase" style={{fontSize: '11px'}}>
                                                                                                <tr>
                                                                                                    <th className="py-2 ps-3">Date & Time</th>
                                                                                                    <th className="py-2">Type</th>
                                                                                                    <th className="py-2">Qty Change</th>
                                                                                                    <th className="py-2">Source/Customer</th>
                                                                                                    <th className="py-2">Address</th>
                                                                                                    <th className="py-2">Forward By</th>
                                                                                                    <th className="py-2 pe-3">Freight Cost</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody>
                                                                                                {itemLedger.map((entry, idx) => (
                                                                                                    <tr key={idx}>
                                                                                                        <td className="ps-3 text-muted">{new Date(entry.date).toLocaleString()}</td>
                                                                                                        <td>
                                                                                                            <span className={`badge rounded-pill px-2 py-0.5 ${['in', 'input'].includes(entry.type.toLowerCase()) ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`} style={{fontSize: '10px'}}>
                                                                                                                {entry.type.toUpperCase()}
                                                                                                            </span>
                                                                                                        </td>
                                                                                                        <td className="fw-bold">
                                                                                                            <span className={entry.qty > 0 ? 'text-success' : 'text-danger'}>
                                                                                                                {entry.qty > 0 ? `+${entry.qty}` : entry.qty}
                                                                                                            </span>
                                                                                                        </td>
                                                                                                        <td>
                                                                                                            <i className={`fa ${entry.qty > 0 ? 'fa-user' : 'fa-shopping-cart'} me-1 opacity-50`}></i>
                                                                                                            <span className="fw-semibold">{entry.source || 'N/A'}</span>
                                                                                                        </td>
                                                                                                        <td className="text-muted fst-italic">{entry.address || 'N/A'}</td>
                                                                                                        <td>
                                                                                                            <i className="fa fa-truck me-1 text-muted"></i> {entry.forwardBy || entry.courier || 'N/A'}
                                                                                                        </td>
                                                                                                        <td className="pe-3 fw-semibold text-dark">
                                                                                                            ₱{parseFloat(entry.freightCost || entry.shipping_cost || 0).toFixed(2)}
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-center py-3 text-muted small">No movement history found for this item.</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile & Tablet Card List View */}
                                    <div className="d-lg-none p-3 d-flex flex-column gap-3">
                                        {inventory.map(item => {
                                            const isExpanded = expandedItemId === item.id;
                                            const itemLedger = ledgers[item.id] || [];

                                            return (
                                                <div key={item.id} className="card border shadow-sm rounded-3 p-3 bg-white">
                                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                                        <div className="d-flex align-items-center gap-2">
                                                            {item.image_url ? (
                                                                <img 
                                                                    src={item.image_url} 
                                                                    alt={item.item_name} 
                                                                    className="rounded-circle border bg-light" 
                                                                    style={{width: '36px', height: '36px', objectFit: 'contain'}} 
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                <div className="rounded-circle bg-light text-secondary d-flex align-items-center justify-content-center border" style={{width: '36px', height: '36px', fontSize: '12px'}}>
                                                                    <i className="fa fa-image"></i>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <h6 className="mb-0 fw-bold text-dark">{item.item_name}</h6>
                                                                <small className="text-muted">#{item.id}</small>
                                                            </div>
                                                        </div>
                                                        {renderStatusBadge(item.available_qty)}
                                                    </div>
                                                    <div className="row g-2 text-center bg-light rounded-2 p-2 my-2 small">
                                                        <div className="col-4 border-end">
                                                            <span className="text-muted d-block" style={{fontSize: '11px'}}>Total</span>
                                                            <span className="fw-bold">{item.total_qty || 0}</span>
                                                        </div>
                                                        <div className="col-4 border-end">
                                                            <span className="text-muted d-block" style={{fontSize: '11px'}}>Sold</span>
                                                            <span className="fw-bold text-danger">{item.soldout_qty || 0}</span>
                                                        </div>
                                                        <div className="col-4">
                                                            <span className="text-muted d-block" style={{fontSize: '11px'}}>Available</span>
                                                            <span className="fw-bold text-primary">{item.available_qty || 0}</span>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex justify-content-end mt-1">
                                                        <button 
                                                            className={`btn btn-sm w-100 ${isExpanded ? 'btn-primary' : 'btn-outline-primary'}`}
                                                            onClick={() => toggleLedger(item)}
                                                        >
                                                            <i className={`fa ${isExpanded ? 'fa-chevron-up' : 'fa-history'} me-1`}></i> 
                                                            {isExpanded ? 'Hide Ledger' : 'View Ledger Movement'}
                                                        </button>
                                                    </div>

                                                    {/* Mobile Expandable Ledger Accordion */}
                                                    {isExpanded && (
                                                        <div className="mt-3 pt-3 border-top bg-light p-2 rounded-2 animate-fade-in">
                                                            <span className="fw-bold text-primary small d-block mb-2">
                                                                <i className="fa fa-list-alt me-1"></i> Movement History:
                                                            </span>
                                                            {ledgerLoading ? (
                                                                <div className="text-center py-2 text-muted small">Loading history...</div>
                                                            ) : itemLedger.length > 0 ? (
                                                                <div className="d-flex flex-column gap-2">
                                                                    {itemLedger.map((entry, idx) => (
                                                                        <div key={idx} className="bg-white border rounded p-2 small">
                                                                            <div className="d-flex justify-content-between text-muted" style={{fontSize: '10px'}}>
                                                                                <span>{new Date(entry.date).toLocaleString()}</span>
                                                                                <span className={`badge ${['in', 'input'].includes(entry.type.toLowerCase()) ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                                                                    {entry.type.toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                            <div className="fw-bold mt-1">
                                                                                Qty: <span className={entry.qty > 0 ? 'text-success' : 'text-danger'}>{entry.qty > 0 ? `+${entry.qty}` : entry.qty}</span>
                                                                            </div>
                                                                            <div className="text-dark small">Source: {entry.source || 'N/A'}</div>
                                                                            <div className="text-muted fst-italic" style={{fontSize: '11px'}}>{entry.address || 'N/A'}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center py-2 text-muted small">No movement history found.</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-5 text-muted">No inventory records found.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Stock Modal */}
            {showModal && (
                <div className="modal show d-block px-2" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow-lg rounded-3">
                            <div className="modal-header bg-primary text-white py-3 px-4">
                                <h5 className="modal-title fw-bold">
                                    <i className="fa fa-plus-circle me-2"></i> Add / Entry Stocks
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmitStock}>
                                <div className="modal-body p-3 p-md-4">
                                    <div className="row g-3">
                                        
                                        {/* Supplier Select */}
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fw-semibold text-secondary small">Supplier Name</label>
                                            <select name="supplier_id" className="form-select" value={formData.supplier_id} onChange={handleInputChange} required>
                                                <option value="">Select Supplier</option>
                                                {suppliers.map(sup => (
                                                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        {/* Item Name */}
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fw-semibold text-secondary small">Item Name</label>
                                            <select 
                                                className="form-select mb-2" 
                                                onChange={handleItemSelectChange}
                                                defaultValue=""
                                            >
                                                <option value="">-- Select Existing Item or Type Below --</option>
                                                {inventory.map(inv => (
                                                    <option key={inv.id} value={inv.id}>{inv.item_name}</option>
                                                ))}
                                            </select>
                                            <input 
                                                type="text" 
                                                name="item_name" 
                                                className="form-control" 
                                                placeholder="Or type new item name" 
                                                value={formData.item_name} 
                                                onChange={handleInputChange} 
                                                required 
                                            />
                                        </div>

                                        {/* Picture Field */}
                                        <div className="col-12 mt-3">
                                            <label className="form-label fw-semibold text-primary small">Picture (Image URL)</label>
                                            <div className="input-group mb-2">
                                                <span className="input-group-text bg-light"><i className="fa fa-link"></i></span>
                                                <input 
                                                    type="text" 
                                                    name="image_url" 
                                                    className="form-control" 
                                                    placeholder="Paste image address URL here" 
                                                    value={formData.image_url} 
                                                    onChange={handleInputChange} 
                                                />
                                                <button 
                                                    type="button" 
                                                    className="btn btn-outline-primary"
                                                    onClick={openGoogleImageSearch}
                                                    disabled={!formData.item_name}
                                                    title="Open Google Image Search in new tab"
                                                >
                                                    <i className="fa fa-external-link-alt me-1"></i> <span className="d-none d-sm-inline">Google</span> Images
                                                </button>
                                            </div>
                                            <div className="form-text text-muted small mb-2">
                                                <i className="fa fa-info-circle me-1"></i> Click search to find your item, right-click to <strong>Copy image address</strong>, and paste above.
                                            </div>

                                            {/* LIVE IMAGE PREVIEW BOX */}
                                            {formData.image_url && (
                                                <div className="d-flex align-items-center gap-3 p-2 bg-light rounded border mb-2">
                                                    <span className="small fw-semibold text-secondary">Live Preview:</span>
                                                    <img 
                                                        src={formData.image_url} 
                                                        alt="Preview" 
                                                        className="border bg-white rounded shadow-sm" 
                                                        style={{ height: '40px', width: '40px', objectFit: 'contain' }}
                                                        onError={(e) => { 
                                                            e.target.onerror = null; 
                                                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f8d7da'/%3E%3Ctext x='50%25' y='50%25' font-size='10' fill='%23721c24' dominant-baseline='middle' text-anchor='middle'%3EError%3C/text%3E%3C/svg%3E"; 
                                                        }}
                                                    />
                                                    <span className="text-success small"><i className="fa fa-check-circle"></i> Image link active</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-12 mt-3">
                                            <label className="form-label fw-semibold text-secondary small">Description</label>
                                            <textarea name="description" className="form-control" rows="2" placeholder="Enter product description" value={formData.description} onChange={handleInputChange}></textarea>
                                        </div>
                                        
                                        <div className="col-12 col-md-4">
                                            <label className="form-label fw-semibold text-secondary small">Quantity</label>
                                            <input type="number" name="quantity" className="form-control" placeholder="0" min="1" value={formData.quantity} onChange={handleInputChange} required />
                                        </div>
                                        
                                        <div className="col-12 col-md-4">
                                            <label className="form-label fw-semibold text-secondary small">W/S Price</label>
                                            <input type="number" step="0.01" name="ws_price" className="form-control" placeholder="0.00" value={formData.ws_price} onChange={handleInputChange} required />
                                        </div>
                                        
                                        <div className="col-12 col-md-4">
                                            <label className="form-label fw-semibold text-secondary small">SRP Amount</label>
                                            <input type="number" step="0.01" name="srp_amount" className="form-control" placeholder="0.00" value={formData.srp_amount} onChange={handleInputChange} required />
                                        </div>
                                        
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fw-semibold text-secondary small">Forward By</label>
                                            <input type="text" name="forward_by" className="form-control" placeholder="Courier or Handler" value={formData.forward_by} onChange={handleInputChange} />
                                        </div>
                                        
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fw-semibold text-secondary small">Freight Cost</label>
                                            <input type="number" step="0.01" name="freight_cost" className="form-control" placeholder="0.00" value={formData.freight_cost} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light py-3 px-4">
                                    <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary px-4" disabled={submitting}>
                                        {submitting ? (
                                            <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Saving...</>
                                        ) : 'Save Stock Entry'}
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

export default StockManagement;
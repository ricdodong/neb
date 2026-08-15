import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';

const StockManagement = () => {
    const [inventory, setInventory] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Image Search States
    const [imageResults, setImageResults] = useState([]);
    const [isSearchingImages, setIsSearchingImages] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);

    // Modal Form State
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        supplier_id: '',
        item_name: '',
        description: '',
        quantity: '',
        ws_price: '',
        srp_price: '',
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

    const fetchLedger = async (item) => {
        setSelectedItem(item);
        try {
            const res = await axios.get(`${BASE_URL}/api/inventory/${item.id}/ledger`);
            setLedger(res.data);
        } catch (err) {
            console.error("Error fetching ledger", err);
            setLedger([]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle Item Selection from existing inventory list
    const handleItemSelectChange = (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            setFormData({ ...formData, item_name: '', description: '', srp_price: '', image_url: '' });
            return;
        }

        const found = inventory.find(i => i.id.toString() === selectedId);
        if (found) {
            setFormData({
                ...formData,
                item_name: found.item_name || '',
                description: found.item_description || '',
                srp_price: found.srp_amount || '',
                image_url: found.image_url || ''
            });
        }
    };

    // Using Google Custom Search Engine (CSE) API to retrieve product & logo images
    const searchWebImages = async (query) => {
        if (!query) return;
        setIsSearchingImages(true);
        setImageResults([]);
        setSearchPerformed(false);
        
        try {
            // Replace with your Google Custom Search API key and Programmable Search Engine ID (CX)
            const apiKey = "AIzaSyAyur479VcmfhUIeSBbRzhA6sDpaN4yMSM";
            const cxId = "e4e812fc701df4163";

            const res = await axios.get(
                `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxId}&q=${encodeURIComponent(query)}&searchType=image&num=8`
            );
            
            const items = res.data.items;
            if (items && items.length > 0) {
                const urls = items
                    .map(item => item.link)
                    .filter(url => url && /\.(jpg|jpeg|png|svg|webp)$/i.test(url));
                
                setImageResults(urls);
            }
        } catch (err) {
            console.error("Google Image search failed", err);
            alert("Google Image search requires a valid API Key and CSE ID. Please check console configuration or paste URL directly.");
        } finally {
            setIsSearchingImages(false);
            setSearchPerformed(true);
        }
    };

    const handleSubmitStock = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await axios.post(`${BASE_URL}/api/inventory/add`, formData);

            // Reset Form & Close Modal
            setShowModal(false);
            setFormData({
                supplier_id: '',
                item_name: '',
                description: '',
                quantity: '',
                ws_price: '',
                srp_price: '',
                forward_by: '',
                freight_cost: '',
                image_url: ''
            });
            setImageResults([]);
            setSearchPerformed(false);

            // Refresh Inventory Grid
            fetchInventory();
        } catch (err) {
            console.error("Error adding stock entry", err);
            alert("Failed to save stock entry. Please check console log.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 animate-fade-in">
            <div className="row g-4">
                {/* Master Inventory List */}
                <div className="col-lg-12">
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                            <h5 className="mb-0 fw-bold text-dark">
                                <i className="fa fa-boxes text-primary me-2"></i>Current Stock Levels
                            </h5>
                            <button 
                                className="btn btn-primary btn-sm shadow-sm"
                                onClick={() => setShowModal(true)}
                            >
                                <i className="fa fa-plus-circle me-1"></i> Add / Entry Stocks
                            </button>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light text-secondary">
                                        <tr>
                                            <th className="ps-4">Item #</th>
                                            <th>Item Name</th>
                                            <th className="text-center">Total Stock (Lifetime)</th>
                                            <th className="text-center">Remaining (On-Hand)</th>
                                            <th>Status</th>
                                            <th className="text-end pe-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="6" className="text-center py-4 text-muted">
                                                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                                    Loading inventory...
                                                </td>
                                            </tr>
                                        ) : inventory.length > 0 ? (
                                            inventory.map(item => (
                                                <tr key={item.id}>
                                                    <td className="ps-4 text-muted">#{item.id}</td>
                                                    <td className="fw-bold d-flex align-items-center">
                                                        {item.image_url ? (
                                                            <img 
                                                                src={item.image_url} 
                                                                alt={item.item_name} 
                                                                className="rounded-circle me-2 border bg-white" 
                                                                style={{width: '35px', height: '35px', objectFit: 'contain'}} 
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <div className="rounded-circle bg-light text-secondary d-flex align-items-center justify-content-center me-2 border" style={{width: '35px', height: '35px', fontSize: '12px'}}>
                                                                <i className="fa fa-image"></i>
                                                            </div>
                                                        )}
                                                        {item.item_name}
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="text-secondary fw-bold">{item.total_qty}</span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`fw-bold fs-6 ${item.remaining_stock === 0 ? 'text-danger' : 'text-primary'}`}>
                                                            {item.remaining_stock}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {item.remaining_stock <= 0 ? (
                                                            <span className="badge bg-danger">OUT OF STOCK</span>
                                                        ) : item.remaining_stock <= 2 ? (
                                                            <span className="badge bg-warning text-dark">LOW STOCK</span>
                                                        ) : (
                                                            <span className="badge bg-success">HEALTHY</span>
                                                        )}
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <button 
                                                            className="btn btn-sm btn-light border shadow-sm"
                                                            onClick={() => fetchLedger(item)}
                                                        >
                                                            <i className="fa fa-history me-1"></i> View Ledger
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="text-center py-4 text-muted">No inventory records found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Stock Ledger */}
                {selectedItem && (
                    <div className="col-lg-12">
                        <div className="card shadow-sm border-0 border-top border-primary border-4">
                            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold">
                                    Movement History: <span className="text-primary">{selectedItem.item_name}</span>
                                </h5>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedItem(null)}>
                                    <i className="fa fa-times me-1"></i> Close
                                </button>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-striped mb-0 align-middle">
                                        <thead className="table-dark">
                                            <tr>
                                                <th className="ps-4">Date</th>
                                                <th>Type</th>
                                                <th>Qty Change</th>
                                                <th>Source/Customer</th>
                                                <th className="pe-4">Address</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ledger.length > 0 ? ledger.map((entry, index) => (
                                                <tr key={index} className="small">
                                                    <td className="ps-4">{new Date(entry.date).toLocaleString()}</td>
                                                    <td>
                                                        <span className={`badge ${['in', 'input'].includes(entry.type.toLowerCase()) ? 'bg-success' : 'bg-danger'}`}>
                                                            {entry.type.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="fw-bold">
                                                        {entry.qty > 0 ? `+${entry.qty}` : entry.qty}
                                                    </td>
                                                    <td>
                                                        <i className={`fa ${entry.qty > 0 ? 'fa-truck' : 'fa-shopping-cart'} me-2 opacity-50`}></i>
                                                        {entry.source}
                                                    </td>
                                                    <td className="pe-4 text-muted fst-italic">{entry.address}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="5" className="text-center py-4 text-muted">No movement history found for this item.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Stock Modal */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title fw-bold">
                                    <i className="fa fa-plus-circle me-2"></i> Add / Entry Stocks
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmitStock}>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        
                                        {/* Supplier Select */}
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Supplier Name</label>
                                            <select name="supplier_id" className="form-select" value={formData.supplier_id} onChange={handleInputChange} required>
                                                <option value="">Select Supplier</option>
                                                {suppliers.map(sup => (
                                                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        {/* Item Name (Auto-select from inventory OR custom type) */}
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Item Name</label>
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

                                        {/* Picture Field with Integrated Google Web Image Search & Live Preview */}
                                        <div className="col-12 mt-3">
                                            <label className="form-label fw-semibold text-primary">Picture (Image URL)</label>
                                            <div className="input-group mb-2">
                                                <span className="input-group-text"><i className="fa fa-link"></i></span>
                                                <input 
                                                    type="text" 
                                                    name="image_url" 
                                                    className="form-control" 
                                                    placeholder="Paste URL or search web using item name" 
                                                    value={formData.image_url} 
                                                    onChange={handleInputChange} 
                                                />
                                                <button 
                                                    type="button" 
                                                    className="btn btn-outline-primary"
                                                    onClick={() => searchWebImages(formData.item_name)}
                                                    disabled={!formData.item_name || isSearchingImages}
                                                    title="Search Web Images"
                                                >
                                                    <i className={`fa ${isSearchingImages ? 'fa-spinner fa-spin' : 'fa-search'}`}></i> Google Search
                                                </button>
                                            </div>

                                            {/* LIVE IMAGE PREVIEW BOX with Bulletproof Local SVG Fallback */}
                                            {formData.image_url && (
                                                <div className="d-flex align-items-center gap-2 p-2 bg-light rounded border mb-2">
                                                    <span className="small fw-semibold text-secondary">Live Preview:</span>
                                                    <img 
                                                        src={formData.image_url} 
                                                        alt="Preview" 
                                                        className="border bg-white rounded" 
                                                        style={{ height: '40px', width: '40px', objectFit: 'contain' }}
                                                        onError={(e) => { 
                                                            e.target.onerror = null; 
                                                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f8d7da'/%3E%3Ctext x='50%25' y='50%25' font-size='10' fill='%23721c24' dominant-baseline='middle' text-anchor='middle'%3EError%3C/text%3E%3C/svg%3E"; 
                                                        }}
                                                    />
                                                    <span className="text-success small"><i className="fa fa-check-circle"></i> Image link active</span>
                                                </div>
                                            )}
                                            
                                            {/* Web Image Results Loading & Empty States */}
                                            {isSearchingImages && (
                                                <div className="text-center py-2 text-muted small">
                                                    <div className="spinner-border spinner-border-sm text-primary me-1" role="status"></div>
                                                    Searching Google Images for "{formData.item_name}"...
                                                </div>
                                            )}

                                            {searchPerformed && imageResults.length === 0 && !isSearchingImages && (
                                                <div className="alert alert-warning py-2 small mb-2">
                                                    <i className="fa fa-exclamation-triangle me-1"></i> No matching images found. You can paste an external URL (such as from Office Warehouse) directly above.
                                                </div>
                                            )}

                                            {imageResults.length > 0 && (
                                                <div className="row g-2 mt-2 bg-light p-2 rounded border" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                                    <span className="small text-muted mb-1 d-block"><i className="fa fa-info-circle me-1"></i> Click an image thumbnail to set it as the picture link:</span>
                                                    {imageResults.map((url, idx) => (
                                                        <div className="col-3" key={idx}>
                                                            <div 
                                                                className={`border rounded p-1 text-center bg-white ${formData.image_url === url ? 'border-primary border-3 shadow' : 'border-secondary'}`}
                                                                onClick={() => setFormData({...formData, image_url: url})}
                                                                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                                            >
                                                                <img 
                                                                    src={url} 
                                                                    alt={`result-${idx}`} 
                                                                    className="img-fluid rounded" 
                                                                    style={{ height: '70px', width: '100%', objectFit: 'contain' }} 
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-12 mt-3">
                                            <label className="form-label fw-semibold">Description</label>
                                            <textarea name="description" className="form-control" rows="2" placeholder="Enter product description" value={formData.description} onChange={handleInputChange}></textarea>
                                        </div>
                                        
                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Quantity</label>
                                            <input type="number" name="quantity" className="form-control" placeholder="0" min="1" value={formData.quantity} onChange={handleInputChange} required />
                                        </div>
                                        
                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">WS Price</label>
                                            <input type="number" step="0.01" name="ws_price" className="form-control" placeholder="0.00" value={formData.ws_price} onChange={handleInputChange} required />
                                        </div>
                                        
                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">SRP Price</label>
                                            <input type="number" step="0.01" name="srp_price" className="form-control" placeholder="0.00" value={formData.srp_price} onChange={handleInputChange} required />
                                        </div>
                                        
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Forward By</label>
                                            <input type="text" name="forward_by" className="form-control" placeholder="Courier or Handler" value={formData.forward_by} onChange={handleInputChange} />
                                        </div>
                                        
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Freight Cost</label>
                                            <input type="number" step="0.01" name="freight_cost" className="form-control" placeholder="0.00" value={formData.freight_cost} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
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
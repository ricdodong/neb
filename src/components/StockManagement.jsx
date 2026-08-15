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

    // Modal Form State (Updated with image_url)
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
            console.error("Error fetching suppliers", err);
            // Fallback mock suppliers
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
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Free, no-key image search using Wikimedia Commons API
    const searchWebImages = async (query) => {
        if (!query) return;
        setIsSearchingImages(true);
        setImageResults([]);
        
        try {
            const res = await axios.get(
                `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json&origin=*`
            );
            
            const pages = res.data.query?.pages;
            if (pages) {
                // Extract URLs from the Wikipedia response
                const urls = Object.values(pages)
                    .map(page => page.imageinfo?.[0]?.url)
                    .filter(url => url && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.jpeg')));
                
                setImageResults(urls.slice(0, 4)); // Limit to top 4 results
            }
        } catch (err) {
            console.error("Image search failed", err);
        } finally {
            setIsSearchingImages(false);
        }
    };

    const handleSubmitStock = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Sending standard JSON since we are passing a URL string, not a file
            await axios.post(`${BASE_URL}/api/inventory/add`, formData);

            // Reset form & close modal
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

            // Refresh table
            fetchInventory();
        } catch (err) {
            console.error("Error adding stock entry", err);
            alert("Failed to save stock entry. Please check your inputs.");
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
                                                    <td className="fw-bold">
                                                        {/* Optional: Show small thumbnail in table if you fetch image_url in master list */}
                                                        {item.image_url && <img src={item.image_url} alt="item" className="rounded-circle me-2" style={{width: '30px', height: '30px', objectFit: 'cover'}} />}
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

                {/* Detailed Stock Ledger (Omitted here for brevity, remains unchanged from previous version) */}
                {/* ... */}
                
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
                                        
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Supplier Name</label>
                                            <select name="supplier_id" className="form-select" value={formData.supplier_id} onChange={handleInputChange} required>
                                                <option value="">Select Supplier</option>
                                                {suppliers.map(sup => (
                                                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Item Name</label>
                                            <div className="input-group">
                                                <input 
                                                    type="text" 
                                                    name="item_name" 
                                                    className="form-control" 
                                                    placeholder="Enter item name" 
                                                    value={formData.item_name} 
                                                    onChange={handleInputChange} 
                                                    required 
                                                />
                                                <button 
                                                    type="button" 
                                                    className="btn btn-outline-primary"
                                                    onClick={() => searchWebImages(formData.item_name)}
                                                    disabled={!formData.item_name || isSearchingImages}
                                                    title="Find Image on Web"
                                                >
                                                    <i className={`fa ${isSearchingImages ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="col-12 mt-3">
                                            <label className="form-label fw-semibold text-primary">Item Image Selection</label>
                                            <div className="input-group mb-2">
                                                <span className="input-group-text"><i className="fa fa-link"></i></span>
                                                <input 
                                                    type="text" 
                                                    name="image_url" 
                                                    className="form-control" 
                                                    placeholder="Click search above, or manually paste an Image URL" 
                                                    value={formData.image_url} 
                                                    onChange={handleInputChange} 
                                                />
                                            </div>
                                            
                                            {/* Render Web Image Results */}
                                            {imageResults.length > 0 && (
                                                <div className="row g-2 mt-2 bg-light p-2 rounded border">
                                                    <span className="small text-muted mb-1 d-block"><i className="fa fa-info-circle"></i> Click an image to select it:</span>
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
                                                                    style={{ height: '80px', width: '100%', objectFit: 'cover' }} 
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
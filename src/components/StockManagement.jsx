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
        picture: null
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
            // Replace endpoint if your suppliers route is different
            const res = await axios.get(`${BASE_URL}/api/suppliers`);
            setSuppliers(res.data);
        } catch (err) {
            console.error("Error fetching suppliers", err);
            // Fallback mock suppliers if API isn't set up yet
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
        const { name, value, files } = e.target;
        if (name === 'picture') {
            setFormData({ ...formData, picture: files[0] });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmitStock = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });

            await axios.post(`${BASE_URL}/api/inventory/add`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

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
                picture: null
            });

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
                                                    <td className="fw-bold">{item.item_name}</td>
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
                                    <i className="fa fa-times"></i> Close
                                </button>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-striped mb-0">
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
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Supplier Name</label>
                                            <select 
                                                name="supplier_id" 
                                                className="form-select" 
                                                value={formData.supplier_id} 
                                                onChange={handleInputChange} 
                                                required
                                            >
                                                <option value="">Select Supplier</option>
                                                {suppliers.map(sup => (
                                                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Item Name</label>
                                            <input 
                                                type="text" 
                                                name="item_name" 
                                                className="form-control" 
                                                placeholder="Enter item name" 
                                                value={formData.item_name} 
                                                onChange={handleInputChange} 
                                                required 
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Description</label>
                                            <textarea 
                                                name="description" 
                                                className="form-control" 
                                                rows="2" 
                                                placeholder="Enter product description" 
                                                value={formData.description} 
                                                onChange={handleInputChange}
                                            ></textarea>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Quantity</label>
                                            <input 
                                                type="number" 
                                                name="quantity" 
                                                className="form-control" 
                                                placeholder="0" 
                                                min="1" 
                                                value={formData.quantity} 
                                                onChange={handleInputChange} 
                                                required 
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">WS Price</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                name="ws_price" 
                                                className="form-control" 
                                                placeholder="0.00" 
                                                value={formData.ws_price} 
                                                onChange={handleInputChange} 
                                                required 
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">SRP Price</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                name="srp_price" 
                                                className="form-control" 
                                                placeholder="0.00" 
                                                value={formData.srp_price} 
                                                onChange={handleInputChange} 
                                                required 
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Forward By</label>
                                            <input 
                                                type="text" 
                                                name="forward_by" 
                                                className="form-control" 
                                                placeholder="Courier or Handler" 
                                                value={formData.forward_by} 
                                                onChange={handleInputChange} 
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Freight Cost</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                name="freight_cost" 
                                                className="form-control" 
                                                placeholder="0.00" 
                                                value={formData.freight_cost} 
                                                onChange={handleInputChange} 
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Picture</label>
                                            <input 
                                                type="file" 
                                                name="picture" 
                                                className="form-control" 
                                                accept="image/*" 
                                                onChange={handleInputChange} 
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button 
                                        type="button" 
                                        className="btn btn-outline-secondary" 
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary px-4" 
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Stock Entry'
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

export default StockManagement;
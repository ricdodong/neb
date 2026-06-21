import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StockManagement = () => {
    const [inventory, setInventory] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [ledger, setLedger] = useState([]);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const res = await axios.get('https://api.ricalgen.eu.org/api/inventory');
            setInventory(res.data);
        } catch (err) {
            console.error("Backend unreachable", err);
        }
    };

    const fetchLedger = async (item) => {
        setSelectedItem(item);
        try {
            // Fetching the combined Union data from the new endpoint
            const res = await axios.get(`https://api.ricalgen.eu.org/api/inventory/${item.id}/ledger`);
            setLedger(res.data);
        } catch (err) {
            console.error("Error fetching ledger", err);
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
                        </div>
                        <div className="card-body p-0">
 <table className="table table-hover mb-0">
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
        {inventory.map(item => (
            <tr key={item.id} className="align-middle">
                <td className="ps-4 text-muted">#{item.id}</td>
                <td className="fw-bold">{item.item_name}</td>
                
                {/* Lifetime Total Stock */}
                <td className="text-center">
                    <span className="text-secondary fw-bold">{item.total_qty}</span>
                </td>

                {/* Current Remaining Stock */}
                <td className="text-center">
                    <h5 className={`mb-0 fw-900 ${item.remaining_stock === 0 ? 'text-danger' : 'text-primary'}`}>
                        {item.remaining_stock}
                    </h5>
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
        ))}
    </tbody>
</table>
                         </div>
                    </div>
                </div>

                {/* Detailed Stock Ledger */}
                {selectedItem && (
                    <div className="col-lg-12">
                        <div className="card shadow-sm border-0 border-top border-primary border-4">
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0 fw-bold">
                                    Movement History: <span className="text-primary">{selectedItem.item_name}</span>
                                </h5>
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
                                                    <td className="pe-4 text-muted italic">{entry.address}</td>
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
        </div>
    );
};

export default StockManagement;
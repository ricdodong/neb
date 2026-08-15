import React, { useState, useEffect, useRef } from 'react';
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
    const [searchQuery, setSearchQuery] = useState('');

    const searchInputRef = useRef(null);

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

        // Global F1 Key Listener
        const handleKeyDown = (e) => {
            if (e.key === 'F1') {
                e.preventDefault(); // Prevent browser help menu
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                    searchInputRef.current.select();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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
            return <span className="badge rounded-pill bg-danger text-black fw-bold px-2 py-1" style={{fontSize: '10px'}}>OUT OF STOCK</span>;
        } else if (qty <= 2) {
            return <span className="badge rounded-pill bg-warning text-black fw-bold px-2 py-1" style={{fontSize: '10px'}}>LOW STOCK</span>;
        }
        return <span className="badge rounded-pill bg-success text-black fw-bold px-2 py-1" style={{fontSize: '10px'}}>HEALTHY</span>;
    };

    const filteredInventory = inventory.filter(item => {
        const query = searchQuery.toLowerCase();
        const itemName = (item.item_name || '').toLowerCase();
        const itemDesc = (item.item_description || '').toLowerCase();
        const itemId = item.id.toString();
        
        return itemName.includes(query) || itemDesc.includes(query) || itemId.includes(query);
    });

    return (
        <div className="container-fluid min-vh-100 bg-black text-light p-0 d-flex flex-column font-monospace overflow-hidden position-relative">
            
            {/* HEADER */}
            <header className="navbar navbar-dark bg-dark border-bottom border-secondary px-3 py-2 sticky-top shadow-sm" style={{zIndex: 1060}}>
                <div className="d-flex align-items-center flex-wrap w-100 justify-content-between">
                    <div className="d-flex align-items-center">
                        <div className="rounded-circle me-2 bg-success pulse-dot" style={{width: '10px', height: '10px'}}></div>
                        <h5 className="mb-0 fw-bold tracking-tighter me-3">JADE<span className="text-success">STOCK</span></h5>
                        
                        <div className="d-none d-md-flex align-items-center bg-black border border-secondary rounded px-2 py-1">
                            <div className="rounded-circle me-2 bg-success" style={{width: '6px', height: '6px'}}></div>
                            <span className="text-secondary fw-bold" style={{fontSize: '10px'}}>
                                NODE: <span className="text-white">STOCK MANAGEMENT PORTAL</span>
                            </span>
                        </div>
                    </div>
                    
                    <div className="d-flex gap-2 align-items-center mt-2 mt-md-0 flex-grow-1 justify-content-end">
                        <div className="position-relative flex-grow-1 flex-md-grow-0" style={{ maxWidth: '300px' }}>
                            <i className="fas fa-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"></i>
                            <input 
                                ref={searchInputRef}
                                type="text" 
                                className="form-control form-control-sm bg-black border-secondary text-white ps-5 w-100" 
                                placeholder="Search inventory... (Press F1)" 
                                style={{borderRadius: '20px', fontSize: '12px'}}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {searchQuery && (
                            <button className="btn btn-sm btn-dark border-secondary text-secondary px-2" onClick={() => setSearchQuery('')}>
                                <i className="fas fa-times"></i>
                            </button>
                        )}

                        <button 
                            className="btn btn-sm btn-success fw-bold px-3 py-1 text-black"
                            onClick={() => setShowModal(true)}
                            style={{fontSize: '12px'}}
                        >
                            <i className="fas fa-plus-circle me-1"></i>ADD STOCK
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT GRID */}
            <main className="flex-grow-1 overflow-auto p-3 bg-dark bg-opacity-10">
                <div className="card bg-dark border border-secondary shadow-lg rounded">
                    <div className="card-header bg-black bg-opacity-50 border-bottom border-secondary py-3 px-3 d-flex justify-content-between align-items-center">
                        <span className="small fw-bold text-success uppercase">
                            <i className="fas fa-boxes me-2"></i>MASTER INVENTORY LEDGER
                        </span>
                        <span className="badge bg-secondary text-white" style={{fontSize: '11px'}}>
                            TOTAL ITEMS: {filteredInventory.length}
                        </span>
                    </div>
                    <div className="card-body p-0">
                        {loading ? (
                            <div className="d-flex justify-content-center align-items-center py-5">
                                <div className="spinner-border text-success" role="status"></div>
                            </div>
                        ) : filteredInventory.length > 0 ? (
                            <div className="table-responsive mb-0">
                                <table className="table table-dark table-hover table-striped align-middle mb-0 text-nowrap" style={{fontSize: '12px'}}>
                                    <thead className="table-secondary text-uppercase text-black fw-bold" style={{fontSize: '11px'}}>
                                        <tr>
                                            <th className="py-2 ps-3">Item #</th>
                                            <th className="py-2">Item Name & Description</th>
                                            <th className="py-2 text-center">Total Stock</th>
                                            <th className="py-2 text-center">Sold Out</th>
                                            <th className="py-2 text-center">Available</th>
                                            <th className="py-2">Status</th>
                                            <th className="py-2 text-end pe-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredInventory.map(item => {
                                            const isExpanded = expandedItemId === item.id;
                                            const itemLedger = ledgers[item.id] || [];

                                            return (
                                                <React.Fragment key={item.id}>
                                                    <tr className={isExpanded ? 'bg-black' : ''}>
                                                        <td className="ps-3 text-secondary fw-semibold">#{item.id}</td>
                                                        <td className="fw-semibold">
                                                            <div className="d-flex align-items-center">
                                                                {item.image_url ? (
                                                                    <img 
                                                                        src={item.image_url} 
                                                                        alt={item.item_name} 
                                                                        className="rounded me-2 border border-secondary bg-black" 
                                                                        style={{width: '32px', height: '32px', objectFit: 'contain'}} 
                                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                                    />
                                                                ) : (
                                                                    <div className="rounded bg-black text-secondary d-flex align-items-center justify-content-center me-2 border border-secondary" style={{width: '32px', height: '32px', fontSize: '11px'}}>
                                                                        <i className="fas fa-image"></i>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <span className="text-white fw-bold d-block">{item.item_name}</span>
                                                                    {item.item_description && <small className="text-secondary text-truncate d-block" style={{maxWidth: '220px', fontSize: '10px'}}>{item.item_description}</small>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className="badge bg-black text-white border border-secondary px-2 py-1">{item.total_qty || 0}</span>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className="badge bg-black text-danger border border-secondary px-2 py-1">{item.soldout_qty || 0}</span>
                                                        </td>
                                                        <td className="text-center fw-bold text-success">
                                                            {item.available_qty || 0}
                                                        </td>
                                                        <td>{renderStatusBadge(item.available_qty)}</td>
                                                        <td className="text-end pe-3">
                                                            <button 
                                                                className={`btn btn-sm px-3 py-1 fw-bold ${isExpanded ? 'btn-success text-black' : 'btn-outline-success text-success'}`}
                                                                style={{fontSize: '11px'}}
                                                                onClick={() => toggleLedger(item)}
                                                            >
                                                                <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-history'} me-1`}></i> 
                                                                {isExpanded ? 'HIDE' : 'LEDGER'}
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* EXPANDABLE INLINE LEDGER */}
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan="7" className="bg-black p-3 border-bottom border-secondary">
                                                                <div className="card bg-dark border border-secondary rounded shadow-inner">
                                                                    <div className="card-header bg-black py-2 px-3 d-flex justify-content-between align-items-center border-bottom border-secondary">
                                                                        <span className="fw-bold text-success tiny-text uppercase">
                                                                            <i className="fas fa-list-alt me-1"></i> Movement History // {item.item_name}
                                                                        </span>
                                                                        <button className="btn btn-sm btn-link text-secondary p-0" onClick={() => setExpandedItemId(null)}>
                                                                            <i className="fas fa-times"></i>
                                                                        </button>
                                                                    </div>
                                                                    <div className="card-body p-0">
                                                                        {ledgerLoading ? (
                                                                            <div className="text-center py-3 text-secondary tiny-text">Loading ledger transactions...</div>
                                                                        ) : itemLedger.length > 0 ? (
                                                                            <div className="table-responsive mb-0">
                                                                                <table className="table table-dark table-sm table-striped mb-0 align-middle text-nowrap" style={{fontSize: '11px'}}>
                                                                                    <thead className="text-secondary uppercase" style={{fontSize: '10px'}}>
                                                                                        <tr>
                                                                                            <th className="py-2 ps-3">Date & Time</th>
                                                                                            <th className="py-2">Type</th>
                                                                                            <th className="py-2">Qty</th>
                                                                                            <th className="py-2">Source / Customer</th>
                                                                                            <th className="py-2">Address</th>
                                                                                            <th className="py-2">Forward By</th>
                                                                                            <th className="py-2 pe-3">Freight Cost</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {itemLedger.map((entry, idx) => (
                                                                                            <tr key={idx}>
                                                                                                <td className="ps-3 text-secondary">{new Date(entry.date).toLocaleString()}</td>
                                                                                                <td>
                                                                                                    <span className={`badge px-2 py-0.5 ${['in', 'input'].includes(entry.type.toLowerCase()) ? 'bg-success text-black' : 'bg-danger text-white'}`} style={{fontSize: '9px'}}>
                                                                                                        {entry.type.toUpperCase()}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td className="fw-bold">
                                                                                                    <span className={entry.qty > 0 ? 'text-success' : 'text-danger'}>
                                                                                                        {entry.qty > 0 ? `+${entry.qty}` : entry.qty}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td className="text-white">{entry.source || 'N/A'}</td>
                                                                                                <td className="text-secondary fst-italic">{entry.address || 'N/A'}</td>
                                                                                                <td className="text-secondary">{entry.forwardBy || entry.courier || 'N/A'}</td>
                                                                                                <td className="pe-3 text-success fw-bold">₱{parseFloat(entry.freightCost || entry.shipping_cost || 0).toFixed(2)}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-center py-3 text-secondary tiny-text">No ledger entries registered for this item.</div>
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
                        ) : (
                            <div className="text-center py-5 text-secondary">
                                <i className="fas fa-ghost fs-1 mb-2"></i>
                                <p className="small mb-0">NO INVENTORY RECORDS MATCHING "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ADD STOCK MODAL */}
            {showModal && (
                <div className="modal d-block bg-black bg-opacity-75" tabIndex="-1" style={{ zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content bg-dark border border-secondary text-white font-monospace shadow-2xl">
                            <div className="modal-header border-secondary py-2 bg-black bg-opacity-50">
                                <h6 className="modal-title text-success fw-bold uppercase">
                                    <i className="fas fa-plus-circle me-2"></i>Stock Entry / Inbound Terminal
                                </h6>
                                <button type="button" className="btn-close btn-close-white scale-75" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmitStock}>
                                <div className="modal-body p-3">
                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary tiny-text fw-bold mb-1">SUPPLIER</label>
                                            <select name="supplier_id" className="form-select form-select-sm bg-black text-white border-secondary" value={formData.supplier_id} onChange={handleInputChange} required>
                                                <option value="">Select Supplier</option>
                                                {suppliers.map(sup => (
                                                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary tiny-text fw-bold mb-1">ITEM NAME</label>
                                            <select 
                                                className="form-select form-select-sm bg-black text-white border-secondary mb-1" 
                                                onChange={handleItemSelectChange}
                                                defaultValue=""
                                            >
                                                <option value="">-- Select Existing or Type New --</option>
                                                {inventory.map(inv => (
                                                    <option key={inv.id} value={inv.id}>{inv.item_name}</option>
                                                ))}
                                            </select>
                                            <input 
                                                type="text" 
                                                name="item_name" 
                                                className="form-control form-control-sm bg-black text-white border-secondary" 
                                                placeholder="Or type new item name" 
                                                value={formData.item_name} 
                                                onChange={handleInputChange} 
                                                required 
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="text-success tiny-text fw-bold mb-1">PICTURE (IMAGE URL)</label>
                                            <div className="input-group input-group-sm mb-1">
                                                <span className="input-group-text bg-black border-secondary text-secondary"><i className="fas fa-link"></i></span>
                                                <input 
                                                    type="text" 
                                                    name="image_url" 
                                                    className="form-control form-control-sm bg-black text-white border-secondary" 
                                                    placeholder="Paste image address URL" 
                                                    value={formData.image_url} 
                                                    onChange={handleInputChange} 
                                                />
                                                <button 
                                                    type="button" 
                                                    className="btn btn-outline-success btn-sm"
                                                    onClick={openGoogleImageSearch}
                                                    disabled={!formData.item_name}
                                                >
                                                    <i className="fas fa-external-link-alt me-1"></i>Google Images
                                                </button>
                                            </div>
                                            {formData.image_url && (
                                                <div className="d-flex align-items-center gap-2 p-1 bg-black rounded border border-secondary mt-1">
                                                    <span className="tiny-text text-secondary">Preview:</span>
                                                    <img src={formData.image_url} alt="" style={{width: '28px', height: '28px', objectFit: 'contain'}} onError={(e) => { e.target.style.display = 'none'; }} />
                                                    <span className="text-success tiny-text"><i className="fas fa-check-circle"></i> Active Link</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-12">
                                            <label className="text-secondary tiny-text fw-bold mb-1">DESCRIPTION</label>
                                            <textarea name="description" className="form-control form-control-sm bg-black text-white border-secondary" rows="2" placeholder="Hardware details..." value={formData.description} onChange={handleInputChange}></textarea>
                                        </div>
                                        
                                        <div className="col-12 col-md-4">
                                            <label className="text-secondary tiny-text fw-bold mb-1">QUANTITY</label>
                                            <input type="number" name="quantity" className="form-control form-control-sm bg-black text-white border-secondary" placeholder="0" min="1" value={formData.quantity} onChange={handleInputChange} required />
                                        </div>
                                        
                                        <div className="col-12 col-md-4">
                                            <label className="text-secondary tiny-text fw-bold mb-1">W/S PRICE</label>
                                            <input type="number" step="0.01" name="ws_price" className="form-control form-control-sm bg-black text-white border-secondary" placeholder="0.00" value={formData.ws_price} onChange={handleInputChange} required />
                                        </div>
                                        
                                        <div className="col-12 col-md-4">
                                            <label className="text-secondary tiny-text fw-bold mb-1">SRP AMOUNT</label>
                                            <input type="number" step="0.01" name="srp_amount" className="form-control form-control-sm bg-black text-white border-secondary" placeholder="0.00" value={formData.srp_amount} onChange={handleInputChange} required />
                                        </div>
                                        
                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary tiny-text fw-bold mb-1">FORWARD BY</label>
                                            <input type="text" name="forward_by" className="form-control form-control-sm bg-black text-white border-secondary" placeholder="Courier / Handler" value={formData.forward_by} onChange={handleInputChange} />
                                        </div>
                                        
                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary tiny-text fw-bold mb-1">FREIGHT COST</label>
                                            <input type="number" step="0.01" name="freight_cost" className="form-control form-control-sm bg-black text-white border-secondary" placeholder="0.00" value={formData.freight_cost} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-secondary bg-black py-2">
                                    <button type="button" className="btn btn-sm btn-dark border-secondary text-secondary px-3" onClick={() => setShowModal(false)}>CANCEL</button>
                                    <button type="submit" className="btn btn-sm btn-success fw-bold text-black px-4" disabled={submitting}>
                                        {submitting ? 'COMMITTING...' : 'COMMIT STOCK ENTRY'}
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
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

    // Lightbox Modal State
    const [lightboxItem, setLightboxItem] = useState(null);

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
            return <span className="badge rounded-pill bg-danger text-black fw-bold px-2.5 py-1" style={{fontSize: '11px'}}>OUT OF STOCK</span>;
        } else if (qty <= 2) {
            return <span className="badge rounded-pill bg-warning text-black fw-bold px-2.5 py-1" style={{fontSize: '11px'}}>LOW STOCK</span>;
        }
        return <span className="badge rounded-pill bg-success text-black fw-bold px-2.5 py-1" style={{fontSize: '11px'}}>HEALTHY</span>;
    };

    const filteredInventory = inventory.filter(item => {
        const query = searchQuery.toLowerCase();
        const itemName = (item.item_name || '').toLowerCase();
        const itemDesc = (item.item_description || '').toLowerCase();
        const itemId = item.id.toString();
        
        return itemName.includes(query) || itemDesc.includes(query) || itemId.includes(query);
    });

    return (
        <div className="container-fluid min-vh-100 bg-black text-light p-0 d-flex flex-column font-monospace overflow-x-hidden position-relative">
            
            {/* INJECT HOVER ZOOM STYLES */}
            <style>{`
                .zoom-hover-img {
                    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease;
                    cursor: pointer;
                }
                .zoom-hover-img:hover {
                    transform: scale(3.5);
                    z-index: 1050;
                    position: relative;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.9);
                    border-color: #198754 !important;
                }
            `}</style>

            {/* HEADER */}
            <header className="navbar navbar-dark bg-dark border-bottom border-secondary px-3 py-3 sticky-top shadow-sm" style={{zIndex: 1020}}>
                <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-3">
                    <div className="d-flex align-items-center">
                        <div className="rounded-circle me-2 bg-success pulse-dot" style={{width: '10px', height: '10px'}}></div>
                        <h4 className="mb-0 fw-bold tracking-tighter me-3 fs-5">JADE<span className="text-success">STOCK</span></h4>
                        
                        <div className="d-none d-md-flex align-items-center bg-black border border-secondary rounded px-2.5 py-1.5">
                            <div className="rounded-circle me-2 bg-success" style={{width: '6px', height: '6px'}}></div>
                            <span className="text-secondary fw-bold" style={{fontSize: '11px'}}>
                                NODE: <span className="text-white">ACTIVE</span>
                            </span>
                        </div>
                    </div>
                    
                    <div className="d-flex gap-2.5 align-items-center w-100 w-md-auto justify-content-between justify-content-md-end">
                        <div className="position-relative flex-grow-1 flex-md-grow-0" style={{ maxWidth: '320px' }}>
                            <i className="fas fa-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary" style={{fontSize: '13px'}}></i>
                            <input 
                                ref={searchInputRef}
                                type="text" 
                                className="form-control bg-black border-secondary text-white ps-5 w-100" 
                                placeholder="Search inventory... (Press F1)" 
                                style={{borderRadius: '20px', fontSize: '13px', padding: '8px 12px 8px 36px'}}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {searchQuery && (
                            <button className="btn btn-dark border-secondary text-secondary px-2.5 py-2" onClick={() => setSearchQuery('')}>
                                <i className="fas fa-times"></i>
                            </button>
                        )}

                        <button 
                            className="btn btn-success fw-bold px-3 py-2 text-black text-nowrap shadow-sm"
                            onClick={() => setShowModal(true)}
                            style={{fontSize: '13px'}}
                        >
                            <i className="fas fa-plus-circle me-1.5"></i>ADD STOCK
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT GRID */}
            <main className="flex-grow-1 p-3 p-md-4 bg-dark bg-opacity-10">
                <div className="card bg-dark border border-secondary shadow-lg rounded-3">
                    <div className="card-header bg-black bg-opacity-50 border-bottom border-secondary py-3 px-4 d-flex justify-content-between align-items-center">
                        <span className="fw-bold text-success uppercase" style={{fontSize: '13px'}}>
                            <i className="fas fa-boxes me-2"></i>INVENTORY LEDGER & STOCK LEVELS
                        </span>
                        <span className="badge bg-secondary text-white px-2.5 py-1.5" style={{fontSize: '11px'}}>
                            TOTAL ITEMS: {filteredInventory.length}
                        </span>
                    </div>
                    <div className="card-body p-0">
                        {loading ? (
                            <div className="d-flex justify-content-center align-items-center py-5">
                                <div className="spinner-border text-success" role="status"></div>
                            </div>
                        ) : filteredInventory.length > 0 ? (
                            <>
                                {/* DESKTOP TABLE VIEW */}
                                <div className="table-responsive mb-0 d-none d-lg-block overflow-visible">
                                    <table className="table table-dark table-hover table-striped align-middle mb-0 text-nowrap" style={{fontSize: '13px'}}>
                                        <thead className="table-secondary text-uppercase text-black fw-bold" style={{fontSize: '12px'}}>
                                            <tr>
                                                <th className="py-3 ps-4">Item #</th>
                                                <th className="py-3">Item Name & Description</th>
                                                <th className="py-3 text-center">Total Stock</th>
                                                <th className="py-3 text-center">Sold</th>
                                                <th className="py-3 text-center">Available</th>
                                                <th className="py-3">Status</th>
                                                <th className="py-3 text-end pe-4">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredInventory.map(item => {
                                                const isExpanded = expandedItemId === item.id;
                                                const itemLedger = ledgers[item.id] || [];

                                                return (
                                                    <React.Fragment key={item.id}>
                                                        <tr className={isExpanded ? 'bg-black' : ''}>
                                                            <td className="ps-4 text-secondary fw-semibold">#{item.id}</td>
                                                            <td className="fw-semibold py-3">
                                                                <div className="d-flex align-items-center">
                                                                    {item.image_url ? (
                                                                        <img 
                                                                            src={item.image_url} 
                                                                            alt={item.item_name} 
                                                                            className="rounded me-3 border border-secondary bg-black zoom-hover-img" 
                                                                            style={{width: '38px', height: '38px', objectFit: 'contain'}} 
                                                                            onClick={() => setLightboxItem(item)}
                                                                            title="Click to view details & lightbox"
                                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                                        />
                                                                    ) : (
                                                                        <div className="rounded bg-black text-secondary d-flex align-items-center justify-content-center me-3 border border-secondary" style={{width: '38px', height: '38px', fontSize: '12px'}}>
                                                                            <i className="fas fa-image"></i>
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <span className="text-white fw-bold d-block fs-6">{item.item_name}</span>
                                                                        {item.item_description && <small className="text-secondary text-truncate d-block mt-0.5" style={{maxWidth: '300px', fontSize: '11px'}}>{item.item_description}</small>}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="badge bg-black text-white border border-secondary px-2.5 py-1.5" style={{fontSize: '12px'}}>{item.total_qty || 0}</span>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="badge bg-black text-danger border border-secondary px-2.5 py-1.5" style={{fontSize: '12px'}}>{item.soldout_qty || 0}</span>
                                                            </td>
                                                            <td className="text-center fw-bold text-success fs-6">
                                                                {item.available_qty || 0}
                                                            </td>
                                                            <td>{renderStatusBadge(item.available_qty)}</td>
                                                            <td className="text-end pe-4">
                                                                <button 
                                                                    className={`btn px-3 py-1.5 fw-bold ${isExpanded ? 'btn-success text-black' : 'btn-outline-success text-success'}`}
                                                                    style={{fontSize: '12px'}}
                                                                    onClick={() => toggleLedger(item)}
                                                                >
                                                                    <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-history'} me-1.5`}></i> 
                                                                    {isExpanded ? 'HIDE' : 'LEDGER'}
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* EXPANDABLE INLINE LEDGER */}
                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan="7" className="bg-black p-4 border-bottom border-secondary">
                                                                    <div className="card bg-dark border border-secondary rounded-3 shadow-inner">
                                                                        <div className="card-header bg-black py-2.5 px-4 d-flex justify-content-between align-items-center border-bottom border-secondary">
                                                                            <span className="fw-bold text-success uppercase" style={{fontSize: '12px'}}>
                                                                                <i className="fas fa-list-alt me-2"></i> Movement History // {item.item_name}
                                                                            </span>
                                                                            <button className="btn btn-sm btn-link text-secondary p-0" onClick={() => setExpandedItemId(null)}>
                                                                                <i className="fas fa-times"></i>
                                                                            </button>
                                                                        </div>
                                                                        <div className="card-body p-0">
                                                                            {ledgerLoading ? (
                                                                                <div className="text-center py-4 text-secondary">Loading ledger transactions...</div>
                                                                            ) : itemLedger.length > 0 ? (
                                                                                <div className="table-responsive mb-0">
                                                                                    <table className="table table-dark table-striped mb-0 align-middle text-nowrap" style={{fontSize: '12px'}}>
                                                                                        <thead className="text-secondary uppercase" style={{fontSize: '11px'}}>
                                                                                            <tr>
                                                                                                <th className="py-2.5 ps-4">Date & Time</th>
                                                                                                <th className="py-2.5">Type</th>
                                                                                                <th className="py-2.5">Qty</th>
                                                                                                <th className="py-2.5">Source / Customer</th>
                                                                                                <th className="py-2.5">Address</th>
                                                                                                <th className="py-2.5">Forward By</th>
                                                                                                <th className="py-2.5 pe-4">Freight Cost</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody>
                                                                                            {itemLedger.map((entry, idx) => (
                                                                                                <tr key={idx}>
                                                                                                    <td className="ps-4 text-secondary">{new Date(entry.date).toLocaleString()}</td>
                                                                                                    <td>
                                                                                                        <span className={`badge px-2.5 py-1 ${['in', 'input'].includes(entry.type.toLowerCase()) ? 'bg-success text-black' : 'bg-danger text-white'}`} style={{fontSize: '10px'}}>
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
                                                                                                    <td className="pe-4 text-success fw-bold">₱{parseFloat(entry.freightCost || entry.shipping_cost || 0).toFixed(2)}</td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-center py-4 text-secondary">No ledger entries registered for this item.</div>
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

                                {/* MOBILE & TABLET CARD VIEW */}
                                <div className="d-lg-none p-3 d-flex flex-column gap-3">
                                    {filteredInventory.map(item => {
                                        const isExpanded = expandedItemId === item.id;
                                        const itemLedger = ledgers[item.id] || [];

                                        return (
                                            <div key={item.id} className="card bg-black border border-secondary rounded-3 p-3 text-light" style={{fontSize: '12px'}}>
                                                <div className="d-flex align-items-center justify-content-between mb-2.5">
                                                    <div className="d-flex align-items-center gap-2.5">
                                                        {item.image_url ? (
                                                            <img 
                                                                src={item.image_url} 
                                                                alt={item.item_name} 
                                                                className="rounded border border-secondary bg-dark zoom-hover-img" 
                                                                style={{width: '38px', height: '38px', objectFit: 'contain'}} 
                                                                onClick={() => setLightboxItem(item)}
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <div className="rounded bg-dark text-secondary d-flex align-items-center justify-content-center border border-secondary" style={{width: '38px', height: '38px', fontSize: '12px'}}>
                                                                <i className="fas fa-image"></i>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h6 className="mb-0 fw-bold text-white text-truncate" style={{fontSize: '13px', maxWidth: '190px'}}>{item.item_name}</h6>
                                                            <small className="text-secondary" style={{fontSize: '10px'}}>ID: #{item.id}</small>
                                                        </div>
                                                    </div>
                                                    {renderStatusBadge(item.available_qty)}
                                                </div>

                                                <div className="row g-2 text-center bg-dark rounded-2 p-2 my-2" style={{fontSize: '11px'}}>
                                                    <div className="col-4 border-end border-secondary">
                                                        <span className="text-secondary d-block" style={{fontSize: '10px'}}>TOTAL</span>
                                                        <span className="fw-bold text-white fs-6">{item.total_qty || 0}</span>
                                                    </div>
                                                    <div className="col-4 border-end border-secondary">
                                                        <span className="text-secondary d-block" style={{fontSize: '10px'}}>SOLD</span>
                                                        <span className="fw-bold text-danger fs-6">{item.soldout_qty || 0}</span>
                                                    </div>
                                                    <div className="col-4">
                                                        <span className="text-secondary d-block" style={{fontSize: '10px'}}>AVAILABLE</span>
                                                        <span className="fw-bold text-success fs-6">{item.available_qty || 0}</span>
                                                    </div>
                                                </div>

                                                <button 
                                                    className={`btn w-100 py-2 fw-bold ${isExpanded ? 'btn-success text-black' : 'btn-outline-success text-success'}`}
                                                    style={{fontSize: '11px'}}
                                                    onClick={() => toggleLedger(item)}
                                                >
                                                    <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-history'} me-1.5`}></i> 
                                                    {isExpanded ? 'HIDE LEDGER' : 'VIEW LEDGER MOVEMENT'}
                                                </button>

                                                {/* MOBILE EXPANDABLE LEDGER ACCORDION */}
                                                {isExpanded && (
                                                    <div className="mt-3 pt-3 border-top border-secondary bg-dark p-2.5 rounded-2 animate-fade-in">
                                                        <span className="fw-bold text-success d-block mb-2" style={{fontSize: '11px'}}>
                                                            <i className="fas fa-list-alt me-1.5"></i> LEDGER HISTORY:
                                                        </span>
                                                        {ledgerLoading ? (
                                                            <div className="text-center py-3 text-secondary">Loading history...</div>
                                                        ) : itemLedger.length > 0 ? (
                                                            <div className="d-flex flex-column gap-2">
                                                                {itemLedger.map((entry, idx) => (
                                                                    <div key={idx} className="bg-black border border-secondary rounded-2 p-2 text-light" style={{fontSize: '11px'}}>
                                                                        <div className="d-flex justify-content-between text-secondary mb-1" style={{fontSize: '10px'}}>
                                                                            <span>{new Date(entry.date).toLocaleString()}</span>
                                                                            <span className={`badge ${['in', 'input'].includes(entry.type.toLowerCase()) ? 'bg-success text-black' : 'bg-danger text-white'}`} style={{fontSize: '9px'}}>
                                                                                {entry.type.toUpperCase()}
                                                                            </span>
                                                                        </div>
                                                                        <div className="fw-bold text-white mb-1">
                                                                            Qty: <span className={entry.qty > 0 ? 'text-success' : 'text-danger'}>{entry.qty > 0 ? `+${entry.qty}` : entry.qty}</span>
                                                                        </div>
                                                                        <div className="text-secondary mb-0.5">Source: <span className="text-white">{entry.source || 'N/A'}</span></div>
                                                                        <div className="text-secondary fst-italic" style={{fontSize: '10px'}}>{entry.address || 'N/A'}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-3 text-secondary">No ledger movements registered.</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-5 text-secondary">
                                <i className="fas fa-ghost fs-1 mb-3"></i>
                                <p className="mb-0">NO INVENTORY RECORDS MATCHING "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* LIGHTBOX / IMAGE ZOOM MODAL */}
            {lightboxItem && (
                <div className="modal d-block bg-black bg-opacity-85 px-3" tabIndex="-1" style={{ zIndex: 1080 }}>
                    <div className="modal-dialog modal-dialog-centered modal-md">
                        <div className="modal-content bg-dark border border-success text-white font-monospace shadow-2xl rounded-3">
                            <div className="modal-header border-secondary py-3 px-4 bg-black bg-opacity-50">
                                <h6 className="modal-title text-success fw-bold uppercase" style={{fontSize: '13px'}}>
                                    <i className="fas fa-search-plus me-2"></i>Item Lightbox // #{lightboxItem.id}
                                </h6>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setLightboxItem(null)}></button>
                            </div>
                            <div className="modal-body p-4 text-center" style={{fontSize: '12px'}}>
                                <div className="bg-black p-3 rounded border border-secondary mb-3 d-flex align-items-center justify-content-center" style={{minHeight: '220px'}}>
                                    <img 
                                        src={lightboxItem.image_url} 
                                        alt={lightboxItem.item_name} 
                                        className="img-fluid rounded" 
                                        style={{ maxHeight: '250px', objectFit: 'contain' }}
                                    />
                                </div>
                                <h5 className="fw-bold text-white mb-2">{lightboxItem.item_name}</h5>
                                <p className="text-secondary small fst-italic mb-3">{lightboxItem.item_description || "No supplemental hardware specifications provided."}</p>
                                
                                <div className="row g-2 text-start bg-black p-3 rounded border border-secondary">
                                    <div className="col-5 text-secondary">TOTAL STOCK:</div>
                                    <div className="col-7 text-white fw-bold">{lightboxItem.total_qty || 0}</div>
                                    <div className="col-5 text-secondary">SOLD:</div>
                                    <div className="col-7 text-danger fw-bold">{lightboxItem.soldout_qty || 0}</div>
                                    <div className="col-5 text-secondary">AVAILABLE QTY:</div>
                                    <div className="col-7 text-success fw-bold">{lightboxItem.available_qty || 0}</div>
                                    <div className="col-5 text-secondary">STATUS:</div>
                                    <div className="col-7">{renderStatusBadge(lightboxItem.available_qty)}</div>
                                </div>
                            </div>
                            <div className="modal-footer border-secondary bg-black py-3 px-4">
                                <button type="button" className="btn btn-success fw-bold text-black w-100 py-2" onClick={() => setLightboxItem(null)} style={{fontSize: '12px'}}>
                                    CLOSE LIGHTBOX
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD STOCK MODAL */}
            {showModal && (
                <div className="modal d-block bg-black bg-opacity-75 px-3" tabIndex="-1" style={{ zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content bg-dark border border-secondary text-white font-monospace shadow-2xl rounded-3">
                            <div className="modal-header border-secondary py-3 px-4 bg-black bg-opacity-50">
                                <h6 className="modal-title text-success fw-bold uppercase" style={{fontSize: '13px'}}>
                                    <i className="fas fa-plus-circle me-2"></i>Stock Entry / Inbound Terminal
                                </h6>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmitStock}>
                                <div className="modal-body p-4" style={{fontSize: '12px'}}>
                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary fw-bold mb-1.5">SUPPLIER</label>
                                            <select name="supplier_id" className="form-select bg-black text-white border-secondary py-2" value={formData.supplier_id} onChange={handleInputChange} required style={{fontSize: '12px'}}>
                                                <option value="">Select Supplier</option>
                                                {suppliers.map(sup => (
                                                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary fw-bold mb-1.5">ITEM NAME</label>
                                            <select 
                                                className="form-select bg-black text-white border-secondary mb-2 py-2" 
                                                onChange={handleItemSelectChange}
                                                defaultValue=""
                                                style={{fontSize: '12px'}}
                                            >
                                                <option value="">-- Select Existing or Type New --</option>
                                                {inventory.map(inv => (
                                                    <option key={inv.id} value={inv.id}>{inv.item_name}</option>
                                                ))}
                                            </select>
                                            <input 
                                                type="text" 
                                                name="item_name" 
                                                className="form-control bg-black text-white border-secondary py-2" 
                                                placeholder="Or type new item name" 
                                                value={formData.item_name} 
                                                onChange={handleInputChange} 
                                                style={{fontSize: '12px'}}
                                                required 
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="text-success fw-bold mb-1.5">PICTURE (IMAGE URL)</label>
                                            <div className="input-group mb-2">
                                                <span className="input-group-text bg-black border-secondary text-secondary"><i className="fas fa-link"></i></span>
                                                <input 
                                                    type="text" 
                                                    name="image_url" 
                                                    className="form-control bg-black text-white border-secondary py-2" 
                                                    placeholder="Paste image address URL" 
                                                    value={formData.image_url} 
                                                    onChange={handleInputChange} 
                                                    style={{fontSize: '12px'}}
                                                />
                                                <button 
                                                    type="button" 
                                                    className="btn btn-outline-success px-3"
                                                    onClick={openGoogleImageSearch}
                                                    disabled={!formData.item_name}
                                                    style={{fontSize: '12px'}}
                                                >
                                                    <i className="fas fa-external-link-alt me-1.5"></i>Google Images
                                                </button>
                                            </div>
                                            {formData.image_url && (
                                                <div className="d-flex align-items-center gap-2.5 p-2 bg-black rounded border border-secondary mt-1.5">
                                                    <span className="text-secondary">Preview:</span>
                                                    <img src={formData.image_url} alt="" className="rounded" style={{width: '32px', height: '32px', objectFit: 'contain'}} onError={(e) => { e.target.style.display = 'none'; }} />
                                                    <span className="text-success"><i className="fas fa-check-circle"></i> Active Link</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-12">
                                            <label className="text-secondary fw-bold mb-1.5">DESCRIPTION</label>
                                            <textarea name="description" className="form-control bg-black text-white border-secondary py-2" rows="2" placeholder="Hardware specifications..." value={formData.description} onChange={handleInputChange} style={{fontSize: '12px'}}></textarea>
                                        </div>
                                        
                                        <div className="col-12 col-md-4">
                                            <label className="text-secondary fw-bold mb-1.5">QUANTITY</label>
                                            <input type="number" name="quantity" className="form-control bg-black text-white border-secondary py-2" placeholder="0" min="1" value={formData.quantity} onChange={handleInputChange} style={{fontSize: '12px'}} required />
                                        </div>
                                        
                                        <div className="col-12 col-md-4">
                                            <label className="text-secondary fw-bold mb-1.5">W/S PRICE</label>
                                            <input type="number" step="0.01" name="ws_price" className="form-control bg-black text-white border-secondary py-2" placeholder="0.00" value={formData.ws_price} onChange={handleInputChange} style={{fontSize: '12px'}} required />
                                        </div>
                                        
                                        <div className="col-12 col-md-4">
                                            <label className="text-secondary fw-bold mb-1.5">SRP AMOUNT</label>
                                            <input type="number" step="0.01" name="srp_amount" className="form-control bg-black text-white border-secondary py-2" placeholder="0.00" value={formData.srp_amount} onChange={handleInputChange} style={{fontSize: '12px'}} required />
                                        </div>
                                        
                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary fw-bold mb-1.5">FORWARD BY</label>
                                            <input type="text" name="forward_by" className="form-control bg-black text-white border-secondary py-2" placeholder="Courier / Handler" value={formData.forward_by} onChange={handleInputChange} style={{fontSize: '12px'}} />
                                        </div>
                                        
                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary fw-bold mb-1.5">FREIGHT COST</label>
                                            <input type="number" step="0.01" name="freight_cost" className="form-control bg-black text-white border-secondary py-2" placeholder="0.00" value={formData.freight_cost} onChange={handleInputChange} style={{fontSize: '12px'}} />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-secondary bg-black py-3 px-4">
                                    <button type="button" className="btn btn-dark border-secondary text-secondary px-4 py-2" onClick={() => setShowModal(false)} style={{fontSize: '12px'}}>CANCEL</button>
                                    <button type="submit" className="btn btn-success fw-bold text-black px-4 py-2" disabled={submitting} style={{fontSize: '12px'}}>
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
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
                    transform: scale(1.05);
                    border-color: #198754 !important;
                }
                .fb-post-card {
                    transition: box-shadow 0.2s ease, border-color 0.2s ease;
                }
                .fb-post-card:hover {
                    border-color: #198754 !important;
                    box-shadow: 0 4px 20px rgba(25, 135, 84, 0.15) !important;
                }
            `}</style>

            {/* NAVBAR HEADER */}
            <header className="navbar navbar-dark bg-dark border-bottom border-secondary px-3 py-3 sticky-top shadow-sm" style={{zIndex: 1020}}>
                <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-3">
                    <div className="d-flex align-items-center">
                        <div className="rounded-circle me-2 bg-success pulse-dot" style={{width: '10px', height: '10px'}}></div>
                        <h4 className="mb-0 fw-bold tracking-tighter me-3 fs-5">JADE<span className="text-success">STOCK</span></h4>
                        
                        <div className="d-none d-md-flex align-items-center bg-black border border-secondary rounded px-2.5 py-1.5">
                            <div className="rounded-circle me-2 bg-success" style={{width: '6px', height: '6px'}}></div>
                            <span className="text-secondary fw-bold" style={{fontSize: '11px'}}>
                                FEED NODE: <span className="text-white">ONLINE</span>
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
                                placeholder="Search inventory feed... (F1)" 
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
                            <i className="fas fa-plus-circle me-1.5"></i>CREATE POST / STOCK
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT CONTAINER */}
            <main className="flex-grow-1 p-3 p-md-4 bg-dark bg-opacity-10">
                <div className="row justify-content-center">
                    <div className="col-12 col-xl-10">
                        
                        {/* FACEBOOK STYLE COVER / FEED HEADER BANNER */}
                        <div className="card bg-dark border border-secondary rounded-3 shadow-sm mb-4">
                            <div className="card-body p-3 p-md-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="rounded-circle bg-black text-success border border-success d-flex align-items-center justify-content-center shadow" style={{width: '50px', height: '50px', fontSize: '20px'}}>
                                        <i className="fas fa-stream"></i>
                                    </div>
                                    <div>
                                        <h5 className="fw-bold text-white mb-0">INVENTORY FEED & ACTIVITY STREAM</h5>
                                        <p className="text-secondary small mb-0" style={{fontSize: '11px'}}>Real-time stock tracking, movement history, and item telemetry</p>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-black text-white border border-secondary px-3 py-2" style={{fontSize: '11px'}}>
                                        TOTAL ITEMS: <span className="text-success fw-bold">{filteredInventory.length}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* FEED LOADER / POSTS */}
                        {loading ? (
                            <div className="d-flex justify-content-center align-items-center py-5">
                                <div className="spinner-border text-success" role="status"></div>
                            </div>
                        ) : filteredInventory.length > 0 ? (
                            <div className="d-flex flex-column gap-3">
                                {filteredInventory.map(item => {
                                    const isExpanded = expandedItemId === item.id;
                                    const itemLedger = ledgers[item.id] || [];

                                    return (
                                        <div key={item.id} className="card bg-dark border border-secondary rounded-3 shadow-lg fb-post-card">
                                            
                                            {/* POST HEADER */}
                                            <div className="card-header bg-black bg-opacity-50 border-bottom border-secondary p-3 d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center gap-2.5">
                                                    {item.image_url ? (
                                                        <img 
                                                            src={item.image_url} 
                                                            alt={item.item_name} 
                                                            className="rounded-circle border border-secondary bg-black" 
                                                            style={{width: '42px', height: '42px', objectFit: 'contain'}} 
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className="rounded-circle bg-black text-secondary d-flex align-items-center justify-content-center border border-secondary" style={{width: '42px', height: '42px', fontSize: '14px'}}>
                                                            <i className="fas fa-box"></i>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h6 className="mb-0 fw-bold text-white fs-6">{item.item_name}</h6>
                                                        <small className="text-secondary" style={{fontSize: '10px'}}>Item ID: #{item.id} • Posted System Entry</small>
                                                    </div>
                                                </div>
                                                <div>
                                                    {renderStatusBadge(item.available_qty)}
                                                </div>
                                            </div>

                                            {/* POST BODY */}
                                            <div className="card-body p-3">
                                                {item.item_description && (
                                                    <p className="text-light mb-3" style={{fontSize: '12px', lineHeight: '1.5'}}>
                                                        {item.item_description}
                                                    </p>
                                                )}

                                                {/* ITEM IMAGE EMBED */}
                                                {item.image_url && (
                                                    <div 
                                                        className="bg-black p-3 rounded border border-secondary mb-3 text-center overflow-hidden position-relative zoom-hover-img"
                                                        style={{maxHeight: '320px', cursor: 'pointer'}}
                                                        onClick={() => setLightboxItem(item)}
                                                        title="Click to expand lightbox"
                                                    >
                                                        <img 
                                                            src={item.image_url} 
                                                            alt={item.item_name} 
                                                            className="img-fluid rounded" 
                                                            style={{maxHeight: '280px', objectFit: 'contain'}} 
                                                        />
                                                    </div>
                                                )}

                                                {/* METRICS / STATS COUNTER BAR */}
                                                <div className="row g-2 text-center bg-black p-2.5 rounded border border-secondary" style={{fontSize: '11px'}}>
                                                    <div className="col-4 border-end border-secondary">
                                                        <span className="text-secondary d-block" style={{fontSize: '10px'}}>TOTAL STOCK</span>
                                                        <span className="fw-bold text-white fs-6">{item.total_qty || 0}</span>
                                                    </div>
                                                    <div className="col-4 border-end border-secondary">
                                                        <span className="text-secondary d-block" style={{fontSize: '10px'}}>SOLD</span>
                                                        <span className="fw-bold text-danger fs-6">{item.soldout_qty || 0}</span>
                                                    </div>
                                                    <div className="col-4">
                                                        <span className="text-secondary d-block" style={{fontSize: '10px'}}>AVAILABLE QTY</span>
                                                        <span className="fw-bold text-success fs-6">{item.available_qty || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* POST ACTION FOOTER */}
                                            <div className="card-footer bg-black bg-opacity-40 border-top border-secondary p-2 d-flex justify-content-between align-items-center">
                                                <button 
                                                    className="btn btn-dark text-secondary btn-sm px-3 border border-secondary"
                                                    style={{fontSize: '11px'}}
                                                    onClick={() => setLightboxItem(item)}
                                                >
                                                    <i className="fas fa-search-plus me-1.5 text-success"></i> Inspect Lightbox
                                                </button>

                                                <button 
                                                    className={`btn btn-sm px-4 py-1.5 fw-bold ${isExpanded ? 'btn-success text-black' : 'btn-outline-success text-success'}`}
                                                    style={{fontSize: '12px'}}
                                                    onClick={() => toggleLedger(item)}
                                                >
                                                    <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-history'} me-1.5`}></i> 
                                                    {isExpanded ? 'Hide Ledger Stream' : 'View Ledger Movement'}
                                                </button>
                                            </div>

                                            {/* EXPANDABLE LEDGER / ACTIVITY THREAD */}
                                            {isExpanded && (
                                                <div className="card-footer bg-black p-3 border-top border-secondary animate-fade-in">
                                                    <div className="d-flex justify-content-between align-items-center mb-2.5">
                                                        <span className="fw-bold text-success uppercase" style={{fontSize: '11px'}}>
                                                            <i className="fas fa-comments me-2"></i>Movement History & Audit Thread
                                                        </span>
                                                        <button className="btn btn-sm btn-link text-secondary p-0" onClick={() => setExpandedItemId(null)}>
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </div>

                                                    {ledgerLoading ? (
                                                        <div className="text-center py-3 text-secondary" style={{fontSize: '11px'}}>Loading movement thread...</div>
                                                    ) : itemLedger.length > 0 ? (
                                                        <div className="d-flex flex-column gap-2">
                                                            {itemLedger.map((entry, idx) => (
                                                                <div key={idx} className="bg-dark border border-secondary rounded-3 p-2.5" style={{fontSize: '11px'}}>
                                                                    <div className="d-flex justify-content-between align-items-center text-secondary mb-1" style={{fontSize: '10px'}}>
                                                                        <span><i className="fas fa-clock me-1"></i>{new Date(entry.date).toLocaleString()}</span>
                                                                        <span className={`badge px-2 py-0.5 ${['in', 'input'].includes(entry.type.toLowerCase()) ? 'bg-success text-black' : 'bg-danger text-white'}`} style={{fontSize: '9px'}}>
                                                                            {entry.type.toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <div>
                                                                            <span className="text-white fw-bold">Qty: </span>
                                                                            <span className={`fw-bold ${entry.qty > 0 ? 'text-success' : 'text-danger'}`}>{entry.qty > 0 ? `+${entry.qty}` : entry.qty}</span>
                                                                            <span className="text-secondary ms-3">Source: <span className="text-white">{entry.source || 'N/A'}</span></span>
                                                                        </div>
                                                                        <div className="text-success fw-bold">
                                                                            ₱{parseFloat(entry.freightCost || entry.shipping_cost || 0).toFixed(2)}
                                                                        </div>
                                                                    </div>
                                                                    {entry.address && <div className="text-secondary fst-italic mt-1" style={{fontSize: '10px'}}>Addr: {entry.address}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-3 text-secondary" style={{fontSize: '11px'}}>No movement history threads found.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-5 text-secondary card bg-dark border border-secondary p-5 rounded-3">
                                <i className="fas fa-ghost fs-1 mb-3"></i>
                                <p className="mb-0">NO INVENTORY POSTS MATCHING "{searchQuery}"</p>
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
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

    // Lightbox & Ledger Details Modal States
    const [lightboxItem, setLightboxItem] = useState(null);
    const [selectedLedgerEntry, setSelectedLedgerEntry] = useState(null);

    // Camera Scanner State
    const [showScanner, setShowScanner] = useState(false);
    const videoRef = useRef(null);
    const scannerIntervalRef = useRef(null);

    const searchInputRef = useRef(null);

    // Modal Form State (Using serial_array for dynamic individual inputs)
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        supplier_id: '',
        item_name: '',
        description: '',
        quantity: '1',
        ws_price: '',
        srp_amount: '',
        forward_by: '',
        freight_cost: '',
        image_url: '',
        serial_array: [''] // Dynamic array corresponding to quantity
    });

    useEffect(() => {
        fetchInventory();
        fetchSuppliers();

        const handleKeyDown = (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                    searchInputRef.current.select();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // HANDLE CAMERA BARCODE / QR SCANNING
    useEffect(() => {
        if (showScanner) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [showScanner]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                startScanningLoop();
            }
        } catch (err) {
            console.error("Camera access error:", err);
            alert("Unable to access camera. Please ensure camera permissions are allowed.");
            setShowScanner(false);
        }
    };

    const stopCamera = () => {
        if (scannerIntervalRef.current) {
            clearInterval(scannerIntervalRef.current);
            scannerIntervalRef.current = null;
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const startScanningLoop = () => {
        const WindowBarcodeDetector = window.BarcodeDetector;
        if (!WindowBarcodeDetector) {
            alert("BarcodeDetector API is not fully supported on this browser. Please use Chrome on Android/iOS or input manually.");
            return;
        }

        const barcodeDetector = new WindowBarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'upc_a', 'data_matrix']
        });

        scannerIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                    const barcodes = await barcodeDetector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        const scannedVal = barcodes[0].rawValue;
                        handleSuccessfulScan(scannedVal);
                    }
                } catch (err) {
                    // Scanning frame error fallback
                }
            }
        }, 300);
    };

    const handleSuccessfulScan = (code) => {
        if (navigator.vibrate) {
            navigator.vibrate(150);
        }

        setFormData(prev => {
            const updatedSerials = [...prev.serial_array];
            // Find the first empty input field to fill, or append if all are filled
            const emptyIndex = updatedSerials.findIndex(s => !s || s.trim() === '');

            if (emptyIndex !== -1) {
                updatedSerials[emptyIndex] = code;
            } else {
                updatedSerials.push(code);
            }

            return {
                ...prev,
                serial_array: updatedSerials,
                quantity: updatedSerials.length.toString()
            };
        });
    };

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

        if (name === 'quantity') {
            const qty = Math.max(1, parseInt(value) || 1);
            setFormData(prev => {
                const newArray = [...prev.serial_array];
                if (qty > newArray.length) {
                    // Add empty slots
                    while (newArray.length < qty) {
                        newArray.push('');
                    }
                } else {
                    // Trim slots
                    newArray.length = qty;
                }
                return { ...prev, quantity: qty.toString(), serial_array: newArray };
            });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSerialChange = (index, value) => {
        setFormData(prev => {
            const newArray = [...prev.serial_array];
            newArray[index] = value;
            return { ...prev, serial_array: newArray };
        });
    };

    const handleItemSelectChange = (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            setFormData(prev => ({ ...prev, item_name: '', description: '', srp_amount: '', image_url: '' }));
            return;
        }

        const found = inventory.find(i => i.id.toString() === selectedId);
        if (found) {
            setFormData(prev => ({
                ...prev,
                item_name: found.item_name || '',
                description: found.item_description || '',
                srp_amount: found.srp_amount || '',
                image_url: found.image_url || ''
            }));
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
            // Map serial_array into newline-separated string for backend compatibility
            const payload = {
                ...formData,
                serial_numbers: formData.serial_array.join('\n')
            };

            await axios.post(`${BASE_URL}/api/inventory/add`, payload);

            setShowModal(false);
            setFormData({
                supplier_id: '',
                item_name: '',
                description: '',
                quantity: '1',
                ws_price: '',
                srp_amount: '',
                forward_by: '',
                freight_cost: '',
                image_url: '',
                serial_array: ['']
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
            return <span className="badge rounded-pill bg-danger text-black fw-bold px-2.5 py-1" style={{ fontSize: '11px' }}>OUT OF STOCK</span>;
        } else if (qty <= 2) {
            return <span className="badge rounded-pill bg-warning text-black fw-bold px-2.5 py-1" style={{ fontSize: '11px' }}>LOW STOCK</span>;
        }
        return <span className="badge rounded-pill bg-success text-black fw-bold px-2.5 py-1" style={{ fontSize: '11px' }}>HEALTHY</span>;
    };

    const formatCurrency = (val) => {
        if (val === undefined || val === null || isNaN(val)) return '₱0.00';
        return `₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

            <style>{`
                .zoom-hover-img {
                    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease;
                    cursor: pointer;
                }
                .zoom-hover-img:hover {
                    transform: scale(1.15);
                    border-color: #198754 !important;
                }
                .ledger-clickable-row {
                    cursor: pointer;
                    transition: background-color 0.15s ease;
                }
                .ledger-clickable-row:hover {
                    background-color: rgba(25, 135, 84, 0.15) !important;
                }
            `}</style>

{/* HEADER */}
            <header className="navbar navbar-dark bg-dark border-bottom border-secondary px-3 py-2 sticky-top shadow-sm" style={{ zIndex: 1020 }}>
                <div className="d-flex align-items-center justify-content-between w-100 flex-nowrap gap-3">
                    <div className="d-flex align-items-center text-nowrap flex-shrink-0">
                        <div className="rounded-circle me-2 bg-success pulse-dot" style={{ width: '10px', height: '10px' }}></div>
                        <h4 className="mb-0 fw-bold tracking-tighter me-3 fs-5">JADE<span className="text-success">STOCK</span></h4>

                        <div className="d-none d-md-flex align-items-center bg-black border border-secondary rounded px-2.5 py-1.5">
                            <div className="rounded-circle me-2 bg-success" style={{ width: '6px', height: '6px' }}></div>
                            <span className="text-secondary fw-bold" style={{ fontSize: '11px' }}>
                                NODE: <span className="text-white">ACTIVE</span>
                            </span>
                        </div>
                    </div>

                    <div className="d-flex gap-2.5 align-items-center justify-content-end flex-wrap flex-md-nowrap w-100">
                        <div className="position-relative flex-grow-1 flex-md-grow-0" style={{ maxWidth: '320px', minWidth: '160px' }}>
                            <i className="fas fa-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary" style={{ fontSize: '13px' }}></i>
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="form-control bg-black border-secondary text-white ps-5 w-100"
                                placeholder="Search inventory... (Press F1)"
                                style={{ borderRadius: '20px', fontSize: '13px', padding: '8px 12px 8px 36px' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {searchQuery && (
                            <button className="btn btn-dark border-secondary text-secondary px-2.5 py-2 text-nowrap" onClick={() => setSearchQuery('')}>
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                        <button
                            className="btn btn-success fw-bold px-3 py-2 text-black text-nowrap shadow-sm"
                            onClick={() => setShowModal(true)}
                            style={{ fontSize: '13px' }}
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
                        <span className="fw-bold text-success uppercase" style={{ fontSize: '13px' }}>
                            <i className="fas fa-boxes me-2"></i>INVENTORY LEDGER & STOCK LEVELS
                        </span>
                        <span className="badge bg-secondary text-white px-2.5 py-1.5" style={{ fontSize: '11px' }}>
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
                                <div className="table-responsive mb-0 d-none d-lg-block">
                                    <table className="table table-dark table-hover table-striped align-middle mb-0 text-nowrap" style={{ fontSize: '13px' }}>
                                        <thead className="table-secondary text-uppercase text-black fw-bold" style={{ fontSize: '12px' }}>
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
                                                                            style={{ width: '38px', height: '38px', objectFit: 'contain' }}
                                                                            onClick={() => setLightboxItem(item)}
                                                                            title="Click to view Lightbox"
                                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                                        />
                                                                    ) : (
                                                                        <div className="rounded bg-black text-secondary d-flex align-items-center justify-content-center me-3 border border-secondary" style={{ width: '38px', height: '38px', fontSize: '12px' }}>
                                                                            <i className="fas fa-image"></i>
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <span className="text-white fw-bold d-block fs-6">{item.item_name}</span>
                                                                        {item.item_description && <small className="text-secondary text-truncate d-block mt-0.5" style={{ maxWidth: '300px', fontSize: '11px' }}>{item.item_description}</small>}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="badge bg-black text-white border border-secondary px-2.5 py-1.5" style={{ fontSize: '12px' }}>{item.total_qty || 0}</span>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="badge bg-black text-danger border border-secondary px-2.5 py-1.5" style={{ fontSize: '12px' }}>{item.soldout_qty || 0}</span>
                                                            </td>
                                                            <td className="text-center fw-bold text-success fs-6">
                                                                {item.available_qty || 0}
                                                            </td>
                                                            <td>{renderStatusBadge(item.available_qty)}</td>
                                                            <td className="text-end pe-4">
                                                                <button
                                                                    className={`btn px-3 py-1.5 fw-bold ${isExpanded ? 'btn-success text-black' : 'btn-outline-success text-success'}`}
                                                                    style={{ fontSize: '12px' }}
                                                                    onClick={() => toggleLedger(item)}
                                                                >
                                                                    <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-history'} me-1.5`}></i>
                                                                    {isExpanded ? 'HIDE' : 'LEDGER'}
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan="7" className="bg-black p-4 border-bottom border-secondary">
                                                                    <div className="card bg-dark border border-secondary rounded-3 shadow-inner">
                                                                        <div className="card-header bg-black py-2.5 px-4 d-flex justify-content-between align-items-center border-bottom border-secondary">
                                                                            <span className="fw-bold text-success uppercase" style={{ fontSize: '12px' }}>
                                                                                <i className="fas fa-list-alt me-2"></i> Movement History // {item.item_name} (Click row to inspect details)
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
                                                                                    <table className="table table-dark table-striped mb-0 align-middle text-nowrap" style={{ fontSize: '12px' }}>
                                                                                        <thead className="text-secondary uppercase" style={{ fontSize: '11px' }}>
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
                                                                                                <tr
                                                                                                    key={idx}
                                                                                                    className="ledger-clickable-row"
                                                                                                    onClick={() => setSelectedLedgerEntry({ ...entry, parentItem: item })}
                                                                                                    title="Click to view full transaction details"
                                                                                                >
                                                                                                    <td className="ps-4 text-secondary">{new Date(entry.date).toLocaleString()}</td>
                                                                                                    <td>
                                                                                                        <span className={`badge px-2.5 py-1 ${['in', 'input'].includes(entry.type.toLowerCase()) ? 'bg-success text-black' : 'bg-danger text-white'}`} style={{ fontSize: '10px' }}>
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

                                <div className="d-lg-none p-3 d-flex flex-column gap-3">
                                    {filteredInventory.map(item => {
                                        const isExpanded = expandedItemId === item.id;
                                        const itemLedger = ledgers[item.id] || [];

                                        return (
                                            <div key={item.id} className="card bg-black border border-secondary rounded-3 p-3 text-light" style={{ fontSize: '12px' }}>
                                                <div className="d-flex align-items-center justify-content-between mb-2.5">
                                                    <div className="d-flex align-items-center gap-2.5">
                                                        {item.image_url ? (
                                                            <img
                                                                src={item.image_url}
                                                                alt={item.item_name}
                                                                className="rounded border border-secondary bg-dark zoom-hover-img"
                                                                style={{ width: '38px', height: '38px', objectFit: 'contain' }}
                                                                onClick={() => setLightboxItem(item)}
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <div className="rounded bg-dark text-secondary d-flex align-items-center justify-content-center border border-secondary" style={{ width: '38px', height: '38px', fontSize: '12px' }}>
                                                                <i className="fas fa-image"></i>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h6 className="mb-0 fw-bold text-white text-truncate" style={{ fontSize: '13px', maxWidth: '190px' }}>{item.item_name}</h6>
                                                            <small className="text-secondary" style={{ fontSize: '10px' }}>ID: #{item.id}</small>
                                                        </div>
                                                    </div>
                                                    {renderStatusBadge(item.available_qty)}
                                                </div>

                                                <div className="row g-2 text-center bg-dark rounded-2 p-2 my-2" style={{ fontSize: '11px' }}>
                                                    <div className="col-4 border-end border-secondary">
                                                        <span className="text-secondary d-block" style={{ fontSize: '10px' }}>TOTAL</span>
                                                        <span className="fw-bold text-white fs-6">{item.total_qty || 0}</span>
                                                    </div>
                                                    <div className="col-4 border-end border-secondary">
                                                        <span className="text-secondary d-block" style={{ fontSize: '10px' }}>SOLD</span>
                                                        <span className="fw-bold text-danger fs-6">{item.soldout_qty || 0}</span>
                                                    </div>
                                                    <div className="col-4">
                                                        <span className="text-secondary d-block" style={{ fontSize: '10px' }}>AVAILABLE</span>
                                                        <span className="fw-bold text-success fs-6">{item.available_qty || 0}</span>
                                                    </div>
                                                </div>

                                                <button
                                                    className={`btn w-100 py-2 fw-bold ${isExpanded ? 'btn-success text-black' : 'btn-outline-success text-success'}`}
                                                    style={{ fontSize: '11px' }}
                                                    onClick={() => toggleLedger(item)}
                                                >
                                                    <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-history'} me-1.5`}></i>
                                                    {isExpanded ? 'HIDE LEDGER' : 'VIEW LEDGER MOVEMENT'}
                                                </button>

                                                {isExpanded && (
                                                    <div className="mt-3 pt-3 border-top border-secondary bg-dark p-2.5 rounded-2 animate-fade-in">
                                                        <span className="fw-bold text-success d-block mb-2" style={{ fontSize: '11px' }}>
                                                            <i className="fas fa-list-alt me-1.5"></i> LEDGER HISTORY (Tap entry for details):
                                                        </span>
                                                        {ledgerLoading ? (
                                                            <div className="text-center py-3 text-secondary">Loading history...</div>
                                                        ) : itemLedger.length > 0 ? (
                                                            <div className="d-flex flex-column gap-2">
                                                                {itemLedger.map((entry, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="bg-black border border-secondary rounded-2 p-2.5 text-light ledger-clickable-row"
                                                                        style={{ fontSize: '11px' }}
                                                                        onClick={() => setSelectedLedgerEntry({ ...entry, parentItem: item })}
                                                                    >
                                                                        <div className="d-flex justify-content-between text-secondary mb-1" style={{ fontSize: '10px' }}>
                                                                            <span>{new Date(entry.date).toLocaleString()}</span>
                                                                            <span className={`badge ${['in', 'input'].includes(entry.type.toLowerCase()) ? 'bg-success text-black' : 'bg-danger text-white'}`} style={{ fontSize: '9px' }}>
                                                                                {entry.type.toUpperCase()}
                                                                            </span>
                                                                        </div>
                                                                        <div className="fw-bold text-white mb-1">
                                                                            Qty: <span className={entry.qty > 0 ? 'text-success' : 'text-danger'}>{entry.qty > 0 ? `+${entry.qty}` : entry.qty}</span>
                                                                        </div>
                                                                        <div className="text-secondary mb-0.5">Source: <span className="text-white">{entry.source || 'N/A'}</span></div>
                                                                        <div className="text-secondary fst-italic" style={{ fontSize: '10px' }}>{entry.address || 'N/A'}</div>
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

            {/* LIGHTBOX MODAL */}
            {lightboxItem && (
                <div className="modal d-block bg-black bg-opacity-90 px-2 px-md-4 py-3" tabIndex="-1" style={{ zIndex: 1090 }}>
                    <div className="modal-dialog modal-dialog-centered modal-xl">
                        <div className="modal-content bg-dark border border-secondary text-white font-monospace shadow-2xl rounded-3 overflow-hidden">
                            <div className="modal-header border-secondary py-2.5 px-3 bg-black d-flex justify-content-between align-items-center">
                                <span className="text-success fw-bold" style={{ fontSize: '12px' }}>MEDIA LIGHTBOX // #{lightboxItem.id} - {lightboxItem.item_name}</span>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setLightboxItem(null)}></button>
                            </div>
                            <div className="modal-body p-0">
                                <div className="row g-0">
                                    <div className="col-12 col-lg-8 bg-black d-flex align-items-center justify-content-center p-3 p-md-5" style={{ minHeight: '380px', maxHeight: '75vh' }}>
                                        <img src={lightboxItem.image_url} alt={lightboxItem.item_name} className="img-fluid rounded" style={{ maxHeight: '70vh', objectFit: 'contain' }} />
                                    </div>
                                    <div className="col-12 col-lg-4 bg-dark border-start border-secondary d-flex flex-column justify-content-between p-3 p-md-4" style={{ fontSize: '12px' }}>
                                        <div>
                                            <h6 className="fw-bold text-white mb-2">{lightboxItem.item_name}</h6>
                                            <p className="text-light bg-black p-2.5 rounded border border-secondary mb-3">{lightboxItem.item_description || "No specifications provided."}</p>
                                        </div>
                                        <button type="button" className="btn btn-success fw-bold text-black w-100 py-2" onClick={() => setLightboxItem(null)}>CLOSE</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LEDGER DETAILS MODAL */}
            {selectedLedgerEntry && (
                <div className="modal d-block bg-black bg-opacity-90 px-2 px-md-4 py-3" tabIndex="-1" style={{ zIndex: 1100 }}>
                    <div className="modal-dialog modal-dialog-centered modal-xl">
                        <div className="modal-content bg-dark border border-success text-white font-monospace shadow-2xl rounded-3 overflow-hidden">
                            <div className="modal-header border-secondary py-2.5 px-3 bg-black d-flex justify-content-between align-items-center">
                                <span className="text-success fw-bold" style={{ fontSize: '12px' }}>{selectedLedgerEntry.type.toUpperCase()} DETAILS // #{selectedLedgerEntry.parentItem?.id} {selectedLedgerEntry.parentItem?.item_name}</span>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedLedgerEntry(null)}></button>
                            </div>
                            <div className="modal-body p-0">
                                <div className="row g-0">
                                    <div className="col-12 col-lg-7 bg-black d-flex align-items-center justify-content-center p-3">
                                        <img src={selectedLedgerEntry.parentItem?.image_url} alt="" className="img-fluid rounded" style={{ maxHeight: '60vh', objectFit: 'contain' }} />
                                    </div>
                                    <div className="col-12 col-lg-5 bg-dark border-start border-secondary p-4 d-flex flex-column justify-content-between" style={{ fontSize: '12px' }}>
                                        <div className="d-flex flex-column gap-2 bg-black p-3 rounded border border-secondary">

                                            <div className="d-flex justify-content-between border-bottom border-secondary pb-1.5">
                                                <span className="text-secondary">DESCRIPTION:</span>
                                                <span className="text-success fw-bold">{selectedLedgerEntry.parentItem?.item_description}</span>
                                            </div>
                                            <div className="d-flex justify-content-between border-bottom border-secondary pb-1.5">
                                                <span className="text-secondary">QTY:</span>
                                                <span className="text-success fw-bold">{selectedLedgerEntry.qty}</span>
                                            </div>
                                            <div className="d-flex justify-content-between border-bottom border-secondary pb-1.5">
                                                <span className="text-secondary">{(selectedLedgerEntry.type || '').toLowerCase() === 'output' ? 'CUSTOMER:' : 'SUPPLIER:'}</span>
                                                <span className="text-white">{selectedLedgerEntry.source}</span>
                                            </div>
                                            <div className="d-flex justify-content-between border-bottom border-secondary pb-1.5">
                                                <span className="text-secondary">FORWARD BY:</span>
                                                <span className="text-success fw-bold">{selectedLedgerEntry.forwardedBy}</span>
                                            </div>
                                            <div className="d-flex justify-content-between border-bottom border-secondary pb-1.5">
                                                <span className="text-secondary">FREIGHT COST:</span>
                                                <span className="text-success">{formatCurrency(selectedLedgerEntry.freightCost || selectedLedgerEntry.shipping_cost)}</span>
                                            </div>
                                            {(selectedLedgerEntry.type || '').toLowerCase() === 'input' && (
                                                <div className="d-flex justify-content-between border-bottom border-secondary pb-1.5">
                                                    <span className="text-secondary">W/S PRICE:</span>
                                                    <span className="text-success">{formatCurrency(selectedLedgerEntry.wsPrice || selectedLedgerEntry.ws_price)}</span>
                                                </div>
                                            )}
                                            <div className="d-flex justify-content-between border-bottom border-secondary pb-1.5">
                                                <span className="text-secondary">SRP:</span>
                                                <span className="text-success">{formatCurrency(selectedLedgerEntry.SRP || selectedLedgerEntry.srp_amount)}</span>
                                            </div>
                                        </div>
                                        <button type="button" className="btn btn-success fw-bold text-black w-100 py-2 mt-3" onClick={() => setSelectedLedgerEntry(null)}>CLOSE</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LIVE CAMERA BARCODE SCANNER MODAL */}
            {showScanner && (
                <div className="modal d-block bg-black bg-opacity-95 px-3" tabIndex="-1" style={{ zIndex: 1120 }}>
                    <div className="modal-dialog modal-dialog-centered modal-md">
                        <div className="modal-content bg-dark border border-success text-white font-monospace shadow-2xl rounded-3">
                            <div className="modal-header border-secondary py-3 px-4 bg-black">
                                <h6 className="modal-title text-success fw-bold" style={{ fontSize: '13px' }}>
                                    <i className="fas fa-camera me-2"></i>SCAN BARCODE / QR CODE
                                </h6>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowScanner(false)}></button>
                            </div>
                            <div className="modal-body p-3 text-center">
                                <div className="position-relative bg-black rounded border border-success overflow-hidden" style={{ minHeight: '280px' }}>
                                    <video ref={videoRef} className="w-100 h-100" style={{ objectFit: 'cover', maxHeight: '350px' }} muted playsInline></video>
                                    <div className="position-absolute top-50 start-50 translate-middle border border-success border-2 rounded opacity-50 pointer-event-none" style={{ width: '80%', height: '120px' }}></div>
                                </div>
                                <p className="text-secondary small mt-3 mb-0" style={{ fontSize: '11px' }}>
                                    Align barcode or QR code inside the frame. Scanned numbers will automatically fill up the serial slots sequentially.
                                </p>
                            </div>
                            <div className="modal-footer border-secondary bg-black py-3 px-4">
                                <button type="button" className="btn btn-danger w-100 fw-bold py-2" onClick={() => setShowScanner(false)} style={{ fontSize: '12px' }}>
                                    DONE / CLOSE SCANNER
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
                                <h6 className="modal-title text-success fw-bold uppercase" style={{ fontSize: '13px' }}>
                                    <i className="fas fa-plus-circle me-2"></i>Stock Entry / Inbound Terminal
                                </h6>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmitStock}>
                                <div className="modal-body p-4" style={{ fontSize: '12px' }}>
                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary fw-bold mb-1.5">SUPPLIER</label>
                                            <select name="supplier_id" className="form-select bg-black text-white border-secondary py-2" value={formData.supplier_id} onChange={handleInputChange} required style={{ fontSize: '12px' }}>
                                                <option value="">Select Supplier</option>
                                                {suppliers.map(sup => (
                                                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary fw-bold mb-1.5">ITEM NAME</label>
                                            <select className="form-select bg-black text-white border-secondary mb-2 py-2" onChange={handleItemSelectChange} defaultValue="" style={{ fontSize: '12px' }}>
                                                <option value="">-- Select Existing or Type New --</option>
                                                {inventory.map(inv => (
                                                    <option key={inv.id} value={inv.id}>{inv.item_name}</option>
                                                ))}
                                            </select>
                                            <input type="text" name="item_name" className="form-control bg-black text-white border-secondary py-2" placeholder="Or type new item name" value={formData.item_name} onChange={handleInputChange} style={{ fontSize: '12px' }} required />
                                        </div>

                                        <div className="col-12">
                                            <label className="text-success fw-bold mb-1.5">PICTURE (IMAGE URL)</label>
                                            <div className="input-group mb-2">
                                                <span className="input-group-text bg-black border-secondary text-secondary"><i className="fas fa-link"></i></span>
                                                <input type="text" name="image_url" className="form-control bg-black text-white border-secondary py-2" placeholder="Paste image address URL" value={formData.image_url} onChange={handleInputChange} style={{ fontSize: '12px' }} />
                                                <button type="button" className="btn btn-outline-success px-3" onClick={openGoogleImageSearch} disabled={!formData.item_name} style={{ fontSize: '12px' }}>
                                                    <i className="fas fa-external-link-alt me-1.5"></i>Google Images
                                                </button>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <label className="text-secondary fw-bold mb-1.5">DESCRIPTION</label>
                                            <textarea name="description" className="form-control bg-black text-white border-secondary py-2" rows="2" placeholder="Hardware specifications..." value={formData.description} onChange={handleInputChange} style={{ fontSize: '12px' }}></textarea>
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="text-secondary fw-bold mb-1.5">QUANTITY</label>
                                            <input type="number" name="quantity" className="form-control bg-black text-white border-secondary py-2" placeholder="1" min="1" value={formData.quantity} onChange={handleInputChange} style={{ fontSize: '12px' }} required />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="text-secondary fw-bold mb-1.5">W/S PRICE</label>
                                            <input type="number" step="0.01" name="ws_price" className="form-control bg-black text-white border-secondary py-2" placeholder="0.00" value={formData.ws_price} onChange={handleInputChange} style={{ fontSize: '12px' }} required />
                                        </div>

                                        <div className="col-12 col-md-4">
                                            <label className="text-secondary fw-bold mb-1.5">SRP AMOUNT</label>
                                            <input type="number" step="0.01" name="srp_amount" className="form-control bg-black text-white border-secondary py-2" placeholder="0.00" value={formData.srp_amount} onChange={handleInputChange} style={{ fontSize: '12px' }} required />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary fw-bold mb-1.5">FORWARD BY</label>
                                            <input type="text" name="forward_by" className="form-control bg-black text-white border-secondary py-2" placeholder="Courier / Handler" value={formData.forward_by} onChange={handleInputChange} style={{ fontSize: '12px' }} />
                                        </div>

                                        <div className="col-12 col-md-6">
                                            <label className="text-secondary fw-bold mb-1.5">FREIGHT COST</label>
                                            <input type="number" step="0.01" name="freight_cost" className="form-control bg-black text-white border-secondary py-2" placeholder="0.00" value={formData.freight_cost} onChange={handleInputChange} style={{ fontSize: '12px' }} />
                                        </div>

                                        {/* DYNAMIC INDIVIDUAL SERIAL INPUT FIELDS */}
                                        <div className="col-12">
                                            <div className="d-flex justify-content-between align-items-center mb-1.5">
                                                <label className="text-success fw-bold mb-0">
                                                    SERIAL NUMBERS ({formData.serial_array.length} Required)
                                                </label>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-success py-1 px-2.5 fw-bold"
                                                    onClick={() => setShowScanner(true)}
                                                    style={{ fontSize: '11px' }}
                                                >
                                                    <i className="fas fa-camera me-1.5"></i>SCAN WITH PHONE CAMERA
                                                </button>
                                            </div>

                                            <div className="d-flex flex-column gap-2 p-2.5 bg-black rounded border border-secondary" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {formData.serial_array.map((serialVal, index) => (
                                                    <div key={index} className="input-group input-group-sm">
                                                        <span className="input-group-text bg-dark text-secondary border-secondary" style={{ width: '42px', fontSize: '11px' }}>
                                                            #{index + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            className="form-control bg-black text-white border-secondary"
                                                            placeholder={`Enter serial number for item #${index + 1}`}
                                                            value={serialVal}
                                                            onChange={(e) => handleSerialChange(index, e.target.value)}
                                                            style={{ fontSize: '12px' }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <small className="text-secondary mt-1.5 d-block" style={{ fontSize: '10px' }}>
                                                Changing the quantity above will automatically add or remove individual serial input slots.
                                            </small>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-secondary bg-black py-3 px-4">
                                    <button type="button" className="btn btn-dark border-secondary text-secondary px-4 py-2" onClick={() => setShowModal(false)} style={{ fontSize: '12px' }}>CANCEL</button>
                                    <button type="submit" className="btn btn-success fw-bold text-black px-4 py-2" disabled={submitting} style={{ fontSize: '12px' }}>
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
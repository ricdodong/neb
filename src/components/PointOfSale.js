import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';
const FRONT_URL = 'https://dps.ricalgen.eu.org';

const PointOfSale = ({ triggerToast }) => {
    // --- State Management ---
    const [stock, setStock] = useState([]);
    const [cart, setCart] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customers, setCustomers] = useState([]);
    const [pendingSelections, setPendingSelections] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    const [isCheckoutView, setIsCheckoutView] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [amountTendered, setAmountTendered] = useState('');
    const [autoBatchRef, setAutoBatchRef] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [showMobileCart, setShowMobileCart] = useState(false);

    // --- SCANNER PAIRING & ACTIVE TOGGLE STATES ---
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [posActiveSession, setPosActiveSession] = useState(localStorage.getItem('jadestock_pos_session') || '');
    const [isScannerActive, setIsScannerActive] = useState(true);

    // Refs to prevent duplicate message flooding on same serial value
    const lastScannedCodeRef = useRef('');
    const lastProcessedSerialRef = useRef('');

    // --- TERMS & INSTALLMENT STATE ---
    const [termType, setTermType] = useState('months');
    const [termDuration, setTermDuration] = useState('7');

    // --- SCAN REDIRECT & NETWORK STATE ---
    const [isSuccessView, setIsSuccessView] = useState(false);
    const [lastTransactionId, setLastTransactionId] = useState(null);
    const [serverBaseUrl, setServerBaseUrl] = useState('');
    const [useLocalIp, setUseLocalIp] = useState(false);

    // --- DOCUMENT UPLOAD MODAL STATE ---
    const [showDocUploadModal, setShowDocUploadModal] = useState(false);
    const [uploadedDR, setUploadedDR] = useState(null);
    const [uploadedSI, setUploadedSI] = useState(null);
    const [uploadedCI, setUploadedCI] = useState(null);

    // --- API Interactions ---
    const fetchServerInfo = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/server-info`);
            setServerBaseUrl(res.data.baseUrl);
            setUseLocalIp(false);
        } catch (err) {
            console.error("Network discovery fallback activated");
            setUseLocalIp(true);
            if (err.response && err.response.data && err.response.data.baseUrl) {
                setServerBaseUrl(err.response.data.baseUrl);
            } else {
                setServerBaseUrl('http://112.199.118.232:5000');
            }
        }
    };

    const fetchStock = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get(`${BASE_URL}/api/pos-inventory?t=${Date.now()}`);
            const sanitizedStock = res.data.map(item => ({
                ...item,
                price: Number(item.price || 0),
                image: item.image_url || `https://placehold.co/400x300/1a1a1a/28a745?text=${encodeURIComponent(item.name)}`
            }));
            setStock(sanitizedStock);
        } catch (err) {
            triggerToast("Database connection failed", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/customers`);
            setCustomers(res.data);
        } catch (err) {
            console.error("Customer fetch error:", err);
        }
    };

    useEffect(() => {
        fetchStock();
        fetchCustomers();
        fetchServerInfo();
    }, []);

    // --- WIRELESS SCANNER CLOUD POLLING & VALUE-CHANGE DEDUPLICATION ---
    useEffect(() => {
        if (!isScannerActive) return;

        const pollInterval = setInterval(async () => {
            const currentSession = localStorage.getItem('jadestock_pos_session');
            if (currentSession) {
                try {
                    const res = await axios.get(`${BASE_URL}/api/scanner/poll?session=${currentSession}`);
                    if (res.data && res.data.scannedCode) {
                        const { scannedCode, timestamp } = res.data;
                        const trimmedSerial = scannedCode.trim();
                        const lastProcessedTimestamp = localStorage.getItem(`jadestock_pos_last_${currentSession}`);

                        // Only trigger if either the timestamp is fresh OR the serial value itself changed
                        if (timestamp !== lastProcessedTimestamp || lastProcessedSerialRef.current !== trimmedSerial) {
                            localStorage.setItem(`jadestock_pos_last_${currentSession}`, timestamp);
                            lastProcessedSerialRef.current = trimmedSerial;

                            if (lastScannedCodeRef.current === trimmedSerial) {
                                return; // Skip if it's the exact same serial value repeating without a change
                            }
                            lastScannedCodeRef.current = trimmedSerial;

                            handleScannedSerialNumber(trimmedSerial);
                        }
                    }
                } catch (err) {
                    // Silent background poll error handling
                }
            }
        }, 800);

        return () => clearInterval(pollInterval);
    }, [stock, cart, isScannerActive]);

    // Match scanned serial number to stock and auto-add to cart
    const handleScannedSerialNumber = (serial) => {
        if (!serial) return;

        // Check if serial is already in the cart
        const alreadyInCart = cart.some(c => c.selectedSN === serial);
        if (alreadyInCart) {
            triggerToast(`Serial "${serial}" is already in the cart!`, "warning");
            return;
        }

        // Find product containing this serial number in stock
        let matchedProduct = null;
        let foundSN = null;

        for (const p of stock) {
            const usedInCart = cart.filter(c => c.id === p.id).map(c => c.selectedSN);
            const availableSNs = p.sns ? p.sns.filter(sn => !usedInCart.includes(sn)) : [];

            if (availableSNs.includes(serial)) {
                matchedProduct = p;
                foundSN = serial;
                break;
            }
        }

        if (matchedProduct && foundSN) {
            setCart(prevCart => [...prevCart, { ...matchedProduct, cartId: Math.random(), selectedSN: foundSN }]);
            triggerToast(`Scanned & Added: ${matchedProduct.name} (${foundSN})`, "success");
        } else {
            triggerToast(`Serial "${serial}" not found or already sold out in inventory.`, "error");
        }
    };

    const generateNewSessionCode = () => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setPosActiveSession(code);
        localStorage.setItem('jadestock_pos_session', code);
        setShowScannerModal(true);
    };

    // --- Helpers ---
    const filteredStock = stock.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.id).includes(searchTerm)
    );

    // Helper or click handler to enter checkout view cleanly
    const proceedToCheckout = () => {
        if (cart.length === 0) return;
        setAutoBatchRef(`TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
        setIsCheckoutView(true);
    };

    // Upload handler function
    const handleUploadFile = async (fileObject, docType) => {
        try {
            const formData = new FormData();
            formData.append('file', fileObject); // fileObject comes from e.target.files[0]

            // Post to your backend R2 upload endpoint
            const response = await axios.post(`${BASE_URL}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const data = response.data;

            if (data.success) {
                // CRITICAL: Save the filename STRING returned from your server, NOT the File object!
                const filename = data.filename; // e.g. "uploaded_dr_1786881556776_DR.jpg"

                if (docType === 'DR') setUploadedDR(filename);
                if (docType === 'SI') setUploadedSI(filename);
                if (docType === 'CI') setUploadedCI(filename);

                triggerToast(`${docType} uploaded successfully to R2`, "success");
            } else {
                triggerToast(data.error || "Upload failed", "error");
            }
        } catch (err) {
            console.error(err);
            triggerToast("Failed to upload file to storage", "error");
        }
    };

    const getUsedSNs = (productId) => cart.filter(c => c.id === productId).map(c => c.selectedSN);
    const formatPHP = (amt) => "₱" + Number(amt || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const totalAmount = cart.reduce((total, item) => total + Number(item.price || 0), 0);
    const changeAmount = Number(amountTendered) > totalAmount ? Number(amountTendered) - totalAmount : 0;

    const installmentBreakdown = () => {
        const duration = parseInt(termDuration) || 1;
        return totalAmount / duration;
    };

    // --- Actions ---
    const addToCart = (product) => {
        const chosenSN = pendingSelections[product.id];
        if (!chosenSN) {
            triggerToast("Select SN first", "warning");
            return;
        }
        setCart([...cart, { ...product, cartId: Math.random(), selectedSN: chosenSN }]);
        setPendingSelections({ ...pendingSelections, [product.id]: '' });

        if (window.innerWidth < 992) triggerToast(`Added ${product.name}`, "success");
    };

  const handleCheckout = async () => {
        if (!selectedCustomerId) return triggerToast("Please select a customer", "warning");

        const isCash = paymentMethod === 'Cash' || paymentMethod === 'Cash Settlement';
        if (isCash && Number(amountTendered) < totalAmount) {
            return triggerToast("Incomplete Cash Payment", "error");
        }

        const customer = customers.find(c => String(c.id) === String(selectedCustomerId));
        const currentBatchRef = autoBatchRef || `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        try {
            // Send the entire cart payload in ONE single request instead of looping
            await axios.post(`${BASE_URL}/api/sales`, {
                customer_id: selectedCustomerId,
                payment_method: paymentMethod,
                payment_status: paymentMethod === 'Terms' ? 'Unpaid' : 'Paid',
                amount_paid: paymentMethod === 'Terms' ? 0 : amountTendered,
                name: customer?.name || "Guest",
                address: customer?.address || "POS Terminal",
                batch_reference: currentBatchRef,
                term_type: paymentMethod === 'Terms' ? termType : null,
                term_duration: paymentMethod === 'Terms' ? termDuration : null,
                
                // Pass the entire array of cart items safely
                items: cart.map(item => ({
                    item_id: item.id,
                    serial_number: item.selectedSN
                })),

                // Documents
                dr_attachment: uploadedDR ? `/uploads/receipts/sales/dr/${uploadedDR}` : null,
                si_attachment: paymentMethod === 'Cash' ? (uploadedSI ? `/uploads/receipts/sales/si/${uploadedSI}` : null) : null,
                ci_attachment: paymentMethod === 'Terms' ? (uploadedCI ? `/uploads/receipts/sales/ci/${uploadedCI}` : null) : null,
            });

            triggerToast(`Transaction Recorded: ${currentBatchRef}`, "success");

            setLastTransactionId(currentBatchRef);
            setIsSuccessView(true);

            // Reset states
            setCart([]);
            setSelectedCustomerId('');
            setIsCheckoutView(false);
            setAmountTendered('');
            setAutoBatchRef('');
            setPaymentMethod('Cash');
            setUploadedDR(null);
            setUploadedSI(null);
            setUploadedCI(null);
            fetchStock();
        } catch (err) {
            triggerToast("Transaction Failed", "error");
        }
    };

    return (
        <div className="container-fluid min-vh-100 bg-black text-light p-0 d-flex flex-column font-monospace overflow-hidden position-relative">

            {showMobileCart && (
                <div
                    className="mobile-cart-backdrop d-lg-none"
                    onClick={() => setShowMobileCart(false)}
                />
            )}

            {/* HEADER */}
            <header className="navbar navbar-dark bg-dark border-bottom border-secondary px-3 py-2 sticky-top shadow-sm" style={{ zIndex: 1020 }}>
                <div className="d-flex align-items-center flex-wrap w-100 justify-content-between">
                    <div className="d-flex align-items-center">
                        <div className={`rounded-circle me-2 pulse-dot ${useLocalIp ? 'bg-warning' : 'bg-success'}`} style={{ width: '10px', height: '10px' }}></div>
                        <h5 className="mb-0 fw-bold tracking-tighter me-3">DPS<span className="text-success">POS</span></h5>

                        <div className="d-none d-md-flex align-items-center bg-black border border-secondary rounded px-2 py-1">
                            <div className={`rounded-circle me-2 ${useLocalIp ? 'bg-warning' : 'bg-success'}`} style={{ width: '6px', height: '6px' }}></div>
                            <span className="text-secondary fw-bold" style={{ fontSize: '10px' }}>
                                NODE: <span className="text-white">{FRONT_URL.replace('https://', '').replace('http://', '') || 'CONNECTING...'}</span>
                            </span>
                        </div>
                    </div>

                    <div className="d-flex gap-2 align-items-center mt-2 mt-md-0 flex-grow-1 justify-content-end">
                        {/* CONNECT SCANNER BUTTON */}
                        <button
                            className="btn btn-sm btn-outline-success fw-bold text-nowrap"
                            onClick={() => {
                                if (!posActiveSession) {
                                    generateNewSessionCode();
                                } else {
                                    setShowScannerModal(true);
                                }
                            }}
                            style={{ fontSize: '12px' }}
                        >
                            <i className="fas fa-barcode me-1.5"></i>CONNECT SCANNER
                        </button>

                        {/* STOP / START SCANNER TOGGLE BUTTON */}
                        <button
                            className={`btn btn-sm fw-bold text-nowrap ${isScannerActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => setIsScannerActive(!isScannerActive)}
                            style={{ fontSize: '12px' }}
                            title="Toggle wireless scanner listener"
                        >
                            <i className={`fas ${isScannerActive ? 'fa-stop-circle' : 'fa-play-circle'} me-1.5`}></i>
                            {isScannerActive ? 'STOP SCANNER' : 'START SCANNER'}
                        </button>

                        <div className="position-relative flex-grow-1 flex-md-grow-0" style={{ maxWidth: '220px' }}>
                            <i className="fas fa-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"></i>
                            <input
                                type="text"
                                className="form-control form-control-sm bg-black border-secondary text-white ps-5 w-100"
                                placeholder="Filter items..."
                                style={{ borderRadius: '20px' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className={`form-select form-select-sm bg-dark text-light border-${selectedCustomerId ? 'secondary' : 'danger'} w-auto`}
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                        >
                            <option value="" disabled>Select Customer</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <button
                            className="btn btn-sm btn-success d-lg-none position-relative ms-2"
                            onClick={() => setShowMobileCart(true)}
                        >
                            <i className="fas fa-shopping-cart"></i>
                            {cart.length > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                                    {cart.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <div className="row g-0 flex-grow-1 overflow-hidden position-relative">
                {/* PRODUCT GRID */}
                <main className="col-12 col-lg-8 col-xl-9 p-3 bg-dark bg-opacity-25 overflow-auto custom-vh-lg">
                    {isLoading ? (
                        <div className="d-flex h-100 justify-content-center align-items-center py-5">
                            <div className="spinner-border text-success" role="status"></div>
                        </div>
                    ) : (
                        <div className="row g-2 g-md-3 pb-5 pb-lg-0">
                            {filteredStock.map(p => {
                                const usedInCart = getUsedSNs(p.id);
                                const availableToSelect = p.sns ? p.sns.filter(sn => !usedInCart.includes(sn)) : [];
                                const remainingCount = availableToSelect.length;

                                return (
                                    <div className="col-6 col-md-4 col-xl-3" key={p.id}>
                                        <div className={`card h-100 border-secondary bg-dark shadow-sm pro-card ${remainingCount === 0 ? 'sold-out' : ''}`}>
                                            <div className="position-relative overflow-hidden" style={{ height: '140px' }}>
                                                <img
                                                    src={p.image}
                                                    className="card-img-top w-100 h-100 object-fit-cover opacity-75 clickable-img"
                                                    alt={p.name}
                                                    onClick={() => setSelectedProduct(p)}
                                                />
                                                <div className="position-absolute top-0 end-0 m-2">
                                                    <span className={`badge ${remainingCount < 3 ? 'bg-danger' : 'bg-dark border border-secondary'} rounded-pill tiny-text`}>
                                                        STK: {remainingCount}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="card-body p-2 d-flex flex-column">
                                                <h6 className="card-title text-white fw-bold mb-1 tiny-text text-truncate">{p.name}</h6>
                                                <p className="text-success fw-bold mb-2 tiny-text">{formatPHP(p.price)}</p>

                                                {remainingCount > 0 ? (
                                                    <div className="mt-auto">
                                                        <select
                                                            className="form-select form-select-sm bg-black text-white border-secondary mb-2 tiny-text"
                                                            value={pendingSelections[p.id] || ''}
                                                            onChange={(e) => setPendingSelections({ ...pendingSelections, [p.id]: e.target.value })}
                                                        >
                                                            <option value="">Select SN</option>
                                                            {availableToSelect.map(sn => <option key={sn} value={sn}>{sn}</option>)}
                                                        </select>
                                                        <button
                                                            className="btn btn-success btn-sm w-100 fw-bold tiny-text"
                                                            onClick={() => addToCart(p)}
                                                            disabled={!pendingSelections[p.id] || isCheckoutView}
                                                        >
                                                            <i className="fas fa-plus me-1"></i>ADD
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button className="btn btn-outline-secondary btn-sm w-100 disabled mt-auto tiny-text">UNAVAILABLE</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>

                {/* CART ASIDE */}
                <aside className={`col-12 col-lg-4 col-xl-3 bg-dark border-start border-secondary d-flex flex-column custom-vh-lg shadow-lg mobile-cart-overlay ${showMobileCart ? 'show' : ''}`}>

                    {isSuccessView ? (
                        <div className="p-4 d-flex flex-column h-100 justify-content-center text-center animate__animated animate__fadeIn">
                            <div className="mb-4">
                                <i className="fas fa-check-circle text-success fs-1 mb-3"></i>
                                <h5 className="fw-bold text-success mb-1">SALE RECORDED</h5>
                                <p className="text-secondary small mb-0">
                                    Transaction completed successfully.
                                </p>
                            </div>

                            <div className="mt-4">
                                <button
                                    className="btn btn-outline-success w-100 py-3 fw-bold tracking-wider uppercase"
                                    onClick={() => {
                                        setIsSuccessView(false);
                                        setShowMobileCart(false);
                                    }}
                                >
                                    NEXT TRANSACTION →
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center bg-black bg-opacity-50 sticky-top">
                                <span className="small fw-bold text-success uppercase"><i className="fas fa-shopping-basket me-2"></i>TERMINAL CART</span>
                                <div className="d-flex align-items-center gap-3">
                                    <span className="badge bg-success text-black fw-bold">{cart.length}</span>
                                    <button className="btn btn-sm btn-dark border-secondary d-lg-none" onClick={() => setShowMobileCart(false)}>
                                        <i className="fas fa-chevron-down"></i>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-grow-1 overflow-auto p-3 cart-items-container">
                                {isCheckoutView ? (
                                    <div className="animate__animated animate__fadeIn">
                                        <div className="bg-black bg-opacity-40 p-3 rounded border border-secondary mb-3 shadow-inner">

                                            <div className="mb-3">
                                                <label className="text-info tiny-text fw-bold mb-1">BATCH REFERENCE #</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm bg-black text-white border-info mb-2 opacity-75"
                                                    placeholder="Auto-generated"
                                                    value={autoBatchRef}
                                                    readOnly
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label className="text-secondary tiny-text fw-bold mb-1">PAYMENT METHOD</label>
                                                <select
                                                    className="form-select form-select-sm bg-black text-white border-secondary"
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                >
                                                    <option value="Cash">Cash Settlement</option>
                                                    <option value="Terms">Pay In Terms (Installment)</option>
                                                </select>
                                            </div>

                                            {paymentMethod === 'Terms' ? (
                                                <div className="border border-secondary p-2 rounded mb-3 bg-dark bg-opacity-50 animate__animated animate__fadeIn">
                                                    <label className="text-warning tiny-text fw-bold mb-1">INSTALLMENT CONFIGURATION</label>

                                                    <div className="row g-2 mb-2">
                                                        <div className="col-6">
                                                            <select
                                                                className="form-select form-select-sm bg-black text-white border-secondary tiny-text"
                                                                value={termType}
                                                                onChange={(e) => setTermType(e.target.value)}
                                                            >
                                                                <option value="weeks">Weeks</option>
                                                                <option value="months">Months</option>
                                                                <option value="years">Years</option>
                                                            </select>
                                                        </div>
                                                        <div className="col-6">
                                                            <input
                                                                type="number"
                                                                className="form-control form-control-sm bg-black text-white border-secondary tiny-text"
                                                                placeholder="Duration"
                                                                value={termDuration}
                                                                onChange={(e) => setTermDuration(e.target.value)}
                                                                min="1"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="bg-black p-2 rounded text-center border border-secondary">
                                                        <div className="tiny-text text-secondary uppercase">Estimated Amortization</div>
                                                        <div className="text-warning fw-bold small">{formatPHP(installmentBreakdown())} / {termType.slice(0, -1)}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="d-flex justify-content-between align-items-end mb-2">
                                                        <label className="text-secondary tiny-text">CASH TENDERED</label>
                                                        <button className="btn btn-outline-success btn-xs px-2" style={{ fontSize: '0.6rem' }} onClick={() => setAmountTendered(totalAmount)}>EXACT</button>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-lg bg-black text-success border-secondary mb-3 text-center fw-bold fs-4"
                                                        value={amountTendered}
                                                        onChange={(e) => setAmountTendered(e.target.value)}
                                                        placeholder="0.00"
                                                        autoFocus
                                                    />
                                                </>
                                            )}

                                            <div className="d-flex justify-content-between small text-secondary">
                                                <span>Subtotal:</span>
                                                <span className="text-white">{formatPHP(totalAmount)}</span>
                                            </div>

                                            {paymentMethod === 'Cash' && (
                                                <>
                                                    <hr className="border-secondary my-2" />
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="text-secondary fw-bold tiny-text">CHANGE</span>
                                                        <span className="text-info fs-5 fw-bold">{formatPHP(changeAmount)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <button className="btn btn-link btn-sm text-secondary w-100 text-decoration-none" onClick={() => setIsCheckoutView(false)}>← BACK TO CART</button>
                                    </div>
                                ) : (
                                    cart.length === 0 ? (
                                        <div className="h-100 d-flex flex-column align-items-center justify-content-center opacity-25 py-5">
                                            <i className="fas fa-ghost fs-1 mb-3"></i>
                                            <p className="small mb-0">SYSTEM IDLE</p>
                                        </div>
                                    ) : (
                                        cart.map(item => (
                                            <div key={item.cartId} className="d-flex align-items-center gap-2 mb-2 bg-secondary bg-opacity-10 p-2 rounded border border-secondary border-opacity-25">
                                                <img src={item.image} className="rounded" style={{ width: '40px', height: '40px', objectFit: 'cover' }} alt="" />
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <div className="small fw-bold text-white text-truncate">{item.name}</div>
                                                    <div className="tiny-text text-success">SN: {item.selectedSN}</div>
                                                </div>
                                                <div className="text-end d-flex flex-column align-items-end justify-content-between h-100" style={{ minWidth: '75px' }}>
                                                    <div className="tiny-text text-white mb-1">{formatPHP(item.price)}</div>
                                                    <i className="fas fa-trash-alt text-danger cursor-pointer p-1" onClick={() => setCart(cart.filter(i => i.cartId !== item.cartId))}></i>
                                                </div>
                                            </div>
                                        ))
                                    )
                                )}
                            </div>

                            {/* CART FIXED FOOTER */}
                            {cart.length > 0 && (
                                <div className="p-3 border-top border-secondary bg-black bg-opacity-90 mt-auto shadow-lg">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="small text-secondary fw-bold">TOTAL DUE</span>
                                        <span className="fs-4 fw-bold text-success tracking-tight">{formatPHP(totalAmount)}</span>
                                    </div>

                                    {isCheckoutView ? (
                                        <button
                                            className="btn btn-success w-100 py-2 fw-bold tracking-wider"
                                            onClick={() => {
                                                const isCash = paymentMethod === 'Cash' || paymentMethod === 'Cash Settlement';
                                                const hasUploadedDocs = isCash ? uploadedSI && uploadedDR : uploadedCI && uploadedDR;

                                                if (!hasUploadedDocs) {
                                                    alert(isCash ? "Please upload DR and SI first" : "Please upload DR and CI first");
                                                    setShowDocUploadModal(true);
                                                    return;
                                                }

                                                handleCheckout();
                                            }}
                                        >
                                            <i className="fas fa-lock me-2"></i>COMMIT TRANSACTION
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-outline-success w-100 py-2 fw-bold text-white tracking-wider"
                                            onClick={() => setIsCheckoutView(true)}
                                        >
                                            PROCEED TO CHECKOUT<i className="fas fa-chevron-right ms-2"></i>
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </aside>

            </div>

            {/* DOCUMENT UPLOAD MODAL (DR / SI / CI) */}
            {showDocUploadModal && (
                <div className="modal d-block bg-black bg-opacity-75" tabIndex="-1" style={{ zIndex: 1100 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-secondary text-white font-monospace shadow-2xl">
                            <div className="modal-header border-secondary py-2 bg-black bg-opacity-40">
                                <h6 className="modal-title text-success fw-bold uppercase">
                                    Upload Required Documents // {(paymentMethod === 'Cash' || paymentMethod === 'Cash Settlement') ? 'DR & SI' : 'DR & CI'}
                                </h6>
                                <button type="button" className="btn-close btn-close-white scale-75" onClick={() => setShowDocUploadModal(false)}></button>
                            </div>
                            <div className="modal-body p-3 small">
                                <div className="mb-3">
                                    <label className="text-secondary d-block mb-1">Upload Delivery Receipt (DR):</label>
                                    <input
                                        type="file"
                                        className="form-control form-control-sm bg-black text-white border-secondary"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;

                                            const formData = new FormData();
                                            formData.append('file', file);
                                            formData.append('type', 'dr');

                                            try {
                                                const res = await axios.post(`${BASE_URL}/api/upload`, formData, {
                                                    headers: { 'Content-Type': 'multipart/form-data' }
                                                });
                                                if (res.data.success) {
                                                    setUploadedDR(res.data.filename);
                                                } else {
                                                    alert("Upload failed: " + (res.data.error || "Unknown error"));
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                alert("Error uploading file to storage.");
                                            }
                                        }}
                                    />
                                    {uploadedDR && <div className="tiny-text text-success mt-1">✓ Attached: {uploadedDR}</div>}
                                </div>

                                {(paymentMethod === 'Cash' || paymentMethod === 'Cash Settlement') ? (
                                    <div className="mb-3">
                                        <label className="text-secondary d-block mb-1">Upload Sales Invoice (SI):</label>
                                        <input
                                            type="file"
                                            className="form-control form-control-sm bg-black text-white border-secondary"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;

                                                const formData = new FormData();
                                                formData.append('file', file);
                                                formData.append('type', 'si');

                                                try {
                                                    const res = await axios.post(`${BASE_URL}/api/upload`, formData, {
                                                        headers: { 'Content-Type': 'multipart/form-data' }
                                                    });
                                                    if (res.data.success) {
                                                        setUploadedSI(res.data.filename);
                                                    } else {
                                                        alert("Upload failed: " + (res.data.error || "Unknown error"));
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("Error uploading file to storage.");
                                                }
                                            }}
                                        />
                                        {uploadedSI && <div className="tiny-text text-success mt-1">✓ Attached: {uploadedSI}</div>}
                                    </div>
                                ) : (
                                    <div className="mb-3">
                                        <label className="text-secondary d-block mb-1">Upload Collection Invoice (CI):</label>
                                        <input
                                            type="file"
                                            className="form-control form-control-sm bg-black text-white border-secondary"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;

                                                const formData = new FormData();
                                                formData.append('file', file);
                                                formData.append('type', 'ci');

                                                try {
                                                    const res = await axios.post(`${BASE_URL}/api/upload`, formData, {
                                                        headers: { 'Content-Type': 'multipart/form-data' }
                                                    });
                                                    if (res.data.success) {
                                                        setUploadedCI(res.data.filename);
                                                    } else {
                                                        alert("Upload failed: " + (res.data.error || "Unknown error"));
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("Error uploading file to storage.");
                                                }
                                            }}
                                        />
                                        {uploadedCI && <div className="tiny-text text-success mt-1">✓ Attached: {uploadedCI}</div>}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-secondary py-2 bg-black">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-success w-100 fw-bold"
                                    onClick={() => {
                                        const isCash = paymentMethod === 'Cash' || paymentMethod === 'Cash Settlement';
                                        const ready = isCash ? (uploadedDR && uploadedSI) : (uploadedDR && uploadedCI);
                                        if (ready) {
                                            setShowDocUploadModal(false);
                                        } else {
                                            alert("Please wait for files to finish uploading or attach all required documents.");
                                        }
                                    }}
                                >
                                    CONFIRM ATTACHMENTS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCT SPEC DETAIL MODAL */}
            {selectedProduct && (
                <div className="modal d-block bg-black bg-opacity-75" tabIndex="-1" style={{ zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-secondary text-white font-monospace shadow-2xl">
                            <div className="modal-header border-secondary py-2 bg-black bg-opacity-40">
                                <h6 className="modal-title text-success fw-bold uppercase">Details // {selectedProduct.name}</h6>
                                <button type="button" className="btn-close btn-close-white scale-75" onClick={() => setSelectedProduct(null)}></button>
                            </div>
                            <div className="modal-body p-3">
                                <img src={selectedProduct.image} className="w-100 rounded mb-3 border border-secondary" style={{ maxHeight: '240px', objectFit: 'cover' }} alt="" />
                                <div className="row g-2 text-start small">
                                    <div className="col-4 text-secondary">PRODUCT ID:</div>
                                    <div className="col-8 text-white fw-bold">{selectedProduct.id}</div>
                                    <div className="col-4 text-secondary">UNIT PRICE:</div>
                                    <div className="col-8 text-success fw-bold">{formatPHP(selectedProduct.price)}</div>
                                    <div className="col-4 text-secondary">REMAINING:</div>
                                    <div className="col-8 text-info">{(selectedProduct.sns || []).filter(sn => !getUsedSNs(selectedProduct.id).includes(sn)).length} items available</div>
                                    <div className="col-4 text-secondary">DESCRIPTION:</div>
                                    <div className="col-8 text-warning small">{selectedProduct.description || "No supplemental hardware metrics declared."}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONNECT SCANNER QR MODAL */}
            {showScannerModal && (
                <div className="modal d-block bg-black bg-opacity-80 px-3" tabIndex="-1" style={{ zIndex: 1150 }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content bg-dark border border-success text-white font-monospace shadow-2xl rounded-3 text-center p-3">
                            <div className="modal-header border-secondary pb-2 bg-black justify-content-between">
                                <h6 className="modal-title text-success fw-bold" style={{ fontSize: '13px' }}>
                                    <i className="fas fa-barcode me-1.5"></i>SCANNER PAIRING
                                </h6>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowScannerModal(false)}></button>
                            </div>
                            <div className="modal-body py-3">
                                <p className="text-secondary small mb-3" style={{ fontSize: '11px' }}>
                                    Scan this QR code with your mobile phone camera to connect it as a wireless barcode scanner:
                                </p>
                                <div className="bg-white p-3 d-flex justify-content-center rounded mx-auto shadow border border-success" style={{ maxWidth: '190px' }}>
                                    <QRCodeSVG
                                        value={`${FRONT_URL}/#/scanner/${posActiveSession}`}
                                        size={150}
                                        level={"H"}
                                        includeMargin={true}
                                    />
                                </div>
                                <div className="mt-3 bg-black border border-secondary p-2 rounded">
                                    <span className="text-secondary d-block" style={{ fontSize: '10px' }}>SESSION CODE</span>
                                    <span className="text-success fw-bold fs-5">{posActiveSession}</span>
                                </div>
                            </div>
                            <div className="modal-footer border-secondary pt-2 bg-black justify-content-center">
                                <button type="button" className="btn btn-sm btn-outline-success w-100 fw-bold" onClick={() => generateNewSessionCode()} style={{ fontSize: '11px' }}>
                                    GENERATE NEW CODE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PointOfSale;
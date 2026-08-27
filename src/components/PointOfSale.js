import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react'; 

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';
const FRONT_URL = 'https://dps.ricalgen.eu.org';

const PointOfSale = ({
    products = [],
    onCommitTransaction,
    useLocalIp
}) => {
    // --- STATE MANAGEMENT ---
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    
    // View Controllers
    const [isCheckoutView, setIsCheckoutView] = useState(false);
    const [isSuccessView, setIsSuccessView] = useState(false);
    const [showMobileCart, setShowMobileCart] = useState(false);
    
    // Modals & Refs
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [posActiveSession, setPosActiveSession] = useState('SESS-101');
    const searchInputRef = useRef(null);

    // Checkout Form Data
    const [orNumber, setOrNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' or 'Terms'
    const [amountTendered, setAmountTendered] = useState('');
    const [termType, setTermType] = useState('months');
    const [termDuration, setTermDuration] = useState('1');
    const [lastTransactionId, setLastTransactionId] = useState(null);

    // Document Upload States
    const [drFile, setDrFile] = useState(null); // Delivery Receipt (Required for Cash & Terms)
    const [siFile, setSiFile] = useState(null); // Sales Invoice (Required for Cash)
    const [ciFile, setCiFile] = useState(null); // Charge Invoice (Required for Terms)

    // --- CALCULATED VALUES ---
    const totalAmount = cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const changeAmount = Math.max(0, (parseFloat(amountTendered) || 0) - totalAmount);

    const getUsedSNs = (productId) => {
        return cart.filter(item => item.id === productId).map(item => item.selectedSN);
    };

    const formatPHP = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
    };

    const installmentBreakdown = () => {
        const duration = parseInt(termDuration) || 1;
        return totalAmount / duration;
    };

    // Auto-focus search input on component mount
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    // --- HANDLERS ---
    const handleAddToCart = (product, sn) => {
        const cartId = `${product.id}-${sn}-${Date.now()}`;
        setCart([...cart, { ...product, selectedSN: sn, cartId }]);
    };

    const generateNewSessionCode = () => {
        const newCode = 'SESS-' + Math.floor(1000 + Math.random() * 9000);
        setPosActiveSession(newCode);
    };

    const handleScanRedirect = () => {
        const url = `${FRONT_URL}/mobile-uploads/${lastTransactionId}`;
        window.open(url, '_blank');
    };

    const handleCheckout = async () => {
        if (!orNumber.trim()) {
            alert('Please enter a valid Reference / Receipt Number.');
            return;
        }

        if (paymentMethod === 'Cash' && parseFloat(amountTendered) < totalAmount) {
            alert('Insufficient tendered amount.');
            return;
        }

        // --- DOCUMENT UPLOAD VALIDATION ---
        if (!drFile) {
            alert('Delivery Receipt (DR) is required.');
            return;
        }

        if (paymentMethod === 'Cash' && !siFile) {
            alert('Cash Settlement requires uploading a Sales Invoice (SI).');
            return;
        }

        if (paymentMethod === 'Terms' && !ciFile) {
            alert('Pay In Terms requires uploading a Charge Invoice (CI).');
            return;
        }

        // Prepare Multipart Form Data for axios API call
        const formData = new FormData();
        formData.append('referenceNumber', orNumber);
        formData.append('paymentMethod', paymentMethod);
        formData.append('totalAmount', totalAmount);
        formData.append('amountTendered', paymentMethod === 'Cash' ? parseFloat(amountTendered) : totalAmount);
        formData.append('changeAmount', paymentMethod === 'Cash' ? changeAmount : 0);
        formData.append('items', JSON.stringify(cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            serialNumber: item.selectedSN
        }))));

        if (paymentMethod === 'Terms') {
            formData.append('installmentDetails', JSON.stringify({
                termType,
                termDuration,
                amortization: installmentBreakdown()
            }));
        }

        // Append required files
        formData.append('deliveryReceipt', drFile);
        if (paymentMethod === 'Cash') {
            formData.append('salesInvoice', siFile);
        } else {
            formData.append('chargeInvoice', ciFile);
        }

        try {
            if (onCommitTransaction) {
                const res = await onCommitTransaction(formData);
                if (res && res.transactionId) {
                    setLastTransactionId(res.transactionId);
                } else {
                    setLastTransactionId('TXN-' + Date.now());
                }
            } else {
                // Direct API call fallback using imported axios & BASE_URL
                const response = await axios.post(`${BASE_URL}/api/sales`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setLastTransactionId(response.data.transactionId || 'TXN-' + Date.now());
            }

            setIsCheckoutView(false);
            setIsSuccessView(true);
            setCart([]);

            // Reset Upload Inputs
            setDrFile(null);
            setSiFile(null);
            setCiFile(null);
        } catch (error) {
            console.error('Checkout failed:', error);
            alert('Failed to process transaction. Please try again.');
        }
    };

    // Filter Logic
    const categories = ['ALL', ...new Set(products.map(p => p.category).filter(Boolean))];
    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toString().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="container-fluid bg-black text-white min-vh-100 font-monospace p-0 d-flex flex-column">
            {/* TOP BAR */}
            <div className="bg-dark border-bottom border-secondary p-3 d-flex justify-content-between align-items-center shadow-sm">
                <div className="d-flex align-items-center gap-2">
                    <i className="fas fa-terminal text-success fs-4"></i>
                    <h5 className="mb-0 fw-bold tracking-wider text-success">POS TERMINAL</h5>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-outline-success btn-sm fw-bold" onClick={() => setShowScannerModal(true)}>
                        <i className="fas fa-qrcode me-2"></i>PAIR SCANNER
                    </button>
                    <button className="btn btn-success btn-sm d-lg-none fw-bold" onClick={() => setShowMobileCart(!showMobileCart)}>
                        <i className="fas fa-shopping-cart me-1"></i> CART ({cart.length})
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT WORKSPACE */}
            <div className="row g-0 flex-grow-1">
                {/* PRODUCT CATALOG (LEFT) */}
                <div className="col-12 col-lg-8 col-xl-9 p-3 d-flex flex-column">
                    <div className="row g-2 mb-3">
                        <div className="col-12 col-md-6">
                            <input 
                                ref={searchInputRef}
                                type="text" 
                                className="form-control bg-dark text-white border-secondary"
                                placeholder="Search product name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="col-12 col-md-6 d-flex gap-1 overflow-auto">
                            {categories.map(cat => (
                                <button 
                                    key={cat} 
                                    className={`btn btn-sm ${selectedCategory === cat ? 'btn-success' : 'btn-outline-secondary text-white'}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PRODUCT GRID */}
                    <div className="row g-3 overflow-auto flex-grow-1" style={{ maxHeight: 'calc(100vh - 160px)' }}>
                        {filteredProducts.map(product => {
                            const availableSNs = (product.sns || []).filter(sn => !getUsedSNs(product.id).includes(sn));
                            return (
                                <div key={product.id} className="col-12 col-sm-6 col-md-4 col-xl-3">
                                    <div className="card bg-dark border-secondary h-100 d-flex flex-column justify-content-between p-2">
                                        <div onClick={() => setSelectedProduct(product)} className="cursor-pointer">
                                            <img src={product.image} className="card-img-top rounded mb-2" style={{ height: '120px', objectFit: 'cover' }} alt="" />
                                            <h6 className="card-title text-white text-truncate mb-1">{product.name}</h6>
                                            <div className="text-success fw-bold mb-2">{formatPHP(product.price)}</div>
                                        </div>

                                        <div>
                                            <label className="tiny-text text-secondary mb-1">SELECT SERIAL NUMBER:</label>
                                            <select 
                                                className="form-select form-select-sm bg-black text-white border-secondary mb-2"
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleAddToCart(product, e.target.value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                disabled={availableSNs.length === 0}
                                            >
                                                <option value="">{availableSNs.length > 0 ? `-- ${availableSNs.length} Available --` : 'OUT OF STOCK'}</option>
                                                {availableSNs.map(sn => (
                                                    <option key={sn} value={sn}>{sn}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* CART ASIDE (RIGHT) */}
                <aside className={`col-12 col-lg-4 col-xl-3 bg-dark border-start border-secondary d-flex flex-column custom-vh-lg shadow-lg mobile-cart-overlay ${showMobileCart ? 'show' : ''}`}>
                    
                    {isSuccessView ? (
                        <div className="p-4 d-flex flex-column h-100 overflow-auto animate__animated animate__fadeIn">
                            <div className="text-center mb-3">
                                <i className="fas fa-check-circle text-success fs-1 mb-2"></i>
                                <h5 className="fw-bold text-success mb-1">SALE RECORDED</h5>
                                <p className="text-secondary tiny-text mb-0">
                                    {useLocalIp ? '🔴 Offline Mode' : '🌐 Online Mode: Synced with cloud'}
                                </p>
                            </div>

                            <div className="bg-white p-3 d-flex justify-content-center rounded mb-3 mx-auto shadow-lg border border-success" style={{ maxWidth: '210px' }}>
                                <QRCodeSVG 
                                    value={`${FRONT_URL}/mobile-uploads/${lastTransactionId}`} 
                                    size={160}
                                    level={"H"}
                                    includeMargin={true}
                                />
                            </div>

                            <div className="mt-auto border-top border-secondary pt-3 bg-dark">
                                <p className="tiny-text text-secondary mb-3 text-center uppercase fw-bold">System Attachment Routing</p>
                                
                                <button 
                                    className="btn btn-primary w-100 mb-2 py-3 fw-bold tracking-wide uppercase"
                                    onClick={handleScanRedirect}
                                    style={{ fontSize: '13px' }}
                                >
                                    <i className="fas fa-camera me-2"></i>[View Upload Route]
                                </button>
                                
                                <button 
                                    className="btn btn-link btn-sm text-secondary w-100 text-decoration-none mt-2" 
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
                                            
                                            {/* OFFICIAL REFERENCE NUMBER */}
                                            <div className="mb-3">
                                                <label className="text-info tiny-text fw-bold mb-1">REFERENCE / RECEIPT #</label>
                                                <input 
                                                    type="text" 
                                                    className="form-control form-control-sm bg-black text-white border-info mb-2"
                                                    placeholder="Required"
                                                    value={orNumber}
                                                    onChange={(e) => setOrNumber(e.target.value.toUpperCase())}
                                                />
                                            </div>

                                            {/* PAYMENT METHOD */}
                                            <div className="mb-3">
                                                <label className="text-secondary tiny-text fw-bold mb-1">PAYMENT METHOD</label>
                                                <select 
                                                    className="form-select form-select-sm bg-black text-white border-secondary"
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                >
                                                    <option value="Cash">Cash Settlement (COD)</option>
                                                    <option value="Terms">Pay In Terms (Installment)</option>
                                                </select>
                                            </div>

                                            {/* REQUIRED DOCUMENT UPLOADS */}
                                            <div className="border border-secondary p-2 rounded mb-3 bg-dark bg-opacity-50">
                                                <label className="text-info tiny-text fw-bold mb-2 d-block">REQUIRED DOCUMENTS</label>

                                                {/* Delivery Receipt (Always Required) */}
                                                <div className="mb-2">
                                                    <label className="text-secondary tiny-text d-block mb-1">DELIVERY RECEIPT (DR) *</label>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*,.pdf"
                                                        className="form-control form-control-sm bg-black text-white border-secondary tiny-text"
                                                        onChange={(e) => setDrFile(e.target.files[0] || null)}
                                                    />
                                                </div>

                                                {/* Conditional Uploads based on Payment Method */}
                                                {paymentMethod === 'Cash' ? (
                                                    <div className="mb-1">
                                                        <label className="text-secondary tiny-text d-block mb-1">SALES INVOICE (SI) *</label>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*,.pdf"
                                                            className="form-control form-control-sm bg-black text-white border-secondary tiny-text"
                                                            onChange={(e) => setSiFile(e.target.files[0] || null)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="mb-1">
                                                        <label className="text-secondary tiny-text d-block mb-1">CHARGE INVOICE (CI) *</label>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*,.pdf"
                                                            className="form-control form-control-sm bg-black text-white border-secondary tiny-text"
                                                            onChange={(e) => setCiFile(e.target.files[0] || null)}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* INSTALLMENT CONFIGURATION */}
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
                                                        <button className="btn btn-outline-success btn-xs px-2" style={{fontSize: '0.6rem'}} onClick={() => setAmountTendered(totalAmount)}>EXACT</button>
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
                                                <img src={item.image} className="rounded" style={{width: '40px', height: '40px', objectFit: 'cover'}} alt="" />
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <div className="small fw-bold text-white text-truncate">{item.name}</div>
                                                    <div className="tiny-text text-success">SN: {item.selectedSN}</div>
                                                </div>
                                                <div className="text-end d-flex flex-column align-items-end justify-content-between h-100" style={{minWidth: '75px'}}>
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
                                            onClick={handleCheckout}
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
                                <img src={selectedProduct.image} className="w-100 rounded mb-3 border border-secondary" style={{maxHeight:'240px', objectFit:'cover'}} alt="" />
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
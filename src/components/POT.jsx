import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';

const ProductivityOfTechnical = ({ triggerToast, username }) => {
    // ==========================================
    // 1. DATA & CORE STATES
    // ==========================================
    const [clients, setClients] = useState([]);                      // Stores list of customers from API
    const [repairableMachines, setRepairableMachines] = useState([]); // Stores dynamic machines/units for selected client
    const [serviceLogs, setServiceLogs] = useState([]);              // Stores all board records/logs
    const [isSubmitting, setIsSubmitting] = useState(false);        // Tracks API submission loader state

    // ==========================================
    // 2. MODAL & VIEW STATES
    // ==========================================
    const [showModal, setShowModal] = useState(false);              // Controls modal visibility
    const [activeTab, setActiveTab] = useState('table');            // View switcher: 'table' | 'kanban'
    const [selectedCardDetail, setSelectedCardDetail] = useState(null); // Selected card for detail/preview modal

    // ==========================================
    // 3. FORM STATES (Monday.com Board Columns)
    // ==========================================
    const [selectedClient, setSelectedClient] = useState('');       // Customer name string
    const [selectedClientId, setSelectedClientId] = useState('');   // Customer ID for API lookups
    const [selectedMachines, setSelectedMachines] = useState(['']); // Array supporting up to 2 machines/serials
    const [timeIn, setTimeIn] = useState('');                       // Service start timestamp
    const [timeOut, setTimeOut] = useState('');                     // Service end timestamp
    const [fsrSeries, setFsrSeries] = useState('');                 // FSR Document code/series number
    const [fsrFile, setFsrFile] = useState(null);                   // Raw File object for R2 upload
    const [fsrImage, setFsrImage] = useState('');                   // Base64 string for image attachment preview
    const [troubleFound, setTroubleFound] = useState('');           // Diagnosed issue / description
    const [workDone, setWorkDone] = useState('');                   // Actions taken / remediation
    const [status, setStatus] = useState('Working on it');          // Board item status (Working on it / Done / Stuck)
    const [priority, setPriority] = useState('Medium');             // Board item priority (High / Medium / Low)

    // ==========================================
    // 4. SEARCH & FILTER STATES
    // ==========================================
    const [searchQuery, setSearchQuery] = useState('');             // General keyword search state
    const [serialSearchQuery, setSerialSearchQuery] = useState(''); // Specific serial number filter
    const [serialSearchResult, setSerialSearchResult] = useState(null); // Filter outcome holder

    // ==========================================
    // 5. LIFECYCLE HOOKS
    // ==========================================
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Trigger lookup fetch whenever selectedClientId updates
    useEffect(() => {
        if (selectedClientId) {
            fetchRepairableMachines(selectedClientId);
        } else {
            setRepairableMachines([]);
        }
    }, [selectedClientId]);

    // ==========================================
    // 6. API FETCH HELPERS
    // ==========================================
    const fetchInitialData = async () => {
        try {
            const [clientRes, logsRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/customers`),
                axios.get(`${BASE_URL}/api/productivity-technical`)
            ]);
            setClients(clientRes.data || []);
            setServiceLogs(logsRes.data || []);
        } catch (err) {
            console.error("Error fetching productivity data", err);
            triggerToast("Failed to load board records", "error");
        }
    };

    const fetchRepairableMachines = async (customerId) => {
        try {
            const res = await axios.get(`${BASE_URL}/api/customers/${customerId}/repairable`);
            setRepairableMachines(res.data || []);
        } catch (err) {
            console.error("Error fetching repairable items", err);
            setRepairableMachines([]);
        }
    };

    // ==========================================
    // 7. FORM UTILITY & INTERACTION HELPERS
    // ==========================================

    // Auto-populates 'Time In' input with the current local timestamp
    const handleSetNowTimeIn = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setTimeIn(now.toISOString().slice(0, 16));
    };

    // Auto-populates 'Time Out' input with the current local timestamp
    const handleSetNowTimeOut = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setTimeOut(now.toISOString().slice(0, 16));
    };

    // Appends an extra blank machine field slot (max limit set to 2)
    const handleAddMachineField = () => {
        if (selectedMachines.length < 2) {
            setSelectedMachines([...selectedMachines, '']);
        }
    };

    // Safely removes a specific machine slot row by array index
    const handleRemoveMachineField = (index) => {
        const updated = selectedMachines.filter((_, i) => i !== index);
        setSelectedMachines(updated.length > 0 ? updated : ['']);
    };

    // Tracks changes in individual machine option dropdowns
    const handleMachineChange = (index, value) => {
        const updated = [...selectedMachines];
        updated[index] = value;
        setSelectedMachines(updated);
    };

    // Captures raw file for upload and processes Base64 preview string
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFsrFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFsrImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Wipes all input values back to clean default states
    const resetForm = () => {
        setSelectedClient('');
        setSelectedClientId('');
        setSelectedMachines(['']);
        setRepairableMachines([]);
        setTimeIn('');
        setTimeOut('');
        setFsrSeries('');
        setFsrFile(null);
        setFsrImage('');
        setTroubleFound('');
        setWorkDone('');
        setStatus('Working on it');
        setPriority('Medium');
    };

    // ==========================================
    // 8. FORM SUBMISSION HANDLER (Multipart FSR + R2 Integration)
    // ==========================================
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Form Validation check
        if (!selectedClient || selectedMachines.length === 0 || !fsrSeries) {
            triggerToast("Please fill in required fields (Client, Machine, FSR Series)", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('client_name', selectedClient);
            formData.append('machine', selectedMachines.filter(m => m.trim() !== '').join(', '));
            formData.append('time_in', timeIn);
            formData.append('time_out', timeOut);
            formData.append('fsr_series', fsrSeries);
            formData.append('trouble_found', troubleFound);
            formData.append('work_done', workDone);
            formData.append('technician', username || 'Technical Staff');
            formData.append('status', status);
            formData.append('priority', priority);

            // Append raw file for Cloudflare R2 bucket storage if selected
            if (fsrFile) {
                formData.append('file', fsrFile);
            }

            // Post multipart request to backend API endpoint
            await axios.post(`${BASE_URL}/api/call-logs`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            triggerToast("Board item created & synced!", "success");

            // Clean up UI state post-success
            resetForm();
            setShowModal(false);
            fetchInitialData();
        } catch (err) {
            console.error("Error saving board item", err);
            triggerToast("Failed to save board update", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // 9. FILTER & FORMATTING HELPERS
    // ==========================================

    const handleSerialResearch = (e) => {
        setSerialSearchQuery(e.target.value);
    };

    const filteredLogs = serviceLogs.filter(log => {
        const matchesGeneral = searchQuery === '' ||
            Object.values(log).some(val =>
                String(val).toLowerCase().includes(searchQuery.toLowerCase())
            );
        const matchesSerial = serialSearchQuery === '' ||
            String(log.machine || '').toLowerCase().includes(serialSearchQuery.toLowerCase());
        return matchesGeneral && matchesSerial;
    });

    const getStatusBadgeStyle = (statusVal) => {
        switch (statusVal) {
            case 'Done': return 'badge bg-success';
            case 'Stuck': return 'badge bg-danger';
            default: return 'badge bg-warning text-dark';
        }
    };

    const getPriorityBadgeStyle = (priorityVal) => {
        switch (priorityVal) {
            case 'High': return 'badge bg-danger text-white';
            case 'Low': return 'badge bg-info text-dark';
            default: return 'badge bg-secondary text-white';
        }
    };

    const formatLocalDateTime = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? dateString : date.toLocaleString();
    };

    return (
        <div className="animate-fade-in text-white container-fluid px-0">
            {/* Monday.com Style Board Header Toolbar */}
            <header className="mb-4 pb-3 border-bottom border-white border-opacity-10 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="badge rounded-pill bg-danger bg-opacity-25 text-danger px-2.5 py-1 tiny-text fw-bold">WORKSPACE</span>
                        <span className="text-muted small">/ Technical Operations Board</span>
                    </div>
                    <h3 className="fw-900 tracking-tighter text-white m-0 d-flex align-items-center gap-2">
                        Productivity & FSR Pipeline <span className="jade-accent fs-6">⚡ Dexterous Printing Services</span>
                    </h3>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2.5">
                    {/* View Switcher Tabs */}
                    <div className="btn-group bg-dark border border-white border-opacity-10 rounded-3 p-1 me-1">
                        <button
                            className={`btn btn-sm px-3 rounded-2 tiny-text fw-bold transition-all ${activeTab === 'table' ? 'bg-secondary bg-opacity-50 text-white shadow-sm' : 'text-secondary border-0'}`}
                            onClick={() => setActiveTab('table')}
                        >
                            <i className="fa-solid fa-table-cells-row-lock me-1"></i> Main Table
                        </button>
                        <button
                            className={`btn btn-sm px-3 rounded-2 tiny-text fw-bold transition-all ${activeTab === 'kanban' ? 'bg-secondary bg-opacity-50 text-white shadow-sm' : 'text-secondary border-0'}`}
                            onClick={() => setActiveTab('kanban')}
                        >
                            <i className="fa-solid fa-kanban me-1"></i> Kanban Board
                        </button>
                    </div>

                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="btn px-4 py-2.5 fw-bold tiny-text tracking-widest text-dark d-flex align-items-center justify-content-center gap-2 shadow-sm transition-all rounded-3"
                        style={{ backgroundColor: '#00c875' }}
                    >
                        <i className="fa-solid fa-plus"></i> NEW ITEM
                    </button>
                </div>
            </header>

            {/* Main Layout Grid (monday.com filter + board view) */}
            <div className="row g-4">
                {/* Left Sidebar: Filters & Utilities */}
                <div className="col-12 col-xl-3">
                    <div className="d-flex flex-column gap-3.5">
                        {/* Search Board Filter */}
                        <div className="p-3.5 rounded-4 sidebar-user-box border border-white border-opacity-10 shadow-sm">
                            <h6 className="fw-900 text-white mb-2 text-uppercase tiny-text tracking-widest d-flex align-items-center gap-2">
                                <span className="jade-accent">🔍</span> Filter Board
                            </h6>
                            <input
                                type="text"
                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none small"
                                placeholder="Search client, tech, serial..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Quick Serial Lookup Widget */}
                        <div className="p-3.5 rounded-4 sidebar-user-box border border-white border-opacity-10 shadow-sm">
                            <h6 className="fw-900 text-white mb-2 text-uppercase tiny-text tracking-widest d-flex align-items-center gap-2">
                                <span className="text-info">📌</span> Serial Check
                            </h6>
                            <input
                                type="text"
                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none font-monospace small"
                                placeholder="Scan serial number..."
                                value={serialSearchQuery}
                                onChange={(e) => handleSerialResearch(e.target.value)}
                            />
                            {serialSearchResult && (
                                <div className="p-2.5 mt-2.5 rounded-3 bg-black border border-white border-opacity-10 animate-fade-in tiny-text">
                                    <div className="text-white fw-bold">{serialSearchResult.client}</div>
                                    <div className="text-info font-monospace mt-0.5">Machine: {serialSearchResult.machine}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Area: Monday.com Table or Kanban Board */}
                <div className="col-12 col-xl-9">
                    <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10 shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex align-items-center gap-2">
                                <span className="badge rounded-3 bg-white bg-opacity-10 px-2.5 py-1 tiny-text fw-bold">Active Group</span>
                                <span className="text-muted tiny-text">({filteredLogs.length} items)</span>
                            </div>
                            <button
                                onClick={fetchInitialData}
                                className="btn btn-sm border-white border-opacity-10 text-muted hover-lift rounded-3 shadow-none d-flex align-items-center gap-1.5 px-3 py-1"
                            >
                                <i className="fa-solid fa-rotate tiny-text"></i> <span className="tiny-text">Sync Board</span>
                            </button>
                        </div>

                        {activeTab === 'table' ? (
                            <div className="table-responsive">
                                <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
                                    <thead>
                                        <tr className="text-muted tiny-text text-uppercase border-bottom border-white border-opacity-10">
                                            <th className="py-3 bg-transparent ps-4" style={{ width: '22%' }}>Item / Client</th>
                                            <th className="py-3 bg-transparent text-center">Status</th>
                                            <th className="py-3 bg-transparent text-center">Priority</th>
                                            <th className="py-3 bg-transparent">Technician</th>
                                            <th className="py-3 bg-transparent font-monospace">Machine / Serial</th>
                                            <th className="py-3 bg-transparent font-monospace">FSR Series</th>
                                            <th className="py-3 bg-transparent pe-4">Time Span</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.length > 0 ? (
                                            filteredLogs.map((item, idx) => {
                                                const statColor = getStatusBadgeStyle(item.status || 'OK');
                                                const prioColor = getPriorityBadgeStyle(item.priority || 'Medium');
                                                return (
                                                    <tr
                                                        key={item.id || idx}
                                                        onClick={() => setSelectedCardDetail(item)}
                                                        className="border-bottom border-white border-opacity-5 transition-all"
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <td className="py-3 bg-transparent fw-bold text-white small ps-4">
                                                            <div className="d-flex align-items-center gap-2">
                                                                {item.fsr_image && (
                                                                    <img
                                                                        src={`${BASE_URL}${item.fsr_image}`}
                                                                        alt="FSR"
                                                                        className="rounded border object-fit-cover shadow-sm flex-shrink-0"
                                                                        style={{ width: '28px', height: '28px' }}
                                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                                    />
                                                                )}
                                                                <div className="text-truncate">{item.client_name || item.client}</div>
                                                            </div>
                                                            {item.work_done && <div className="tiny-text text-muted text-truncate fw-normal mt-1" style={{ maxWidth: '240px' }}>{item.work_done}</div>}
                                                        </td>
                                                        <td className="py-3 bg-transparent text-center">
                                                            <span className="badge tiny-text px-3 py-1.5 fw-bold rounded-pill text-center shadow-xs" style={{ backgroundColor: statColor.bg, color: statColor.text, minWidth: '105px' }}>
                                                                {item.status || 'OK'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 bg-transparent text-center">
                                                            <span className="badge tiny-text px-2.5 py-1.5 fw-bold rounded-pill text-center" style={{ backgroundColor: prioColor.bg, color: prioColor.text, minWidth: '75px' }}>
                                                                {item.priority || 'Medium'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 bg-transparent small text-white-50">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span className="rounded-circle bg-secondary bg-opacity-25 text-white d-inline-flex align-items-center justify-content-center tiny-text fw-bold border border-white border-opacity-10 shadow-xs" style={{ width: '26px', height: '26px' }}>
                                                                    {(item.technician || username || 'S').charAt(0).toUpperCase()}
                                                                </span>
                                                                <span className="text-truncate fw-medium text-light" style={{ maxWidth: '110px' }}>{item.technician || username || 'Staff'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 bg-transparent font-monospace text-info small fw-semibold">
                                                            {item.machine || '—'}
                                                        </td>
                                                        <td className="py-3 bg-transparent font-monospace small">
                                                            <span className="tiny-text px-2.5 py-1 rounded-2 bg-white bg-opacity-10 text-white fw-bold border border-white border-opacity-10">
                                                                {item.fsr_series || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 bg-transparent tiny-text text-muted font-monospace pe-4">
                                                            <div className="d-flex align-items-center gap-1"><span className="text-success fw-bold">In:</span> {formatLocalDateTime(item.time_in)}</div>
                                                            <div className="d-flex align-items-center gap-1 mt-0.5"><span className="text-danger fw-bold">Out:</span> {formatLocalDateTime(item.time_out)}</div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="text-center text-muted py-5 italic small">
                                                    No board entries match your filter criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* Monday.com Kanban View Grouped Columns */
                            <div className="row g-3">
                                {['Working on it', 'OK', 'Stuck'].map((colStatus, cIdx) => {
                                    const colItems = filteredLogs.filter(l => (l.status || 'Working on it') === colStatus || (colStatus === 'OK' && l.status === 'Done'));

                                    // Professional status color styling profile
                                    const statusConfig = {
                                        'Working on it': { border: '#ffc107', badgeBg: '#fff3cd', badgeText: '#856404', headerBg: '#fef9e7' },
                                        'OK': { border: '#198754', badgeBg: '#d1e7dd', badgeText: '#0f5132', headerBg: '#f1f8f5' },
                                        'Stuck': { border: '#dc3545', badgeBg: '#f8d7da', badgeText: '#842029', headerBg: '#fdf2f2' }
                                    }[colStatus] || { border: '#6c757d', badgeBg: '#e2e3e5', badgeText: '#383d41', headerBg: '#f8f9fa' };

                                    return (
                                        <div key={cIdx} className="col-12 col-md-4">
                                            <div className="p-3 rounded-4 shadow-sm h-100 bg-white border border-light-subtle" style={{ borderTop: `4px solid ${statusConfig.border}` }}>
                                                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                                    <span className="badge px-3 py-1.5 fw-semibold rounded-pill" style={{ backgroundColor: statusConfig.badgeBg, color: statusConfig.badgeText, fontSize: '0.8rem' }}>
                                                        {colStatus}
                                                    </span>
                                                    <span className="badge bg-light text-dark fw-bold rounded-circle px-2 py-1">{colItems.length}</span>
                                                </div>
                                                <div className="d-flex flex-column gap-3" style={{ minHeight: '300px' }}>
                                                    {colItems.length > 0 ? colItems.map((item, i) => (
                                                        <div
                                                            key={i}
                                                            onClick={() => setSelectedCardDetail(item)}
                                                            className="p-3 rounded-3 bg-white border shadow-xs hover-shadow transition-all cursor-pointer position-relative"
                                                            style={{ borderLeft: `4px solid ${statusConfig.border}`, cursor: 'pointer' }}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                                <div className="fw-bold text-dark text-truncate pe-2" style={{ maxWidth: '75%' }}>{item.client_name || item.client}</div>
                                                                <span className="text-muted" style={{ fontSize: '0.7rem' }}>{formatLocalDateTime(item.time_in)}</span>
                                                            </div>
                                                            <div className="small text-primary font-monospace mb-1 fw-medium">Machine: {item.machine || '—'}</div>
                                                            <div className="text-muted mb-2" style={{ fontSize: '0.75rem' }}>FSR: <span className="fw-semibold text-dark">{item.fsr_series || 'N/A'}</span></div>

                                                            {item.work_done && (
                                                                <div className="text-secondary bg-light p-2 rounded-2 mb-2 text-truncate" style={{ fontSize: '0.75rem' }}>
                                                                    {item.work_done}
                                                                </div>
                                                            )}

                                                            {item.fsr_image && (
                                                                <div className="mt-2 pt-2 border-top d-flex align-items-center gap-2">
                                                                    <img
                                                                        src={`${BASE_URL}${item.fsr_image}`}
                                                                        alt="FSR Attachment"
                                                                        className="rounded border object-fit-cover"
                                                                        style={{ width: '40px', height: '40px' }}
                                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                                    />
                                                                    <span className="text-muted italic" style={{ fontSize: '0.7rem' }}>Click card to view details & attachment</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )) : (
                                                        <div className="text-center text-muted small py-5 fst-italic border rounded-3 bg-light bg-opacity-50 border-dashed">
                                                            No items in {colStatus}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                        )}
                    </div>
                </div>
            </div>

            {/*Style New Item Modal / Drawer Form */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(5, 7, 10, 0.85)', backdropFilter: 'blur(8px)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflowY: 'auto', zIndex: 1050, padding: '1rem 0' }}>
                    <div className="modal-dialog modal-lg mx-auto my-0" style={{ maxWidth: '800px', width: '100%' }}>
                        <div className="modal-content bg-dark border border-secondary border-opacity-25 text-white rounded-4 shadow-2xl overflow-hidden">

                            {/* Modal Header */}
                            <div className="modal-header border-bottom border-secondary border-opacity-15 px-3 px-md-4 py-3 bg-black bg-opacity-75 sticky-top" style={{ zIndex: 10 }}>
                                <h5 className="modal-title fw-bold tiny-text tracking-widest text-uppercase d-flex align-items-center gap-2 m-0 text-light">
                                    <span style={{ color: '#00c875', fontSize: '0.85rem' }}>●</span> Create Monday Board Item
                                </h5>
                                <button type="button" className="btn-close btn-close-white shadow-none opacity-75" onClick={() => setShowModal(false)}></button>
                            </div>

                            {/* Modal Body */}
                            <div className="modal-body p-3 p-md-4" style={{ backgroundColor: '#121418' }}>
                                <form onSubmit={handleSubmit} id="productivityForm">

                                    {/* MONDAY.COM COLUMN: CLIENT & MACHINES */}
                                    <div className="p-3 p-md-4 mb-3 mb-md-4 rounded-3 bg-black bg-opacity-30 border border-secondary border-opacity-15 shadow-sm">
                                        <div className="tiny-text text-uppercase fw-bold text-secondary mb-3 tracking-wider d-flex align-items-center gap-2">
                                            <span className="text-info">🏢</span> Client & Equipment Column
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">Client Name *</label>
                                            <select
                                                className="form-select bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2 px-3 small"
                                                value={selectedClient}
                                                onChange={(e) => {
                                                    const selectedOption = e.target.selectedOptions[0];
                                                    const clientName = e.target.value;
                                                    const clientId = selectedOption.getAttribute('data-id');

                                                    setSelectedClient(clientName);
                                                    setSelectedClientId(clientId); // Triggers repairable machines fetch via useEffect
                                                    setSelectedMachines(['']); // Reset machine selections
                                                }}
                                                required
                                            >
                                                <option value="" className="text-muted">-- Choose Customer / Client --</option>
                                                {clients.map((c, i) => (
                                                    <option key={i} value={c.name || c.client_name} data-id={c.id || c.customer_id}>
                                                        {c.name || c.client_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <label className="form-label tiny-text text-uppercase fw-bold text-secondary m-0">Machine / Exact Serial Number *</label>
                                                {selectedMachines.length < 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleAddMachineField}
                                                        className="btn btn-sm btn-link p-0 tiny-text text-decoration-none fw-bold"
                                                        style={{ color: '#00c875' }}
                                                    >
                                                        + Add 2nd Machine
                                                    </button>
                                                )}
                                            </div>
                                            {selectedMachines.map((m, index) => {
                                                return (
                                                    <div key={index} className="input-group mb-2">
                                                        <span className="input-group-text bg-dark border-secondary border-opacity-25 text-secondary tiny-text px-2 px-md-3">#{index + 1}</span>

                                                        <select
                                                            className="form-select bg-dark text-white border-secondary border-opacity-25 rounded-end shadow-none font-monospace small py-2 px-3"
                                                            value={m}
                                                            onChange={(e) => handleMachineChange(index, e.target.value)}
                                                            required={index === 0}
                                                            disabled={!selectedClient}
                                                        >
                                                            <option value="" className="text-muted">
                                                                {selectedClient ? "-- Select Machine & Serial Number --" : "-- Select client first --"}
                                                            </option>
                                                            {repairableMachines.map((mach, mi) => {
                                                                const itemName = mach.item_name || 'Item';
                                                                const serialNum = mach.serial_number || 'No Serial';
                                                                const optionLabel = `${itemName} — Serial: ${serialNum}`;

                                                                return (
                                                                    <option key={mi} value={serialNum}>
                                                                        {optionLabel}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>

                                                        {selectedMachines.length > 1 && (
                                                            <button type="button" className="btn btn-outline-danger border-opacity-25 text-danger px-2 px-md-3 ms-2 rounded-3" onClick={() => handleRemoveMachineField(index)}>
                                                                <i className="fa-solid fa-trash-can tiny-text"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* MONDAY.COM COLUMN: STATUS & PRIORITY SELECTORS */}
                                    <div className="p-3 p-md-4 mb-3 mb-md-4 rounded-3 bg-black bg-opacity-30 border border-secondary border-opacity-15 shadow-sm">
                                        <div className="tiny-text text-uppercase fw-bold text-secondary mb-3 tracking-wider d-flex align-items-center gap-2">
                                            <span className="text-warning">📊</span> Status & Priority Labels
                                        </div>
                                        <div className="row g-3">
                                            <div className="col-12 col-md-6">
                                                <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">Board Status</label>
                                                <select
                                                    className="form-select bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2 px-3 small fw-bold"
                                                    value={status}
                                                    onChange={(e) => setStatus(e.target.value)}
                                                >
                                                    <option value="Working on it">🟠 Working on it</option>
                                                    <option value="Done">🟢 Done / OK</option>
                                                    <option value="Stuck">🔴 Stuck</option>
                                                </select>
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">Priority</label>
                                                <select
                                                    className="form-select bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2 px-3 small fw-bold"
                                                    value={priority}
                                                    onChange={(e) => setPriority(e.target.value)}
                                                >
                                                    <option value="High">🔴 High</option>
                                                    <option value="Medium">🟣 Medium</option>
                                                    <option value="Low">🔵 Low</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MONDAY.COM COLUMN: TIMELINE / TIMING */}
                                    <div className="p-3 p-md-4 mb-3 mb-md-4 rounded-3 bg-black bg-opacity-30 border border-secondary border-opacity-15 shadow-sm">
                                        <div className="tiny-text text-uppercase fw-bold text-secondary mb-3 tracking-wider d-flex align-items-center gap-2">
                                            <span className="text-success">⏱️</span> Timeline & Duration
                                        </div>
                                        <div className="row g-3">
                                            <div className="col-12 col-md-6">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <label className="form-label tiny-text text-uppercase fw-bold text-secondary m-0">Time In *</label>
                                                    <button type="button" onClick={handleSetNowTimeIn} className="btn btn-sm btn-link text-info p-0 tiny-text text-decoration-none">
                                                        Set Now
                                                    </button>
                                                </div>
                                                <input
                                                    type="datetime-local"
                                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2 px-3 small"
                                                    value={timeIn}
                                                    onChange={(e) => setTimeIn(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <label className="form-label tiny-text text-uppercase fw-bold text-secondary m-0">Time Out *</label>
                                                    <button type="button" onClick={handleSetNowTimeOut} className="btn btn-sm btn-link text-info p-0 tiny-text text-decoration-none">
                                                        Set Now
                                                    </button>
                                                </div>
                                                <input
                                                    type="datetime-local"
                                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2 px-3 small"
                                                    value={timeOut}
                                                    onChange={(e) => setTimeOut(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* MONDAY.COM COLUMN: FSR DOCUMENT & UPDATES */}
                                    <div className="p-3 p-md-4 mb-0 rounded-3 bg-black bg-opacity-30 border border-secondary border-opacity-15 shadow-sm">
                                        <div className="tiny-text text-uppercase fw-bold text-secondary mb-3 tracking-wider d-flex align-items-center gap-2">
                                            <span className="text-primary">📝</span> FSR & Updates Column
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">FSR Series Number *</label>
                                            <input
                                                type="text"
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none font-monospace py-2 px-3 small"
                                                placeholder="e.g., FSR-2026-00124"
                                                value={fsrSeries}
                                                onChange={(e) => setFsrSeries(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">Picture of FSR</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2 px-3 small"
                                                onChange={handleImageUpload}
                                            />
                                            {fsrImage && (
                                                <div className="mt-2 d-flex align-items-center justify-content-between p-2.5 rounded-3 bg-dark border border-success border-opacity-25">
                                                    <span className="text-success tiny-text d-flex align-items-center gap-2 fw-bold">
                                                        <i className="fa-solid fa-check-circle"></i> File selected for upload
                                                    </span>
                                                    <button type="button" className="btn btn-sm btn-link text-danger p-0 tiny-text text-decoration-none" onClick={() => setFsrImage(null)}>
                                                        Remove
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">Trouble Found</label>
                                            <textarea
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none p-3 small"
                                                rows="2"
                                                placeholder="Diagnosed issue..."
                                                value={troubleFound}
                                                onChange={(e) => setTroubleFound(e.target.value)}
                                            ></textarea>
                                        </div>

                                        <div className="mb-0">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">Work Done</label>
                                            <textarea
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none p-3 small"
                                                rows="2"
                                                placeholder="Remediation / actions taken..."
                                                value={workDone}
                                                onChange={(e) => setWorkDone(e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Modal Footer */}
                            <div className="modal-footer border-top border-secondary border-opacity-15 px-3 px-md-4 py-3 bg-black bg-opacity-75 sticky-bottom" style={{ zIndex: 10 }}>
                                <button type="button" className="btn btn-outline-secondary border-opacity-25 px-3 px-md-4 py-2 tiny-text rounded-3 text-white shadow-none" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="productivityForm"
                                    className="btn px-3 px-md-4 py-2 fw-bold tiny-text tracking-widest text-dark rounded-3 d-flex align-items-center gap-2 shadow-none"
                                    style={{ backgroundColor: '#00c875', transition: 'opacity 0.2s' }}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            SAVING ITEM...
                                        </>
                                    ) : (
                                        'Save'
                                    )}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductivityOfTechnical;
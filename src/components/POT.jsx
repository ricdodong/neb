import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';

const ProductivityOfTechnical = ({ triggerToast, username }) => {
    const [clients, setClients] = useState([]);
    const [machines, setMachines] = useState([]);
    const [serviceLogs, setServiceLogs] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal & View State
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('table'); // 'table' | 'kanban'

    // Form States (Monday.com board-style columns)
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedMachines, setSelectedMachines] = useState(['']);
    const [timeIn, setTimeIn] = useState('');
    const [timeOut, setTimeOut] = useState('');
    const [fsrSeries, setFsrSeries] = useState('');
    const [fsrImage, setFsrImage] = useState('');
    const [troubleFound, setTroubleFound] = useState('');
    const [workDone, setWorkDone] = useState('');
    const [status, setStatus] = useState('Working on it'); // Monday-style status item
    const [priority, setPriority] = useState('Medium'); // Monday-style priority item

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [serialSearchQuery, setSerialSearchQuery] = useState('');
    const [serialSearchResult, setSerialSearchResult] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [clientRes, machineRes, logsRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/customers`),
                axios.get(`${BASE_URL}/api/inventory`),
                axios.get(`${BASE_URL}/api/productivity-technical`)
            ]);
            setClients(clientRes.data || []);
            setMachines(machineRes.data || []);
            setServiceLogs(logsRes.data || []);
        } catch (err) {
            console.error("Error fetching productivity data", err);
            triggerToast("Failed to load board records", "error");
        }
    };

    const handleSetNowTimeIn = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setTimeIn(now.toISOString().slice(0, 16));
    };

    const handleSetNowTimeOut = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setTimeOut(now.toISOString().slice(0, 16));
    };

    const handleAddMachineField = () => {
        if (selectedMachines.length < 2) {
            setSelectedMachines([...selectedMachines, '']);
        }
    };

    const handleRemoveMachineField = (index) => {
        const updated = selectedMachines.filter((_, i) => i !== index);
        setSelectedMachines(updated.length > 0 ? updated : ['']);
    };

    const handleMachineChange = (index, value) => {
        const updated = [...selectedMachines];
        updated[index] = value;
        setSelectedMachines(updated);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFsrImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSerialResearch = (serial) => {
        setSerialSearchQuery(serial);
        if (!serial) {
            setSerialSearchResult(null);
            return;
        }
        const foundLog = serviceLogs.find(log =>
            log.serial_number?.toLowerCase().includes(serial.toLowerCase()) ||
            log.machine?.toLowerCase().includes(serial.toLowerCase())
        );
        if (foundLog) {
            setSerialSearchResult({
                client: foundLog.client_name || foundLog.client || 'Unknown Client',
                machine: foundLog.machine || 'N/A',
                date: foundLog.created_at || 'Recent'
            });
        } else {
            setSerialSearchResult({ client: 'No prior record found for this serial/machine.', machine: serial });
        }
    };

    const resetForm = () => {
        setSelectedClient('');
        setSelectedMachines(['']);
        setTimeIn('');
        setTimeOut('');
        setFsrSeries('');
        setFsrImage('');
        setTroubleFound('');
        setWorkDone('');
        setStatus('Working on it');
        setPriority('Medium');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedClient || selectedMachines.length === 0 || !fsrSeries) {
            triggerToast("Please fill in required fields (Client, Machine, FSR Series)", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                client_name: selectedClient,
                machine: selectedMachines.filter(m => m.trim() !== '').join(', '),
                time_in: timeIn,
                time_out: timeOut,
                fsr_series: fsrSeries,
                fsr_image: fsrImage,
                trouble_found: troubleFound,
                work_done: workDone,
                technician: username || 'Technical Staff',
                status: status,
                priority: priority
            };

            await axios.post(`${BASE_URL}/api/call-logs`, payload);
            triggerToast("Board item created & synced!", "success");

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

    const filteredLogs = serviceLogs.filter(log =>
        (log.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.machine || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.fsr_series || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.technician || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadgeStyle = (stat) => {
        switch (stat) {
            case 'Done':
            case 'OK': return { bg: '#00c875', text: '#fff' };
            case 'Working on it': return { bg: '#fdab3d', text: '#fff' };
            case 'Stuck': return { bg: '#e2445c', text: '#fff' };
            default: return { bg: '#579bfc', text: '#fff' };
        }
    };

    const getPriorityBadgeStyle = (prio) => {
        switch (prio) {
            case 'High': return { bg: '#e2445c', text: '#fff' };
            case 'Medium': return { bg: '#a25ddc', text: '#fff' };
            case 'Low': return { bg: '#579bfc', text: '#fff' };
            default: return { bg: '#c4c4c4', text: '#fff' };
        }
    };

    const formatLocalDateTime = (dateStr) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
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
                    <div className="btn-group bg-dark border border-white border-opacity-10 rounded-3 p-1">
                        <button
                            className={`btn btn-sm px-3 rounded-2 tiny-text fw-bold transition-all ${activeTab === 'table' ? 'bg-secondary bg-opacity-50 text-white shadow-sm' : 'text-muted border-0'}`}
                            onClick={() => setActiveTab('table')}
                        >
                            <i className="fa-solid fa-table-cells-row-lock me-1"></i> Main Table
                        </button>
                        <button
                            className={`btn btn-sm px-3 rounded-2 tiny-text fw-bold transition-all ${activeTab === 'kanban' ? 'bg-secondary bg-opacity-50 text-white shadow-sm' : 'text-muted border-0'}`}
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
                                            <th className="py-3 bg-transparent" style={{ width: '22%' }}>Item / Client</th>
                                            <th className="py-3 bg-transparent">Status</th>
                                            <th className="py-3 bg-transparent">Priority</th>
                                            <th className="py-3 bg-transparent">Technician</th>
                                            <th className="py-3 bg-transparent font-monospace">Machine / Serial</th>
                                            <th className="py-3 bg-transparent font-monospace">FSR Series</th>
                                            <th className="py-3 bg-transparent">Time Span</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.length > 0 ? (
                                            filteredLogs.map((item, idx) => {
                                                const statColor = getStatusBadgeStyle(item.status || 'OK');
                                                const prioColor = getPriorityBadgeStyle(item.priority || 'Medium');
                                                return (
                                                    <tr key={item.id || idx} className="border-bottom border-white border-opacity-5">
                                                        <td className="py-3 bg-transparent fw-bold text-white small">
                                                            <div>{item.client_name || item.client}</div>
                                                            {item.work_done && <div className="tiny-text text-muted text-truncate fw-normal mt-0.5" style={{ maxWidth: '200px' }}>{item.work_done}</div>}
                                                        </td>
                                                        <td className="py-3 bg-transparent">
                                                            <span className="badge tiny-text px-2.5 py-1.5 fw-bold rounded-2 text-center" style={{ backgroundColor: statColor.bg, color: statColor.text, minWidth: '95px' }}>
                                                                {item.status || 'OK'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 bg-transparent">
                                                            <span className="badge tiny-text px-2.5 py-1.5 fw-bold rounded-2 text-center" style={{ backgroundColor: prioColor.bg, color: prioColor.text, minWidth: '70px' }}>
                                                                {item.priority || 'Medium'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 bg-transparent small text-white-50">
                                                            <div className="d-flex align-items-center gap-1.5">
                                                                <span className="rounded-circle bg-secondary bg-opacity-50 text-white d-inline-flex align-items-center justify-content-center tiny-text fw-bold" style={{ width: '22px', height: '22px' }}>
                                                                    {(item.technician || username || 'S').charAt(0).toUpperCase()}
                                                                </span>
                                                                <span className="text-truncate" style={{ maxWidth: '100px' }}>{item.technician || username || 'Staff'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 bg-transparent font-monospace text-info small">{item.machine || '—'}</td>
                                                        <td className="py-3 bg-transparent font-monospace small">
                                                            <span className="tiny-text px-2 py-1 rounded-2 bg-white bg-opacity-10 jade-accent fw-bold">
                                                                {item.fsr_series || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 bg-transparent tiny-text text-muted font-monospace">
                                                            <div>In: {formatLocalDateTime(item.time_in)}</div>
                                                            <div>Out: {formatLocalDateTime(item.time_out)}</div>
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
                                    const colColor = getStatusBadgeStyle(colStatus);
                                    return (
                                        <div key={cIdx} className="col-12 col-md-4">
                                            <div className="p-3 rounded-3 bg-black bg-opacity-40 border border-white border-opacity-5 h-100">
                                                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-white border-opacity-10">
                                                    <span className="badge tiny-text px-2.5 py-1 fw-bold rounded-2" style={{ backgroundColor: colColor.bg, color: colColor.text }}>
                                                        {colStatus}
                                                    </span>
                                                    <span className="text-muted tiny-text fw-bold">{colItems.length}</span>
                                                </div>
                                                <div className="d-flex flex-column gap-2.5" style={{ minHeight: '300px' }}>
                                                    {colItems.length > 0 ? colItems.map((item, i) => (
                                                        <div key={i} className="p-3 rounded-3 bg-dark border border-white border-opacity-10 shadow-sm hover-border transition-all">
                                                            <div className="fw-bold text-white small mb-1">{item.client_name || item.client}</div>
                                                            <div className="tiny-text text-info font-monospace mb-1">Machine: {item.machine || '—'}</div>
                                                            <div className="tiny-text text-muted">FSR: {item.fsr_series || 'N/A'}</div>
                                                            {item.work_done && <div className="tiny-text text-secondary mt-2 pt-2 border-top border-white border-opacity-5 text-truncate">{item.work_done}</div>}
                                                        </div>
                                                    )) : (
                                                        <div className="text-center text-muted tiny-text py-5 italic border border-white border-opacity-5 rounded-3 border-dashed">
                                                            No items
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

            {/* Monday.com Style New Item Modal / Drawer Form */}
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
                                                onChange={(e) => setSelectedClient(e.target.value)}
                                                required
                                            >
                                                <option value="" className="text-muted">-- Choose Customer / Client --</option>
                                                {clients.map((c, i) => (
                                                    <option key={i} value={c.name || c.client_name}>{c.name || c.client_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <label className="form-label tiny-text text-uppercase fw-bold text-secondary m-0">Machine / Serial Number *</label>
                                                {selectedMachines.length < 2 && (
                                                    <button type="button" onClick={handleAddMachineField} className="btn btn-sm btn-link p-0 tiny-text text-decoration-none fw-bold" style={{ color: '#00c875' }}>
                                                        + Add 2nd Machine
                                                    </button>
                                                )}
                                            </div>
                                            {selectedMachines.map((m, index) => (
                                                <div key={index} className="input-group mb-2">
                                                    <span className="input-group-text bg-dark border-secondary border-opacity-25 text-secondary tiny-text px-2 px-md-3">#{index + 1}</span>
                                                    <input
                                                        type="text"
                                                        className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-end shadow-none font-monospace small py-2 px-3"
                                                        placeholder="Enter machine serial / ID..."
                                                        value={m}
                                                        onChange={(e) => handleMachineChange(index, e.target.value)}
                                                        required={index === 0}
                                                    />
                                                    {selectedMachines.length > 1 && (
                                                        <button type="button" className="btn btn-outline-danger border-opacity-25 text-danger px-2 px-md-3 ms-2 rounded-3" onClick={() => handleRemoveMachineField(index)}>
                                                            <i className="fa-solid fa-trash-can tiny-text"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
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
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">FSR Document Attachment</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2 px-3 small"
                                                onChange={handleImageUpload}
                                            />
                                            {fsrImage && (
                                                <div className="mt-2 d-flex align-items-center justify-content-between p-2.5 rounded-3 bg-dark border border-success border-opacity-25">
                                                    <span className="text-success tiny-text d-flex align-items-center gap-2 fw-bold">
                                                        <i className="fa-solid fa-check-circle"></i> File uploaded successfully
                                                    </span>
                                                    <button type="button" className="btn btn-sm btn-link text-danger p-0 tiny-text text-decoration-none" onClick={() => setFsrImage('')}>
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
                                            CREATING ITEM...
                                        </>
                                    ) : (
                                        'CREATE BOARD ITEM'
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
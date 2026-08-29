import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';

const ProductivityOfTechnical = ({ triggerToast, username }) => {
    const [clients, setClients] = useState([]);
    const [machines, setMachines] = useState([]);
    const [serviceLogs, setServiceLogs] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Modal State
    const [showModal, setShowModal] = useState(false);

    // Form States (Optimized with smart defaults & quick-helpers)
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedMachines, setSelectedMachines] = useState(['']);
    const [timeIn, setTimeIn] = useState('');
    const [timeOut, setTimeOut] = useState('');
    const [fsrSeries, setFsrSeries] = useState('');
    const [fsrImage, setFsrImage] = useState('');
    const [troubleFound, setTroubleFound] = useState('');
    const [workDone, setWorkDone] = useState('');
    
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
            triggerToast("Failed to load records", "error");
        }
    };

    // Helper: Set Time In to current local time instantly
    const handleSetNowTimeIn = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setTimeIn(now.toISOString().slice(0, 16));
    };

    // Helper: Set Time Out to current local time instantly
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
                status: 'OK'
            };

            await axios.post(`${BASE_URL}/api/call-logs`, payload);
            triggerToast("Productivity logged & synced successfully!", "success");
            
            resetForm();
            setShowModal(false);
            fetchInitialData();
        } catch (err) {
            console.error("Error saving productivity log", err);
            triggerToast("Failed to save service record", "error");
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

    const formatLocalDateTime = (dateStr) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="animate-fade-in text-white container-fluid px-0">
            {/* Page Header */}
            <header className="mb-4 pb-3 border-bottom border-white border-opacity-10 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                    <h3 className="fw-900 tracking-tighter text-white m-0">
                        PRODUCTIVITY OF <span className="jade-accent">TECHNICAL</span>
                    </h3>
                    <p className="text-muted small m-0 mt-1">Track service tickets, FSR records, and sync field tasks effortlessly.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)} 
                    className="btn px-4 py-2.5 fw-bold tiny-text tracking-widest text-dark d-flex align-items-center justify-content-center gap-2 shadow-sm transition-all"
                    style={{ backgroundColor: 'var(--jade)' }}
                >
                    <i className="fa-solid fa-plus-circle"></i> NEW SERVICE ENTRY
                </button>
            </header>

            {/* Main Layout Grid */}
            <div className="row g-4">
                {/* Left Column: Research & Quick Inspection Utilities */}
                <div className="col-12 col-xl-4">
                    <div className="d-flex flex-column gap-4">
                        {/* Serial Number Research Widget */}
                        <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10 shadow-sm">
                            <h6 className="fw-900 text-white mb-2 text-uppercase tiny-text tracking-widest d-flex align-items-center gap-2">
                                <span className="jade-accent">🔍</span> Quick Serial Lookup
                            </h6>
                            <p className="text-muted small mb-3">Instantly find who owns a machine or check its past service history.</p>
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none font-monospace small"
                                    placeholder="Type serial / machine ID..."
                                    value={serialSearchQuery}
                                    onChange={(e) => handleSerialResearch(e.target.value)}
                                />
                                {serialSearchQuery && (
                                    <button className="btn btn-outline-secondary border-opacity-25 text-white" type="button" onClick={() => handleSerialResearch('')}>
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                )}
                            </div>
                            {serialSearchQuery && (
                                <div className="p-3 mt-3 rounded-3 bg-black border border-white border-opacity-10 animate-fade-in">
                                    <div className="tiny-text text-muted text-uppercase tracking-wider">Lookup Match</div>
                                    <div className="text-white fw-bold mt-1 small">{serialSearchResult?.client}</div>
                                    <div className="tiny-text text-info font-monospace mt-1">Machine: {serialSearchResult?.machine}</div>
                                </div>
                            )}
                        </div>

                        {/* Live Sync Feed Widget */}
                        <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10 shadow-sm">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="fw-900 text-white mb-0 text-uppercase tiny-text tracking-widest d-flex align-items-center gap-2">
                                    <span className="text-info">●</span> Recent Service Logs
                                </h6>
                                <span className="badge bg-secondary bg-opacity-25 tiny-text px-2 py-1">{filteredLogs.length}</span>
                            </div>
                            <p className="text-muted small mb-3">Live feed of previously submitted technical outputs.</p>
                            <div className="mb-3">
                                <input 
                                    type="text" 
                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none small"
                                    placeholder="Search active logs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="d-flex flex-column gap-2.5 pe-1" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                                {filteredLogs.length > 0 ? filteredLogs.map((log, idx) => (
                                    <div key={idx} className="p-3 rounded-3 bg-black border border-white border-opacity-5 hover-border transition-all">
                                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                                            <span className="fw-bold text-white small text-truncate">{log.client_name || log.client}</span>
                                            <span className="badge bg-success bg-opacity-25 text-success tiny-text px-2">OK</span>
                                        </div>
                                        <div className="tiny-text text-info font-monospace mb-1">Machine: {log.machine || '—'}</div>
                                        <div className="tiny-text text-muted d-flex justify-content-between">
                                            <span>FSR: {log.fsr_series || 'N/A'}</span>
                                            <span className="text-white-50">{log.technician || 'Staff'}</span>
                                        </div>
                                        {log.work_done && <div className="tiny-text text-secondary mt-1.5 pt-1.5 border-top border-white border-opacity-5 text-truncate">{log.work_done}</div>}
                                    </div>
                                )) : (
                                    <div className="text-muted small text-center py-4 bg-black rounded-3 border border-white border-opacity-5">
                                        No logs matching filter.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Main Productivity Ledger Table */}
                <div className="col-12 col-xl-8">
                    <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10 shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h5 className="fw-900 text-white m-0 text-uppercase tiny-text tracking-widest d-flex align-items-center gap-2">
                                    <span className="jade-accent">●</span> Productivity Master Ledger
                                </h5>
                                <p className="text-muted small m-0 mt-1">Complete historical record of dispatched technician service hours.</p>
                            </div>
                            <button 
                                onClick={fetchInitialData} 
                                className="btn btn-sm border-white border-opacity-10 text-muted hover-lift rounded-3 shadow-none d-flex align-items-center gap-1.5 px-3 py-1.5"
                                title="Refresh data"
                            >
                                <i className="fa-solid fa-rotate tiny-text"></i> <span className="tiny-text">Refresh</span>
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
                                <thead>
                                    <tr className="text-muted tiny-text text-uppercase border-bottom border-white border-opacity-10">
                                        <th className="py-3 bg-transparent">Duration / Time</th>
                                        <th className="py-3 bg-transparent">Technician</th>
                                        <th className="py-3 bg-transparent">Client</th>
                                        <th className="py-3 bg-transparent">Machine / Serial</th>
                                        <th className="py-3 bg-transparent">FSR Series</th>
                                        <th className="py-3 bg-transparent">Trouble Found</th>
                                        <th className="py-3 bg-transparent">Work Done</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {serviceLogs.length > 0 ? (
                                        serviceLogs.map((item, idx) => (
                                            <tr key={item.id || idx} className="border-bottom border-white border-opacity-5">
                                                <td className="py-3 bg-transparent tiny-text text-muted font-monospace">
                                                    <div><span className="text-white-50">In:</span> {formatLocalDateTime(item.time_in)}</div>
                                                    <div><span className="text-white-50">Out:</span> {formatLocalDateTime(item.time_out)}</div>
                                                </td>
                                                <td className="py-3 bg-transparent fw-bold text-white small">{item.technician || username || 'Staff'}</td>
                                                <td className="py-3 bg-transparent text-white small fw-medium">{item.client_name || item.client}</td>
                                                <td className="py-3 bg-transparent font-monospace text-info small">{item.machine || '—'}</td>
                                                <td className="py-3 bg-transparent font-monospace small">
                                                    <span className="tiny-text px-2.5 py-1 rounded-2 bg-white bg-opacity-10 jade-accent fw-bold">
                                                        {item.fsr_series || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="py-3 bg-transparent text-muted small">{item.trouble_found || '—'}</td>
                                                <td className="py-3 bg-transparent text-muted small">{item.work_done || '—'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted py-5 italic small">
                                                No productivity records found in the database.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Entry Form Modal Component (Redesigned for Handy, Clean, Step-by-Step Flow) */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content bg-dark border border-white border-opacity-20 text-white rounded-4 shadow-lg overflow-hidden">
                            <div className="modal-header border-bottom border-white border-opacity-10 px-4 py-3 bg-black bg-opacity-50">
                                <h5 className="modal-title fw-900 tiny-text tracking-widest text-uppercase d-flex align-items-center gap-2 m-0">
                                    <span className="jade-accent">●</span> New Technical Service Log
                                </h5>
                                <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <form onSubmit={handleSubmit} id="productivityForm">
                                    
                                    {/* SECTION 1: CLIENT & MACHINES */}
                                    <div className="p-3.5 mb-3.5 rounded-3 bg-black bg-opacity-40 border border-white border-opacity-5">
                                        <div className="tiny-text text-uppercase fw-bold text-muted mb-3 tracking-wider">
                                            1. Client & Equipment Assignment
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">Client Name *</label>
                                            <select 
                                                className="form-select bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2"
                                                value={selectedClient}
                                                onChange={(e) => setSelectedClient(e.target.value)}
                                                required
                                            >
                                                <option value="">-- Choose Customer / Client --</option>
                                                {clients.map((c, i) => (
                                                    <option key={i} value={c.name || c.client_name}>{c.name || c.client_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <label className="form-label tiny-text text-uppercase fw-bold text-secondary m-0">Machine / Serial Number *</label>
                                                {selectedMachines.length < 2 && (
                                                    <button type="button" onClick={handleAddMachineField} className="btn btn-sm btn-link jade-accent p-0 tiny-text text-decoration-none fw-bold">
                                                        + Include 2nd Machine
                                                    </button>
                                                )}
                                            </div>
                                            {selectedMachines.map((m, index) => (
                                                <div key={index} className="input-group mb-2">
                                                    <span className="input-group-text bg-dark border-secondary border-opacity-25 text-muted tiny-text">#{index + 1}</span>
                                                    <input 
                                                        type="text" 
                                                        className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-end shadow-none font-monospace small py-2"
                                                        placeholder="Enter machine serial / ID..."
                                                        value={m}
                                                        onChange={(e) => handleMachineChange(index, e.target.value)}
                                                        required={index === 0}
                                                    />
                                                    {selectedMachines.length > 1 && (
                                                        <button type="button" className="btn btn-outline-danger border-opacity-25 text-danger px-3 ms-2 rounded-3" onClick={() => handleRemoveMachineField(index)} title="Remove machine">
                                                            <i className="fa-solid fa-trash-can tiny-text"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SECTION 2: TIME TRACKING (WITH FAST-FILL HANDY BUTTONS) */}
                                    <div className="p-3.5 mb-3.5 rounded-3 bg-black bg-opacity-40 border border-white border-opacity-5">
                                        <div className="tiny-text text-uppercase fw-bold text-muted mb-3 tracking-wider">
                                            2. Service Duration & Timing
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
                                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2 small"
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
                                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2 small"
                                                    value={timeOut}
                                                    onChange={(e) => setTimeOut(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION 3: FSR & TECHNICAL FINDINGS */}
                                    <div className="p-3.5 rounded-3 bg-black bg-opacity-40 border border-white border-opacity-5">
                                        <div className="tiny-text text-uppercase fw-bold text-muted mb-3 tracking-wider">
                                            3. FSR Document & Service Notes
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">FSR Series Number *</label>
                                            <input 
                                                type="text" 
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none font-monospace py-2 small"
                                                placeholder="e.g., FSR-2026-00124"
                                                value={fsrSeries}
                                                onChange={(e) => setFsrSeries(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">Upload FSR Document Image</label>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none py-2 small"
                                                onChange={handleImageUpload}
                                            />
                                            {fsrImage && <div className="mt-1.5 text-success tiny-text d-flex align-items-center gap-1">✓ FSR image attached</div>}
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">Trouble Found</label>
                                            <textarea 
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none small"
                                                rows="2"
                                                placeholder="What was the diagnosed issue?"
                                                value={troubleFound}
                                                onChange={(e) => setTroubleFound(e.target.value)}
                                            ></textarea>
                                        </div>

                                        <div className="mb-0">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-secondary mb-1">Work Done / Action Taken</label>
                                            <textarea 
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none small"
                                                rows="2"
                                                placeholder="What steps were taken to resolve the issue?"
                                                value={workDone}
                                                onChange={(e) => setWorkDone(e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer border-top border-white border-opacity-10 px-4 py-3 bg-black bg-opacity-50">
                                <button type="button" className="btn btn-outline-secondary border-opacity-25 px-4 py-2 tiny-text rounded-3 text-white" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    form="productivityForm" 
                                    className="btn px-4 py-2.5 fw-bold tiny-text tracking-widest text-dark rounded-3 d-flex align-items-center gap-2"
                                    style={{ backgroundColor: 'var(--jade)' }}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            SYNCING ENTRY...
                                        </>
                                    ) : (
                                        'SAVE & SYNC TO CALL LOGS'
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
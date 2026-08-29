import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';

const ProductivtyOfTechnical = ({ triggerToast, username }) => {
    const [clients, setClients] = useState([]);
    const [machines, setMachines] = useState([]);
    const [serviceLogs, setServiceLogs] = useState([]);
    
    // Modal State
    const [showModal, setShowModal] = useState(false);

    // Form States
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedMachines, setSelectedMachines] = useState(['']); // array to support multiple machines (usahay duha)
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

    const handleAddMachineField = () => {
        if (selectedMachines.length < 2) {
            setSelectedMachines([...selectedMachines, '']);
        }
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
                setFsrImage(reader.result); // Base64 string storage
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
            setSerialSearchResult({ client: 'No client record found for this serial/machine.', machine: serial });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedClient || selectedMachines.length === 0 || !fsrSeries) {
            triggerToast("Please fill in required fields (Client, Machine, FSR Series)", "error");
            return;
        }

        try {
            const payload = {
                client_name: selectedClient,
                machine: selectedMachines.join(', '),
                time_in: timeIn,
                time_out: timeOut,
                fsr_series: fsrSeries,
                fsr_image: fsrImage,
                trouble_found: troubleFound,
                work_done: workDone,
                technician: username || 'Technical Staff',
                status: 'OK'
            };

            // Post to call-logs which automatically syncs to productivity-technical table in your Cloudflare worker
            await axios.post(`${BASE_URL}/api/call-logs`, payload);
            triggerToast("Productivity logged & synced to Call Logs successfully!", "success");
            
            // Reset form & close modal
            setSelectedClient('');
            setSelectedMachines(['']);
            setTimeIn('');
            setTimeOut('');
            setFsrSeries('');
            setFsrImage('');
            setTroubleFound('');
            setWorkDone('');
            setShowModal(false);
            fetchInitialData();
        } catch (err) {
            console.error("Error saving productivity log", err);
            triggerToast("Failed to save service record", "error");
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
        <div className="animate-fade-in text-white">
            <header className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h3 className="fw-900 tracking-tighter text-white m-0">
                        PRODUCTIVITY OF <span className="jade-accent">TECHNICAL</span>
                    </h3>
                    <p className="text-muted small m-0">Service logs, FSR tracking, and automated call-log deployment.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)} 
                    className="btn px-4 py-2 fw-bold tiny-text tracking-widest text-dark d-flex align-items-center gap-2"
                    style={{ backgroundColor: 'var(--jade)' }}
                >
                    <i className="fa-solid fa-plus"></i> + ADD NEW ENTRY
                </button>
            </header>

            {/* SEARCH & SERIAL RESEARCH PANEL & LEDGER */}
            <div className="row g-4">
                <div className="col-12 col-xl-5">
                    {/* SERIAL LOOKUP RESEARCH WIDGET */}
                    <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10 mb-4">
                        <h6 className="fw-900 text-white mb-3 uppercase tiny-text tracking-widest">
                            <span className="jade-accent me-2">🔍</span> Serial Number Research
                        </h6>
                        <input 
                            type="text" 
                            className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none mb-3 font-monospace"
                            placeholder="Enter serial to check client owner..."
                            value={serialSearchQuery}
                            onChange={(e) => handleSerialResearch(e.target.value)}
                        />
                        {serialSearchQuery && (
                            <div className="p-3 rounded-3 bg-black border border-white border-opacity-5">
                                <div className="tiny-text text-muted uppercase">Research Result:</div>
                                <div className="text-white fw-bold mt-1">{serialSearchResult?.client}</div>
                                <div className="small text-info">Machine: {serialSearchResult?.machine}</div>
                            </div>
                        )}
                    </div>

                    {/* LIVE CALL LOGS LIST */}
                    <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-900 text-white mb-0 uppercase tiny-text tracking-widest">
                                <span className="text-info me-2">●</span> Live Call Logs Sync
                            </h6>
                        </div>
                        <input 
                            type="text" 
                            className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none mb-3"
                            placeholder="Search logs by client/FSR/tech..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="d-flex flex-column gap-3" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                            {filteredLogs.length > 0 ? filteredLogs.map((log, idx) => (
                                <div key={idx} className="p-3 rounded-3 bg-black border border-white border-opacity-5">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div className="fw-bold text-white small">{log.client_name || log.client}</div>
                                        <span className="badge bg-success tiny-text">OK</span>
                                    </div>
                                    <div className="tiny-text text-muted mt-1">Machine: {log.machine}</div>
                                    <div className="tiny-text text-info">FSR: {log.fsr_series || 'N/A'} | Tech: {log.technician || 'Staff'}</div>
                                    <div className="tiny-text text-secondary mt-1">{log.work_done || log.trouble_found}</div>
                                </div>
                            )) : <div className="text-muted small text-center py-3">No matching logs found.</div>}
                        </div>
                    </div>
                </div>

                {/* PRODUCTIVITY LEDGER DATA TABLE SECTION */}
                <div className="col-12 col-xl-7">
                    <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-900 text-white m-0 text-uppercase tiny-text tracking-widest">
                                <span className="jade-accent me-2">●</span> Entered Technical Productivity Ledger
                            </h5>
                            <button onClick={fetchInitialData} className="btn btn-sm border-white border-opacity-10 text-muted hover-lift rounded-3 shadow-none">
                                <i className="fa-solid fa-rotate"></i>
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
                                <thead>
                                    <tr className="text-muted tiny-text text-uppercase border-bottom border-white border-opacity-10">
                                        <th className="py-3 bg-transparent">Time In / Out</th>
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
                                                <td className="py-3 bg-transparent tiny-text text-muted">
                                                    <div>In: {formatLocalDateTime(item.time_in)}</div>
                                                    <div>Out: {formatLocalDateTime(item.time_out)}</div>
                                                </td>
                                                <td className="py-3 bg-transparent fw-bold text-white small">{item.technician || username || 'Staff'}</td>
                                                <td className="py-3 bg-transparent text-white small">{item.client_name || item.client}</td>
                                                <td className="py-3 bg-transparent font-monospace text-info small">{item.machine || '—'}</td>
                                                <td className="py-3 bg-transparent font-monospace small">
                                                    <span className="tiny-text px-2 py-1 rounded bg-white bg-opacity-10 jade-accent">
                                                        {item.fsr_series || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="py-3 bg-transparent text-muted small">{item.trouble_found || '—'}</td>
                                                <td className="py-3 bg-transparent text-muted small">{item.work_done || '—'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted py-4 italic small">No productivity records found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* NEW PRODUCTIVITY ENTRY MODAL */}
            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content bg-dark border border-white border-opacity-15 text-white rounded-4 shadow-lg">
                            <div className="modal-header border-bottom border-white border-opacity-10 px-4 py-3">
                                <h5 className="modal-title fw-900 tiny-text tracking-widest text-uppercase">
                                    <span className="jade-accent me-2">●</span> New Technical Productivity Entry
                                </h5>
                                <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <form onSubmit={handleSubmit} id="productivityForm">
                                    <div className="mb-3">
                                        <label className="form-label tiny-text text-uppercase fw-bold text-muted">Select Client</label>
                                        <select 
                                            className="form-select bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none"
                                            value={selectedClient}
                                            onChange={(e) => setSelectedClient(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Choose Client --</option>
                                            {clients.map((c, i) => (
                                                <option key={i} value={c.name || c.client_name}>{c.name || c.client_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-muted">Select Machine / Serial Number</label>
                                            {selectedMachines.length < 2 && (
                                                <button type="button" onClick={handleAddMachineField} className="btn btn-sm btn-link jade-accent p-0 tiny-text text-decoration-none">
                                                    + Add 2nd Machine
                                                </button>
                                            )}
                                        </div>
                                        {selectedMachines.map((m, index) => (
                                            <div key={index} className="input-group mb-2">
                                                <input 
                                                    type="text" 
                                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none font-monospace"
                                                    placeholder={`Machine / Serial #${index + 1}`}
                                                    value={m}
                                                    onChange={(e) => handleMachineChange(index, e.target.value)}
                                                    required={index === 0}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-6">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-muted">Time In</label>
                                            <input 
                                                type="datetime-local" 
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none"
                                                value={timeIn}
                                                onChange={(e) => setTimeIn(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label tiny-text text-uppercase fw-bold text-muted">Time Out</label>
                                            <input 
                                                type="datetime-local" 
                                                className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none"
                                                value={timeOut}
                                                onChange={(e) => setTimeOut(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label tiny-text text-uppercase fw-bold text-muted">FSR Series Number</label>
                                        <input 
                                            type="text" 
                                            className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none font-monospace"
                                            placeholder="Enter FSR series code..."
                                            value={fsrSeries}
                                            onChange={(e) => setFsrSeries(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label tiny-text text-uppercase fw-bold text-muted">Upload Picture of FSR</label>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none"
                                            onChange={handleImageUpload}
                                        />
                                        {fsrImage && <div className="mt-2 text-success tiny-text">✓ Image attached successfully</div>}
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label tiny-text text-uppercase fw-bold text-muted">Trouble Found</label>
                                        <textarea 
                                            className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none"
                                            rows="2"
                                            placeholder="Describe diagnostic findings..."
                                            value={troubleFound}
                                            onChange={(e) => setTroubleFound(e.target.value)}
                                        ></textarea>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label tiny-text text-uppercase fw-bold text-muted">Work Done</label>
                                        <textarea 
                                            className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 shadow-none"
                                            rows="2"
                                            placeholder="Describe remediation / actions taken..."
                                            value={workDone}
                                            onChange={(e) => setWorkDone(e.target.value)}
                                        ></textarea>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer border-top border-white border-opacity-10 px-4 py-3">
                                <button type="button" className="btn btn-secondary px-4 py-2 tiny-text rounded-3" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" form="productivityForm" className="btn px-4 py-2 fw-bold tiny-text tracking-widest text-dark rounded-3" style={{ backgroundColor: 'var(--jade)' }}>
                                    SAVE & SYNC TO CALL LOGS (OK)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductivtyOfTechnical;
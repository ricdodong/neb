import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';

const ProductivtyOfTechnical = ({ triggerToast, username }) => {
    const [clients, setClients] = useState([]);
    const [machines, setMachines] = useState([]);
    const [serviceLogs, setServiceLogs] = useState([]);
    
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
                axios.get(`${BASE_URL}/api/inventory`), // Assuming machines/items are pulled from inventory or machine records
                axios.get(`${BASE_URL}/api/call-logs`)
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
        // Research logic: find which client owns/associated with this machine serial
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
                status: 'OK' // Automatically log to Call Logs as OK
            };

            await axios.post(`${BASE_URL}/api/call-logs`, payload);
            triggerToast("Productivity logged & synced to Call Logs successfully!", "success");
            
            // Reset form
            setSelectedClient('');
            setSelectedMachines(['']);
            setTimeIn('');
            setTimeOut('');
            setFsrSeries('');
            setFsrImage('');
            setTroubleFound('');
            setWorkDone('');
            fetchInitialData();
        } catch (err) {
            console.error("Error saving productivity log", err);
            triggerToast("Failed to save service record", "error");
        }
    };

    const filteredLogs = serviceLogs.filter(log => 
        (log.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.machine || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.fsr_series || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-fade-in text-white">
            <header className="mb-4">
                <h3 className="fw-900 tracking-tighter text-white">
                    PRODUCTIVITY OF <span className="jade-accent">TECHNICAL</span>
                </h3>
                <p className="text-muted small">Service logs, FSR tracking, and automated call-log deployment.</p>
            </header>

            <div className="row g-4">
                {/* FORM SECTION */}
                <div className="col-12 col-xl-7">
                    <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10">
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label tiny-text text-uppercase fw-bold text-muted">Select Client</label>
                                <select 
                                    className="form-select bg-dark text-white border-secondary border-opacity-25 rounded-3"
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
                                            className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3"
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
                                        className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3"
                                        value={timeIn}
                                        onChange={(e) => setTimeIn(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label tiny-text text-uppercase fw-bold text-muted">Time Out</label>
                                    <input 
                                        type="datetime-local" 
                                        className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3"
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
                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 font-monospace"
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
                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3"
                                    onChange={handleImageUpload}
                                />
                                {fsrImage && <div className="mt-2 text-success tiny-text">✓ Image attached successfully</div>}
                            </div>

                            <div className="mb-3">
                                <label className="form-label tiny-text text-uppercase fw-bold text-muted">Trouble Found</label>
                                <textarea 
                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3"
                                    rows="2"
                                    placeholder="Describe diagnostic findings..."
                                    value={troubleFound}
                                    onChange={(e) => setTroubleFound(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="mb-4">
                                <label className="form-label tiny-text text-uppercase fw-bold text-muted">Work Done</label>
                                <textarea 
                                    className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3"
                                    rows="2"
                                    placeholder="Describe remediation / actions taken..."
                                    value={workDone}
                                    onChange={(e) => setWorkDone(e.target.value)}
                                ></textarea>
                            </div>

                            <button type="submit" className="btn w-100 py-3 fw-bold tiny-text tracking-widest text-dark" style={{ backgroundColor: 'var(--jade)' }}>
                                SAVE & SYNC TO CALL LOGS (OK)
                            </button>
                        </form>
                    </div>
                </div>

                {/* SEARCH & SERIAL RESEARCH PANEL */}
                <div className="col-12 col-xl-5">
                    {/* SERIAL LOOKUP RESEARCH WIDGET */}
                    <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10 mb-4">
                        <h6 className="fw-900 text-white mb-3 uppercase tiny-text tracking-widest">
                            <span className="jade-accent me-2">🔍</span> Serial Number Research
                        </h6>
                        <input 
                            type="text" 
                            className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 mb-3 font-monospace"
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

                    {/* RECENT OK LOGS & SEARCH TAB */}
                    <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-900 text-white mb-0 uppercase tiny-text tracking-widest">
                                <span className="text-info me-2">●</span> Live Call Logs Sync
                            </h6>
                        </div>
                        <input 
                            type="text" 
                            className="form-control bg-dark text-white border-secondary border-opacity-25 rounded-3 mb-3"
                            placeholder="Search logs by client/FSR..."
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
                                    <div className="tiny-text text-info">FSR: {log.fsr_series || 'N/A'}</div>
                                    <div className="tiny-text text-secondary mt-1">{log.work_done || log.trouble_found}</div>
                                </div>
                            )) : <div className="text-muted small text-center py-3">No matching logs found.</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductivtyOfTechnical;
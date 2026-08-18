import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BASE_URL = 'https://dpsapi.ricalgen.eu.org';

const ScannerPage = () => {
    const [sessionId, setSessionId] = useState('');
    const [scanStatus, setScanStatus] = useState('Initializing camera scanner...');
    const [lastScanned, setLastScanned] = useState(null);
    const [isScanning, setIsScanning] = useState(true);

    const videoRef = useRef(null);
    const scannerIntervalRef = useRef(null);
    const lastScannedCodeRef = useRef({ code: '', time: 0 });
    const clearMessageTimerRef = useRef(null);

    // Extract session ID from URL hash e.g., #/scanner/481920
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash; // e.g. "#/scanner/481920"
            const parts = hash.split('/');
            if (parts.length >= 3 && parts[1] === 'scanner') {
                const extractedSession = parts[2];
                setSessionId(extractedSession);
                setScanStatus(`Connected to Session: [${extractedSession}]`);
            } else {
                setScanStatus('Error: No active session ID found in URL.');
                setIsScanning(false);
            }
        };

        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Start camera when session is active
    useEffect(() => {
        if (sessionId && isScanning) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [sessionId, isScanning]);

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
            setScanStatus("Unable to access camera. Please allow camera permissions.");
            setIsScanning(false);
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
            setScanStatus("BarcodeDetector API not supported. Please use Chrome on Mobile.");
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

    // Helper function to detect URLs and prevent pushing links
    const isUrl = (val) => {
        const lowerVal = val.toLowerCase();
        return (
            lowerVal.startsWith('http://') ||
            lowerVal.startsWith('https://') ||
            lowerVal.startsWith('www.') ||
            /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(val)
        );
    };

    const handleSuccessfulScan = async (code) => {
        const trimmedCode = code.trim();
        const now = Date.now();

        // 1. URL Check: Reject if scanned value is a web link / URL
        if (isUrl(trimmedCode)) {
            setScanStatus(`Ignored URL QR Code: Please scan item serial barcode.`);
            return;
        }

        // 2. Anti-flood check (3.5s cooldown per exact code to prevent spamming)
        if (lastScannedCodeRef.current.code === trimmedCode && (now - lastScannedCodeRef.current.time < 3500)) {
            return;
        }
        lastScannedCodeRef.current = { code: trimmedCode, time: now };

        if (navigator.vibrate) navigator.vibrate(150);
        setLastScanned(trimmedCode);
        setScanStatus(`Successfully Pushed Serial: ${trimmedCode}`);

        // Clear last scanned badge message after 3 seconds
        if (clearMessageTimerRef.current) clearTimeout(clearMessageTimerRef.current);
        clearMessageTimerRef.current = setTimeout(() => {
            setLastScanned(null);
            setScanStatus(`Connected to Session: [${sessionId}] - Ready for next scan`);
        }, 3000);

        if (sessionId) {
            try {
                await axios.post(`${BASE_URL}/api/scanner/push`, {
                    session: sessionId,
                    scannedCode: trimmedCode,
                    timestamp: now
                });
            } catch (err) {
                console.error("Failed to push scan to server", err);
            }
        }
    };

    return (
        <div className="container-fluid min-vh-100 bg-black text-light p-3 d-flex flex-column font-monospace justify-content-center align-items-center">
            <div className="card bg-dark border border-success text-white p-4 rounded-3 shadow-lg text-center font-monospace w-100" style={{ maxWidth: '450px' }}>
                <h5 className="text-success fw-bold mb-2">
                    <i className="fas fa-camera me-2"></i>MOBILE BARCODE SCANNER
                </h5>
                <p className="text-secondary small mb-3" style={{ fontSize: '11px' }}>
                    {scanStatus}
                </p>

                <div className="position-relative bg-black rounded border border-success overflow-hidden mb-3" style={{ minHeight: '300px' }}>
                    <video ref={videoRef} className="w-100 h-100" style={{ objectFit: 'cover', maxHeight: '350px' }} muted playsInline></video>
                    <div className="position-absolute top-50 start-50 translate-middle border border-success border-2 rounded opacity-50 pointer-event-none" style={{ width: '80%', height: '120px' }}></div>
                </div>

                {lastScanned && (
                    <div className="alert alert-success py-2 mb-3 text-black fw-bold animate__animated animate__fadeIn" style={{ fontSize: '12px' }}>
                        ⚡ Serial Sent: {lastScanned}
                    </div>
                )}

                <div className="d-flex gap-2">
                    <button 
                        className={`btn w-100 py-2 fw-bold ${isScanning ? 'btn-danger' : 'btn-success text-black'}`}
                        onClick={() => setIsScanning(!isScanning)}
                        style={{ fontSize: '12px' }}
                    >
                        {isScanning ? 'PAUSE SCANNER' : 'RESUME SCANNER'}
                    </button>
                    <button 
                        className="btn btn-outline-secondary py-2" 
                        onClick={() => window.location.href = '/'}
                        style={{ fontSize: '12px' }}
                    >
                        EXIT
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScannerPage;
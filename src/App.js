import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import JadeSystem from './JadeSystem';
import MobileUpload2 from './components/MobileUpload2'; 
import MobileUpload from './components/MobileUpload'; 
import ScannerPage from './components/ScannerPage'; // Adjust path if located elsewhere

export default function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <HashRouter>
            <Routes>
                {/* Public Routes: Bypass login screen */}
                <Route path="/scanner/:sessionId" element={<ScannerPage />} />
                <Route path="/mobile-upload2/:batchRef" element={<MobileUpload2 />} />
                <Route path="/mobile-upload/:batchRef" element={<MobileUpload />} />

                {/* Main System Routes */}
                <Route path="/" element={
                    !user ? (
                        <Login onLogin={handleLogin} />
                    ) : (
                        <JadeSystem 
                            userRole={user.role} 
                            username={user.username} 
                            onLogout={handleLogout} 
                        />
                    )
                } />

                {/* Redirect any unknown paths back to home */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </HashRouter>
    );
}
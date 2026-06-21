import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import JadeSystem from './JadeSystem';
import MobileUpload2 from './components/MobileUpload2'; // Import your new component

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
        <BrowserRouter>
            <Routes>
                {/* Public Route: The mobile upload bypasses the login screen */}
                <Route path="/mobile-uploads2/:batchRef" element={<MobileUpload2 />} />

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

                {/* Redirect any unknown paths to login */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}
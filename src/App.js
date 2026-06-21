import React, { useState, useEffect } from 'react';
import Login from './Login';
import JadeSystem from './JadeSystem'; 

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
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
    };

    if (!user) {
        return <Login onLogin={handleLogin} />;
    }

    // We remove the top bar div entirely here. 
    // JadeSystem now receives onLogout to power the "Terminate" button.
    return (
        <JadeSystem 
            userRole={user.role} 
            username={user.username} 
            onLogout={handleLogout} 
        />
    );
}
import React, { useState } from 'react';
import axios from 'axios';

// Dynamically extracts Cloudflare routing endpoints via webpack/react-scripts environment maps
const API_BASE_URL = 'https://dpsapi.ricalgen.eu.org';

const Login = ({ onLogin }) => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // UPDATED: Points to dynamic environment base instead of unchangeable hardcoded endpoints
            const response = await axios.post(
                `${API_BASE_URL}/api/login`, 
                credentials,
                { withCredentials: true } 
            );            
            
            if (response.data.success) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
                onLogin(response.data.user);
            } else {
                setError('ACCESS DENIED: Invalid Credentials');
            }
        } catch (err) {
            setError('COMMUNICATION ERROR: Check Backend Node');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="text-center mb-5">
                    <h2 className="fw-900 tracking-tighter text-white mb-1">
                        JADE<span className="jade-accent">SYS</span>
                    </h2>
                    <div className="tiny-text jade-accent tracking-widest uppercase">Terminal Authentication</div>
                </div>

                {error && (
                    <div className="error-box mb-4 animate-shake" role="alert">
                        <i className="fa-solid fa-triangle-exclamation me-2"></i>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group-custom mb-4">
                        <label className="input-label" htmlFor="username">OPERATOR_ID</label>
                        <div className="input-field-wrapper">
                            <i className="fa-solid fa-user-shield field-icon"></i>
                            <input 
                                id="username"
                                type="text" 
                                name="username" 
                                autoComplete="username"
                                value={credentials.username} 
                                onChange={handleChange} 
                                required 
                                className="styled-input"
                                placeholder="Enter Username"
                            />
                        </div>
                    </div>

                    <div className="input-group-custom mb-5">
                        <label className="input-label" htmlFor="password">ACCESS_KEY</label>
                        <div className="input-field-wrapper">
                            <i className="fa-solid fa-key field-icon"></i>
                            <input 
                                id="password"
                                type="password" 
                                name="password" 
                                autoComplete="current-password"
                                value={credentials.password} 
                                onChange={handleChange} 
                                required 
                                className="styled-input"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? (
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        ) : (
                            <><i className="fa-solid fa-unlock-keyhole me-2"></i> INITIATE LOGIN</>
                        )}
                    </button>
                </form>

                <div className="text-center mt-5">
                    <p className="text-light tiny-text">SECURE END-TO-END ENCRYPTED SESSION</p>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

                :root {
                    --base-bg: #050505;
                    --card-bg: #080808;
                    --jade: #00ff88;
                    --error: #ff4d4d;
                    --dark-shadow: rgba(0, 0, 0, 0.9);
                    --light-shadow: rgba(255, 255, 255, 0.03);
                }

                .login-wrapper {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background-image: url(/bg.jpg);
                    font-family: 'Inter', sans-serif;
                    color: #e0e0e0;
                    padding: 20px;
                    background-size: cover;
                    background-repeat: no-repeat;
                    background-position: center;
                }

                .login-card {
                    width: 100%;
                    max-width: 420px;
                    padding: 50px 40px;
                    background: var(--card-bg);
                    border-radius: 30px;
                    box-shadow: 20px 20px 60px var(--dark-shadow), -5px -5px 30px var(--light-shadow);
                    border: 1px solid rgba(255, 255, 255, 0.01);
                }

                .jade-accent { color: var(--jade); }
                .fw-900 { font-weight: 900; }
                .tiny-text { font-size: 0.65rem; font-weight: 800; letter-spacing: 1.5px; }

                .input-label {
                    display: block;
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: #ffffff;
                    margin-bottom: 8px;
                    padding-left: 5px;
                }

                .input-field-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .field-icon {
                    position: absolute;
                    left: 20px;
                    color: #666666; /* Optimized readability for darker fields */
                    font-size: 0.9rem;
                    z-index: 2;
                }

                .styled-input {
                    width: 100%;
                    padding: 15px 15px 15px 50px;
                    background: #121212; /* Cohesive dark dashboard background styling */
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    color: #ffffff;
                    font-weight: 600;
                    outline: none;
                    transition: all 0.3s ease;
                }

                .styled-input:focus {
                    border-color: var(--jade);
                    box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
                }

                .login-btn {
                    width: 100%;
                    padding: 16px;
                    background: var(--card-bg);
                    color: var(--jade);
                    border: 1px solid rgba(0, 255, 136, 0.1);
                    border-radius: 15px;
                    font-weight: 800;
                    font-size: 0.85rem;
                    letter-spacing: 1px;
                    box-shadow: 6px 6px 12px var(--dark-shadow), -2px -2px 10px var(--light-shadow);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .login-btn:hover {
                    transform: translateY(-2px);
                    color: #fff;
                    background: rgba(0, 255, 136, 0.05);
                    box-shadow: 8px 8px 15px var(--dark-shadow), -2px -2px 12px var(--light-shadow);
                }

                .login-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .error-box {
                    background: rgba(255, 77, 77, 0.05);
                    border: 1px solid rgba(255, 77, 77, 0.2);
                    color: var(--error);
                    padding: 12px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-align: center;
                }

                .animate-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }

                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}</style>
        </div>
    );
};

export default Login;
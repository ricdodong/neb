import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toast, ToastContainer, Offcanvas, Modal } from 'react-bootstrap';
// Components
import CustomerManagement from './components/CustomerManagement';
import StockManagement from './components/StockManagement';
import CallLogs from './components/CallLogs';
import PointOfSale from './components/PointOfSale';
import ServiceCenter from './components/ServiceCenter';
import POReceives from './components/poReceives'; 

const BASE_URL = 'https://dpsapi.ricalgen.eu.org'; // Use your actual Worker URL here

// --- UPGRADED PRO DASHBOARD HOME (DYNAMIC WITH TOTAL REVENUE FOOTER) ---
const DashboardHome = ({ userRole, setActivePage, activities, dashboardStats, username, inventoryData }) => {
    const [showSalesModal, setShowSalesModal] = useState(false);

    // Helper to format currency
    const formatPHP = (val) => new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0
    }).format(val || 0);

    const formatMonthLabel = (str) => {
        if (!str) return '';
        const [year, month] = str.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const currentMonthNameCaps = new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

    const totalAllTimeRevenue = dashboardStats?.monthlyHistory?.reduce((sum, item) => {
        return sum + parseFloat(item.total_revenue || 0);
    }, 0) || 0;

    const stats = [
        {
            label: 'Monthly Sales',
            val: formatPHP(dashboardStats?.grossRevenue),
            change: 'Month of ' + currentMonthNameCaps,
            icon: 'fa-money-bill-trend-up',
            color: 'var(--jade)',
            isClickable: true,
            trendLabel: 'Gross Revenue'
        },
        {
            label: 'Repair Lab',
            val: `${dashboardStats?.activeRepairs || 0} Active`,
            change: 'In Queue',
            icon: 'fa-microchip',
            color: '#3498db',
            trendLabel: 'v. Repaired'
        },
        {
            label: 'Inventory Value',
            val: formatPHP(dashboardStats?.totalStockValue),
            change: 'Monthly Collections',
            icon: 'fa-warehouse',
            color: '#f1c40f',
            trendLabel: 'v. Collectables'
        },
        {
            label: 'Alerts',
            val: `${dashboardStats?.lowStockAlerts || 0} Items`,
            change: 'PO Receives',
            icon: 'fa-triangle-exclamation',
            color: '#e74c3c',
            trendLabel: 'v. Rendered'
        }
    ];

    const handleDownloadReport = async () => {
        try {
            const response = await axios.post(`${BASE_URL}/api/generate-report`, {
                stats: dashboardStats,
                username: username,
                inventory: inventoryData 
            }, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `JADESYS_REPORT_${new Date().getTime()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Pro Report Generation Failed", err);
        }
    };

    return (
        <div className="animate-fade-in">
            <header className="mb-5 d-md-flex justify-content-between align-items-end">
                <div>
                    <h1 className="display-6 fw-900 text-white mb-2 tracking-tighter">
                        Dexterous Printing <span className="jade-accent">Services</span>
                    </h1>
                    <p className="text-muted mb-0">Real-time enterprise telemetry for DPS system.</p>
                </div>
                <div className="mt-3 mt-md-0">
                    <button
                        onClick={handleDownloadReport}
                        className="btn btn-sm border-white border-opacity-10 text-white px-3 py-2 rounded-3 me-2 sidebar-user-box hover-lift"
                    >
                        <i className="fa-solid fa-download me-2 tiny-text"></i> REPORT.PDF
                    </button>
                </div>
            </header>

            {/* STAT CARDS */}
            <div className="row g-3 mb-5">
                {stats.map((stat, i) => (
                    <div className="col-12 col-sm-6 col-xl-3" key={i}>
                        <div 
                            onClick={() => stat.isClickable && setShowSalesModal(true)}
                            className={`p-4 rounded-4 h-100 border border-white border-opacity-10 position-relative overflow-hidden ${stat.isClickable ? 'sidebar-user-box hover-lift' : 'sidebar-user-box'}`}
                            style={{ cursor: stat.isClickable ? 'pointer' : 'default' }}
                        >
                            <div className="position-absolute top-0 end-0 p-3 opacity-10">
                                <i className={`fa-solid ${stat.icon} display-4`}></i>
                            </div>
                            <div className="text-muted tiny-text text-uppercase mb-1 fw-bold">
                                {stat.label} {stat.isClickable && <span className="jade-accent ms-1"><i className="fa-solid fa-magnifying-glass-chart"></i></span>}
                            </div>
                            <h3 className="fw-900 text-white m-0 mb-2">{stat.val}</h3>
                            <div className="d-flex align-items-center gap-2">
                                <span className="tiny-text px-2 py-1 rounded bg-white bg-opacity-10" style={{ color: stat.color }}>{stat.change}</span>
                                <span className="tiny-text text-muted text-uppercase">{stat.trendLabel}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODULES & LIVE LOGS ROW */}
            <div className="row g-4">
                <div className="col-12 col-xl-8">
                    <h5 className="fw-900 text-white mb-4 uppercase tiny-text tracking-widest d-flex align-items-center">
                        <span className="jade-accent me-2">●</span> Deployment Modules
                    </h5>
                    <div className="row g-3">
                        {[
                            { title: 'New Transaction', desc: 'Launch POS Terminal', icon: 'fa-cart-plus', target: 'pos' },
                            { title: 'Inventory Log', desc: 'Add/Update Hardware', icon: 'fa-boxes-stacked', target: 'stocks' },
                            { title: 'Call Logs', desc: 'Broken Unit Service', icon: 'fa-headset', target: 'call logs' },
                            { title: 'Customer File', desc: 'CRM & History', icon: 'fa-address-card', target: 'customers' },
                            { title: 'PO Receives', desc: 'Log Inbound Logistics', icon: 'fa-file-import', target: 'po receives' }
                        ].map((box, i) => (
                            <div className="col-12 col-sm-6" key={i}>
                                <button onClick={() => setActivePage(box.target)} className="w-100 p-4 rounded-4 sidebar-btn text-start d-flex align-items-center gap-4 h-100 border border-white border-opacity-5">
                                    <div className="icon-box-neon p-3 rounded-4 bg-dark border border-white border-opacity-10">
                                        <i className={`fa-solid ${box.icon} jade-accent fs-3`}></i>
                                    </div>
                                    <div>
                                        <div className="fw-900 text-white">{box.title}</div>
                                        <div className="text-muted small lh-sm">{box.desc}</div>
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-12 col-xl-4">
                    <h5 className="fw-900 text-white mb-4 uppercase tiny-text tracking-widest d-flex align-items-center">
                        <span className="text-info me-2">●</span> Live Activity
                    </h5>
                    <div className="p-4 rounded-4 sidebar-user-box border border-white border-opacity-10">
                        <div className="d-flex flex-column gap-4">
                            {activities.length > 0 ? activities.map(activity => (
                                <div key={activity.id} className="d-flex justify-content-between align-items-start border-bottom border-white border-opacity-5 pb-3">
                                    <div className="d-flex gap-3">
                                        <div className={`mt-1 status-dot ${activity.type === 'input' || activity.type === 'Sale' ? 'bg-success' : 'bg-info'}`}></div>
                                        <div>
                                            <div className="text-white small fw-bold">{activity.description}</div>
                                            <div className="tiny-text text-muted">{new Date(activity.created_at).toLocaleTimeString()} • {activity.type.toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <div className="fw-bold text-white small">
                                        {activity.qty_change ? `${activity.qty_change > 0 ? '+' : ''}${activity.qty_change}` : activity.status}
                                    </div>
                                </div>
                            )) : <div className="text-muted small py-3 text-center italic">Scanning for live updates...</div>}
                        </div>
                        <button className="btn w-100 mt-4 tiny-text text-muted fw-bold tracking-widest">VIEW SYSTEM LOGS</button>
                    </div>
                </div>
            </div>

            {/* OMNI MONTHLY BREAKDOWN MODAL OVERLAY */}
            <Modal show={showSalesModal} onHide={() => setShowSalesModal(false)} centered size="lg" contentClassName="bg-dark border border-white border-opacity-10 rounded-4 text-white">
                <Modal.Header closeButton closeVariant="white" className="border-bottom border-white border-opacity-5 p-4">
                    <Modal.Title className="fw-900 tracking-tighter">
                        Sales Ledger <span className="jade-accent">Breakdown</span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4" style={{ backgroundColor: '#050505' }}>
                    <p className="text-muted small mb-4">Historical system performance ledger compiled directly from live database metrics.</p>
                    <div className="table-responsive">
                        <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
                            <thead>
                                <tr className="text-muted tiny-text text-uppercase border-bottom border-white border-opacity-10">
                                    <th className="py-3 bg-transparent">Billing Month</th>
                                    <th className="py-3 bg-transparent text-center">Transactions Placed</th>
                                    <th className="py-3 bg-transparent text-end">Gross Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardStats?.monthlyHistory && dashboardStats.monthlyHistory.length > 0 ? (
                                    dashboardStats.monthlyHistory.map((item, idx) => (
                                        <tr key={idx} className="border-bottom border-white border-opacity-5">
                                            <td className="py-3 bg-transparent fw-bold text-white">{formatMonthLabel(item.sales_month)}</td>
                                            <td className="py-3 bg-transparent text-center text-info font-monospace">{item.total_orders}</td>
                                            <td className="py-3 bg-transparent text-end jade-accent fw-bold font-monospace">{formatPHP(item.total_revenue)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="text-center text-muted small py-4 italic">No dynamic records found.</td>
                                    </tr>
                                )}
                            </tbody>
                            {dashboardStats?.monthlyHistory && dashboardStats.monthlyHistory.length > 0 && (
                                <tfoot>
                                    <tr className="border-top border-white border-opacity-10 fw-bold fs-6">
                                        <td className="py-3 bg-transparent text-white text-uppercase tracking-wider small">Total Revenue</td>
                                        <td className="py-3 bg-transparent text-center text-muted font-monospace small">—</td>
                                        <td className="py-3 bg-transparent text-end text-white font-monospace" style={{ textShadow: '0 0 12px rgba(255,255,255,0.2)' }}>
                                            {formatPHP(totalAllTimeRevenue)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-top border-white border-opacity-5 p-3">
                    <button onClick={() => setShowSalesModal(false)} className="btn btn-sm btn-outline-secondary px-4 rounded-3 tiny-text fw-bold tracking-widest text-white">
                        DISMISS
                    </button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

// --- MAIN SYSTEM WRAPPER ---
const JadeSystem = ({ userRole, onLogout, username }) => {
    const [activePage, setActivePage] = useState('dashboard');
    const [showToast, setShowToast] = useState(false);
    const [toastConfig, setToastConfig] = useState({ message: '', bg: 'primary' });
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [activities, setActivities] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [inventoryData, setInventoryData] = useState([]);

    // FETCH LIVE ACTIVITY & DASHBOARD STATS
    useEffect(() => {
        const fetchTelemetry = async () => {
            try {
                const logRes = await axios.get(`${BASE_URL}/api/system-logs`);
                setActivities(logRes.data);

                const statRes = await axios.get(`${BASE_URL}/api/dashboard-stats`);
                setDashboardStats(statRes.data);

                const invRes = await axios.get(`${BASE_URL}/api/inventory`); 
                setInventoryData(invRes.data);

            } catch (err) {
                console.error("Telemetry link lost:", err);
            }
        };

        fetchTelemetry();
        const interval = setInterval(fetchTelemetry, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setShowMobileMenu(false);
    }, [activePage]);

    const triggerToast = (message, type = 'success') => {
        const bg = type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info';
        setToastConfig({ message, bg }); 
        setShowToast(true);
    };

    const menuItems = [
        { id: 'dashboard', label: 'Mainframe', icon: 'fa-microchip', roles: ['admin', 'sales', 'technical'] },
        { id: 'pos', label: 'Point of Sale', icon: 'fa-cash-register', roles: ['admin', 'sales'] },
        { id: 'stocks', label: 'Inventory', icon: 'fa-laptop-code', roles: ['admin', 'technical', 'sales'] },
        { id: 'customers', label: 'Clients', icon: 'fa-users-gear', roles: ['admin', 'sales'] },
        { id: 'services', label: 'Repair Lab', icon: 'fa-screwdriver-wrench', roles: ['admin', 'technical'] },
        { id: 'call logs', label: 'Call Logs', icon: 'fa-headset', roles: ['admin', 'technical', 'sales'] },
        { id: 'po receives', label: 'PO Receives', icon: 'fa-file-import', roles: ['admin', 'technical', 'sales'] },
    ];

    const SidebarContent = () => (
        <div className="d-flex flex-column h-100 py-4 px-3">
            <div className="mb-5 px-3">
                <h3 className="fw-900 tracking-tighter text-white mb-0 fst-italic">DPS<span className="jade-accent fst-normal">system</span></h3>
                <div className="d-flex align-items-center mt-4 p-2 rounded-4 sidebar-user-box border border-white border-opacity-10">
                    <img src={`https://ui-avatars.com/api/?name=${username || userRole}&background=00ff88&color=000&bold=true`} className="rounded-circle me-2 profile-img" alt="User" />
                    <div className="overflow-hidden">
                        <div className="fw-900 text-white small text-truncate">{username || 'OPERATOR'}</div>
                        <span className="jade-accent tiny-text">{userRole.toUpperCase()}</span>
                    </div>
                </div>
            </div>
            <nav className="flex-grow-1">
                <ul className="nav flex-column gap-2">
                    {menuItems.map(item => item.roles.includes(userRole) && (
                        <li className="nav-item" key={item.id}>
                            <button onClick={() => setActivePage(item.id)} className={`nav-link w-100 text-start border-0 sidebar-btn ${activePage === item.id ? 'active' : ''}`}>
                                <i className={`fa-solid ${item.icon} me-3 fs-6`}></i>
                                <span className="small fw-bold">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="mt-auto pt-4 border-top border-secondary border-opacity-10">
                <button onClick={onLogout} className="btn terminate-btn w-100 py-3 fw-bold tiny-text">
                    <i className="fa-solid fa-power-off me-2"></i> TERMINATE SESSION
                </button>
            </div>
        </div>
    );

    return (
        <div className="obsidian-wrapper">
            <aside className="sidebar-desktop d-none d-lg-block">
                <SidebarContent />
            </aside>

            <header className="mobile-header d-lg-none px-4 py-3 d-flex justify-content-between align-items-center bg-dark border-bottom border-secondary border-opacity-10">
                <h4 className="fw-900 text-white mb-0 fst-italic">DPS<span className="jade-accent fst-normal">system</span></h4>
                <button className="btn text-white p-0 fs-3" onClick={() => setShowMobileMenu(true)}>
                    <i className="fa-solid fa-bars-staggered"></i>
                </button>
            </header>

            <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} className="obsidian-drawer text-white bg-dark">
                <SidebarContent />
            </Offcanvas>

            <main className="main-content container-fluid">
                <section className="page-container mt-0 p-2 p-md-3 animate-fade-in">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h2 className="fw-900 text-white text-uppercase tracking-widest m-0 h4">
                            {activePage === 'po receives' ? 'PO Receives' : activePage.replace('call logs', 'Call Logs')}
                        </h2>
                        <div className="status-badge px-3 py-1 rounded-pill d-none d-md-block border border-white border-opacity-10">
                            <span className="jade-accent tiny-text">Simple System For a Simple Company</span>
                        </div>
                    </div>
                    <div className="content-body">
                        {activePage === 'dashboard' && (
                            <DashboardHome
                                activities={activities}
                                userRole={userRole}
                                setActivePage={setActivePage}
                                dashboardStats={dashboardStats}
                                username={username} 
                                inventoryData={inventoryData}
                            />
                        )}
                        {activePage === 'stocks' && <StockManagement triggerToast={triggerToast} userRole={userRole} />}
                        {activePage === 'customers' && <CustomerManagement triggerToast={triggerToast} userRole={userRole} />}
                        {activePage === 'call logs' && <CallLogs triggerToast={triggerToast} userRole={userRole} />}
                        {activePage === 'pos' && <PointOfSale triggerToast={triggerToast} userRole={userRole} />}
                        {activePage === 'services' && <ServiceCenter triggerToast={triggerToast} userRole={userRole} />}
                        {activePage === 'po receives' && <POReceives triggerToast={triggerToast} userRole={userRole} />} 
                    </div>
                </section>
            </main>

            <ToastContainer position="bottom-center" className="p-4 mb-3">
                <Toast show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide className="obsidian-toast border-0">
                    <div className="p-3 d-flex align-items-center rounded-4 shadow-lg bg-dark border border-white border-opacity-10">
                        <div className={`status-dot bg-${toastConfig.bg} me-3`}></div>
                        <span className="fw-bold text-white small">{toastConfig.message}</span>
                    </div>
                </Toast>
            </ToastContainer>

            <style>{`
                :root { --base-bg: #050505; --sidebar-bg: #080808; --jade: #00ff88; --dark-shadow: rgba(0, 0, 0, 0.9); --light-shadow: rgba(255, 255, 255, 0.02); }
                .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .obsidian-wrapper { background-color: var(--base-bg); min-height: 100vh; display: flex; flex-direction: column; color: #e0e0e0; font-family: 'Inter', sans-serif; }
                @media (min-width: 992px) { .obsidian-wrapper { flex-direction: row; } }
                .sidebar-desktop { width: 280px; background: var(--sidebar-bg); border-right: 1px solid rgba(255,255,255,0.03); position: sticky; top: 0; height: 100vh; }
                .sidebar-user-box { background: var(--sidebar-bg); box-shadow: inset 4px 4px 10px #000, inset -2px -2px 8px var(--light-shadow); transition: all 0.2s ease; }
                .sidebar-btn { background: transparent; color: #666 !important; border-radius: 12px; transition: all 0.2s ease; border: 1px solid transparent; padding: 12px 15px; }
                .sidebar-btn:hover { color: #fff !important; background: rgba(255,255,255,0.03); }
                .sidebar-btn.active { color: var(--jade) !important; background: rgba(0, 255, 136, 0.03); border: 1px solid rgba(0, 255, 136, 0.1); }
                .jade-accent { color: var(--jade); text-shadow: 0 0 10px rgba(0, 255, 136, 0.3); }
                .tiny-text { font-size: 0.65rem; font-weight: 800; letter-spacing: 1.5px; }
                .profile-img { width: 34px; height: 34px; border: 2px solid var(--jade); padding: 2px; }
                .status-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
                .terminate-btn { background: var(--sidebar-bg); color: #ff4d4d; border-radius: 14px; border: 1px solid rgba(255, 77, 77, 0.1); }
                .main-content { flex-grow: 1; height: 100vh; overflow-y: auto; background: var(--base-bg); }
                .page-container { background: var(--base-bg); box-shadow: 20px 20px 60px #000; border-radius: 30px; min-height: 90vh; border: 1px solid rgba(255,255,255,0.02); }
            `}</style>
        </div>
    );
};

export default JadeSystem;
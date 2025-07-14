import React, { useState, useEffect, useMemo } from 'react';

// Firebase Imports
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail, // --- [FITUR BARU] Impor fungsi reset password ---
} from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, ADMIN_UID, JOBS_COLLECTION, SETTINGS_COLLECTION, USERS_COLLECTION } from './config/firebase';

// Constants and Initial States
import { initialSettingsState } from './utils/constants';

// Helper Functions
import { exportToCsv, toYyyyMmDd } from './utils/helpers';

// --- Component Imports ---
// Dashboards
import MainDashboard from './components/dashboard/MainDashboard';
import JobControlDashboard from './components/dashboard/JobControlDashboard';
import FinanceDashboard from './components/dashboard/FinanceDashboard';
import GrossProfitDashboard from './components/dashboard/GrossProfitDashboard';
import CRCDashboard from './components/crc/CRCDashboard';
import CRCKPIDashboard from './components/crc/CRCKPIDashboard';
import ProductionKPIDashboard from './components/dashboard/ProductionKPIDashboard';
import SAKPIDashboard from './components/dashboard/SAKPIDashboard';
import FinanceKPIDashboard from './components/dashboard/FinanceKPIDashboard';
import PartmanDashboard from './components/part/PartmanDashboard';
import AssPartmanDashboard from './components/part/AssPartmanDashboard';
import InventoryDashboard from './components/inventory/InventoryDashboard';
// --- [IMPLEMENTASI FITUR] Impor dashboard baru ---
import PhotoControlDashboard from './components/dashboard/PhotoControlDashboard';


// Modals
import AddJobModal from './components/modals/AddJobModal';
import EditDataModal from './components/modals/EditDataModal';
import EditJobModal from './components/modals/EditJobModal';
import EstimateModal from './components/modals/EstimateModal';
import CostModal from './components/modals/CostModal';
import LogMechanicModal from './components/modals/LogMechanicModal';
import WhatsAppModal from './components/modals/WhatsAppModal';
import ProfileModal from './components/modals/ProfileModal';
import ConfirmDeleteModal from './components/modals/ConfirmDeleteModal';
import SurveyModal from './components/modals/SurveyModal';
import PartOrderDetailModal from './components/modals/PartOrderDetailModal';
import AssignMaterialsModal from './components/modals/AssignMaterialsModal';
import AddEditSupplierModal from './components/modals/inventory/AddEditSupplierModal';
import AddEditSparepartModal from './components/modals/inventory/AddEditSparepartModal';
import AddEditBahanModal from './components/modals/inventory/AddEditBahanModal';
import StockInModal from './components/modals/inventory/StockInModal';
// --- [IMPLEMENTASI FITUR] Impor modal baru ---
import PhotoUploadModal from './components/modals/PhotoUploadModal';


// Settings Page
import SettingsPage from './components/settings/SettingsPage';


const App = () => {
    // --- STATE MANAGEMENT ---
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState({});
    const [userPermissions, setUserPermissions] = useState({ role: 'sa', hasFinanceAccess: false });
    const [isLoading, setIsLoading] = useState(true);
    const [authPage, setAuthPage] = useState('login');
    const [authError, setAuthError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [allData, setAllData] = useState([]);
    const [currentView, setCurrentView] = useState('main');
    const [modal, setModal] = useState({ isOpen: false, type: null, data: null });
    const [settings, setSettings] = useState(initialSettingsState);
    const [allUsers, setAllUsers] = useState([]);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterWorkStatus, setFilterWorkStatus] = useState('');
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [showClosedJobs, setShowClosedJobs] = useState(false);

    const filteredJobs = useMemo(() => {
        let jobs = [...allData];

        if (!showClosedJobs) {
            jobs = jobs.filter(job => !job.isClosed);
        }

        if (searchQuery) { jobs = jobs.filter(job => job.policeNumber && job.policeNumber.toLowerCase().includes(searchQuery.toLowerCase())); }
        if (filterStatus) { jobs = jobs.filter(job => job.statusKendaraan === filterStatus); }
        if (filterWorkStatus) { jobs = jobs.filter(job => job.statusPekerjaan === filterWorkStatus); }

        jobs.sort((a, b) => {
            if (a.isClosed && !b.isClosed) return 1;
            if (!a.isClosed && b.isClosed) return -1;
            return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        });

        return jobs;
    }, [allData, searchQuery, filterStatus, filterWorkStatus, showClosedJobs]);


    // --- AUTHENTICATION & DATA FETCHING ---
    useEffect(() => {
        const loadScripts = () => {
            if (!document.getElementById("jspdf-script")) {
                const script1 = document.createElement("script"); script1.id = "jspdf-script"; script1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; script1.async = true;
                document.body.appendChild(script1);
                script1.onload = () => {
                     if (!document.getElementById("jspdf-autotable-script")) {
                         const script2 = document.createElement("script"); script2.id = "jspdf-autotable-script"; script2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js"; script2.async = true;
                         document.body.appendChild(script2);
                     }
                };
            }
        };
        loadScripts();

        const checkAndCreateUserDocument = async (user) => { const userDocRef = doc(db, USERS_COLLECTION, user.uid); const userDoc = await getDoc(userDocRef); if (!userDoc.exists()) { await setDoc(userDocRef, { email: user.email, createdAt: serverTimestamp(), displayName: user.email.split('@')[0], jobdesk: 'Service Advisor' }); } };

        let unsubData = () => {}; 
        let unsubSettings = () => {}; 
        let unsubUsers = () => {}; 
        let unsubUserData = () => {};

        const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
            unsubData(); unsubSettings(); unsubUsers(); unsubUserData();

            setIsLoading(true);
            setUser(currentUser);

            if (currentUser) {
                try {
                    await checkAndCreateUserDocument(currentUser);

                    const settingsDoc = await getDoc(doc(db, SETTINGS_COLLECTION, 'config'));
                    const settingsData = settingsDoc.exists() ? settingsDoc.data() : {};
                    const roles = settingsData.userRoles || {};

                    const userProfileDoc = await getDoc(doc(db, USERS_COLLECTION, currentUser.uid));
                    const userProfile = userProfileDoc.exists() ? userProfileDoc.data() : {};
                    const defaultRole = userProfile.jobdesk || 'Service Advisor';
                    const userRoleData = roles[currentUser.uid] || { role: defaultRole, financeAccess: false };

                    const isManager = currentUser.uid === ADMIN_UID || userRoleData.role === 'Manager';
                    const finalUserRole = isManager ? 'Manager' : userRoleData.role;
                    const finalHasFinanceAccess = isManager || userRoleData.financeAccess || false;

                    setUserPermissions({ role: finalUserRole, hasFinanceAccess: finalHasFinanceAccess });

                    unsubSettings = onSnapshot(doc(db, SETTINGS_COLLECTION, 'config'), (doc) => setSettings(prev => ({ ...initialSettingsState, ...prev, ...doc.data() })));
                    unsubUserData = onSnapshot(doc(db, USERS_COLLECTION, currentUser.uid), (doc) => { if (doc.exists()) setUserData(doc.data()) });
                    unsubData = onSnapshot(collection(db, JOBS_COLLECTION), (snapshot) => setAllData(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
                    unsubUsers = onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => setAllUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid !== ADMIN_UID)));

                } catch (error) { 
                    showNotification("Terjadi galat saat memuat data.", "error"); 
                } finally {
                    setIsLoading(false);
                }
            } else {
                setUserPermissions({ role: 'sa', hasFinanceAccess: false });
                setAllData([]); setSettings(initialSettingsState); setUserData({}); setAllUsers([]);
                setIsLoading(false);
            }
        });
        return () => { unsubAuth(); unsubData(); unsubSettings(); unsubUsers(); unsubUserData(); };
    }, []);

    // --- HANDLERS ---
    const showNotification = (message, type = 'success', duration = 3000) => { setNotification({ show: true, message, type }); setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), duration); };
    const openModal = (type, data = null) => { setModal({ isOpen: true, type, data }); setDropdownOpen(false); };
    const closeModal = () => setModal({ isOpen: false, type: null, data: null });
    const handleLogin = async (e) => { e.preventDefault(); setAuthError(''); try { await signInWithEmailAndPassword(auth, email, password); } catch (error) { setAuthError('Email atau password salah.'); } };
    const handleLogout = async () => { await signOut(auth); };
    const handleRegister = async (e) => { e.preventDefault(); setAuthError(''); try { await createUserWithEmailAndPassword(auth, email, password); } catch (error) { setAuthError(error.message); } };

    // --- [FITUR BARU] Fungsi untuk menangani Lupa Password ---
    const handleForgotPassword = async () => {
        if (!email) {
            setAuthError("Harap masukkan email Anda di kolom email terlebih dahulu.");
            return;
        }
        setAuthError('');
        try {
            await sendPasswordResetEmail(auth, email);
            showNotification("Link reset password berhasil dikirim. Silakan periksa inbox email Anda.", "success", 6000);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                setAuthError("Email tidak terdaftar dalam sistem.");
            } else {
                setAuthError("Gagal mengirim email reset. Silakan coba lagi.");
            }
            console.error("Password Reset Error:", error);
        }
    };

    const handleExportGeneralData = () => {
        const dataToExport = filteredJobs.map(job => ({
            'Tanggal Masuk': toYyyyMmDd(job.tanggalMasuk), 'No Polisi': job.policeNumber || '','Nama Pelanggan': job.customerName || '','Nama Asuransi': job.namaAsuransi || '','No. HP/WA': `="${job.customerPhone || ''}"`, 'Model Mobil': job.carModel || '','Warna Mobil': job.warnaMobil || '','Status Kendaraan': job.statusKendaraan || '','Status Pekerjaan': job.statusPekerjaan || '','Status Part': job.statusOrderPart || '','Tgl Mulai Perbaikan': toYyyyMmDd(job.tanggalMulaiPerbaikan), 'Tgl Estimasi Selesai': toYyyyMmDd(job.tanggalEstimasiSelesai),
        }));
        exportToCsv('Laporan_Data_Unit.csv', dataToExport);
    };

    // --- RENDER LOGIC ---
    if (isLoading) return <div className="text-center p-8">Memuat...</div>;
    if (!user) { return <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4"><div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8"><div className="text-center mb-4"><h1 className="text-3xl font-bold text-gray-900">Mazda Ranger - BP System</h1><p className="text-sm text-gray-500">by Hendrik Wiradi Praja</p></div><h2 className="text-2xl font-bold text-center text-indigo-600 mb-6">{authPage === 'login' ? 'Login' : 'Register'}</h2><form onSubmit={authPage === 'login' ? handleLogin : handleRegister}><div className="mb-4"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label><input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 border rounded-lg w-full" required /></div><div className="mb-6"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label><input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 border rounded-lg w-full" required /></div>{authError && <p className="text-red-500 text-xs italic mb-4">{authError}</p>}<button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700">{authPage === 'login' ? 'Login' : 'Register'}</button></form><p className="text-center text-sm text-gray-600 mt-6">{authPage === 'login' ? "Belum punya akun?" : "Sudah punya akun?"}<button onClick={() => { setAuthPage(authPage === 'login' ? 'register' : 'login'); setAuthError(''); }} className="font-bold text-indigo-600 hover:text-indigo-800 ml-2">{authPage === 'login' ? 'Register di sini' : 'Login di sini'}</button></p></div></div>; }
    if (!user) {
        // --- [MODIFIKASI] Tampilan halaman login disesuaikan untuk menambahkan tombol Lupa Password ---
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
                <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
                    <div className="text-center mb-4">
                        <h1 className="text-3xl font-bold text-gray-900">Mazda Ranger - BP System</h1>
                        <p className="text-sm text-gray-500">by Hendrik Wiradi Praja</p>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-indigo-600 mb-6">{authPage === 'login' ? 'Login' : 'Register'}</h2>
                    <form onSubmit={authPage === 'login' ? handleLogin : handleRegister}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 border rounded-lg w-full" required />
                        </div>
                        <div className="mb-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
                            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 border rounded-lg w-full" required />
                        </div>
                        {/* --- [FITUR BARU] Tombol Lupa Password --- */}
                        {authPage === 'login' && (
                             <div className="text-right mb-4">
                                <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                    Lupa Password?
                                </button>
                            </div>
                        )}
                        {authError && <p className="text-red-500 text-xs italic mb-4">{authError}</p>}
                        <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700">
                            {authPage === 'login' ? 'Login' : 'Register'}
                        </button>
                    </form>
                    <p className="text-center text-sm text-gray-600 mt-6">
                        {authPage === 'login' ? "Belum punya akun?" : "Sudah punya akun?"}
                        <button onClick={() => { setAuthPage(authPage === 'login' ? 'register' : 'login'); setAuthError(''); }} className="font-bold text-indigo-600 hover:text-indigo-800 ml-2">
                            {authPage === 'login' ? 'Register di sini' : 'Login di sini'}
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    const AccessDenied = () => (<div className="text-center p-10 bg-white rounded-lg shadow"><h2 className="text-2xl font-bold text-red-600">Akses Ditolak</h2><p className="text-gray-600 mt-2">Anda tidak memiliki izin untuk mengakses halaman ini.</p></div>);

    const renderContent = () => {
        const { role } = userPermissions;
        const allowedPartRoles = ['Partman', 'Ass. Partman', 'Manager'];
        const allowedForemanRoles = ['Foreman', 'Manager', 'Admin Bengkel'];

        switch (currentView) {
            case 'main':
                if (role === 'Partman') return <PartmanDashboard allJobs={allData} openModal={openModal} showNotification={showNotification} />;
                if (role === 'Ass. Partman') return <AssPartmanDashboard allJobs={allData} showNotification={showNotification} openModal={openModal} />;
                if (role === 'Service Advisor') return <SAKPIDashboard allJobs={allData} userData={userData} settings={settings} showNotification={showNotification} userPermissions={userPermissions} />;
                return <MainDashboard allData={filteredJobs} openModal={openModal} userPermissions={userPermissions} showNotification={showNotification} />;

            case 'partman_dashboard': return allowedPartRoles.includes(role) ? <PartmanDashboard allJobs={allData} openModal={openModal} showNotification={showNotification} /> : <AccessDenied />;
            case 'ass_partman_dashboard': return allowedPartRoles.includes(role) ? <AssPartmanDashboard allJobs={allData} showNotification={showNotification} openModal={openModal} /> : <AccessDenied />;
            case 'inventory_dashboard': return allowedPartRoles.includes(role) ? <InventoryDashboard openModal={openModal} showNotification={showNotification} settings={settings} /> : <AccessDenied />;

            case 'job_control': return <JobControlDashboard allJobs={allData} onBack={() => setCurrentView('main')} showNotification={showNotification} openModal={openModal} settings={settings} user={user} userPermissions={userPermissions} />;
            // --- [IMPLEMENTASI FITUR] Render dashboard baru ---
            case 'photo_control': return allowedForemanRoles.includes(role) ? <PhotoControlDashboard allJobs={allData} onBack={() => setCurrentView('main')} showNotification={showNotification} openModal={openModal} userPermissions={userPermissions} /> : <AccessDenied />;

            case 'finance_kpi_dashboard': return userPermissions.hasFinanceAccess ? <FinanceKPIDashboard allJobs={allData} onBack={() => setCurrentView('main')} openModal={openModal} /> : <AccessDenied />;
            case 'sa_kpi_dashboard': return <SAKPIDashboard allJobs={allData} userData={userData} settings={settings} showNotification={showNotification} openModal={openModal} userPermissions={userPermissions} />;
            case 'crc_dashboard': return <CRCDashboard allJobs={allData} onBack={() => setCurrentView('main')} showNotification={showNotification} openModal={openModal} settings={settings} user={user} />;
            case 'crc_kpi_dashboard': return <CRCKPIDashboard allJobs={allData} onBack={() => setCurrentView('main')} showNotification={showNotification} />;
            case 'production_kpi_dashboard': return <ProductionKPIDashboard allJobs={allData} onBack={() => setCurrentView('main')} settings={settings} showNotification={showNotification} />;
            case 'finance': return userPermissions.hasFinanceAccess ? <FinanceDashboard allJobs={allData} onBack={() => setCurrentView('main')} openModal={openModal} userPermissions={userPermissions} showNotification={showNotification}/> : <AccessDenied />;
            case 'gross_profit': return <GrossProfitDashboard allJobs={allData} settings={settings} onBack={() => setCurrentView('main')} />;
            case 'entry_data': return <MainDashboard allData={filteredJobs} openModal={openModal} userPermissions={userPermissions} showNotification={showNotification} />;
            default: return <MainDashboard allData={filteredJobs} openModal={openModal} userPermissions={userPermissions} showNotification={showNotification} />;
        }
    };
    const notificationStyles = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };

    const renderModal = () => {
        if (!modal.isOpen) return null;
        const props = { ...modal.data, closeModal, showNotification, user, userData, settings, userPermissions, openModal, allUsers, onBack: closeModal };
        switch (modal.type) {
            case 'add_job': return <AddJobModal {...props} />;
            case 'edit_data': return <EditDataModal {...props} />;
            case 'edit_job': return <EditJobModal {...props} />;
            case 'estimate': return <EstimateModal {...props} />;
            case 'settings': return <SettingsPage {...props} />;
            case 'profile': return <ProfileModal {...props} />;
            case 'finance_cost': return <CostModal {...props} />;
            case 'confirm_delete': return <ConfirmDeleteModal {...props} />;
            case 'log_mechanic': return <LogMechanicModal {...props} />;
            case 'whatsapp_followup': return <WhatsAppModal {...props} />;
            case 'survey': return <SurveyModal {...props} />;
            case 'part_order_detail': return <PartOrderDetailModal {...props} />;
            case 'assign_materials': return <AssignMaterialsModal {...props} allBahan={modal.data.allBahan} jobData={modal.data.jobData} />;
            case 'add_edit_supplier': return <AddEditSupplierModal {...props} />;
            case 'add_edit_sparepart': return <AddEditSparepartModal {...props} />;
            case 'add_edit_bahan': return <AddEditBahanModal {...props} />;
            case 'stock_in_bahan': return <StockInModal {...props} />;
            // --- [IMPLEMENTASI FITUR] Render modal baru ---
            case 'photo_upload': return <PhotoUploadModal {...props} />;
            default: return null;
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            {notification.show && <div className={`fixed top-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg z-[100] ${notificationStyles[notification.type]}`}>{notification.message}</div>}
            <header className="bg-white shadow-md sticky top-0 z-20">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 cursor-pointer" onClick={() => setCurrentView('main')}>Mazda Ranger - BP System</h1>
                        <p className="text-xs text-gray-500">by Hendrik Wiradi Praja</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                            {/* Menu Service Advisor */}
                            {userPermissions.role === 'Service Advisor' && (
                                <>
                                    <button onClick={()=> setCurrentView('entry_data')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">Entry Data</button>
                                    <button onClick={()=> setCurrentView('sa_kpi_dashboard')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">Dashboard KPI</button>
                                </>
                            )}

                             {/* Menu Part & Gudang */}
                            {(userPermissions.role === 'Partman' || userPermissions.role === 'Ass. Partman') && (
                                <div className="border-l-2 border-gray-200 pl-3 flex flex-wrap gap-x-4 gap-y-2">
                                    <button onClick={()=> setCurrentView('partman_dashboard')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">Dashboard Part</button>
                                    <button onClick={()=> setCurrentView('ass_partman_dashboard')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">Dashboard Bahan</button>
                                    <button onClick={()=> setCurrentView('inventory_dashboard')} className="text-sm font-semibold text-teal-600 hover:text-teal-800">Manajemen Inventaris</button>
                                </div>
                            )}

                            {/* Menu Operasional & Manajerial */}
                            {['Manager', 'Admin Bengkel', 'Foreman', 'CRC'].includes(userPermissions.role) && (
                                 <>
                                    <button onClick={()=> setCurrentView('main')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">Data Entry</button>
                                    <div className="border-l-2 border-gray-200 pl-3 flex flex-wrap gap-x-4 gap-y-2">
                                        <button onClick={()=> setCurrentView('job_control')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">Job Control</button>
                                        {/* --- [IMPLEMENTASI FITUR] Tambahkan tombol menu kontrol foto --- */}
                                        <button onClick={()=> setCurrentView('photo_control')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">Kontrol Foto</button>
                                    </div>
                                    <div className="border-l-2 border-gray-200 pl-3 flex flex-wrap gap-x-4 gap-y-2">
                                        <button onClick={()=> setCurrentView('crc_dashboard')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">CRC Follow Up</button>
                                        <button onClick={()=> setCurrentView('production_kpi_dashboard')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">KPI Produksi</button>
                                        <button onClick={()=> setCurrentView('sa_kpi_dashboard')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">KPI SA</button>
                                        <button onClick={()=> setCurrentView('crc_kpi_dashboard')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">KPI CRC</button>
                                    </div>
                                    <div className="border-l-2 border-gray-200 pl-3 flex flex-wrap gap-x-4 gap-y-2">
                                        <button onClick={()=> setCurrentView('gross_profit')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600">Pantau Gross Profit</button>
                                        <button onClick={()=> setCurrentView('finance')} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Finance</button>
                                        <button onClick={()=> setCurrentView('finance_kpi_dashboard')} className="text-sm font-semibold text-blue-600 hover:text-blue-800">KPI Finance</button>
                                    </div>
                                 </>
                            )}

                            {/* Menu Akses Khusus Manager */}
                            {userPermissions.role === 'Manager' && (
                                <div className="border-l-2 border-gray-200 pl-3 flex flex-wrap gap-x-4 gap-y-2">
                                    <button onClick={()=> setCurrentView('partman_dashboard')} className="text-sm font-semibold text-teal-600 hover:text-teal-800">Dashboard Part</button>
                                    <button onClick={()=> setCurrentView('ass_partman_dashboard')} className="text-sm font-semibold text-teal-600 hover:text-teal-800">Dashboard Bahan</button>
                                    <button onClick={()=> setCurrentView('inventory_dashboard')} className="text-sm font-semibold text-teal-600 hover:text-teal-800">Manajemen Inventaris</button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="relative">
                        <div onClick={() => setDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 cursor-pointer">
                            <div className="text-right">
                                <p className='font-semibold text-gray-800'>{userData.displayName || user.email}</p>
                                <p className='text-sm text-gray-500'>{userPermissions.role}</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                                <button onClick={() => openModal('profile')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Edit Profil</button>
                                {userPermissions.role === 'Manager' && (<button onClick={() => openModal('settings')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Pengaturan Bengkel</button>)}
                                <button onClick={handleLogout} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-6">
                {(currentView === 'main' || currentView === 'entry_data') && ['Manager', 'Admin Bengkel', 'Foreman', 'CRC', 'Service Advisor'].includes(userPermissions.role) ? (
                    <div className='flex justify-between items-start mb-6 gap-4'>
                        <div className="flex-grow">
                            <div className="flex flex-wrap gap-4">
                                <input type="text" placeholder="Cari No. Polisi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="p-2 border rounded-lg"/>
                                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-2 border rounded-lg bg-white"><option value="">Semua Status Kendaraan</option>{(settings.statusKendaraanOptions || []).map(opt => <option key={opt}>{opt}</option>)}</select>
                                <select value={filterWorkStatus} onChange={e => setFilterWorkStatus(e.target.value)} className="p-2 border rounded-lg bg-white"><option value="">Semua Status Pekerjaan</option>{(settings.statusPekerjaanOptions || []).map(opt => <option key={opt}>{opt}</option>)}</select>
                            </div>
                             <div className="mt-4">
                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                    <input type="checkbox" checked={showClosedJobs} onChange={(e) => setShowClosedJobs(e.target.checked)} className="h-4 w-4 rounded" />
                                    Tampilkan Data yang Sudah di-Close WO
                                </label>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={handleExportGeneralData} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">Export CSV</button>
                            <button onClick={() => openModal('add_job')} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg">+ Tambah Data</button>
                        </div>
                    </div>
                ) : null}
                {renderContent()}
            </main>
            {modal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-6xl my-8">
                        {renderModal()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

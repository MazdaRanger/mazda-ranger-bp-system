import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { db, SETTINGS_COLLECTION, JOBS_COLLECTION } from '../../config/firebase';
import { jobdeskOptions } from '../../utils/constants';

const SettingsPage = ({ settings, userPermissions, allUsers, showNotification, onBack, openModal }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState('umum');
    const [isCleaning, setIsCleaning] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    const EditableListManager = ({ title, items, setItems, placeholder }) => {
        const [newItem, setNewItem] = useState('');
        const [editingIndex, setEditingIndex] = useState(null);
        const [editingValue, setEditingValue] = useState('');

        const handleAddItem = () => {
            if (newItem && !items.includes(newItem.trim())) {
                setItems([...items, newItem.trim()].sort());
                setNewItem('');
                showNotification(`${title} berhasil ditambahkan.`, "success");
            } else {
                showNotification(`Nama tidak boleh kosong atau sudah ada.`, "error");
            }
        };

        const handleDeleteItem = (index) => {
            const updatedItems = items.filter((_, i) => i !== index);
            setItems(updatedItems);
            showNotification(`${title} berhasil dihapus.`, "success");
        };

        const handleUpdateItem = (index) => {
            if (!editingValue.trim()) {
                showNotification("Nama tidak boleh kosong.", "error");
                return;
            }
            const updatedItems = [...items];
            updatedItems[index] = editingValue.trim();
            setItems(updatedItems.sort());
            setEditingIndex(null);
            setEditingValue('');
            showNotification(`${title} berhasil diperbarui.`, "success");
        };

        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
                <div className="flex gap-2 mb-4">
                    <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddItem()} placeholder={`Ketik ${placeholder} baru...`} className="p-2 border w-full rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={handleAddItem} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex-shrink-0">Tambah</button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                    {(items || []).map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded-lg bg-gray-50">
                            {editingIndex === index ? (
                                <input type="text" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleUpdateItem(index)} className="p-1 border rounded w-full" autoFocus />
                            ) : ( <span className="font-medium text-gray-800">{item}</span> )}
                            <div className="flex gap-3 items-center">
                                {editingIndex === index ? (
                                    <>
                                        <button onClick={() => handleUpdateItem(index)} className="text-sm font-semibold text-green-600 hover:text-green-800">Simpan</button>
                                        <button onClick={() => setEditingIndex(null)} className="text-sm text-gray-500 hover:text-gray-700">Batal</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { setEditingIndex(index); setEditingValue(item); }} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Edit</button>
                                        <button onClick={() => handleDeleteItem(index)} className="text-sm font-semibold text-red-600 hover:text-red-800">Hapus</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {(!items || items.length === 0) && (<p className="text-center text-gray-400 p-4">Belum ada data.</p>)}
                </div>
            </div>
        );
    };
    
    const InsuranceManager = () => {
        const [newInsurance, setNewInsurance] = useState({ name: '', jasa: 0, part: 0 });
        const items = localSettings.insuranceOptions || [];
        
        const handleSetItems = (newItems) => {
             setLocalSettings(prev => ({ ...prev, insuranceOptions: newItems }));
        }

        const handleAddItem = () => {
            if (newInsurance.name && !items.find(i => i.name.toLowerCase() === newInsurance.name.trim().toLowerCase())) {
                const updatedItems = [...items, { ...newInsurance, name: newInsurance.name.trim() }];
                updatedItems.sort((a, b) => a.name.localeCompare(b.name));
                handleSetItems(updatedItems);
                setNewInsurance({ name: '', jasa: 0, part: 0 });
                showNotification(`Asuransi berhasil ditambahkan.`, "success");
            } else {
                showNotification(`Nama asuransi tidak boleh kosong atau sudah ada.`, "error");
            }
        };
        
        const handleDeleteItem = (nameToDelete) => {
            const updatedItems = items.filter(i => i.name !== nameToDelete);
            handleSetItems(updatedItems);
            showNotification(`Asuransi berhasil dihapus.`, "success");
        }

        const handleItemChange = (index, field, value) => {
            const updatedItems = [...items];
            updatedItems[index] = { ...updatedItems[index], [field]: value };
            handleSetItems(updatedItems);
        };

        return (
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Manajemen Asuransi & Diskon</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4 p-3 border rounded-lg bg-gray-50">
                    <input type="text" value={newInsurance.name} onChange={(e) => setNewInsurance(p => ({...p, name: e.target.value}))} placeholder="Nama Asuransi Baru" className="p-2 border col-span-2 rounded-lg"/>
                    <input type="number" value={newInsurance.jasa} onChange={(e) => setNewInsurance(p => ({...p, jasa: parseFloat(e.target.value) || 0}))} placeholder="Diskon Jasa (%)" className="p-2 border rounded-lg"/>
                    <input type="number" value={newInsurance.part} onChange={(e) => setNewInsurance(p => ({...p, part: parseFloat(e.target.value) || 0}))} placeholder="Diskon Part (%)" className="p-2 border rounded-lg"/>
                    <button onClick={handleAddItem} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 col-span-full mt-2">Tambah Asuransi</button>
                </div>
                 <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {items.map((item, index) => (
                        <div key={item.name} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 border rounded-lg">
                            <span className="font-semibold col-span-4 md:col-span-1">{item.name}</span>
                            <div><label className="text-sm text-gray-600">Diskon Jasa (%)</label><input type="number" value={item.jasa} onChange={e => handleItemChange(index, 'jasa', parseFloat(e.target.value) || 0)} className="p-2 border w-full mt-1 rounded-lg" /></div>
                            <div><label className="text-sm text-gray-600">Diskon Part (%)</label><input type="number" value={item.part} onChange={e => handleItemChange(index, 'part', parseFloat(e.target.value) || 0)} className="p-2 border w-full mt-1 rounded-lg" /></div>
                            <div className="flex justify-end">
                                <button onClick={() => handleDeleteItem(item.name)} className="text-sm font-semibold text-red-600 hover:text-red-800">Hapus</button>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        );
    };

    const TemplateManager = () => {
        const [newTemplate, setNewTemplate] = useState({ title: '', message: '' });
        const items = localSettings.whatsappTemplates || [];

        const handleSetItems = (newItems) => {
            setLocalSettings(prev => ({ ...prev, whatsappTemplates: newItems }));
        };

        const handleAddItem = () => {
            if (newTemplate.title && newTemplate.message) {
                handleSetItems([...items, newTemplate]);
                setNewTemplate({ title: '', message: '' });
                showNotification("Template baru berhasil ditambahkan.", "success");
            } else {
                showNotification("Judul dan isi pesan tidak boleh kosong.", "error");
            }
        };

        const handleDeleteItem = (index) => {
            const updatedItems = items.filter((_, i) => i !== index);
            handleSetItems(updatedItems);
            showNotification("Template berhasil dihapus.", "success");
        };

        const handleItemChange = (index, field, value) => {
            const updatedItems = [...items];
            updatedItems[index] = { ...updatedItems[index], [field]: value };
            handleSetItems(updatedItems);
        };

        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Manajemen Template Pesan WhatsApp</h2>
                <div className="space-y-4">
                    {items.map((template, index) => (
                        <div key={index} className="border p-4 rounded-lg">
                            <input 
                                type="text" 
                                value={template.title}
                                onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                                placeholder="Judul Template"
                                className="p-2 border w-full rounded-lg font-semibold mb-2"
                            />
                            <textarea
                                value={template.message}
                                onChange={(e) => handleItemChange(index, 'message', e.target.value)}
                                rows="4"
                                placeholder="Isi pesan template..."
                                className="p-2 border w-full rounded-lg text-sm"
                            />
                            <div className="flex justify-end mt-2">
                                <button onClick={() => handleDeleteItem(index)} className="text-sm font-semibold text-red-600 hover:text-red-800">Hapus Template</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t mt-6 pt-6">
                     <h3 className="text-lg font-semibold mb-2">Tambah Template Baru</h3>
                     <div className="space-y-2">
                         <input 
                            type="text" 
                            value={newTemplate.title}
                            onChange={(e) => setNewTemplate(p => ({...p, title: e.target.value}))}
                            placeholder="Judul Template Baru"
                            className="p-2 border w-full rounded-lg"
                        />
                        <textarea
                            value={newTemplate.message}
                            onChange={(e) => setNewTemplate(p => ({...p, message: e.target.value}))}
                            rows="4"
                            placeholder="Isi pesan... Gunakan {nama_pelanggan}, {no_polisi}, dll."
                            className="p-2 border w-full rounded-lg text-sm"
                        />
                        <button onClick={handleAddItem} className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">Tambah Template</button>
                     </div>
                </div>
            </div>
        );
    };

    const SurveyQuestionManager = () => {
        const items = localSettings.surveyQuestions || [];
        const [newItem, setNewItem] = useState('');
        const [editingIndex, setEditingIndex] = useState(null);
        const [editingValue, setEditingValue] = useState('');

        const handleSetItems = (newItems) => {
            setLocalSettings(prev => ({ ...prev, surveyQuestions: newItems }));
        };

        const handleAddItem = () => {
            if (newItem && !items.find(q => q.toLowerCase() === newItem.trim().toLowerCase())) {
                handleSetItems([...items, newItem.trim()]);
                setNewItem('');
                showNotification(`Pertanyaan survey berhasil ditambahkan.`, "success");
            } else {
                showNotification(`Pertanyaan tidak boleh kosong atau sudah ada.`, "error");
            }
        };

        const handleDeleteItem = (index) => {
            const updatedItems = items.filter((_, i) => i !== index);
            handleSetItems(updatedItems);
            showNotification(`Pertanyaan survey berhasil dihapus.`, "success");
        };

        const handleUpdateItem = (index) => {
            if (!editingValue.trim()) {
                showNotification("Pertanyaan tidak boleh kosong.", "error");
                return;
            }
            const updatedItems = [...items];
            updatedItems[index] = editingValue.trim();
            handleSetItems(updatedItems);
            setEditingIndex(null);
            setEditingValue('');
            showNotification(`Pertanyaan survey berhasil diperbarui.`, "success");
        };
        
        const moveItem = (fromIndex, toIndex) => {
            const updatedItems = [...items];
            const [movedItem] = updatedItems.splice(fromIndex, 1);
            updatedItems.splice(toIndex, 0, movedItem);
            handleSetItems(updatedItems);
        };

        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Manajemen Pertanyaan Survey Kepuasan</h2>
                <p className="text-sm text-gray-500 mb-4">Atur daftar pertanyaan yang akan diajukan oleh CRC saat melakukan survey after-service. Urutan pertanyaan di sini akan sama dengan urutan di formulir survey.</p>
                <div className="flex gap-2 mb-4">
                    <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddItem()} placeholder="Ketik pertanyaan baru..." className="p-2 border w-full rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={handleAddItem} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex-shrink-0">Tambah</button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {(items || []).map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50 group">
                            {editingIndex === index ? (
                                <input type="text" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleUpdateItem(index)} className="p-1 border rounded w-full" autoFocus />
                            ) : ( 
                                <div className="flex items-center">
                                    <span className="text-gray-500 font-bold mr-3">{index + 1}.</span>
                                    <span className="font-medium text-gray-800">{item}</span> 
                                </div>
                            )}
                            <div className="flex gap-3 items-center">
                                {editingIndex === index ? (
                                    <>
                                        <button onClick={() => handleUpdateItem(index)} className="text-sm font-semibold text-green-600 hover:text-green-800">Simpan</button>
                                        <button onClick={() => setEditingIndex(null)} className="text-sm text-gray-500 hover:text-gray-700">Batal</button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center border-l pl-2 ml-2">
                                            <button onClick={() => moveItem(index, index - 1)} disabled={index === 0} className="p-1 disabled:opacity-20 disabled:cursor-not-allowed text-gray-500 hover:text-gray-800">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                                            </button>
                                            <button onClick={() => moveItem(index, index + 1)} disabled={index === items.length - 1} className="p-1 disabled:opacity-20 disabled:cursor-not-allowed text-gray-500 hover:text-gray-800">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                        <button onClick={() => { setEditingIndex(index); setEditingValue(item); }} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Edit</button>
                                        <button onClick={() => handleDeleteItem(index)} className="text-sm font-semibold text-red-600 hover:text-red-800">Hapus</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {(!items || items.length === 0) && (<p className="text-center text-gray-400 p-4">Belum ada pertanyaan survey.</p>)}
                </div>
            </div>
        );
    };


    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    if (userPermissions.role !== 'Manager') return <div className="text-center p-10"><h2 className="text-2xl font-bold text-red-600">Akses Ditolak</h2><p className="text-gray-600 mt-2">Hanya Manager yang dapat mengakses halaman ini.</p></div>;

    const handleSettingChange = (e) => {
        const { name, value } = e.target;
        setLocalSettings(p => ({...p, [name]: name === 'afterServiceFollowUpDays' ? parseInt(value, 10) : parseFloat(value) || 0}));
    };

    const handleUserPermissionChange = (uid, field, value) => {
        setLocalSettings(p => {
            const updatedRoles = { ...p.userRoles };
            if (!updatedRoles[uid]) {
                updatedRoles[uid] = { role: jobdeskOptions[0] || 'Service Advisor', financeAccess: false };
            }
            updatedRoles[uid][field] = value;
            return { ...p, userRoles: updatedRoles };
        });
    };

    const handleHolidaysChange = (e) => {
        const dates = e.target.value.split(',').map(d => d.trim()).filter(d => d);
        setLocalSettings(p => ({ ...p, nationalHolidays: dates }));
    };

    const handleSaveSettings = async () => {
        try {
            await setDoc(doc(db, SETTINGS_COLLECTION, 'config'), localSettings, { merge: true });
            showNotification("Pengaturan berhasil disimpan.", "success");
        } catch (error) {
            showNotification("Gagal menyimpan pengaturan.", "error");
            console.error("Error saving settings:", error);
        }
    };
    
    const handleCleanupOldJobs = async () => {
        openModal('confirm_delete', {
            title: "Konfirmasi Pembersihan Data",
            message: "Anda yakin ingin mengarsipkan semua histori pekerjaan dari unit yang sudah selesai lebih dari 1 tahun? Tindakan ini tidak dapat diurungkan.",
            onConfirm: async () => {
                setIsCleaning(true);
                showNotification("Memulai proses pembersihan data...", "info");

                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

                const jobsRef = collection(db, JOBS_COLLECTION);
                const q = query(jobsRef, where("isClosed", "==", true));

                try {
                    const querySnapshot = await getDocs(q);
                    const batch = writeBatch(db);
                    let cleanedCount = 0;

                    querySnapshot.forEach((docSnap) => {
                        const jobData = docSnap.data();
                        const closeDate = jobData.tanggalDiambil ? new Date(jobData.tanggalDiambil) : null;

                        if (closeDate && closeDate < oneYearAgo) {
                            batch.update(docSnap.ref, {
                                history: [],
                                logPekerjaan: [],
                                followUpHistory: [],
                                surveyData: {},
                                estimateData: {},
                                costData: {},
                                isArchived: true,
                                statusPekerjaan: 'Diarsipkan'
                            });
                            cleanedCount++;
                        }
                    });

                    if (cleanedCount > 0) {
                        await batch.commit();
                        showNotification(`${cleanedCount} data pekerjaan lama berhasil diarsipkan.`, "success");
                    } else {
                        showNotification("Tidak ada data lama yang perlu diarsipkan.", "info");
                    }
                } catch (error) {
                    showNotification("Gagal melakukan pembersihan data.", "error");
                    console.error("Error cleaning up old jobs:", error);
                } finally {
                    setIsCleaning(false);
                }
            }
        });
    };

    const handleFixPoliceNumbers = async () => {
        openModal('confirm_delete', {
            title: "Konfirmasi Perbaikan No. Polisi",
            message: "Anda akan memindai semua data pekerjaan dan menghapus spasi dari semua No. Polisi yang ada di database. Lanjutkan?",
            onConfirm: async () => {
                showNotification("Memulai perbaikan format No. Polisi...", "info");
                try {
                    const querySnapshot = await getDocs(collection(db, JOBS_COLLECTION));
                    const batch = writeBatch(db);
                    let updatedCount = 0;

                    querySnapshot.forEach((docSnap) => {
                        const jobData = docSnap.data();
                        if (jobData.policeNumber && jobData.policeNumber.includes(' ')) {
                            const correctedNumber = jobData.policeNumber.replace(/\s/g, '').toUpperCase();
                            batch.update(docSnap.ref, { policeNumber: correctedNumber });
                            updatedCount++;
                        }
                    });

                    if (updatedCount > 0) {
                        await batch.commit();
                        showNotification(`Perbaikan selesai. ${updatedCount} data No. Polisi diperbarui.`, "success");
                    } else {
                        showNotification("Tidak ada No. Polisi yang perlu diperbaiki.", "info");
                    }
                } catch (error) {
                    showNotification("Gagal memperbaiki data No. Polisi.", "error");
                    console.error("Error fixing police numbers:", error);
                }
            }
        });
    };
    
    // --- [PERBAIKAN BUG UTAMA] Fungsi migrasi yang disempurnakan ---
    const handleMigrateOldPartData = async () => {
        openModal('confirm_delete', {
            title: "Konfirmasi Migrasi Data Part",
            message: "Anda akan memindai semua data pekerjaan dan menyesuaikannya dengan alur kerja dashboard partman yang baru. Lakukan ini hanya satu kali. Lanjutkan?",
            onConfirm: async () => {
                setIsMigrating(true);
                showNotification("Memulai proses migrasi data part...", "info");
                const jobsRef = collection(db, JOBS_COLLECTION);
                const q = query(jobsRef); // Pindai semua dokumen

                try {
                    const querySnapshot = await getDocs(q);
                    const batch = writeBatch(db);
                    let migratedCount = 0;
                    
                    // Status lama yang perlu dimigrasikan
                    const statusesToMigrate = ["On Order", "Part Indent", "Ready Sebagian", "Ready"];

                    querySnapshot.forEach((docSnap) => {
                        const jobData = docSnap.data();
                        
                        // Hanya proses dokumen yang punya status lama dan BELUM punya status baru
                        if (statusesToMigrate.includes(jobData.statusOrderPart) && !jobData.partOrderStatus) {
                            let newPartStatus;
                            if (jobData.statusOrderPart === "Ready") {
                                newPartStatus = 'Part Telah Tiba';
                            } else {
                                newPartStatus = 'Part Sedang Dipesan';
                            }
                            
                            batch.update(docSnap.ref, {
                                partOrderStatus: newPartStatus
                            });
                            migratedCount++;
                        }
                    });
                    
                    if (migratedCount > 0) {
                        await batch.commit();
                        showNotification(`${migratedCount} data part lama berhasil dimigrasi ke alur kerja baru.`, "success");
                    } else {
                        showNotification("Tidak ada data part lama yang perlu dimigrasi.", "info");
                    }

                } catch (error) {
                    showNotification("Gagal melakukan migrasi data.", "error");
                    console.error("Error migrating old data:", error);
                } finally {
                    setIsMigrating(false);
                }
            }
        });
    };

    const TabButton = ({ tabName, label, icon }) => {
        const isActive = activeTab === tabName;
        return (
            <button
                onClick={() => setActiveTab(tabName)}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-3 ${
                    isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200'
                }`}
            >
                {icon}
                {label}
            </button>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'survey': return <SurveyQuestionManager />;
            case 'templates': return <TemplateManager />;
            case 'opsi':
                return (
                    <div className="space-y-8">
                        <InsuranceManager />
                        <EditableListManager title="Manajemen Status Kendaraan" items={localSettings.statusKendaraanOptions} setItems={(items) => setLocalSettings(p => ({...p, statusKendaraanOptions: items}))} placeholder="Status Kendaraan" />
                        <EditableListManager title="Manajemen Status Pengerjaan" items={localSettings.statusPekerjaanOptions} setItems={(items) => setLocalSettings(p => ({...p, statusPekerjaanOptions: items}))} placeholder="Status Pengerjaan" />
                    </div>
                );
            case 'pengguna':
                return (
                    <div className="space-y-8">
                        <EditableListManager title="Manajemen Service Advisor (SA)" items={localSettings.serviceAdvisors} setItems={(items) => setLocalSettings(p => ({...p, serviceAdvisors: items}))} placeholder="Nama SA" />
                        <EditableListManager title="Manajemen Mekanik" items={localSettings.mechanicNames} setItems={(items) => setLocalSettings(p => ({...p, mechanicNames: items}))} placeholder="Nama Mekanik" />
                        
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Manajemen Peran & Akses</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50"><tr><th className="p-3">User</th><th className="p-3">Peran</th><th className="p-3 text-center">Akses Finance</th></tr></thead>
                                    <tbody>
                                        {allUsers
                                            .filter(usr => usr.uid !== 'sa4QbuTtBSfmnNwDgefOtTaNYl83')
                                            .map(usr => (
                                            <tr key={usr.uid} className="border-b">
                                                <td className="p-3 font-semibold">{usr.email}</td>
                                                <td className="p-3">
                                                    <select 
                                                        value={localSettings.userRoles?.[usr.uid]?.role || jobdeskOptions[0]} 
                                                        onChange={e => handleUserPermissionChange(usr.uid, 'role', e.target.value)} 
                                                        className="p-2 border w-full bg-white rounded-lg">
                                                        {jobdeskOptions.map(role => (
                                                            <option key={role} value={role}>{role}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input type="checkbox" checked={localSettings.userRoles?.[usr.uid]?.financeAccess || false} onChange={e => handleUserPermissionChange(usr.uid, 'financeAccess', e.target.checked)} className="h-5 w-5 rounded"/>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            case 'sistem':
                return (
                    <div className="space-y-8">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Perawatan & Migrasi Data</h2>
                            <div className="space-y-4">
                                <div>
                                    <button onClick={handleFixPoliceNumbers} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Perbaiki Format No. Polisi</button>
                                    <p className="text-sm text-gray-500 mt-2">Klik tombol ini untuk menghapus spasi dari semua No. Polisi yang ada di database.</p>
                                </div>
                                <div className="pt-4 border-t">
                                     <button 
                                        onClick={handleMigrateOldPartData} 
                                        disabled={isMigrating}
                                        className="bg-orange-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-wait"
                                     >
                                        {isMigrating ? 'Memigrasi...' : 'Migrasi Data Order Part Lama'}
                                     </button>
                                     <p className="text-sm text-gray-500 mt-2">
                                        Jalankan fungsi ini HANYA SATU KALI untuk menyesuaikan data part lama dengan dashboard partman yang baru.
                                     </p>
                                </div>
                                <div className="pt-4 border-t border-red-200">
                                     <h3 className="font-semibold text-red-700">Zona Berbahaya</h3>
                                     <button 
                                        onClick={handleCleanupOldJobs} 
                                        disabled={isCleaning}
                                        className="mt-2 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-wait"
                                     >
                                        {isCleaning ? 'Membersihkan...' : 'Arsipkan Histori Pekerjaan (> 1 Tahun)'}
                                     </button>
                                     <p className="text-sm text-gray-500 mt-2">
                                        Tindakan ini akan mengarsipkan (membersihkan) data histori, log, dan survey dari pekerjaan yang sudah ditutup lebih dari satu tahun.
                                        Tindakan ini tidak dapat dibatalkan.
                                     </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'umum':
            default:
                return (
                     <div className="space-y-8">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Pengaturan Keuangan</h2>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div><label className="font-medium text-gray-700">Target Bulanan</label><input type="number" name="monthlyTarget" value={localSettings.monthlyTarget} onChange={handleSettingChange} className="p-2 border w-full mt-1 rounded-lg" /></div>
                                <div><label className="font-medium text-gray-700">Target Mingguan</label><input type="number" name="weeklyTarget" value={localSettings.weeklyTarget} onChange={handleSettingChange} className="p-2 border w-full mt-1 rounded-lg" /></div>
                                <div><label className="font-medium text-gray-700">PPN (%)</label><input type="number" name="ppnPercentage" value={localSettings.ppnPercentage} onChange={handleSettingChange} className="p-2 border w-full mt-1 rounded-lg" /></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Tanggal Libur & Follow Up</h2>
                            <div>
                                <label className="font-medium text-gray-700">Hari Follow-Up After Service</label>
                                <input type="number" name="afterServiceFollowUpDays" value={localSettings.afterServiceFollowUpDays || 3} onChange={handleSettingChange} className="p-2 border w-full mt-1 rounded-lg" />
                                <p className="text-xs text-gray-500 mt-1">Jumlah hari setelah mobil diambil untuk muncul di daftar follow-up.</p>
                            </div>
                            <div className="mt-4">
                                <label htmlFor="nationalHolidays" className="font-medium text-gray-700">Tanggal Libur Nasional</label>
                                <p className="text-xs text-gray-500 mb-2">Masukkan tanggal libur dengan format `YYYY-MM-DD`, pisahkan dengan koma.</p>
                                <textarea id="nationalHolidays" name="nationalHolidays" value={(localSettings.nationalHolidays || []).join(', ')} onChange={handleHolidaysChange} className="p-2 border w-full rounded-lg" rows="3" placeholder="Contoh: 2024-08-17, 2024-12-25"/>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b">
                <h1 className="text-3xl font-bold text-gray-800">Pengaturan Bengkel</h1>
                <button onClick={onBack} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">← Kembali</button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-64 flex-shrink-0">
                    <nav className="flex flex-col space-y-2">
                       <TabButton tabName="umum" label="Pengaturan Umum" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>} />
                       <TabButton tabName="opsi" label="Opsi & Kategori" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>} />
                       <TabButton tabName="pengguna" label="Pengguna & Staf" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} />
                       <TabButton tabName="templates" label="Template Pesan" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" /></svg>} />
                       <TabButton tabName="survey" label="Pertanyaan Survey" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3.293 4.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L10 8.586l.293-.293z" clipRule="evenodd" /></svg>} />
                       <TabButton tabName="sistem" label="Sistem & Data" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>} />
                    </nav>
                </aside>

                <main className="flex-grow">
                    {renderContent()}
                </main>
            </div>
            
            <div className="flex justify-end mt-8 pt-6 border-t">
                <button onClick={handleSaveSettings} className="px-8 py-3 rounded-lg text-white bg-indigo-600 font-bold text-lg hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-shadow duration-200">
                    Simpan Semua Pengaturan
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;

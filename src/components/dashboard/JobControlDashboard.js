import React, { useState, useMemo } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';

const JobControlDashboard = ({ allJobs, onBack, showNotification, openModal, settings, user }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const activeJobs = useMemo(() => {
        let jobs = allJobs.filter(job => !job.isClosed);
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            jobs = jobs.filter(job => 
                (job.policeNumber && job.policeNumber.toLowerCase().includes(lowercasedQuery)) ||
                (job.woNumber && job.woNumber.toLowerCase().includes(lowercasedQuery))
            );
        }
        return jobs;
    }, [allJobs, searchQuery]);

    const handleStatusChange = async (job, newStatus) => {
        if (job.statusPekerjaan === newStatus) return;

        if (job.statusPekerjaan === 'Belum Mulai Perbaikan' && newStatus !== 'Belum Mulai Perbaikan') {
            if (!job.tanggalEstimasiSelesai || !job.tanggalMulaiPerbaikan) {
                showNotification("Tanggal Mulai & Estimasi Selesai wajib diisi sebelum memulai pekerjaan.", "error");
                showNotification("Silakan isi melalui tombol 'Estimasi & WO' di halaman utama.", "info", 5000);
                return;
            }
        }

        const jobRef = doc(db, JOBS_COLLECTION, job.id);
        
        const newHistoryEntry = {
            status: newStatus,
            timestamp: new Date(),
            updatedBy: user.email,
            isRework: job.isRework || false
        };

        const dataToUpdate = {
            statusPekerjaan: newStatus,
            history: arrayUnion(newHistoryEntry)
        };

        if (job.statusPekerjaan === 'Belum Mulai Perbaikan' && newStatus !== 'Belum Mulai Perbaikan') {
            dataToUpdate.statusKendaraan = 'Work In Progress';
        }
        
        if (newStatus === 'Selesai' && !job.tanggalSelesai) {
            dataToUpdate.tanggalSelesai = new Date().toISOString().slice(0, 10);
        }

        try {
            await updateDoc(jobRef, dataToUpdate);
            showNotification(`Status diperbarui menjadi ${newStatus}`, 'success');
        } catch (error) {
            showNotification("Gagal memperbarui status.", "error");
            console.error("Error updating status:", error);
        }
    };

    const getWarningStatus = (job) => {
        if (!job.tanggalEstimasiSelesai || job.statusPekerjaan === 'Selesai') return null;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const estimasi = new Date(job.tanggalEstimasiSelesai);
        const diffTime = estimasi.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'overdue';
        if (diffDays <= 2) return 'warning';
        return null;
    };

    const getPartStatusColor = (status) => {
        switch (status) { case 'Part Indent': case 'Ready Sebagian': return 'text-red-500 font-semibold'; case 'On Order': return 'text-yellow-600 font-semibold'; default: return 'text-green-600 font-semibold'; }
    };

    const statusPekerjaanOptions = settings.statusPekerjaanOptions || [];

    return (
        <div className="bg-gray-100 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
            <header className="bg-white shadow-md p-4 flex-shrink-0 z-10">
                <div className="container mx-auto flex justify-between items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-900 flex-shrink-0">Dashboard Job Control</h1>
                    <input type="text" placeholder="Cari No. Polisi / WO..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="p-2 border rounded-lg w-full max-w-sm focus:ring-2 focus:ring-sky-400"/>
                    <button onClick={onBack} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100">← Kembali</button>
                </div>
            </header>
            <main className="flex-grow overflow-x-auto">
                <div className="flex h-full space-x-4 p-4">
                    {statusPekerjaanOptions.map(status => {
                        const jobsInStatus = activeJobs.filter(job => job.statusPekerjaan === status);
                        return (
                            <div key={status} className="bg-gray-200 rounded-lg flex-shrink-0 w-80 flex flex-col">
                                <div className="p-4 border-b bg-white rounded-t-lg">
                                    <h2 className="font-bold text-lg text-gray-800">{status} <span className="text-sm font-normal text-gray-500">({jobsInStatus.length})</span></h2>
                                </div>
                                <div className="p-4 space-y-4 flex-grow overflow-y-auto">
                                    {jobsInStatus.length > 0 ? jobsInStatus.map(job => {
                                        const warningType = getWarningStatus(job);
                                        const cardBorderColor = warningType === 'overdue' ? 'border-red-500' : warningType === 'warning' ? 'border-yellow-400' : 'border-gray-200';
                                        
                                        const isChangeDisabled = 
                                            job.statusPekerjaan === 'Belum Mulai Perbaikan' && 
                                            (!job.tanggalEstimasiSelesai || !job.tanggalMulaiPerbaikan);

                                        const currentStatusIndex = statusPekerjaanOptions.indexOf(job.statusPekerjaan);
                                        const filteredStatusOptions = statusPekerjaanOptions.filter((_, index) => {
                                            if (job.isRework) return true;
                                            return index >= currentStatusIndex;
                                        });

                                        return (
                                            <div key={job.id} className={`bg-white rounded-lg p-3 shadow border-l-4 ${cardBorderColor}`}>
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-sky-600">{job.policeNumber}</p>
                                                    <div className="flex items-center gap-2">
                                                        {job.isRework && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" title="Pekerjaan ini di-rework" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>}
                                                        {warningType && (<svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${warningType === 'overdue' ? 'text-red-500' : 'text-yellow-400'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>)}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-600">{job.carModel} <span className="text-gray-400">({job.warnaMobil})</span></p>
                                                <p className="text-xs mt-2"><span className="font-semibold">SA:</span> {job.namaSA}</p>
                                                <p className="text-xs"><span className="font-semibold">Panel:</span> {job.jumlahPanel || 0}</p>
                                                <p className="text-xs"><span className="font-semibold">Estimasi:</span> {job.tanggalEstimasiSelesai || '-'}</p>
                                                <p className={`text-xs mt-1 ${getPartStatusColor(job.statusOrderPart)}`}>Part: {job.statusOrderPart || 'N/A'}</p>
                                                <div className="mt-3 pt-2 border-t">
                                                    <select 
                                                        value={job.statusPekerjaan} 
                                                        onChange={(e) => handleStatusChange(job, e.target.value)} 
                                                        className="p-1 border rounded-md w-full text-sm bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                                                        disabled={isChangeDisabled}
                                                        title={isChangeDisabled ? "Isi Tanggal Mulai & Estimasi Selesai untuk memulai pekerjaan" : "Ubah Status Pekerjaan"}
                                                    >
                                                        {filteredStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                    <button onClick={() => openModal('log_mechanic', job)} className="w-full mt-2 bg-gray-600 text-white text-xs font-bold py-1 px-2 rounded-md hover:bg-gray-700">Log Mekanik</button>
                                                </div>
                                            </div>
                                        );
                                    }) : (<p className="text-sm text-gray-400 text-center pt-10">Tidak ada pekerjaan</p>)}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>
        </div>
    );
};

export default JobControlDashboard;

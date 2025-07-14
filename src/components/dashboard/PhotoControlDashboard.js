import React, { useMemo, useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';

const PhotoControlDashboard = ({ allJobs, onBack, showNotification, openModal, userPermissions }) => {
    const [totalStorageSize, setTotalStorageSize] = useState(0);

    const taskList = useMemo(() => {
        return allJobs.filter(job => job.statusPekerjaan === 'Selesai' && !job.isClosed && !job.photosTaskIgnored);
    }, [allJobs]);

    useEffect(() => {
        const calculateSize = () => {
            const total = allJobs.reduce((acc, job) => {
                if (!job.photos) return acc;
                const photoArrays = Object.values(job.photos);
                const jobSize = photoArrays.reduce((jobAcc, photoArray) => {
                    if (Array.isArray(photoArray)) {
                        return jobAcc + photoArray.reduce((sum, photo) => sum + (photo.size || 0), 0);
                    }
                    return jobAcc;
                }, 0);
                return acc + jobSize;
            }, 0);
            setTotalStorageSize(total);
        };
        calculateSize();
    }, [allJobs]);

    const handleIgnoreTask = (job) => {
        openModal('confirm_delete', {
            title: `Sembunyikan Tugas: ${job.policeNumber}?`,
            message: "Anda yakin ingin menyembunyikan pekerjaan ini dari daftar tugas upload foto? Tindakan ini bisa diubah oleh Manager.",
            onConfirm: async () => {
                const jobDocRef = doc(db, JOBS_COLLECTION, job.id);
                try {
                    await updateDoc(jobDocRef, { photosTaskIgnored: true });
                    showNotification(`Tugas untuk ${job.policeNumber} telah disembunyikan.`, 'success');
                } catch (error) {
                    showNotification("Gagal menyembunyikan tugas.", 'error');
                }
            }
        });
    };
    
    const PhotoStatusIcon = ({ uploaded }) => (
        <span className={`flex items-center text-xs font-semibold ${uploaded ? 'text-green-600' : 'text-red-600'}`}>
            {uploaded ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            )}
            {uploaded ? 'Lengkap' : 'Belum'}
        </span>
    );
    
    // --- [PERBAIKAN] Menambahkan 'Manager' ke role yang bisa menghapus/menyembunyikan ---
    const canDelete = ['Foreman', 'Admin Bengkel', 'Manager'].includes(userPermissions.role);
    const GIGABYTE = 1024 * 1024 * 1024;
    const usagePercentage = (totalStorageSize / (5 * GIGABYTE)) * 100;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Kontrol Foto</h1>
                <button onClick={onBack} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100">← Kembali</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Kapasitas Cloud Storage</h2>
                <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                        className="bg-blue-600 h-6 rounded-full text-white text-xs font-medium flex items-center justify-center transition-all duration-500" 
                        style={{ width: `${usagePercentage > 100 ? 100 : usagePercentage}%` }}
                    >
                        {(totalStorageSize / (1024 * 1024)).toFixed(2)} MB
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-1 text-right">
                    Total Penggunaan: <strong>{(totalStorageSize / (1024 * 1024)).toFixed(2)} MB</strong> dari 5 GB Kuota Gratis
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Daftar Tugas Upload Foto ({taskList.length})</h2>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                    {taskList.length > 0 ? taskList.map(job => (
                        <div key={job.id} className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="flex-grow">
                                <p className="font-bold text-sky-600 text-lg">{job.policeNumber} <span className="text-gray-500 font-normal text-base">({job.woNumber})</span></p>
                                <p className="text-sm text-gray-700">{job.carModel} - {job.customerName}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 border-t pt-3">
                                    <div className="flex justify-between items-center"><span className="text-sm font-medium">Foto Epoxy:</span> <PhotoStatusIcon uploaded={job.photos?.epoxy?.length > 0} /></div>
                                    <div className="flex justify-between items-center"><span className="text-sm font-medium">Foto Salvage:</span> <PhotoStatusIcon uploaded={job.photos?.salvage?.length > 0} /></div>
                                    <div className="flex justify-between items-center"><span className="text-sm font-medium">Foto Selesai:</span> <PhotoStatusIcon uploaded={job.photos?.selesai?.length > 0} /></div>
                                    <div className="flex justify-between items-center"><span className="text-sm font-medium">Foto Peneng:</span> <PhotoStatusIcon uploaded={job.photos?.peneng?.length > 0} /></div>
                                </div>
                                {/* --- [IMPLEMENTASI FITUR] Menampilkan daftar link download --- */}
                                {(Object.values(job.photos || {}).flat().length > 0) && (
                                    <details className="mt-3 text-sm">
                                        <summary className="cursor-pointer font-semibold text-blue-600">Lihat & Download Foto ({Object.values(job.photos || {}).flat().length})</summary>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {Object.entries(job.photos || {}).map(([type, photos]) => (
                                                photos.map((photo, index) => (
                                                     <a key={index} href={photo.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline truncate" title={photo.url}>
                                                        {photo.keterangan ? `[${photo.keterangan}]` : `Foto ${type} ${index + 1}`}
                                                     </a>
                                                ))
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                            <div className="flex-shrink-0 flex flex-col gap-2 w-full md:w-auto">
                                <button onClick={() => openModal('photo_upload', { jobData: job })} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Upload/Kelola Foto</button>
                                {canDelete && (
                                    <button 
                                        onClick={() => handleIgnoreTask(job)} 
                                        className="w-full bg-red-100 text-red-700 font-bold py-2 px-4 rounded-lg"
                                    >
                                        Sembunyikan Kartu
                                    </button>
                                )}
                            </div>
                        </div>
                    )) : <p className="text-center text-gray-500 py-8">Tidak ada tugas upload foto saat ini.</p>}
                </div>
            </div>
        </div>
    );
};

export default PhotoControlDashboard;

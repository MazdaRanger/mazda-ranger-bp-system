import React from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';

const JobCard = ({ job, openModal, userPermissions, showNotification }) => {
    const getStatusColor = (status) => {
        if (!status) return 'bg-gray-100 text-gray-800';
        if (status.includes('Selesai') || status.includes('Di ambil')) return 'bg-green-100 text-green-800';
        if (status.includes('Booking')) return 'bg-blue-100 text-blue-800';
        if (status.includes('Tunggu')) return 'bg-yellow-100 text-yellow-800';
        return 'bg-indigo-100 text-indigo-800';
    };

    const handleDelete = () => {
        openModal('confirm_delete', {
            title: `Hapus Pekerjaan: ${job.policeNumber}?`,
            message: `Anda akan menghapus data untuk "${job.customerName}" secara permanen. Tindakan ini tidak dapat dibatalkan.`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, JOBS_COLLECTION, job.id));
                    showNotification("Data pekerjaan berhasil dihapus.", "success");
                } catch (error) {
                    showNotification("Gagal menghapus data. Coba lagi.", "error");
                    console.error("Error deleting document: ", error);
                }
            }
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col justify-between">
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-sky-700 text-lg">{job.policeNumber}</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.statusKendaraan)}`}>
                        {job.statusKendaraan}
                    </span>
                </div>
                <p className="text-sm text-gray-700">{job.carModel}</p>
                <p className="text-xs text-gray-500">{job.namaAsuransi}</p>
                
                <div className="mt-3 border-t pt-3 space-y-1 text-sm">
                    <p><span className="font-semibold">Tgl Masuk:</span> {job.tanggalMasuk || '-'}</p>
                    <p><span className="font-semibold">SA:</span> {job.namaSA || '-'}</p>
                    <p><span className="font-semibold">Panel:</span> {job.jumlahPanel || 0}</p>
                    <p><span className="font-semibold">Pekerjaan:</span> {job.statusPekerjaan || '-'}</p>
                    
                    {/* --- [IMPLEMENTASI BARU] Menampilkan status WO jika ada nomor WO --- */}
                    {job.woNumber && (
                        <div className="border-t mt-2 pt-2 space-y-1">
                            <p><span className="font-semibold">No. WO:</span> {job.woNumber}</p>
                            <p>
                                <span className="font-semibold">Status WO:</span>
                                <span className={`ml-1 font-bold ${job.isClosed ? 'text-red-600' : 'text-green-600'}`}>
                                    {job.isClosed ? 'Closed WO' : 'Open WO'}
                                </span>
                            </p>
                        </div>
                    )}
                    {/* --- AKHIR DARI IMPLEMENTASI BARU --- */}

                    <p className="font-bold text-green-600 pt-2"><span className="font-semibold text-gray-800">Gross Profit:</span> Rp {job.grossProfit?.toLocaleString('id-ID') || 0}</p>
                </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 flex justify-end items-center gap-3 rounded-b-lg">
                {userPermissions.role === 'Manager' && (
                     <button 
                        onClick={handleDelete}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                    >
                        Hapus
                    </button>
                )}
                <button 
                    onClick={() => openModal('edit_data', job)}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                    Edit Data
                </button>
                <button 
                    onClick={() => openModal('edit_job', job)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    Estimasi & WO
                </button>
            </div>
        </div>
    );
};


const MainDashboard = ({ allData, openModal, userPermissions, showNotification }) => {
    // Pesan jika tidak ada data untuk ditampilkan
    if (!allData || allData.length === 0) {
        return (
            <div className="text-center text-gray-500 mt-10 p-4 bg-gray-50 rounded-lg">
                <p>Tidak ada data untuk ditampilkan.</p>
                <p className="text-xs mt-1">Coba sesuaikan filter atau centang 'Tampilkan Data yang Sudah di-Close WO' untuk melihat riwayat.</p>
            </div>
        );
    }

    // Menampilkan data dalam grid
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allData.map(job => (
                <JobCard 
                    key={job.id} 
                    job={job} 
                    openModal={openModal} 
                    userPermissions={userPermissions} 
                    showNotification={showNotification} 
                />
            ))}
        </div>
    );
};

export default MainDashboard;

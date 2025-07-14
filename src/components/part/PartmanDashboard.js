import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, JOBS_COLLECTION, increment } from '../../config/firebase';
import { exportToCsv, toYyyyMmDd } from '../../utils/helpers';

const PartmanDashboard = ({ allJobs, openModal, showNotification }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const partJobs = useMemo(() => {
        let activeJobs = allJobs.filter(j => 
            j.partOrderStatus &&
            j.partOrderStatus !== 'Order Dibatalkan' && 
            !j.isClosed
        );

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            activeJobs = activeJobs.filter(job => 
                (job.policeNumber && job.policeNumber.toLowerCase().includes(query)) ||
                (job.woNumber && job.woNumber.toLowerCase().includes(query))
            );
        }
        
        const newOrders = activeJobs.filter(j => j.partOrderStatus === 'Menunggu Konfirmasi Partman');
        const onOrder = activeJobs.filter(j => j.partOrderStatus === 'Part Sedang Dipesan');
        // --- [IMPLEMENTASI FITUR 3] Kolom baru untuk part indent ---
        const indent = activeJobs.filter(j => j.partOrderStatus === 'Menunggu Part Indent');
        // --- [PERBAIKAN BUG 1] ---
        // Menambahkan filter untuk memastikan hanya pekerjaan dengan part yang masuk ke kolom ini.
        const arrived = activeJobs.filter(j => 
            j.partOrderStatus === 'Part Telah Tiba' && 
            j.estimateData?.partItems?.length > 0
        );

        return { newOrders, onOrder, indent, arrived };
    }, [allJobs, searchQuery]);

    const handlePartStatusUpdate = async (job, newPartmanStatus, newForemanStatus, message) => {
        const jobRef = doc(db, JOBS_COLLECTION, job.id);
        const dataToUpdate = {
            partOrderStatus: newPartmanStatus,
            statusOrderPart: newForemanStatus
        };

        try {
            await updateDoc(jobRef, dataToUpdate);
            if (showNotification) showNotification(message, 'success');
        } catch (error) {
            if (showNotification) showNotification("Gagal memperbarui status part.", "error");
            console.error("Error updating part status: ", error);
        }
    };

    const handleCancelOrder = (job) => {
        openModal('confirm_delete', {
            title: `Batalkan Order Part: ${job.policeNumber}?`,
            message: "Tindakan ini akan membatalkan proses order part dan mengembalikan biaya yang mungkin sudah tercatat. Lanjutkan?",
            onConfirm: async () => {
                const jobRef = doc(db, JOBS_COLLECTION, job.id);
                const dataToUpdate = {
                    partOrderStatus: 'Order Dibatalkan',
                    statusOrderPart: 'Tidak Ada',
                };
                const recordedPartCost = job.costData?.hargaBeliPart || 0;
                if (recordedPartCost > 0) {
                    dataToUpdate.grossProfit = increment(recordedPartCost);
                    dataToUpdate['costData.hargaBeliPart'] = 0;
                }
                try {
                    await updateDoc(jobRef, dataToUpdate);
                    showNotification(`Order part untuk ${job.policeNumber} berhasil dibatalkan.`, "success");
                } catch (error) {
                    showNotification("Gagal membatalkan order.", "error");
                }
            }
        });
    };
    
    // --- [IMPLEMENTASI FITUR 3] Fungsi untuk ekspor laporan indent ---
    const handleExportIndent = () => {
        const indentJobs = allJobs.filter(j => j.statusOrderPart === 'Part Indent' && !j.isClosed);

        if (indentJobs.length === 0) {
            showNotification("Tidak ada data part indent untuk diekspor.", "info");
            return;
        }

        const dataToExport = indentJobs.flatMap(job => {
            const partItems = job.estimateData?.partItems || [];
            return partItems.map(part => ({
                'No. Work Order': job.woNumber || 'N/A',
                'No. Polisi': job.policeNumber || '',
                'Service Advisor': job.namaSA || '',
                'Tgl WO': toYyyyMmDd(job.createdAt),
                'Nama Part': part.name,
                'Nomor Part': part.number,
                'Qty': part.qty,
            }));
        });
        
        exportToCsv('Laporan_Part_Indent.csv', dataToExport);
    };

    const JobCard = ({ job, color }) => (
        <div className={`bg-white rounded-lg p-4 shadow border-l-4 ${color}`}>
            <p className="font-bold text-sky-600">{job.policeNumber}</p>
            <p className="text-sm text-gray-700">{job.carModel} - {job.customerName}</p>
            <p className="text-xs text-gray-500">SA: {job.namaSA}</p>
            <div className="mt-3 pt-3 border-t">
                <h4 className="font-semibold text-xs mb-1">Daftar Part:</h4>
                <ul className="list-disc list-inside text-xs space-y-1 max-h-24 overflow-y-auto">
                    {(job.estimateData?.partItems || []).map((item, idx) => (
                        <li key={idx}>{item.name} ({item.qty})</li>
                    ))}
                    {(job.estimateData?.partItems || []).length === 0 && <li className="text-gray-400">Tidak ada part</li>}
                </ul>
            </div>
            
            <div className="mt-4 space-y-2">
                {job.partOrderStatus === 'Menunggu Konfirmasi Partman' && (
                    <button onClick={() => openModal('part_order_detail', job)} className="w-full text-white text-sm font-bold py-2 px-3 rounded-md bg-sky-600 hover:bg-sky-700">Lihat & Proses Order</button>
                )}
                {job.partOrderStatus === 'Part Sedang Dipesan' && (
                    <>
                        <button onClick={() => handlePartStatusUpdate(job, 'Part Telah Tiba', 'Ready', `Semua part untuk ${job.policeNumber} telah ditandai tiba.`)} className="w-full text-white text-sm font-bold py-2 px-3 rounded-md bg-green-500 hover:bg-green-600">Tandai SEMUA Part Tiba</button>
                        <button onClick={() => handlePartStatusUpdate(job, 'Part Sedang Dipesan', 'Ready Sebagian', `Status part untuk ${job.policeNumber} diubah menjadi 'Ready Sebagian'.`)} className="w-full text-gray-800 bg-yellow-400 hover:bg-yellow-500 text-sm font-bold py-2 px-3 rounded-md">Tandai SEBAGIAN Part Tiba</button>
                        {/* --- [IMPLEMENTASI FITUR 3] Tombol untuk part indent --- */}
                        <button onClick={() => handlePartStatusUpdate(job, 'Menunggu Part Indent', 'Part Indent', `Status part untuk ${job.policeNumber} diubah menjadi 'Part Indent'.`)} className="w-full text-white bg-red-500 hover:bg-red-600 text-sm font-bold py-2 px-3 rounded-md">Tandai Part Indent</button>
                    </>
                )}
                 {job.partOrderStatus === 'Menunggu Part Indent' && (
                     <button onClick={() => handlePartStatusUpdate(job, 'Part Sedang Dipesan', 'On Order', `Status part untuk ${job.policeNumber} dikembalikan ke 'On Order'.`)} className="w-full text-white text-sm font-bold py-2 px-3 rounded-md bg-orange-500 hover:bg-orange-600">Kembalikan ke 'On Order'</button>
                )}
                {(job.partOrderStatus === 'Menunggu Konfirmasi Partman' || job.partOrderStatus === 'Part Sedang Dipesan') && (
                     <button onClick={() => handleCancelOrder(job)} className="w-full text-red-700 bg-red-100 hover:bg-red-200 text-sm font-bold py-1 px-3 rounded-md mt-2">Batalkan Order</button>
                )}
            </div>
        </div>
    );

    const CategoryColumn = ({ title, jobs, color, borderColor }) => (
        <div className="bg-gray-100 rounded-lg p-4 flex flex-col h-[80vh]">
            <h2 className={`font-bold text-lg ${color} mb-4 flex-shrink-0`}>{title} ({jobs.length})</h2>
            <div className="space-y-4 overflow-y-auto flex-grow pr-2">
                {jobs.length > 0 ? jobs.map(job => 
                    <JobCard key={job.id} job={job} color={borderColor} />
                ) : <p className="text-sm text-gray-500 text-center pt-10">Tidak ada data.</p>}
            </div>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6 gap-4">
                 <h1 className="text-3xl font-bold text-gray-900">Dashboard Order Part</h1>
                 <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari No. Polisi / No. WO..."
                    className="p-2 border rounded-lg w-full max-w-sm"
                 />
                 {/* --- [IMPLEMENTASI FITUR 3] Tombol ekspor laporan indent --- */}
                 <button onClick={handleExportIndent} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 flex-shrink-0">
                    Export Indent
                 </button>
            </div>
            {/* --- [IMPLEMENTASI FITUR 3] Menambahkan kolom Indent dan mengubah grid --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <CategoryColumn title="Order Baru" jobs={partJobs.newOrders} color="text-sky-700" borderColor="border-sky-600" />
                <CategoryColumn title="Dalam Proses Order" jobs={partJobs.onOrder} color="text-yellow-700" borderColor="border-yellow-600" />
                <CategoryColumn title="Menunggu Part Indent" jobs={partJobs.indent} color="text-red-700" borderColor="border-red-600" />
                <CategoryColumn title="Part Tiba (Siap Rakit)" jobs={partJobs.arrived} color="text-green-700" borderColor="border-green-600" />
            </div>
        </div>
    );
};

export default PartmanDashboard;

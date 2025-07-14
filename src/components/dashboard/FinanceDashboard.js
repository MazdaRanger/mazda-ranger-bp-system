import React, { useState, useMemo } from 'react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';
import { toYyyyMmDd, exportToCsv } from '../../utils/helpers';

const FinanceDashboard = ({ allJobs, onBack, openModal, userPermissions, showNotification }) => {
    const [woFilter, setWoFilter] = useState('');
    const [policeNoFilter, setPoliceNoFilter] = useState('');
    const [financeView, setFinanceView] = useState('open'); // 'open' or 'closed'

    const handleReopenWO = async (jobId) => {
        // --- [PERBAIKAN BUG] Mengganti 'admin' dengan 'Manager' agar sesuai dengan role yang ada
        if (userPermissions.role !== 'Manager') {
            showNotification("Hanya manager yang bisa membuka kembali WO.", "error");
            return;
        }
        const jobRef = doc(db, JOBS_COLLECTION, jobId);
        try {
            await updateDoc(jobRef, { isClosed: false, closedAt: deleteField() });
            showNotification("Work Order berhasil dibuka kembali.", "success");
        } catch (error) {
            showNotification("Gagal membuka WO.", "error");
        }
    };
    
    const filteredJobs = useMemo(() => {
        const targetStatus = financeView === 'open';
        return allJobs.filter(job => {
            const statusMatch = !job.isClosed === targetStatus;
            if (!statusMatch) return false;
            
            if (woFilter && !job.woNumber?.toLowerCase().includes(woFilter.toLowerCase())) return false;
            if (policeNoFilter && !job.policeNumber.toLowerCase().includes(policeNoFilter.toLowerCase())) return false;
            return true;
        });
    }, [allJobs, woFilter, policeNoFilter, financeView]);

    const handleExportFinanceData = () => {
        const dataToExport = filteredJobs.map(job => {
            // --- [PERBAIKAN UTAMA] ---
            // Ambil semua data biaya dari sumber yang benar: `job.costData`.
            const costData = job.costData || {};
            const totalBiayaBahan = costData.hargaModalBahan || 0;
            const totalHargaBeliPart = costData.hargaBeliPart || 0;
            const totalSpkl = costData.jasaExternal || 0;

            const estimateData = job.estimateData || {};
            const discountJasaAmount = estimateData.discountJasaAmount || 0;
            const discountPartAmount = estimateData.discountPartAmount || 0;
            const totalDiscount = discountJasaAmount + discountPartAmount;

            const totalRevenue = (job.hargaJasa || 0) + (job.hargaPart || 0);
            const totalExpenses = totalBiayaBahan + totalHargaBeliPart + totalSpkl;
            // Lakukan kalkulasi ulang GP untuk ekspor agar selalu akurat.
            const grossProfit = totalRevenue - totalExpenses;

            return {
                'No. Work Order': job.woNumber || '',
                'No. Polisi': job.policeNumber || '',
                'Model Mobil': job.carModel || '',
                'Warna Kendaraan': job.warnaMobil || '',
                'Nama Asuransi': job.namaAsuransi || '',
                'Jumlah Panel': job.jumlahPanel || 0,
                'Status WO': job.isClosed ? 'Close WO' : 'Open WO',
                'Tanggal Close WO': toYyyyMmDd(job.closedAt),
                'Total Biaya Jasa': job.hargaJasa || 0,
                'Total Biaya Part': job.hargaPart || 0,
                'Total Biaya Bahan': totalBiayaBahan,
                'Total Harga Beli Part': totalHargaBeliPart,
                'Total SPKL': totalSpkl,
                'Total Diskon': totalDiscount,
                'Total Nett Revenue': totalRevenue,
                'Total Expenses': totalExpenses,
                'Total Gross Profit': grossProfit,
            };
        });
        exportToCsv('Laporan_Finance.csv', dataToExport);
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
                 <button onClick={onBack} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100">← Kembali</button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center border-b mb-4">
                    <div className="flex">
                        <button onClick={() => setFinanceView('open')} className={`py-2 px-4 ${financeView === 'open' ? 'border-b-2 border-indigo-500 font-semibold' : 'text-gray-500'}`}>Data Open WO</button>
                        <button onClick={() => setFinanceView('closed')} className={`py-2 px-4 ${financeView === 'closed' ? 'border-b-2 border-indigo-500 font-semibold' : 'text-gray-500'}`}>Data Close WO</button>
                    </div>
                     <button onClick={handleExportFinanceData} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">Export Finance</button>
                </div>
                <div className="flex gap-4 mb-4">
                    <input type="text" placeholder="Filter No. WO..." value={woFilter} onChange={e => setWoFilter(e.target.value)} className="p-2 border rounded-lg w-full"/>
                    <input type="text" placeholder="Filter No. Polisi..." value={policeNoFilter} onChange={e => setPoliceNoFilter(e.target.value)} className="p-2 border rounded-lg w-full"/>
                </div>
                <div className="space-y-4">
                    {filteredJobs.length > 0 ? filteredJobs.map(job => (
                        <div key={job.id} className="flex justify-between items-center p-4 border rounded-lg">
                            <div>
                                <p className="font-bold text-sky-600">{job.policeNumber} <span className="text-gray-500 font-normal">({job.woNumber || 'Belum ada WO'})</span></p>
                                <p className="text-sm text-gray-700">{job.customerName}</p>
                            </div>
                            {financeView === 'open' ? (
                                <button onClick={() => openModal('finance_cost', job)} className="bg-green-600 text-white px-4 py-2 rounded-lg">Input Biaya & Close WO</button>
                            ) : (
                                // --- [PERBAIKAN BUG] --- Mengganti 'admin' dengan 'Manager' di sini juga untuk menonaktifkan tombol
                                <button onClick={() => handleReopenWO(job.id)} className="bg-yellow-500 text-white px-4 py-2 rounded-lg" disabled={userPermissions.role !== 'Manager'}>Buka Kembali WO</button>
                            )}
                        </div>
                    )) : <p>Tidak ada pekerjaan yang cocok dengan filter.</p>}
                </div>
            </div>
        </div>
    );
};

export default FinanceDashboard;

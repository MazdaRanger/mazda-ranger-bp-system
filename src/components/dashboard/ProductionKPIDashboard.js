import React, { useState, useMemo } from 'react';
import { exportToCsv, toYyyyMmDd } from '../../utils/helpers';

// Helper function to calculate difference in days between two dates
const diffInDays = (date1, date2) => {
    if (!date1 || !date2) return 0;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

// --- Reusable UI Components ---
const KpiCard = ({ title, value, subtitle, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
    </div>
);

const BarChart = ({ title, data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-3">
                {data.map(({ label, value, color }) => (
                    <div key={label} className="flex items-center">
                        <span className="text-sm font-medium text-gray-600 w-32 truncate" title={label}>{label}</span>
                        <div className="flex-grow bg-gray-200 rounded-full h-5 mr-2">
                            <div
                                className="h-5 rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold"
                                style={{ width: `${(value / maxValue) * 100}%`, backgroundColor: color }}
                            >
                                {value > 0 ? `${value.toFixed(1)} hr` : ''}
                            </div>
                        </div>
                    </div>
                ))}
                 {data.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Data tidak tersedia.</p>}
            </div>
        </div>
    );
};

const OverdueTable = ({ jobs }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Unit Terlambat (Melebihi Estimasi)</h3>
        <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="p-2">No. Polisi</th>
                        <th className="p-2">Estimasi Selesai</th>
                        <th className="p-2">Status Sekarang</th>
                        <th className="p-2 text-right">Terlambat</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.map(job => (
                        <tr key={job.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-semibold text-sky-600">{job.policeNumber}</td>
                            <td className="p-2">{job.tanggalEstimasiSelesai}</td>
                            <td className="p-2">{job.statusPekerjaan}</td>
                            <td className="p-2 text-right font-bold text-red-500">{diffInDays(job.tanggalEstimasiSelesai, new Date())} hari</td>
                        </tr>
                    ))}
                     {jobs.length === 0 && (
                        <tr><td colSpan="4" className="text-center text-gray-400 p-4">Tidak ada unit yang terlambat.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);


// --- Main Dashboard Component ---
const ProductionKPIDashboard = ({ allJobs, onBack, settings, showNotification }) => {
    const [days, setDays] = useState(30);

    const kpiData = useMemo(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const jobsInPeriod = allJobs.filter(job => {
            const jobDate = job.tanggalMulaiPerbaikan ? new Date(job.tanggalMulaiPerbaikan) : (job.createdAt?.toDate() || null);
            return jobDate && jobDate >= startDate && jobDate <= endDate;
        });

        const finishedJobs = jobsInPeriod.filter(job => job.statusPekerjaan === 'Selesai');

        // 1. Cycle Time
        const cycleTimes = finishedJobs
            .map(job => diffInDays(job.tanggalMulaiPerbaikan, job.tanggalSelesai))
            .filter(days => days >= 0);
        const avgCycleTime = cycleTimes.length > 0 ? (cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length).toFixed(1) : 0;

        // 2. On-Time Delivery
        const onTimeJobs = finishedJobs.filter(job => {
            if (!job.tanggalEstimasiSelesai || !job.tanggalSelesai) return false;
            return new Date(job.tanggalSelesai) <= new Date(job.tanggalEstimasiSelesai);
        }).length;
        const onTimeRate = finishedJobs.length > 0 ? Math.round((onTimeJobs / finishedJobs.length) * 100) : 0;

        // 3. Rework Rate
        const reworkJobs = finishedJobs.filter(job => job.isRework).length;
        const reworkRate = finishedJobs.length > 0 ? Math.round((reworkJobs / finishedJobs.length) * 100) : 0;

        // 4. WIP Aging
        const wipAging = {};
        const wipCount = {};
        const statusOptions = settings.statusPekerjaanOptions || [];
        
        jobsInPeriod.forEach(job => {
            if (!job.history || job.isRework) return; // Abaikan job rework dari kalkulasi WIP aging standar
            
            job.history.forEach((entry, index) => {
                const nextEntry = job.history[index + 1];
                if (nextEntry) {
                    const duration = diffInDays(entry.timestamp?.toDate(), nextEntry.timestamp?.toDate());
                    if (duration >= 0) {
                        wipAging[entry.status] = (wipAging[entry.status] || 0) + duration;
                        wipCount[entry.status] = (wipCount[entry.status] || 0) + 1;
                    }
                }
            });
        });

        const avgWipAging = statusOptions.map(status => ({
            label: status,
            value: wipCount[status] > 0 ? wipAging[status] / wipCount[status] : 0,
            color: ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#6366f1', '#f59e0b'][statusOptions.indexOf(status) % 7]
        }));
        
        // 5. Overdue Jobs
        const overdueJobs = allJobs.filter(job => {
            return !job.isClosed && 
                   job.statusPekerjaan !== 'Selesai' && 
                   job.tanggalEstimasiSelesai && 
                   new Date(job.tanggalEstimasiSelesai) < new Date();
        }).sort((a,b) => new Date(a.tanggalEstimasiSelesai) - new Date(b.tanggalEstimasiSelesai));

        return { avgCycleTime, onTimeRate, reworkRate, avgWipAging, overdueJobs };

    }, [allJobs, days, settings.statusPekerjaanOptions]);

    // --- [IMPLEMENTASI BARU] Fungsi untuk export data rework ---
    const handleExportRework = () => {
        const reworkJobs = allJobs.filter(job => job.isRework);

        if (reworkJobs.length === 0) {
            showNotification("Tidak ada data rework untuk diekspor.", "info");
            return;
        }

        const dataToExport = reworkJobs.map(job => {
            const mechanics = job.logPekerjaan?.map(log => log.namaMekanik).join(', ') || 'N/A';
            return {
                'No. Work Order': job.woNumber || job.id,
                'No. Polisi': job.policeNumber || '',
                'No. Rangka': job.nomorRangka || 'N/A',
                'Model Kendaraan': job.carModel || '',
                'Warna': job.warnaMobil || '',
                'Customer': job.customerName || '',
                'Asuransi': job.namaAsuransi || '',
                'Tgl Mulai Perbaikan': toYyyyMmDd(job.tanggalMulaiPerbaikan),
                'Tgl Estimasi Selesai': toYyyyMmDd(job.tanggalEstimasiSelesai),
                'Stall Rework': job.reworkStall || 'N/A',
                'Penanggung Jawab Rework': job.reworkResponsibleMechanic || 'N/A',
                'Alasan Rework': job.reworkReason || '',
                'Mekanik Terlibat': mechanics,
            };
        });

        exportToCsv('Laporan_Pekerjaan_Ulang.csv', dataToExport);
        showNotification("Laporan rework berhasil diunduh.", "success");
    };

    return (
        <div className="bg-gray-50 p-4 sm:p-6 lg:p-8 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard KPI Produksi</h1>
                {/* --- [IMPLEMENTASI BARU] Tombol Download --- */}
                <div className="flex items-center gap-4">
                    <button onClick={handleExportRework} className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        Download Laporan Rework
                    </button>
                    <button onClick={onBack} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">&larr; Kembali</button>
                </div>
            </div>
            
            <div className="mb-6 flex justify-start items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Tampilkan data untuk:</span>
                {[30, 60, 90].map(d => (
                    <button 
                        key={d}
                        onClick={() => setDays(d)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                            days === d ? 'bg-sky-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {d} Hari Terakhir
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <KpiCard 
                    title="Rata-rata Waktu Siklus" 
                    value={`${kpiData.avgCycleTime} Hari`}
                    subtitle="Dari Mulai Perbaikan s/d Selesai"
                    icon={<div className="p-3 bg-blue-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>}
                />
                <KpiCard 
                    title="Penyelesaian Tepat Waktu" 
                    value={`${kpiData.onTimeRate}%`}
                    subtitle="Selesai sesuai estimasi"
                    icon={<div className="p-3 bg-green-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>}
                />
                <KpiCard 
                    title="Tingkat Pengerjaan Ulang" 
                    value={`${kpiData.reworkRate}%`}
                    subtitle="Pekerjaan yang di-rework"
                    icon={<div className="p-3 bg-red-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg></div>}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarChart title="Rata-rata Waktu di Setiap Pos (WIP Aging)" data={kpiData.avgWipAging} />
                <OverdueTable jobs={kpiData.overdueJobs} />
            </div>
        </div>
    );
};

export default ProductionKPIDashboard;

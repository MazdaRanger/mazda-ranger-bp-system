import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';

// --- Reusable UI Components ---
const KpiCard = ({ title, value, subtitle, icon }) => (
    <div className="bg-white p-5 rounded-xl shadow-md flex items-center space-x-4">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
    </div>
);

const ActionCard = ({ job, taskType, onMarkAsDone }) => {
    const taskDetails = {
        needsSpkAppeal: { title: "Banding SPK", doneFlag: "spkAppealDone" },
        needsSupplement: { title: "Pengajuan Penambahan", doneFlag: "supplementDone" },
        needsEstimation: { title: "Tunggu Estimasi", doneFlag: "estimationDone" },
        needsCustomerApproval: { title: "Approval Pelanggan", doneFlag: "customerApprovalDone" }
    };

    const detail = taskDetails[taskType];

    return (
        <div className="bg-white rounded-lg p-3 shadow border-l-4 border-red-500">
            <p className="font-bold text-sky-600">{job.policeNumber}</p>
            <p className="text-sm text-gray-600">{job.carModel}</p>
            <p className="text-xs text-gray-500">Customer: {job.customerName}</p>
            <button
                onClick={() => onMarkAsDone(job.id, `saTasks.${detail.doneFlag}`)}
                className="w-full mt-3 bg-red-500 text-white text-xs font-bold py-1.5 px-2 rounded-md hover:bg-red-600"
            >
                Tandai Selesai
            </button>
        </div>
    );
};

// --- Main Dashboard Component ---
const SAKPIDashboard = ({ allJobs, userData, settings, showNotification, userPermissions }) => {
    
    const [selectedSA, setSelectedSA] = useState('');
    
    const saName = userPermissions.role === 'Manager' ? selectedSA : userData.displayName;

    const { actionBoardJobs, kpi } = useMemo(() => {
        // --- [PERBAIKAN] Logika diubah untuk menghitung KPI bulanan ---
        const emptyKpi = { avgWOValue: 'Rp 0', totalGrossProfit: 'Rp 0', onTimeRate: '0%', monthlyWOCount: 0 };
        const emptyResult = { saJobs: [], actionBoardJobs: {}, kpi: emptyKpi };
        
        if (userPermissions.role === 'Manager' && !saName) {
            return emptyResult;
        }

        const saJobs = allJobs.filter(job => job.namaSA === saName);
        
        // --- Logika Action Board (tidak berubah, tetap menampilkan semua tugas aktif) ---
        const needsSpkAppeal = saJobs.filter(j => j.saTasks?.needsSpkAppeal && !j.saTasks?.spkAppealDone);
        const needsSupplement = saJobs.filter(j => j.saTasks?.needsSupplement && !j.saTasks?.supplementDone);
        const needsEstimation = saJobs.filter(j => j.saTasks?.needsEstimation && !j.saTasks?.estimationDone);
        const needsCustomerApproval = saJobs.filter(j => j.saTasks?.needsCustomerApproval && !j.saTasks?.customerApprovalDone);
        const actionBoardJobs = { needsSpkAppeal, needsSupplement, needsEstimation, needsCustomerApproval };

        // --- Logika Perhitungan KPI (berdasarkan bulan berjalan) ---
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // 1. Jumlah WO di Bulan Ini (berdasarkan tanggal dibuat)
        const jobsCreatedThisMonth = saJobs.filter(job => {
            const jobDate = job.createdAt?.toDate();
            return jobDate && jobDate.getMonth() === currentMonth && jobDate.getFullYear() === currentYear;
        });
        const monthlyWOCount = jobsCreatedThisMonth.length;
        
        // 2. Rata-rata Nilai WO (berdasarkan WO yang dibuat bulan ini)
        const totalWOValueThisMonth = jobsCreatedThisMonth.reduce((sum, job) => sum + (job.estimateData?.grandTotal || 0), 0);
        const avgWOValue = jobsCreatedThisMonth.length > 0 ? (totalWOValueThisMonth / jobsCreatedThisMonth.length) : 0;
        
        // --- KPI berikut dihitung berdasarkan tanggal selesai di bulan berjalan ---
        const jobsFinishedThisMonth = saJobs.filter(job => {
            const finishDate = job.tanggalSelesai ? new Date(job.tanggalSelesai) : null;
            return finishDate && finishDate.getMonth() === currentMonth && finishDate.getFullYear() === currentYear;
        });

        // 3. Akumulasi Gross Profit (berdasarkan pekerjaan yang selesai bulan ini)
        const totalGrossProfit = jobsFinishedThisMonth.reduce((sum, job) => sum + (job.grossProfit || 0), 0);
        
        // 4. Penyelesaian Tepat Waktu (berdasarkan pekerjaan yang selesai bulan ini)
        const onTimeJobs = jobsFinishedThisMonth.filter(job => {
            if (!job.tanggalEstimasiSelesai || !job.tanggalSelesai) return false;
            return new Date(job.tanggalSelesai) <= new Date(job.tanggalEstimasiSelesai);
        }).length;
        const onTimeRate = jobsFinishedThisMonth.length > 0 ? Math.round((onTimeJobs / jobsFinishedThisMonth.length) * 100) : 0;

        return {
            actionBoardJobs,
            kpi: {
                avgWOValue: `Rp ${avgWOValue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`,
                totalGrossProfit: `Rp ${totalGrossProfit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`,
                onTimeRate: `${onTimeRate}%`,
                monthlyWOCount
            }
        };

    }, [allJobs, saName, userPermissions.role]);

    const handleMarkTaskAsDone = async (jobId, fieldToUpdate) => {
        const jobRef = doc(db, JOBS_COLLECTION, jobId);
        try {
            await updateDoc(jobRef, { [fieldToUpdate]: true });
            showNotification("Tugas berhasil ditandai selesai.", "success");
        } catch (error) {
            showNotification("Gagal memperbarui tugas.", "error");
            console.error("Error updating task:", error);
        }
    };
    
    const DashboardContent = () => (
        <>
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Papan Tugas Kritis (Action Board)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.entries(actionBoardJobs).map(([key, jobs]) => {
                        const titles = {
                            needsSpkAppeal: "Butuh Banding SPK",
                            needsSupplement: "Butuh Pengajuan Penambahan",
                            needsEstimation: "SPK Turun, Tunggu Estimasi",
                            needsCustomerApproval: "Butuh Approval Pelanggan"
                        };
                        return (
                            <div key={key} className="bg-gray-200 rounded-lg flex flex-col">
                                <div className="p-3 border-b bg-white rounded-t-lg">
                                    <h3 className="font-bold text-gray-800">{titles[key]} <span className="text-sm font-normal text-gray-500">({jobs.length})</span></h3>
                                </div>
                                <div className="p-3 space-y-3 flex-grow overflow-y-auto h-64">
                                    {jobs.length > 0 ? jobs.map(job => (
                                        <ActionCard key={job.id} job={job} taskType={key} onMarkAsDone={handleMarkTaskAsDone} />
                                    )) : <p className="text-sm text-gray-400 text-center pt-10">Tidak ada tugas.</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Ringkasan Kinerja Bulan Ini</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard title="Jumlah WO Bulan Ini" value={kpi.monthlyWOCount} subtitle="Pekerjaan dibuat bulan ini" />
                    <KpiCard title="Rata-rata Nilai WO" value={kpi.avgWOValue} subtitle="Dari WO yang dibuat bulan ini" />
                    <KpiCard title="Akumulasi Gross Profit" value={kpi.totalGrossProfit} subtitle="Dari pekerjaan selesai bulan ini" />
                    <KpiCard title="Penyelesaian Tepat Waktu" value={kpi.onTimeRate} subtitle="Dari pekerjaan selesai bulan ini" />
                </div>
            </div>
        </>
    );

    return (
        <div className="bg-gray-50 p-4 sm:p-6 lg:p-8">
            {userPermissions.role === 'Manager' ? (
                <>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Kinerja Service Advisor</h1>
                    <div className="mb-6 flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
                        <label htmlFor="sa-select" className="font-semibold text-gray-700">Pilih SA untuk dilihat:</label>
                        <select
                            id="sa-select"
                            value={selectedSA}
                            onChange={(e) => setSelectedSA(e.target.value)}
                            className="p-2 border rounded-lg bg-white w-full max-w-xs"
                        >
                            <option value="">-- Pilih SA --</option>
                            {(settings.serviceAdvisors || []).map(sa => <option key={sa} value={sa}>{sa}</option>)}
                        </select>
                    </div>
                    {selectedSA ? <DashboardContent /> : <p className="text-center text-gray-500 mt-10">Silakan pilih Service Advisor untuk melihat data.</p>}
                </>
            ) : (
                <>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Selamat Datang, {saName}!</h1>
                    <p className="text-md text-gray-600 mb-6">Ini adalah daftar tugas kritis dan ringkasan kinerjamu.</p>
                    <DashboardContent />
                </>
            )}
        </div>
    );
};

export default SAKPIDashboard;

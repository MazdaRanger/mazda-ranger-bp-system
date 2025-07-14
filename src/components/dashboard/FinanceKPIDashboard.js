import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Daftarkan semua komponen Chart.js yang dibutuhkan
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Helper Functions ---
const diffInDays = (date1, date2) => {
    if (!date1 || !date2) return 0;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

// --- Reusable UI Components ---
const KpiCard = ({ title, value, subtitle }) => (
    <div className="bg-white p-5 rounded-xl shadow-md">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
);

const InsuranceLineChart = ({ data, title }) => {
    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: title, font: { size: 16 } }
        },
        interaction: { mode: 'index', intersect: false },
        scales: { y: { beginAtZero: true } }
    };
    return <Line options={options} data={data} />;
};

const ActionCard = ({ job, onOpenModal }) => {
    const totalRevenue = (job.hargaJasa || 0) + (job.hargaPart || 0);
    return (
        <div className="bg-white rounded-lg p-3 shadow border-l-4 border-sky-500">
            <p className="font-bold text-sky-600">{job.policeNumber}</p>
            <p className="text-sm text-gray-600">{job.customerName}</p>
            <p className="text-xs text-gray-500">{job.namaAsuransi}</p>
            <p className="text-sm font-semibold mt-1">Rp {totalRevenue.toLocaleString('id-ID')}</p>
            <button
                onClick={() => onOpenModal('finance_cost', job)}
                className="w-full mt-2 bg-sky-500 text-white text-xs font-bold py-1.5 px-2 rounded-md hover:bg-sky-600"
            >
                Lengkapi Data
            </button>
        </div>
    );
};


// --- Main Dashboard Component ---
const FinanceKPIDashboard = ({ allJobs, onBack, openModal }) => {
    const [activeTab, setActiveTab] = useState('summary');
    const [viewMode, setViewMode] = useState('monthly');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const processedData = useMemo(() => {
        // --- 1. Persiapan Struktur Data & Label ---
        const labels = [];
        const dataStructure = {};
        const today = new Date();

        if (viewMode === 'monthly') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
                labels.push(label);
                dataStructure[label] = {};
            }
        } else { // daily
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const label = `${i} ${monthNames[selectedMonth]}`;
                labels.push(label);
                dataStructure[label] = {};
            }
        }

        // --- 2. Memproses Data Pekerjaan ---
        allJobs.forEach(job => {
            if (!job.woNumber) return;
            const jobDate = job.createdAt?.toDate();
            if (!jobDate) return;

            let key;
            if (viewMode === 'monthly') {
                const d = new Date(jobDate.getFullYear(), jobDate.getMonth(), 1);
                key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            } else {
                 if (jobDate.getFullYear() !== selectedYear || jobDate.getMonth() !== selectedMonth) return;
                 key = `${jobDate.getDate()} ${monthNames[selectedMonth]}`;
            }

            if (dataStructure[key]) {
                const insuranceName = job.namaAsuransi || 'Umum / Pribadi';
                const totalRevenue = (job.hargaJasa || 0) + (job.hargaPart || 0);
                const totalExpenses = (job.costData?.hargaModalBahan || 0) + (job.costData?.hargaBeliPart || 0) + (job.costData?.jasaExternal || 0);
                const grossProfit = totalRevenue - totalExpenses;

                if (!dataStructure[key][insuranceName]) {
                    dataStructure[key][insuranceName] = { unit: 0, panel: 0, gp: 0 };
                }
                
                dataStructure[key][insuranceName].unit += 1;
                dataStructure[key][insuranceName].panel += (job.jumlahPanel || 0);
                dataStructure[key][insuranceName].gp += grossProfit;
            }
        });
        
        // --- 3. Memformat Data untuk Grafik ---
        const allInsurances = [...new Set(allJobs.map(j => j.namaAsuransi || 'Umum / Pribadi'))].sort();
        const colors = ['#3b82f6','#10b981','#f97316','#ef4444','#8b5cf6','#ec4899','#6366f1','#f59e0b','#22c55e','#14b8a6', '#6b7280', '#d946ef'];

        const createChartDataset = (dataType) => ({
            labels,
            datasets: allInsurances.map((insurance, index) => ({
                label: insurance,
                data: labels.map(label => dataStructure[label][insurance]?.[dataType] || 0),
                borderColor: colors[index % colors.length],
                backgroundColor: `${colors[index % colors.length]}1A`,
                tension: 0.2,
                fill: true,
            }))
        });

        const unitChartData = createChartDataset('unit');
        const panelChartData = createChartDataset('panel');
        const gpChartData = createChartDataset('gp');
        
        // --- 4. Kalkulasi Data untuk Tab Ringkasan ---
        const documentList = [ 'hasSpkAsuransi', 'hasWoEstimasi', 'hasApprovalBiaya', 'hasFotoPeneng', 'hasFotoEpoxy', 'hasGesekRangka', 'hasFotoSelesai', 'hasInvoice', 'hasFakturPajak' ];
        const docsIncomplete = allJobs.filter(j => j.statusPekerjaan === 'Selesai' && !j.isClosed && j.financeDocs && !documentList.every(doc => j.financeDocs[doc]));
        const readyForInvoice = allJobs.filter(j => !j.isClosed && !j.tanggalInvoice && j.financeDocs && documentList.every(doc => j.financeDocs[doc]));

        const outstandingAR = allJobs.filter(j => j.tanggalInvoice && j.statusPembayaran !== 'Lunas');
        const totalOutstandingAR = outstandingAR.reduce((sum, job) => sum + ((job.hargaJasa || 0) + (job.hargaPart || 0)), 0);
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const paidThisMonth = allJobs.filter(job => { const d = job.tanggalLunas ? new Date(job.tanggalLunas) : null; return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear; });
        const totalPaidThisMonth = paidThisMonth.reduce((sum, job) => sum + ((job.hargaJasa || 0) + (job.hargaPart || 0)), 0);
        
        const dsoTimes = allJobs.filter(j => j.tanggalInvoice && j.tanggalLunas).map(j => diffInDays(j.tanggalInvoice, j.tanggalLunas));
        const avgDSO = dsoTimes.length > 0 ? (dsoTimes.reduce((a, b) => a + b, 0) / dsoTimes.length).toFixed(1) : 0;

        const summaryKpi = {
            totalOutstandingAR: `Rp ${totalOutstandingAR.toLocaleString('id-ID')}`,
            totalPaidThisMonth: `Rp ${totalPaidThisMonth.toLocaleString('id-ID')}`,
            avgDSO: `${avgDSO} Hari`
        };

        return { unitChartData, panelChartData, gpChartData, summaryKpi, actionBoard: { docsIncomplete, readyForInvoice } };

    }, [allJobs, viewMode, selectedMonth, selectedYear]);

    // --- Komponen untuk Merender Isi Tab ---
    const renderTabContent = () => {
        const chartTitleSuffix = viewMode === 'monthly' ? '6 Bulan Terakhir' : `${monthNames[selectedMonth]} ${selectedYear}`;
        
        switch (activeTab) {
            case 'unit':
                return <InsuranceLineChart data={processedData.unitChartData} title={`Analisis Unit per Asuransi (${chartTitleSuffix})`} />;
            case 'panel':
                return <InsuranceLineChart data={processedData.panelChartData} title={`Analisis Jumlah Panel per Asuransi (${chartTitleSuffix})`} />;
            case 'gp':
                return <InsuranceLineChart data={processedData.gpChartData} title={`Analisis Gross Profit per Asuransi (${chartTitleSuffix})`} />;
            case 'summary':
            default:
                return (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <KpiCard title="Total Piutang (AR)" value={processedData.summaryKpi.totalOutstandingAR} subtitle="Semua tagihan belum lunas" />
                             <KpiCard title="Pembayaran Diterima" value={processedData.summaryKpi.totalPaidThisMonth} subtitle="Bulan ini" />
                             <KpiCard title="Rata-rata Hari Pembayaran (DSO)" value={processedData.summaryKpi.avgDSO} subtitle="Sejak invoice terbit" />
                        </div>
                        <div>
                             <h2 className="text-xl font-bold text-gray-800 mb-4">Papan Tugas (Action Board)</h2>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-200 rounded-lg flex flex-col">
                                    <div className="p-3 border-b bg-white rounded-t-lg">
                                        <h3 className="font-bold text-gray-800">Lengkapi Dokumen Penagihan <span className="text-sm font-normal text-gray-500">({processedData.actionBoard.docsIncomplete.length})</span></h3>
                                    </div>
                                    <div className="p-3 space-y-3 flex-grow overflow-y-auto h-64">
                                        {processedData.actionBoard.docsIncomplete.length > 0 ? processedData.actionBoard.docsIncomplete.map(job => (
                                            <ActionCard key={job.id} job={job} onOpenModal={openModal} />
                                        )) : <p className="text-sm text-gray-400 text-center pt-10">Semua dokumen lengkap.</p>}
                                    </div>
                                </div>
                                <div className="bg-gray-200 rounded-lg flex flex-col">
                                    <div className="p-3 border-b bg-white rounded-t-lg">
                                        <h3 className="font-bold text-gray-800">Siap Dibuat Invoice <span className="text-sm font-normal text-gray-500">({processedData.actionBoard.readyForInvoice.length})</span></h3>
                                    </div>
                                    <div className="p-3 space-y-3 flex-grow overflow-y-auto h-64">
                                         {processedData.actionBoard.readyForInvoice.length > 0 ? processedData.actionBoard.readyForInvoice.map(job => (
                                            <ActionCard key={job.id} job={job} onOpenModal={openModal} />
                                        )) : <p className="text-sm text-gray-400 text-center pt-10">Tidak ada pekerjaan baru.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="bg-gray-50 p-4 sm:p-6 lg:p-8 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Pusat Analisis Keuangan</h1>
                <button onClick={onBack} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">← Kembali</button>
            </div>

            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('summary')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'summary' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Ringkasan</button>
                    <button onClick={() => setActiveTab('unit')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'unit' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Analisis Unit</button>
                    <button onClick={() => setActiveTab('panel')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'panel' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Analisis Panel</button>
                    <button onClick={() => setActiveTab('gp')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'gp' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Analisis Gross Profit</button>
                </nav>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                {activeTab !== 'summary' && (
                    <div className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">Tampilan:</span>
                            <button onClick={() => setViewMode('monthly')} className={`px-3 py-1 text-sm rounded-full ${viewMode === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Perbandingan Bulanan</button>
                            <button onClick={() => setViewMode('daily')} className={`px-3 py-1 text-sm rounded-full ${viewMode === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Harian (Per Bulan)</button>
                        </div>
                        {viewMode === 'daily' && (
                            <div className="flex items-center gap-2">
                                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="p-2 border rounded-lg bg-white text-sm">
                                    {monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
                                </select>
                                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="p-2 border rounded-lg bg-white text-sm">
                                    {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="min-h-[400px]">
                   {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default FinanceKPIDashboard;

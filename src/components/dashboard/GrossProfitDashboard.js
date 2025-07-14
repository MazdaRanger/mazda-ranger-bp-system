import React, { useState, useMemo } from 'react';
import { formatCurrency, toYyyyMmDd } from '../../utils/helpers';

const GrossProfitDashboard = ({ allJobs, settings, onBack }) => {
    const [view, setView] = useState('monthly'); // 'monthly' or 'weekly'
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [selectedWeek, setSelectedWeek] = useState(1); // 1-5
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const weekOptions = [1, 2, 3, 4, 5];

    const data = useMemo(() => {
        const holidays = settings.nationalHolidays || [];
        
        const startOfMonth = new Date(selectedYear, selectedMonth, 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const getWeekRange = (week) => {
            const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            let startDay, endDay;

            if (week < 5) {
                startDay = (week - 1) * 7 + 1;
                endDay = week * 7;
            } else {
                startDay = 29;
                endDay = lastDayOfMonth;
            }
            startDay = Math.max(1, startDay);
            endDay = Math.min(endDay, lastDayOfMonth);
            
            const startDate = new Date(selectedYear, selectedMonth, startDay);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(selectedYear, selectedMonth, endDay);
            endDate.setHours(23, 59, 59, 999);

            return { start: startDate, end: endDate };
        };
        const weeklyRange = getWeekRange(selectedWeek);

        const inMonth = (firestoreTimestamp) => {
            if (!firestoreTimestamp || typeof firestoreTimestamp.toDate !== 'function') return false;
            const date = firestoreTimestamp.toDate();
            return date >= startOfMonth && date <= endOfMonth;
        };
        const inWeek = (firestoreTimestamp) => {
            if (!firestoreTimestamp || typeof firestoreTimestamp.toDate !== 'function') return false;
            const date = firestoreTimestamp.toDate();
            return date >= weeklyRange.start && date <= weeklyRange.end;
        };

        const monthlyEntryJobs = allJobs.filter(j => j.createdAt && inMonth(j.createdAt));
        const weeklyEntryJobs = allJobs.filter(j => j.createdAt && inWeek(j.createdAt));
        const monthlyClosedJobs = allJobs.filter(j => j.isClosed && j.closedAt && inMonth(j.closedAt));
        const weeklyClosedJobs = allJobs.filter(j => j.isClosed && j.closedAt && inWeek(j.closedAt));

        const calculateStats = (jobs) => {
            if (!jobs || jobs.length === 0) return { unit: 0, panel: 0, revJasa: 0, revPart: 0, costBahan: 0, costPart: 0, costSpkl: 0, gp: 0 };
            return jobs.reduce((acc, job) => {
                // --- [PERBAIKAN KONSISTENSI] ---
                // Memastikan field yang digunakan sama dengan di FinanceDashboard & CostModal.
                const costBahan = job.costData?.hargaModalBahan || 0;
                const costPart = job.costData?.hargaBeliPart || 0;
                const costSpkl = job.costData?.jasaExternal || 0;
                
                const totalRevenue = (job.hargaJasa || 0) + (job.hargaPart || 0);
                const totalExpenses = costBahan + costPart + costSpkl;
                
                // Lakukan kalkulasi ulang GP secara mandiri untuk memastikan akurasi.
                const grossProfit = totalRevenue - totalExpenses;

                return {
                    unit: acc.unit + 1,
                    panel: acc.panel + (Number(job.jumlahPanel) || 0),
                    revJasa: acc.revJasa + (job.hargaJasa || 0),
                    revPart: acc.revPart + (job.hargaPart || 0),
                    costBahan: acc.costBahan + costBahan,
                    costPart: acc.costPart + costPart,
                    costSpkl: acc.costSpkl + costSpkl,
                    gp: acc.gp + grossProfit
                }
            }, { unit: 0, panel: 0, revJasa: 0, revPart: 0, costBahan: 0, costPart: 0, costSpkl: 0, gp: 0 });
        };
        
        const getWorkingDays = (start, end) => {
             let count = 0;
             const curDate = new Date(start.getTime());
             while (curDate <= end) {
                 const dayOfWeek = curDate.getDay();
                 const dateString = toYyyyMmDd(curDate);
                 if (dayOfWeek !== 0 && !holidays.includes(dateString)) {
                     count++;
                 }
                 curDate.setDate(curDate.getDate() + 1);
             }
             return count > 0 ? count : 1;
        };

        const monthlyTargetStats = calculateStats(monthlyClosedJobs);
        const weeklyTargetStats = calculateStats(weeklyClosedJobs);
        
        const calculateProductivity = (targetStats, entryJobs, closedJobs, start, end) => ({
            avgUnitEntry: getWorkingDays(start, end) > 0 ? entryJobs.length / getWorkingDays(start, end) : 0,
            avgBahanPanel: Math.round(targetStats.panel > 0 ? targetStats.costBahan / targetStats.panel : 0),
            avgJasaPanel: Math.round(targetStats.panel > 0 ? targetStats.revJasa / targetStats.panel : 0),
            avgRevenueUnit: Math.round(targetStats.unit > 0 ? (targetStats.revJasa + targetStats.revPart) / targetStats.unit : 0),
            marginJasa: targetStats.revJasa > 0 ? ((targetStats.revJasa - targetStats.costBahan) / targetStats.revJasa) * 100 : 0,
            marginPart: targetStats.revPart > 0 ? ((targetStats.revPart - targetStats.costPart) / targetStats.revPart) * 100 : 0,
            totalUnitAsuransi: closedJobs.filter(j => j.namaAsuransi && j.namaAsuransi !== 'Umum / Pribadi' && j.namaAsuransi !== 'Lainnya').length,
            totalUnitPribadi: closedJobs.filter(j => !j.namaAsuransi || j.namaAsuransi === 'Umum / Pribadi' || j.namaAsuransi === 'Lainnya').length,
        });

        const forecastJobs = allJobs.filter(j => !j.isClosed);

        return {
            monthly: {
                forecast: calculateStats(forecastJobs),
                target: { ...monthlyTargetStats, unitEntry: monthlyEntryJobs.length },
                productivity: calculateProductivity(monthlyTargetStats, monthlyEntryJobs, monthlyClosedJobs, startOfMonth, endOfMonth)
            },
            weekly: {
                forecast: calculateStats(forecastJobs.filter(j => j.createdAt && inWeek(j.createdAt))),
                target: { ...weeklyTargetStats, unitEntry: weeklyEntryJobs.length },
                productivity: calculateProductivity(weeklyTargetStats, weeklyEntryJobs, weeklyClosedJobs, weeklyRange.start, weeklyRange.end)
            }
        };
    }, [allJobs, view, selectedYear, selectedMonth, selectedWeek, settings]);

    const currentData = view === 'monthly' ? data.monthly : data.weekly;
    const currentTargetValue = view === 'monthly' ? settings.monthlyTarget : settings.weeklyTarget;
    const gap = currentTargetValue - currentData.target.gp;

    const StatCard = ({ title, value, isCurrency = true, color = 'text-gray-900' }) => (
        <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`text-lg font-bold ${color}`}>{isCurrency ? formatCurrency(value) : (value || 0).toLocaleString('id-ID', {maximumFractionDigits: 2})}</p>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Pantau Gross Profit</h1>
                <button onClick={onBack} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100">← Kembali</button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center border-b pb-2">
                     <div className="flex">
                        <button onClick={() => setView('monthly')} className={`py-2 px-4 ${view === 'monthly' ? 'border-b-2 border-indigo-500 font-semibold' : 'text-gray-500'}`}>Bulanan</button>
                        <button onClick={() => setView('weekly')} className={`py-2 px-4 ${view === 'weekly' ? 'border-b-2 border-indigo-500 font-semibold' : 'text-gray-500'}`}>Mingguan</button>
                    </div>
                     <div className="flex gap-2">
                        {view === 'weekly' && (
                            <select value={selectedWeek} onChange={e => setSelectedWeek(Number(e.target.value))} className="p-2 border rounded-lg bg-white">
                                {weekOptions.map(w => <option key={w} value={w}>Minggu ke-{w}</option>)}
                            </select>
                        )}
                         <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="p-2 border rounded-lg bg-white">
                             {monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
                         </select>
                         <input type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="p-2 border rounded-lg bg-white w-24"/>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* FORECAST SECTION */}
                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <h2 className="text-xl font-bold text-blue-600 border-b pb-2">Forecast {view === 'monthly' ? 'Bulanan' : 'Mingguan'}</h2>
                    <p className="text-xs text-gray-500 -mt-2">Potensi dari semua WO yang masih open.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard title="Unit Open WO" value={currentData.forecast.unit} isCurrency={false} />
                        <StatCard title="Jumlah Panel" value={currentData.forecast.panel} isCurrency={false} />
                        <StatCard title="Total Revenue Jasa" value={currentData.forecast.revJasa} />
                        <StatCard title="Total Revenue Part" value={currentData.forecast.revPart} />
                        <StatCard title="Total Biaya Bahan" value={currentData.forecast.costBahan} />
                        <StatCard title="Total Biaya Beli Part" value={currentData.forecast.costPart} />
                        <StatCard title="Total Pek. Eksternal" value={currentData.forecast.costSpkl} />
                        <div className="bg-blue-50 p-4 rounded-lg col-span-2 text-center">
                            <p className="text-sm font-semibold text-blue-800">TOTAL POTENSI GROSS PROFIT</p>
                            <p className="text-2xl font-bold text-blue-800">{formatCurrency(currentData.forecast.gp)}</p>
                        </div>
                    </div>
                </div>

                {/* TARGET ACHIEVEMENT SECTION */}
                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <h2 className="text-xl font-bold text-green-600 border-b pb-2">Pencapaian Target {view === 'monthly' ? 'Bulanan' : 'Mingguan'}</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <StatCard title="Unit Entry" value={currentData.target.unitEntry} isCurrency={false} />
                                <StatCard title="Unit Close WO" value={currentData.target.unit} isCurrency={false} />
                            </div>
                            <StatCard title="Jumlah Panel" value={currentData.target.panel} isCurrency={false} />
                            <StatCard title="Total Revenue Jasa" value={currentData.target.revJasa} />
                            <StatCard title="Total Revenue Part" value={currentData.target.revPart} />
                            <StatCard title={`Biaya Bahan (Margin ${currentData.productivity.marginJasa.toFixed(1)}%)`} value={currentData.target.costBahan} />
                            <StatCard title={`Biaya Beli Part (Margin ${currentData.productivity.marginPart.toFixed(1)}%)`} value={currentData.target.costPart} />
                            <StatCard title="Total Pek. Eksternal" value={currentData.target.costSpkl} />
                        </div>
                        <div className="space-y-4">
                             <StatCard title="Target Gross Profit" value={currentTargetValue} color="text-gray-900" />
                             <StatCard title="Aktual Gross Profit" value={currentData.target.gp} color="text-green-600" />
                             <StatCard title="GAP Target" value={gap} color={gap > 0 ? "text-red-600" : "text-green-600"} />
                        </div>
                    </div>
                </div>
            </div>

            {/* PRODUCTIVITY SECTION */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4 mt-8">
                 <h2 className="text-xl font-bold text-purple-600 border-b pb-2">Productivity ({view === 'monthly' ? 'Bulanan' : 'Mingguan'})</h2>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard title="Avg. Unit Entry / Hari" value={currentData.productivity.avgUnitEntry} isCurrency={false} />
                    <StatCard title="Avg. Biaya Bahan / Panel" value={currentData.productivity.avgBahanPanel} />
                    <StatCard title="Avg. Revenue Jasa / Panel" value={currentData.productivity.avgJasaPanel} />
                    <StatCard title="Avg. Revenue / Unit" value={currentData.productivity.avgRevenueUnit} />
                    <StatCard title="Total Unit Asuransi" value={currentData.productivity.totalUnitAsuransi} isCurrency={false} />
                    <StatCard title="Total Unit Pribadi" value={currentData.productivity.totalUnitPribadi} isCurrency={false} />
                 </div>
            </div>
        </div>
    );
};

export default GrossProfitDashboard;

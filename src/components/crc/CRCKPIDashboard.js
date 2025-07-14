import React, { useState, useMemo } from 'react';

// Helper function to get the start of a day for a given date
const getStartOfDay = (date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
};

// --- Reusable UI Components (No Changes) ---
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
                        <span className="text-sm font-medium text-gray-600 w-32 truncate">{label}</span>
                        <div className="flex-grow bg-gray-200 rounded-full h-5 mr-2">
                            <div className="h-5 rounded-full" style={{ width: `${(value / maxValue) * 100}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-sm font-bold text-gray-700">{value}</span>
                    </div>
                ))}
                 {data.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Data tidak tersedia.</p>}
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---
const CRCKPIDashboard = ({ allJobs, onBack }) => {
    // --- [PERBAIKAN 1] --- Mengubah state untuk filter periode berbasis kalender
    const [filterPeriod, setFilterPeriod] = useState('thisMonth'); // 'thisMonth', 'lastMonth', 'last7days'

    const kpiData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        let startDate, endDate;

        // --- [PERBAIKAN 2] --- Logika baru untuk menentukan rentang tanggal berdasarkan filter
        switch (filterPeriod) {
            case 'lastMonth':
                startDate = getStartOfDay(new Date(currentYear, currentMonth - 1, 1));
                endDate = getStartOfDay(new Date(currentYear, currentMonth, 1));
                endDate.setMilliseconds(endDate.getMilliseconds() - 1); // Akhir dari hari sebelumnya
                break;
            case 'last7days':
                endDate = new Date();
                startDate = getStartOfDay(new Date(new Date().setDate(now.getDate() - 7)));
                break;
            case 'thisMonth':
            default:
                startDate = getStartOfDay(new Date(currentYear, currentMonth, 1));
                endDate = now;
                break;
        }

        let totalFollowUps = 0;
        const followUpsByCategory = {};
        
        // 1. KPI Aktivitas: Dihitung dari `followUpHistory` dalam rentang tanggal
        allJobs.forEach(job => {
            job.followUpHistory?.forEach(log => {
                const logDate = log.timestamp?.toDate();
                if (logDate && logDate >= startDate && logDate <= endDate) {
                    totalFollowUps++;
                    const category = log.type || 'Lainnya';
                    followUpsByCategory[category] = (followUpsByCategory[category] || 0) + 1;
                }
            });
        });

        // 2. KPI Konversi Booking: Dihitung dari pekerjaan yang dikonfirmasi dalam rentang tanggal
        const bookingFollowedUp = allJobs.filter(job => {
            if (!job.bookingConfirmed) return false;
            const confirmationLog = job.followUpHistory?.find(log => log.type === 'booking');
            if (!confirmationLog) return false;
            const confirmationDate = confirmationLog.timestamp?.toDate();
            return confirmationDate && confirmationDate >= startDate && confirmationDate <= endDate;
        });

        const bookingConverted = bookingFollowedUp.filter(job => 
            job.history?.some(h => h.status === 'Work In Progress' || h.status === 'Las Ketok')
        );
        const bookingConversionRate = bookingFollowedUp.length > 0
            ? Math.round((bookingConverted.length / bookingFollowedUp.length) * 100)
            : 0;
            
        // 3. KPI Survey: Dihitung dari survey yang diselesaikan dalam rentang tanggal
        const surveysCompletedInPeriod = allJobs.filter(job => {
            if (!job.surveyCompleted || !job.surveyData?.timestamp) return false;
            const surveyDate = job.surveyData.timestamp.toDate();
            return surveyDate >= startDate && surveyDate <= endDate;
        });
        
        const eligibleForSurvey = allJobs.filter(job => {
            if (!job.isClosed || !job.tanggalDiambil) return false;
            const deliveryDate = new Date(job.tanggalDiambil);
            return deliveryDate >= startDate && deliveryDate <= endDate;
        });

        const surveyResponseRate = eligibleForSurvey.length > 0
            ? Math.round((surveysCompletedInPeriod.length / eligibleForSurvey.length) * 100)
            : 0;
        
        const surveyScores = surveysCompletedInPeriod
            .filter(job => typeof job.surveyScore === 'number')
            .map(job => job.surveyScore);
        
        const averageSurveyScore = surveyScores.length > 0
            ? (surveyScores.reduce((a, b) => a + b, 0) / surveyScores.length).toFixed(1)
            : 'N/A';

        return {
            totalFollowUps,
            followUpsByCategory,
            bookingConversionRate,
            surveyResponseRate,
            averageSurveyScore,
        };

    }, [allJobs, filterPeriod]);

    const fuCategoryData = Object.entries(kpiData.followUpsByCategory)
        .map(([label, value], index) => ({
            label,
            value,
            color: ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899'][index % 5],
        }))
        .sort((a, b) => b.value - a.value);
        
    // --- [PERBAIKAN 3] --- Opsi filter yang baru untuk UI
    const filterOptions = [
        { id: 'thisMonth', label: 'Bulan Ini' },
        { id: 'lastMonth', label: 'Bulan Lalu' },
        { id: 'last7days', label: '7 Hari Terakhir' }
    ];

    return (
        <div className="bg-gray-50 p-4 sm:p-6 lg:p-8 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard KPI CRC</h1>
                <button onClick={onBack} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">← Kembali</button>
            </div>
            
            <div className="mb-6 flex justify-start items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Tampilkan data untuk:</span>
                {filterOptions.map(option => (
                    <button 
                        key={option.id}
                        onClick={() => setFilterPeriod(option.id)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                            filterPeriod === option.id ? 'bg-sky-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <KpiCard 
                    title="Total Follow-Up" 
                    value={kpiData.totalFollowUps}
                    subtitle={`Dalam periode terpilih`}
                    icon={<div className="p-3 bg-blue-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V4a2 2 0 012-2h8z" /></svg></div>}
                />
                <KpiCard 
                    title="Konversi Booking" 
                    value={`${kpiData.bookingConversionRate}%`}
                    subtitle="Dari FU menjadi Work In Progress"
                    icon={<div className="p-3 bg-green-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div>}
                />
                <KpiCard 
                    title="Skor Kepuasan" 
                    value={kpiData.averageSurveyScore}
                    subtitle={`Dari survey yang diisi`}
                    icon={<div className="p-3 bg-yellow-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.05 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg></div>}
                />
                <KpiCard 
                    title="Respons Survey" 
                    value={`${kpiData.surveyResponseRate}%`}
                    subtitle="Pelanggan yang mengisi survey"
                    icon={<div className="p-3 bg-purple-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></div>}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <BarChart title="Aktivitas Follow-Up per Kategori" data={fuCategoryData} />
            </div>
        </div>
    );
};

export default CRCKPIDashboard;

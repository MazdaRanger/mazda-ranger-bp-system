import React, { useMemo } from 'react';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';

const CRCDashboard = ({ allJobs, onBack, showNotification, openModal, settings, user }) => {
    const crcJobs = useMemo(() => {
        const followUpDays = settings.afterServiceFollowUpDays || 3;
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() - followUpDays);
        
        const openJobs = allJobs.filter(job => !job.isClosed);
        const closedJobs = allJobs.filter(job => job.isClosed);

        const booking = openJobs.filter(j => j.statusKendaraan === 'Booking Masuk' && !j.bookingConfirmed);
        const readyToCollect = openJobs.filter(j => j.statusPekerjaan === 'Selesai' && j.statusKendaraan !== 'Sudah Di ambil Pemilik' && !j.collectionNotified);
        const partReady = openJobs.filter(j => j.statusOrderPart === 'Ready' && j.posisiKendaraan === 'Di Pemilik' && !j.partReadyNotified);
        const outpatient = openJobs.filter(j => j.statusKendaraan === 'Rawat Jalan' && !j.outpatientFollowUpSent);
        
        const afterService = closedJobs.filter(job => {
            if (job.surveyCompleted) return false; 
            const tanggalDiambil = job.tanggalDiambil ? new Date(job.tanggalDiambil) : null;
            return tanggalDiambil && tanggalDiambil <= followUpDate;
        });

        return { booking, readyToCollect, afterService, partReady, outpatient };
    }, [allJobs, settings.afterServiceFollowUpDays]);

    const markAsDone = async (jobId, field, category) => {
        const jobRef = doc(db, JOBS_COLLECTION, jobId);
        
        // Buat entri log yang akan disimpan di riwayat
        const logEntry = {
            type: category, // e.g., 'booking', 'readyToCollect'
            message: `Tugas "${category}" ditandai selesai.`,
            timestamp: serverTimestamp(),
            sentBy: user.email,
        };

        try {
            // Update status dan tambahkan log ke array 'followUpHistory'
            await updateDoc(jobRef, {
                [field]: true,
                followUpHistory: arrayUnion(logEntry)
            });
            showNotification("Status follow-up berhasil diperbarui dan dicatat.", "success");
        } catch (error) {
            showNotification("Gagal memperbarui status.", "error");
            console.error("Error updating status:", error);
        }
    };
    
    const JobCard = ({ job, category }) => {
        const actions = {
            booking: { doneField: 'bookingConfirmed', doneText: 'Konfirmasi Selesai' },
            readyToCollect: { doneField: 'collectionNotified', doneText: 'Info Selesai' },
            afterService: { isSurvey: true, surveyText: 'Isi Survey' },
            partReady: { doneField: 'partReadyNotified', doneText: 'Part Info Selesai' },
            outpatient: { doneField: 'outpatientFollowUpSent', doneText: 'Follow Up Selesai' },
        };
        const action = actions[category];

        return (
            <div className="bg-white rounded-lg p-4 shadow flex-shrink-0 w-full">
                <p className="font-bold text-sky-600">{job.policeNumber}</p>
                <p className="text-sm text-gray-700">{job.customerName}</p>
                <p className="text-xs text-gray-500">{job.carModel}</p>
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                    {action.isSurvey ? (
                        <button onClick={() => openModal('survey', job)} className="text-xs bg-indigo-500 text-white px-3 py-1 rounded font-semibold hover:bg-indigo-600">{action.surveyText}</button>
                    ) : (
                        <button onClick={() => markAsDone(job.id, action.doneField, category)} className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">{action.doneText}</button>
                    )}
                    <button onClick={() => openModal('whatsapp_followup', job)} className="text-xs bg-green-500 text-white px-3 py-1 rounded font-semibold hover:bg-green-600">Follow-Up WA</button>
                </div>
            </div>
        );
    };
    
    const CategoryColumn = ({ title, jobs, category, color }) => (
        <div className="bg-gray-100 rounded-lg p-4 flex flex-col h-[75vh]">
            <h2 className={`font-bold text-lg ${color} mb-4 flex-shrink-0`}>{title} ({jobs.length})</h2>
            <div className="space-y-4 overflow-y-auto flex-grow">
                {jobs.length > 0 ? jobs.map(job => <JobCard key={job.id} job={job} category={category} />) : <p className="text-sm text-gray-500 text-center pt-10">Tidak ada data.</p>}
            </div>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">CRC Follow-Up Dashboard</h1>
                <button onClick={onBack} className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100">← Kembali</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <CategoryColumn title="Konfirmasi Booking" jobs={crcJobs.booking} category="booking" color="text-blue-800" />
                <CategoryColumn title="Info Kendaraan Selesai" jobs={crcJobs.readyToCollect} category="readyToCollect" color="text-green-800" />
                <CategoryColumn title="Part Ready (di Pemilik)" jobs={crcJobs.partReady} category="partReady" color="text-yellow-800" />
                <CategoryColumn title="Follow-Up Rawat Jalan" jobs={crcJobs.outpatient} category="outpatient" color="text-indigo-800" />
                <CategoryColumn title="Follow-Up After Service" jobs={crcJobs.afterService} category="afterService" color="text-purple-800" />
            </div>
        </div>
    );
};

export default CRCDashboard;

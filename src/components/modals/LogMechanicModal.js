import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';
import { toYyyyMmDd } from '../../utils/helpers';

const LogMechanicModal = ({ closeModal, showNotification, user, settings, ...jobData }) => {
    const [logEntry, setLogEntry] = useState({
        namaMekanik: '',
        tahapanPekerjaan: '',
        jumlahPanel: '',
        isRework: false,
        alasanRework: '',
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setLogEntry(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!logEntry.namaMekanik || !logEntry.tahapanPekerjaan || !logEntry.jumlahPanel) {
            showNotification("Harap isi semua field yang diperlukan.", "error");
            return;
        }

        if (logEntry.isRework && !logEntry.alasanRework.trim()) {
            showNotification("Alasan Rework wajib diisi jika ini adalah pekerjaan ulang.", "error");
            return;
        }

        const newLog = {
            ...logEntry,
            jumlahPanel: parseFloat(logEntry.jumlahPanel) || 0,
            tanggalLog: new Date(),
            dicatatOleh: user.email,
        };

        try {
            const jobRef = doc(db, JOBS_COLLECTION, jobData.id);
            
            const dataToUpdate = {
                logPekerjaan: arrayUnion(newLog)
            };

            if (newLog.isRework) {
                dataToUpdate.isRework = true;
            }

            await updateDoc(jobRef, dataToUpdate);
            showNotification("Log mekanik berhasil ditambahkan.", "success");
            closeModal();
        } catch (error) {
            showNotification("Gagal menyimpan log.", "error");
            console.error("Error adding log:", error);
        }
    };

    const jobLogs = jobData.logPekerjaan || [];

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Log Kinerja Mekanik ({jobData.policeNumber})</h2>

            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nama Mekanik</label>
                        <select name="namaMekanik" value={logEntry.namaMekanik} onChange={handleInputChange} className="mt-1 p-2 border rounded-md w-full bg-white">
                            <option value="">Pilih Mekanik</option>
                            {(settings.mechanicNames || []).map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tahapan Pekerjaan</label>
                        <select name="tahapanPekerjaan" value={logEntry.tahapanPekerjaan} onChange={handleInputChange} className="mt-1 p-2 border rounded-md w-full bg-white">
                            <option value="">Pilih Tahapan</option>
                            {(settings.statusPekerjaanOptions || []).filter(s => s !== "Belum Mulai Perbaikan").map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Jumlah Panel Dikerjakan</label>
                        <input type="number" step="0.5" name="jumlahPanel" value={logEntry.jumlahPanel} onChange={handleInputChange} className="mt-1 p-2 border rounded-md w-full"/>
                    </div>
                    <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="isRework" checked={logEntry.isRework} onChange={handleInputChange} className="h-5 w-5 rounded"/>
                            <span className="text-sm font-medium text-gray-700">Pekerjaan Ulang (Rework)</span>
                        </label>
                    </div>
                </div>
                {logEntry.isRework && (
                    <div>
                        <label className="block text-sm font-semibold text-red-600">Alasan Rework *</label>
                        <textarea name="alasanRework" value={logEntry.alasanRework} onChange={handleInputChange} className="mt-1 p-2 border rounded-md w-full" rows="2" placeholder="Jelaskan alasan pekerjaan diulang..."></textarea>
                    </div>
                )}
                <div className="flex justify-end">
                    <button type="submit" className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-indigo-700">Simpan Log</button>
                </div>
            </form>

            <h3 className="text-lg font-bold mb-2">Riwayat Pengerjaan</h3>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
                {jobLogs.length > 0 ? (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-2">Tanggal</th>
                                <th className="p-2">Mekanik</th>
                                <th className="p-2">Tahapan</th>
                                <th className="p-2 text-center">Panel</th>
                                <th className="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobLogs.slice().sort((a,b) => (b.tanggalLog?.toDate() || 0) - (a.tanggalLog?.toDate() || 0)).map((log, index) => (
                                <tr key={index} className={`border-b ${log.isRework ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                                    <td className="p-2">{log.tanggalLog ? toYyyyMmDd(log.tanggalLog) : 'Baru'}</td>
                                    <td className="p-2">{log.namaMekanik}</td>
                                    <td className="p-2">{log.tahapanPekerjaan}</td>
                                    <td className="p-2 text-center">{log.jumlahPanel}</td>
                                    <td className={`p-2 font-semibold ${log.isRework ? 'text-red-600' : 'text-green-600'}`}>{log.isRework ? 'Rework' : 'Selesai'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="p-4 text-center text-gray-500">Belum ada log pekerjaan.</p>
                )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">Tutup</button>
            </div>
        </div>
    );
};

export default LogMechanicModal;

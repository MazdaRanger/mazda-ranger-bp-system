import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';
import { generatePDF } from '../../utils/helpers';

const EditJobModal = ({ closeModal, showNotification, user, openModal, settings, userPermissions, ...jobData }) => {
    // --- [PERBAIKAN] ---
    // Menggunakan pola yang sama dengan EditDataModal untuk inisialisasi state
    // agar lebih aman dan tidak meng-copy objek kompleks.
    const [formData, setFormData] = useState({
        policeNumber: jobData.policeNumber || '',
        nomorRangka: jobData.nomorRangka || '',
        statusKendaraan: jobData.statusKendaraan || '',
        statusPekerjaan: jobData.statusPekerjaan || '',
        tanggalMulaiPerbaikan: jobData.tanggalMulaiPerbaikan || '',
        tanggalEstimasiSelesai: jobData.tanggalEstimasiSelesai || '',
        tanggalDiambil: jobData.tanggalDiambil || '',
        jumlahPanel: jobData.jumlahPanel || 0,
    });
    
    const [isReworking, setIsReworking] = useState(jobData.isRework || false);
    const [reworkReason, setReworkReason] = useState(jobData.reworkReason || '');
    const [reworkResponsibleMechanic, setReworkResponsibleMechanic] = useState(jobData.reworkResponsibleMechanic || '');
    const [saTasks, setSaTasks] = useState(jobData.saTasks || {});

    const statusPekerjaanOptions = settings.statusPekerjaanOptions || [];
    const currentStatusIndex = statusPekerjaanOptions.indexOf(jobData.statusPekerjaan);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (type === 'checkbox') {
            if (name === 'isRework') setIsReworking(checked);
            return;
        }

        setFormData(prev => {
            const newFormData = { ...prev, [name]: value };

            if (name === 'tanggalMulaiPerbaikan' && value && jobData.statusPekerjaan === 'Belum Mulai Perbaikan') {
                newFormData.statusKendaraan = 'Work In Progress';
                newFormData.statusPekerjaan = 'Las Ketok';
            }
            
            if (name === 'statusKendaraan' && value === 'Sudah Di ambil Pemilik') {
                newFormData.tanggalDiambil = new Date().toISOString().slice(0, 10);
            }
            return newFormData;
        });
    };

    const handleSaTaskChange = (e) => {
        const { name, checked } = e.target;
        setSaTasks(prev => ({ ...prev, [name]: checked }));
    };

    const isJumlahPanelRequired = formData.statusPekerjaan && formData.statusPekerjaan !== 'Belum Mulai Perbaikan';
    const isSaveDisabled = isJumlahPanelRequired && (!formData.jumlahPanel || formData.jumlahPanel <= 0);

    const handleSave = async () => {
        if (isSaveDisabled) {
            showNotification("Jumlah Panel wajib diisi jika pekerjaan sudah dimulai.", "error");
            return false;
        }
        if (jobData.statusPekerjaan === 'Belum Mulai Perbaikan' && formData.statusPekerjaan !== 'Belum Mulai Perbaikan' && !formData.tanggalEstimasiSelesai) {
            showNotification("Tanggal Estimasi Selesai wajib diisi sebelum memulai pekerjaan.", "error");
            return false;
        }
        if (isReworking && (!reworkReason || !reworkResponsibleMechanic)) {
            showNotification("Alasan Rework dan Penanggung Jawab wajib diisi jika mode rework aktif.", "error");
            return false;
        }

        try {
            const dataToUpdate = {
                ...formData,
                jumlahPanel: Number(formData.jumlahPanel) || 0,
                isRework: isReworking,
                saTasks: saTasks,
                updatedAt: serverTimestamp(),
                lastUpdatedBy: user.email,
                history: jobData.history || []
            };
            
            if (isReworking) {
                dataToUpdate.reworkReason = reworkReason;
                dataToUpdate.reworkResponsibleMechanic = reworkResponsibleMechanic;
                if (!jobData.isRework) {
                    dataToUpdate.reworkStall = jobData.statusPekerjaan;
                    dataToUpdate.history.push({
                        status: `Mode Rework Diaktifkan (di tahap: ${jobData.statusPekerjaan})`,
                        timestamp: new Date(),
                        updatedBy: user.email,
                        isRework: true
                    });
                }
            }

            if (formData.statusPekerjaan !== jobData.statusPekerjaan) {
                dataToUpdate.history.push({
                    status: formData.statusPekerjaan,
                    timestamp: new Date(),
                    updatedBy: user.email,
                    isRework: isReworking
                });
            }
            
            await updateDoc(doc(db, JOBS_COLLECTION, jobData.id), dataToUpdate);
            showNotification("Perubahan berhasil disimpan.", "success");
            return true;
        } catch (error) {
            showNotification("Gagal menyimpan perubahan. Coba lagi.", "error");
            console.error("Error saving job data:", error);
            return false;
        }
    };

    const handlePrintWO = () => {
        generatePDF({ ...jobData, ...formData }, true, showNotification);
    };

    const handleSaveAndOpenEstimate = async () => {
        const isSuccess = await handleSave();
        if (isSuccess) {
            openModal('estimate', { ...jobData, ...formData });
        }
    };

    const isStatusPekerjaanDisabled = !formData.tanggalMulaiPerbaikan;
    const canAccessRework = userPermissions.role === 'Manager' || userPermissions.role === 'Foreman';
    const isEstimasiRequired = formData.statusPekerjaan !== 'Belum Mulai Perbaikan';

    const statusKendaraanOptions = settings.statusKendaraanOptions || [];

    const filteredStatusPekerjaanOptions = () => {
        if (isReworking) return statusPekerjaanOptions;
        return statusPekerjaanOptions.filter((_, index) => index >= currentStatusIndex);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Estimasi & WO ({jobData.policeNumber})</h2>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg">
                    <legend className="px-2 font-semibold">Info Kendaraan</legend>
                    <div><label>No. Polisi</label><input type="text" name="policeNumber" value={formData.policeNumber || ''} onChange={handleInputChange} className="p-2 border w-full"/></div>
                    <div><label>No. Rangka</label><input type="text" name="nomorRangka" value={formData.nomorRangka || ''} onChange={handleInputChange} className="p-2 border w-full"/></div>
                </fieldset>
                <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg">
                    <legend className="px-2 font-semibold">Update Status Pekerjaan</legend>
                    <div><label>Status Kendaraan</label><select name="statusKendaraan" value={formData.statusKendaraan || ''} onChange={handleInputChange} className="p-2 border w-full">{statusKendaraanOptions.map(s => <option key={s}>{s}</option>)}</select></div>
                    <div>
                        <label>Status Pekerjaan</label>
                        <select 
                            name="statusPekerjaan" 
                            value={formData.statusPekerjaan || ''}
                            onChange={handleInputChange} 
                            className="p-2 border w-full" 
                            disabled={isStatusPekerjaanDisabled}
                            title={isStatusPekerjaanDisabled ? "Isi tanggal mulai perbaikan untuk mengaktifkan" : "Ubah status pekerjaan"}
                        >
                            {filteredStatusPekerjaanOptions().map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div><label>Tgl Mulai Perbaikan</label><input type="date" name="tanggalMulaiPerbaikan" value={formData.tanggalMulaiPerbaikan || ''} onChange={handleInputChange} className="p-2 border w-full"/></div>
                    <div>
                        <label className={`block font-medium ${isEstimasiRequired ? 'text-red-500' : ''}`}>
                            Tgl Estimasi Selesai {isEstimasiRequired && '*'}
                        </label>
                        <input type="date" name="tanggalEstimasiSelesai" value={formData.tanggalEstimasiSelesai || ''} onChange={handleInputChange} className="p-2 border w-full"/>
                    </div>
                    <div><label className={`block font-medium ${isJumlahPanelRequired ? 'text-red-500' : ''}`}>Jumlah Panel {isJumlahPanelRequired && '*'}</label><input type="number" name="jumlahPanel" value={formData.jumlahPanel || ''} onChange={handleInputChange} className="p-2 border w-full"/></div>
                    
                    {canAccessRework && (
                        <div className="md:col-span-2 bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="isRework" checked={isReworking} onChange={handleInputChange} className="h-5 w-5 rounded text-yellow-600 focus:ring-yellow-500"/>
                                <span className="font-bold text-yellow-800">Aktifkan Mode Pengerjaan Ulang (Rework)</span>
                            </label>
                            <p className="text-xs text-yellow-700 mt-1 ml-8">Centang ini jika ada perbaikan ulang. Ini akan mengizinkan status pekerjaan untuk dimundurkan.</p>
                            {isReworking && (
                                <div className="mt-3 ml-8 space-y-2">
                                    <div>
                                        <label className="text-sm font-semibold text-yellow-800">Alasan Rework *</label>
                                        <textarea value={reworkReason} onChange={(e) => setReworkReason(e.target.value)} className="p-2 border rounded-lg w-full mt-1 text-sm" rows="2" placeholder="Jelaskan alasan pengerjaan ulang..."/>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-yellow-800">Penanggung Jawab (Mekanik) *</label>
                                        <select value={reworkResponsibleMechanic} onChange={(e) => setReworkResponsibleMechanic(e.target.value)} className="p-2 border rounded-lg w-full mt-1 bg-white">
                                            <option value="">Pilih Mekanik</option>
                                            {(settings.mechanicNames || []).map(name => <option key={name} value={name}>{name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </fieldset>
                
                <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg">
                    <legend className="px-2 font-semibold">Tugas Kritis SA</legend>
                    <div className="flex items-center">
                        <input type="checkbox" id="needsSpkAppeal" name="needsSpkAppeal" checked={saTasks.needsSpkAppeal || false} onChange={handleSaTaskChange} className="h-4 w-4 rounded" />
                        <label htmlFor="needsSpkAppeal" className="ml-2 text-sm">Butuh Banding SPK</label>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" id="needsSupplement" name="needsSupplement" checked={saTasks.needsSupplement || false} onChange={handleSaTaskChange} className="h-4 w-4 rounded" />
                        <label htmlFor="needsSupplement" className="ml-2 text-sm">Butuh Pengajuan Penambahan</label>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" id="needsEstimation" name="needsEstimation" checked={saTasks.needsEstimation || false} onChange={handleSaTaskChange} className="h-4 w-4 rounded" />
                        <label htmlFor="needsEstimation" className="ml-2 text-sm">SPK Langsung, Tunggu Estimasi</label>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" id="needsCustomerApproval" name="needsCustomerApproval" checked={saTasks.needsCustomerApproval || false} onChange={handleSaTaskChange} className="h-4 w-4 rounded" />
                        <label htmlFor="needsCustomerApproval" className="ml-2 text-sm">Butuh Approval Pelanggan</label>
                    </div>
                </fieldset>
            </div>
            <div className="flex justify-between items-center mt-8 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg">Tutup</button>
                <div className="flex gap-4">
                    <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-400" disabled={isSaveDisabled}>Simpan Perubahan</button>
                    <button onClick={handleSaveAndOpenEstimate} className="bg-yellow-500 text-white px-4 py-2 rounded-lg">Buat Estimasi Biaya</button>
                    <button onClick={handlePrintWO} className="bg-green-600 text-white px-4 py-2 rounded-lg">Cetak WO</button>
                </div>
            </div>
        </div>
    );
};

export default EditJobModal;

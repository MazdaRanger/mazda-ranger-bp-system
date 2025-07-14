import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';
import { mazdaModels, mazdaColors, posisiKendaraanOptions } from '../../utils/constants';
import { toYyyyMmDd } from '../../utils/helpers';

const EditDataModal = ({ closeModal, showNotification, user, settings, ...jobData }) => {
    
    // --- [PERBAIKAN UTAMA] ---
    // Inisialisasi state 'formData' secara eksplisit hanya dengan field yang relevan.
    // Ini mencegah objek kompleks (seperti Timestamps atau array) masuk ke state.
    const [formData, setFormData] = useState({
        policeNumber: jobData.policeNumber || '',
        customerName: jobData.customerName || '',
        customerPhone: jobData.customerPhone || '',
        namaSA: jobData.namaSA || '',
        carModel: mazdaModels.includes(jobData.carModel) ? jobData.carModel : 'Lainnya',
        carModelLainnya: !mazdaModels.includes(jobData.carModel) ? jobData.carModel : '',
        warnaMobil: mazdaColors.includes(jobData.warnaMobil) ? jobData.warnaMobil : 'Lainnya',
        warnaMobilLainnya: !mazdaColors.includes(jobData.warnaMobil) ? jobData.warnaMobil : '',
        namaAsuransi: (settings.insuranceOptions.map(i => i.name).includes(jobData.namaAsuransi)) ? jobData.namaAsuransi : 'Lainnya',
        namaAsuransiLainnya: !(settings.insuranceOptions.map(i => i.name).includes(jobData.namaAsuransi)) ? jobData.namaAsuransi : '',
        tanggalMasuk: toYyyyMmDd(jobData.tanggalMasuk),
        posisiKendaraan: jobData.posisiKendaraan || 'Di Bengkel',
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'policeNumber') {
            const formattedValue = value.replace(/\s/g, '').toUpperCase();
            setFormData(prev => ({ ...prev, [name]: formattedValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.policeNumber || !formData.customerName) {
            showNotification("No. Polisi & Nama Pelanggan wajib diisi.", "error");
            return;
        }
        
        // Objek 'dataToUpdate' juga dibuat secara eksplisit untuk keamanan.
        const dataToUpdate = {
            policeNumber: formData.policeNumber,
            customerName: formData.customerName,
            customerPhone: formData.customerPhone,
            namaSA: formData.namaSA,
            tanggalMasuk: formData.tanggalMasuk,
            posisiKendaraan: formData.posisiKendaraan,
            updatedAt: serverTimestamp(),
            lastUpdatedBy: user.email,
        };

        // Logika cerdas untuk menangani pilihan "Lainnya"
        dataToUpdate.carModel = formData.carModel === 'Lainnya' ? (formData.carModelLainnya || 'Lainnya') : formData.carModel;
        dataToUpdate.warnaMobil = formData.warnaMobil === 'Lainnya' ? (formData.warnaMobilLainnya || 'Lainnya') : formData.warnaMobil;
        dataToUpdate.namaAsuransi = formData.namaAsuransi === 'Lainnya' ? (formData.namaAsuransiLainnya || 'Lainnya') : formData.namaAsuransi;

        try {
            await updateDoc(doc(db, JOBS_COLLECTION, jobData.id), dataToUpdate);
            showNotification("Data informasi berhasil diperbarui.", "success");
            closeModal();
        } catch (error) {
            showNotification("Gagal memperbarui data.", "error");
            console.error("Error updating document: ", error);
        }
    };
    
    const insuranceOptions = (settings.insuranceOptions || []).map(opt => opt.name);
    const serviceAdvisors = settings.serviceAdvisors || [];

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Edit Informasi Dasar ({jobData.policeNumber})</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg">
                    <legend className="px-2 font-semibold">Info Kendaraan & Pelanggan</legend>
                    <div><label>Nomor Polisi</label><input type="text" name="policeNumber" value={formData.policeNumber} onChange={handleInputChange} className="p-2 border w-full" required /></div>
                    <div><label>Nama Pelanggan</label><input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} className="p-2 border w-full" required /></div>
                    <div><label>No. HP / WA</label><input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleInputChange} className="p-2 border w-full"/></div>
                    <div><label>Service Advisor (SA)</label><select name="namaSA" value={formData.namaSA} onChange={handleInputChange} className="p-2 border w-full bg-white"><option value="">Pilih SA</option>{serviceAdvisors.map(sa => <option key={sa} value={sa}>{sa}</option>)}</select></div>
                    <div className="md:col-span-3 flex items-end gap-2"><div className="flex-grow"><label>Model Mobil</label><select name="carModel" value={formData.carModel} onChange={handleInputChange} className="p-2 border w-full bg-white">{[...mazdaModels, "Lainnya"].map(m => <option key={m}>{m}</option>)}</select></div>{formData.carModel === 'Lainnya' && <input type="text" name="carModelLainnya" value={formData.carModelLainnya || ''} onChange={handleInputChange} placeholder="Model Lainnya" className="p-2 border w-full" />}</div>
                    <div className="md:col-span-3 flex items-end gap-2"><div className="flex-grow"><label>Warna Mobil</label><select name="warnaMobil" value={formData.warnaMobil} onChange={handleInputChange} className="p-2 border w-full bg-white">{[...mazdaColors, "Lainnya"].map(c => <option key={c}>{c}</option>)}</select></div>{formData.warnaMobil === 'Lainnya' && <input type="text" name="warnaMobilLainnya" value={formData.warnaMobilLainnya || ''} onChange={handleInputChange} placeholder="Warna Lainnya" className="p-2 border w-full"/>}</div>
                    <div className="md:col-span-3 flex items-end gap-2"><div className="flex-grow"><label>Nama Asuransi</label><select name="namaAsuransi" value={formData.namaAsuransi} onChange={handleInputChange} className="p-2 border w-full bg-white">{[...insuranceOptions].map(ins => <option key={ins} value={ins}>{ins}</option>)}</select></div>{formData.namaAsuransi === 'Lainnya' && <input type="text" name="namaAsuransiLainnya" value={formData.namaAsuransiLainnya || ''} onChange={handleInputChange} placeholder="Asuransi Lainnya" className="p-2 border w-full"/>}</div>
                    <div><label>Tgl Masuk</label><input type="date" name="tanggalMasuk" value={formData.tanggalMasuk} onChange={handleInputChange} className="p-2 border w-full" /></div>
                    <div>
                        <label>Posisi Kendaraan</label>
                        <select name="posisiKendaraan" value={formData.posisiKendaraan} onChange={handleInputChange} className="p-2 border w-full bg-white rounded-lg">
                            {posisiKendaraanOptions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </fieldset>
                <div className="flex justify-end mt-6 gap-4">
                    <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button>
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg">Simpan Perubahan</button>
                </div>
            </form>
        </div>
    );
};

export default EditDataModal;

import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';
import { 
    initialFormState, 
    initialCostState, 
    initialEstimateData,
    mazdaModels,
    mazdaColors,
    posisiKendaraanOptions
} from '../../utils/constants';

const AddJobModal = ({ closeModal, showNotification, user, settings }) => { 
    const [formData, setFormData] = useState({
        ...initialFormState,
        namaSA: '',
        namaAsuransi: (settings.insuranceOptions[0]?.name || ''),
        statusKendaraan: (settings.statusKendaraanOptions[0] || ''),
        statusPekerjaan: (settings.statusPekerjaanOptions[0] || ''),
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

    const handlePoliceNumberBlur = async () => { 
        if (!formData.policeNumber) return; 
        const q = query(collection(db, JOBS_COLLECTION), where("policeNumber", "==", formData.policeNumber)); 
        const querySnapshot = await getDocs(q); 
        if (!querySnapshot.empty) { 
            const d = querySnapshot.docs[0].data(); 
            setFormData(p => ({ ...p, customerName: d.customerName, customerPhone: d.customerPhone, carModel: d.carModel, warnaMobil: d.warnaMobil, namaAsuransi: d.namaAsuransi, nomorRangka: d.nomorRangka })); 
            showNotification("Data kendaraan yang sudah ada ditemukan.", "info"); 
        } 
    }; 

    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        if (!formData.policeNumber || !formData.customerName) { 
            showNotification("No. Polisi & Nama Pelanggan wajib diisi.", "error"); 
            return; 
        }
        if (!formData.namaSA) {
            showNotification("Service Advisor (SA) wajib dipilih.", "error");
            return;
        }

        try {
            const dataToSave = {...formData};
            if(formData.carModel === 'Lainnya') dataToSave.carModel = formData.carModelLainnya;
            if(formData.warnaMobil === 'Lainnya') dataToSave.warnaMobil = formData.warnaMobilLainnya;
            if(formData.namaAsuransi === 'Lainnya') dataToSave.namaAsuransi = formData.namaAsuransiLainnya;
            delete dataToSave.carModelLainnya;
            delete dataToSave.warnaMobilLainnya;
            delete dataToSave.namaAsuransiLainnya;

            const initialHistory = { status: dataToSave.statusPekerjaan, timestamp: new Date(), updatedBy: user.email };
            
            // --- [PERBAIKAN UTAMA] ---
            // Menginisialisasi semua field yang akan digunakan nanti, terutama array,
            // untuk mencegah error 'undefined' pada komponen lain.
            await addDoc(collection(db, JOBS_COLLECTION), { 
                ...dataToSave, 
                createdAt: serverTimestamp(),
                createdBy: user.email, 
                costData: initialCostState, 
                estimateData: initialEstimateData,
                history: [initialHistory],
                // Inisialisasi array kosong untuk riwayat follow-up
                followUpHistory: [], 
                // Inisialisasi array kosong untuk log mekanik
                logPekerjaan: [],
                // Inisialisasi field-field boolean
                isRework: false,
                isClosed: false,
                isWoConfirmed: false,
                // Inisialisasi objek untuk tugas SA
                saTasks: {
                    needsSpkAppeal: false, spkAppealDone: false,
                    needsSupplement: false, supplementDone: false,
                    needsEstimation: false, estimationDone: false,
                    needsCustomerApproval: false, customerApprovalDone: false,
                },
                // Inisialisasi objek untuk dokumen finance
                financeDocs: {
                    hasSpkAsuransi: false, hasWoEstimasi: false, hasApprovalBiaya: false,
                    hasFotoPeneng: false, hasFotoEpoxy: false, hasGesekRangka: false,
                    hasFotoSelesai: false, hasInvoice: false, hasFakturPajak: false,
                },
            }); 
            showNotification("Data baru berhasil disimpan.", "success"); 
            closeModal(); 

        } catch (error) {
            showNotification("Gagal menyimpan data baru. Silakan coba lagi.", "error");
            console.error("Error adding new document:", error);
        }
    };
    
    const insuranceOptions = (settings.insuranceOptions || []).map(opt => opt.name);
    const serviceAdvisors = settings.serviceAdvisors || [];
    const statusKendaraanOptions = settings.statusKendaraanOptions || [];
    const statusPekerjaanOptions = settings.statusPekerjaanOptions || [];

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Tambah Data Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg">
                    <legend className="px-2 font-semibold">Info Kendaraan & Pelanggan</legend>
                    <div><label>Nomor Polisi</label><input type="text" name="policeNumber" value={formData.policeNumber} onChange={handleInputChange} onBlur={handlePoliceNumberBlur} className="p-2 border w-full" required /></div>
                    <div><label>Nama Pelanggan</label><input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} className="p-2 border w-full" required /></div>
                    <div><label>No. HP / WA</label><input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleInputChange} className="p-2 border w-full"/></div>
                    <div><label>Nomor Rangka</label><input type="text" name="nomorRangka" value={formData.nomorRangka || ''} onChange={handleInputChange} className="p-2 border w-full"/></div>
                    <div><label>Service Advisor (SA)</label><select name="namaSA" value={formData.namaSA} onChange={handleInputChange} className="p-2 border w-full" required><option value="">Pilih SA</option>{serviceAdvisors.map(sa => <option key={sa} value={sa}>{sa}</option>)}</select></div>
                    <div><label>Jumlah Panel</label><input type="number" name="jumlahPanel" value={formData.jumlahPanel} onChange={handleInputChange} className="p-2 border w-full"/></div>
                    <div className="md:col-span-3 flex items-end gap-2">
                        <div className="flex-grow"><label>Model Mobil</label><select name="carModel" value={formData.carModel} onChange={handleInputChange} className="p-2 border w-full">{[...mazdaModels, "Lainnya"].map(m => <option key={m}>{m}</option>)}</select></div>
                        {formData.carModel === 'Lainnya' && <input type="text" name="carModelLainnya" value={formData.carModelLainnya} onChange={handleInputChange} placeholder="Model Lainnya" className="p-2 border w-full" />}
                    </div>
                    <div className="md:col-span-3 flex items-end gap-2">
                        <div className="flex-grow"><label>Warna Mobil</label><select name="warnaMobil" value={formData.warnaMobil} onChange={handleInputChange} className="p-2 border w-full">{[...mazdaColors, "Lainnya"].map(c => <option key={c}>{c}</option>)}</select></div>
                        {formData.warnaMobil === 'Lainnya' && <input type="text" name="warnaMobilLainnya" value={formData.warnaMobilLainnya} onChange={handleInputChange} placeholder="Warna Lainnya" className="p-2 border w-full"/>}
                    </div>
                    <div className="md:col-span-3 flex items-end gap-2">
                        <div className="flex-grow"><label>Nama Asuransi</label><select name="namaAsuransi" value={formData.namaAsuransi} onChange={handleInputChange} className="p-2 border w-full">{[...insuranceOptions].map(ins => <option key={ins} value={ins}>{ins}</option>)}</select></div>
                        {formData.namaAsuransi === 'Lainnya' && <input type="text" name="namaAsuransiLainnya" value={formData.namaAsuransiLainnya} onChange={handleInputChange} placeholder="Asuransi Lainnya" className="p-2 border w-full"/>}
                    </div>
                </fieldset>
                <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg">
                    <legend>Status & Tanggal</legend>
                    <select name="statusKendaraan" value={formData.statusKendaraan} onChange={handleInputChange} className="p-2 border w-full">{statusKendaraanOptions.map(s => <option key={s}>{s}</option>)}</select>
                    <select name="statusPekerjaan" value={formData.statusPekerjaan} onChange={handleInputChange} className="p-2 border w-full">{statusPekerjaanOptions.map(s => <option key={s}>{s}</option>)}</select>
                    <select name="posisiKendaraan" value={formData.posisiKendaraan} onChange={handleInputChange} className="p-2 border w-full">{posisiKendaraanOptions.map(p => <option key={p}>{p}</option>)}</select>
                    <div><label>Tgl Masuk</label><input type="date" name="tanggalMasuk" value={formData.tanggalMasuk} onChange={handleInputChange} className="p-2 border w-full" /></div>
                </fieldset>
                <div className="flex justify-end mt-6 gap-4">
                    <button type="button" onClick={closeModal} className="bg-gray-300 px-4 py-2 rounded-lg">Batal</button>
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg">Simpan Data</button>
                </div>
            </form>
        </div>
    );
};

export default AddJobModal;

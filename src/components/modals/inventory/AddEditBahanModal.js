import React, { useState } from 'react';
import { doc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db, SPAREPART_COLLECTION } from '../../../config/firebase';

const AddEditBahanModal = ({ closeModal, showNotification, bahanData, isNew }) => {
    const initialState = {
        namaBahan: '', kodeBahan: '', hargaModal: 0,
        stok: 0, minStok: 1, satuan: 'Pcs', tipe: 'bahan', supplier: '',
        isiPerBox: 0, densitas: 0
    };
    const [formData, setFormData] = useState(isNew ? initialState : bahanData);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? parseFloat(value) || 0 : value;
        setFormData(p => ({ ...p, [name]: val }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.namaBahan) {
            showNotification("Nama Bahan wajib diisi.", "error");
            return;
        }

        try {
            if (isNew) {
                await addDoc(collection(db, SPAREPART_COLLECTION), formData);
                showNotification("Bahan baru berhasil ditambahkan.", "success");
            } else {
                const bahanRef = doc(db, SPAREPART_COLLECTION, bahanData.id);
                await updateDoc(bahanRef, formData);
                showNotification("Data bahan berhasil diperbarui.", "success");
            }
            closeModal();
        } catch (error) {
            showNotification("Gagal menyimpan data.", "error");
            console.error("Error saving material: ", error);
        }
    };
    
    const bahanUnits = ['Pcs', 'Gram', 'Liter', 'Kaleng', 'Kilogram', 'Box'];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold">{isNew ? "Tambah Bahan Baru" : `Edit Bahan: ${bahanData.namaBahan}`}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label>Nama Bahan*</label><input type="text" name="namaBahan" value={formData.namaBahan} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Kode Bahan</label><input type="text" name="kodeBahan" value={formData.kodeBahan} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div>
                    <label>Satuan</label>
                    <select name="satuan" value={formData.satuan} onChange={handleInputChange} className="p-2 border w-full bg-white">
                        {bahanUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                </div>
                <div><label>Harga Modal (per satuan)</label><input type="number" name="hargaModal" value={formData.hargaModal} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Stok Saat Ini</label><input type="number" name="stok" value={formData.stok} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Stok Minimum</label><input type="number" name="minStok" value={formData.minStok} onChange={handleInputChange} className="p-2 border w-full"/></div>
                 {formData.satuan === 'Box' && (
                     <div><label>Default Isi per Box</label><input type="number" name="isiPerBox" value={formData.isiPerBox || ''} onChange={handleInputChange} className="p-2 border w-full" placeholder="Jumlah Pcs dalam 1 Box"/></div>
                )}
                {formData.satuan === 'Liter' && (
                     <div><label>Default Densitas (g/L)</label><input type="number" name="densitas" value={formData.densitas || ''} onChange={handleInputChange} className="p-2 border w-full" placeholder="Contoh: 1000"/></div>
                )}
                <div className="md:col-span-2"><label>Supplier</label><input type="text" name="supplier" value={formData.supplier} onChange={handleInputChange} className="p-2 border w-full" placeholder="Nama supplier jika ada"/></div>
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg">Simpan</button>
            </div>
        </form>
    );
};

export default AddEditBahanModal;

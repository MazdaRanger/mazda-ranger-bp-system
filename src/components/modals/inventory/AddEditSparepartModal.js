import React, { useState } from 'react';
import { doc, setDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db, SPAREPART_COLLECTION } from '../../../config/firebase';

const AddEditSparepartModal = ({ closeModal, showNotification, partData, isNew }) => {
    const initialState = {
        namaBahan: '', kodeBahan: '', hargaJual: 0, hargaModal: 0,
        stok: 0, minStok: 1, satuan: 'Pcs', tipe: 'part', supplier: ''
    };
    const [formData, setFormData] = useState(isNew ? initialState : partData);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? parseFloat(value) || 0 : value;
        setFormData(p => ({ ...p, [name]: val }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.namaBahan || !formData.kodeBahan) {
            showNotification("Nama dan Nomor Part wajib diisi.", "error");
            return;
        }

        try {
            if (isNew) {
                await addDoc(collection(db, SPAREPART_COLLECTION), formData);
                showNotification("Sparepart baru berhasil ditambahkan.", "success");
            } else {
                const partRef = doc(db, SPAREPART_COLLECTION, partData.id);
                await updateDoc(partRef, formData);
                showNotification("Data sparepart berhasil diperbarui.", "success");
            }
            closeModal();
        } catch (error) {
            showNotification("Gagal menyimpan data.", "error");
            console.error("Error saving sparepart: ", error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold">{isNew ? "Tambah Sparepart Baru" : `Edit Sparepart: ${partData.namaBahan}`}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label>Nama Part*</label><input type="text" name="namaBahan" value={formData.namaBahan} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Nomor Part*</label><input type="text" name="kodeBahan" value={formData.kodeBahan} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div>
                    <label>Tipe</label>
                    <select name="tipe" value={formData.tipe} onChange={handleInputChange} className="p-2 border w-full bg-white">
                        <option value="part">Part</option>
                        <option value="bahan">Bahan</option>
                    </select>
                </div>
                <div><label>Satuan</label><input type="text" name="satuan" value={formData.satuan} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Stok Awal / Saat Ini</label><input type="number" name="stok" value={formData.stok} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Stok Minimum</label><input type="number" name="minStok" value={formData.minStok} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Harga Jual</label><input type="number" name="hargaJual" value={formData.hargaJual} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Harga Beli (Modal)</label><input type="number" name="hargaModal" value={formData.hargaModal} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div className="md:col-span-2"><label>Supplier</label><input type="text" name="supplier" value={formData.supplier} onChange={handleInputChange} className="p-2 border w-full" placeholder="Nama supplier jika ada"/></div>
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg">Simpan</button>
            </div>
        </form>
    );
};

export default AddEditSparepartModal;

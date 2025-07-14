import React, { useState } from 'react';
import { doc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db, SUPPLIERS_COLLECTION } from '../../../config/firebase';

const AddEditSupplierModal = ({ closeModal, showNotification, supplierData, isNew }) => {
    const initialState = {
        namaSupplier: '', namaPic: '', kontak: '', alamat: '',
        noRekening: '', namaRekening: '', namaBank: ''
    };
    const [formData, setFormData] = useState(isNew ? initialState : supplierData);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.namaSupplier) {
            showNotification("Nama Supplier wajib diisi.", "error");
            return;
        }

        try {
            if (isNew) {
                await addDoc(collection(db, SUPPLIERS_COLLECTION), formData);
                showNotification("Supplier baru berhasil ditambahkan.", "success");
            } else {
                const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplierData.id);
                await updateDoc(supplierRef, formData);
                showNotification("Data supplier berhasil diperbarui.", "success");
            }
            closeModal();
        } catch (error) {
            showNotification("Gagal menyimpan data.", "error");
            console.error("Error saving supplier: ", error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold">{isNew ? "Tambah Supplier Baru" : `Edit Supplier: ${supplierData.namaSupplier}`}</h2>
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg">
                <legend className="px-2 font-semibold">Info Supplier</legend>
                <div><label>Nama Supplier*</label><input type="text" name="namaSupplier" value={formData.namaSupplier} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Nama PIC</label><input type="text" name="namaPic" value={formData.namaPic} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Kontak (HP/Telp)</label><input type="text" name="kontak" value={formData.kontak} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div className="md:col-span-2"><label>Alamat</label><textarea name="alamat" value={formData.alamat} onChange={handleInputChange} className="p-2 border w-full" rows="2"/></div>
            </fieldset>
             <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg">
                <legend className="px-2 font-semibold">Info Pembayaran</legend>
                <div><label>Nama Bank</label><input type="text" name="namaBank" value={formData.namaBank} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Nomor Rekening</label><input type="text" name="noRekening" value={formData.noRekening} onChange={handleInputChange} className="p-2 border w-full"/></div>
                <div><label>Nama Pemilik Rekening</label><input type="text" name="namaRekening" value={formData.namaRekening} onChange={handleInputChange} className="p-2 border w-full"/></div>
            </fieldset>
            <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg">Simpan</button>
            </div>
        </form>
    );
};

export default AddEditSupplierModal;

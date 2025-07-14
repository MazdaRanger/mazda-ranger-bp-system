import React, { useState, useEffect } from 'react';
import { doc, updateDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db, SPAREPART_COLLECTION, JOBS_COLLECTION, increment } from '../../config/firebase';

const AssignMaterialsModal = ({ closeModal, showNotification, jobData, allBahan }) => {
    const [assignedItems, setAssignedItems] = useState([]);
    const [bahanOptions, setBahanOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Memfilter bahan yang sudah ada di daftar agar tidak bisa dipilih lagi
        const currentAssignedIds = assignedItems.map(item => item.bahanId);
        setBahanOptions(allBahan.filter(b => !currentAssignedIds.includes(b.id)));
    }, [assignedItems, allBahan]);

    const handleAddItem = () => {
        if (bahanOptions.length > 0) {
            setAssignedItems([...assignedItems, { bahanId: '', qty: 1, totalCost: 0 }]);
        } else {
            showNotification("Semua bahan sudah ditambahkan atau tidak ada bahan di database.", "info");
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...assignedItems];
        const item = newItems[index];
        item[field] = value;

        if (field === 'bahanId') {
            const selectedBahan = allBahan.find(b => b.id === value);
            item.satuan = selectedBahan?.satuan || '';
            item.hargaModal = selectedBahan?.hargaModal || 0;
        }

        item.totalCost = (item.qty || 0) * (item.hargaModal || 0);
        setAssignedItems(newItems);
    };

    const handleRemoveItem = (index) => {
        setAssignedItems(assignedItems.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (assignedItems.length === 0 || assignedItems.some(item => !item.bahanId || !item.qty > 0)) {
            showNotification("Pastikan semua baris terisi dengan benar dan kuantitas lebih dari nol.", "error");
            return;
        }
        setIsLoading(true);

        const batch = writeBatch(db);

        // 1. Update biaya pada dokumen pekerjaan
        const totalCost = assignedItems.reduce((sum, item) => sum + item.totalCost, 0);
        const jobRef = doc(db, JOBS_COLLECTION, jobData.id);
        batch.update(jobRef, { 'costData.hargaModalBahan': increment(totalCost) });

        // 2. Kurangi stok setiap bahan
        assignedItems.forEach(item => {
            const bahanRef = doc(db, SPAREPART_COLLECTION, item.bahanId);
            batch.update(bahanRef, { stok: increment(-item.qty) });
        });

        try {
            await batch.commit();
            showNotification(`Biaya bahan berhasil dibebankan ke ${jobData.policeNumber}.`, "success");
            closeModal();
        } catch (error) {
            showNotification("Gagal menyimpan pembebanan bahan.", "error");
            console.error("Error committing batch: ", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Bebankan Bahan untuk: {jobData.policeNumber}</h2>
            <div className="bg-gray-50 p-3 rounded-md">
                <p>No. WO: <span className="font-semibold">{jobData.woNumber}</span></p>
                <p>Model: <span className="font-semibold">{jobData.carModel}</span></p>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {assignedItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center border p-3 rounded-lg">
                        <div className="col-span-5">
                            <label className="text-sm">Nama Bahan</label>
                            <select value={item.bahanId} onChange={e => handleItemChange(index, 'bahanId', e.target.value)} className="p-2 border w-full">
                                <option value="">Pilih Bahan...</option>
                                {bahanOptions.map(b => <option key={b.id} value={b.id}>{b.namaBahan}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm">Qty</label>
                            <input type="number" value={item.qty} onChange={e => handleItemChange(index, 'qty', parseFloat(e.target.value))} className="p-2 border w-full" />
                        </div>
                         <div className="col-span-1">
                             <label className="text-sm">Satuan</label>
                             <p className="p-2 font-semibold">{item.satuan}</p>
                         </div>
                        <div className="col-span-3">
                             <label className="text-sm">Total Biaya</label>
                            <p className="p-2 font-semibold">Rp {item.totalCost.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="col-span-1 flex justify-end">
                            <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 mt-4">Hapus</button>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={handleAddItem} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg w-full">+ Tambah Bahan</button>

             <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-300 px-4 py-2 rounded-lg">Batal</button>
                <button onClick={handleSave} disabled={isLoading} className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:bg-gray-400">
                    {isLoading ? 'Menyimpan...' : 'Simpan Pembebanan'}
                </button>
            </div>
        </div>
    );
};

export default AssignMaterialsModal;

import React, { useState } from 'react';
import { doc, updateDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { db, SPAREPART_COLLECTION, JOBS_COLLECTION, increment } from '../../config/firebase';

const StockInOutModal = ({ closeModal, showNotification, jobData: bahanData }) => {
    const [type, setType] = useState('out'); // 'in' or 'out'
    const [quantity, setQuantity] = useState(1);
    const [policeNumber, setPoliceNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (quantity <= 0) {
            showNotification("Kuantitas harus lebih dari nol.", "error");
            return;
        }

        setIsLoading(true);
        const bahanRef = doc(db, SPAREPART_COLLECTION, bahanData.id);

        try {
            if (type === 'in') {
                await updateDoc(bahanRef, { stok: increment(quantity) });
                showNotification("Stok berhasil ditambahkan.", "success");
            } else { // type === 'out'
                if (!policeNumber.trim()) {
                    showNotification("No. Polisi pekerjaan wajib diisi untuk stok keluar.", "error");
                    setIsLoading(false);
                    return;
                }

                // Cari pekerjaan berdasarkan No. Polisi
                const q = query(collection(db, JOBS_COLLECTION), where("policeNumber", "==", policeNumber.toUpperCase().replace(/\s/g, '')));
                const jobSnapshot = await getDocs(q);

                if (jobSnapshot.empty) {
                    showNotification(`Pekerjaan dengan No. Polisi ${policeNumber} tidak ditemukan.`, "error");
                    setIsLoading(false);
                    return;
                }

                const jobDoc = jobSnapshot.docs[0];
                const jobRef = doc(db, JOBS_COLLECTION, jobDoc.id);

                // Hitung biaya bahan yang keluar
                const totalCost = (bahanData.hargaModal || 0) * quantity;
                
                // Update stok bahan & biaya pada pekerjaan
                await updateDoc(bahanRef, { stok: increment(-quantity) });
                await updateDoc(jobRef, { 'costData.hargaModalBahan': increment(totalCost) });
                
                showNotification(`Stok keluar berhasil dicatat dan biaya dibebankan ke ${policeNumber}.`, "success");
            }
            closeModal();
        } catch (error) {
            showNotification("Gagal memproses stok. Coba lagi.", "error");
            console.error("Error processing stock: ", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Stok Masuk/Keluar: {bahanData.namaBahan}</h2>
            <div>
                <div className="flex border border-gray-300 rounded-lg p-1">
                    <button onClick={() => setType('out')} className={`w-1/2 py-2 rounded-md font-semibold ${type === 'out' ? 'bg-red-500 text-white' : ''}`}>Stok Keluar</button>
                    <button onClick={() => setType('in')} className={`w-1/2 py-2 rounded-md font-semibold ${type === 'in' ? 'bg-green-500 text-white' : ''}`}>Stok Masuk</button>
                </div>
            </div>
            {type === 'out' && (
                <div>
                    <label className="font-medium">No. Polisi Pekerjaan</label>
                    <input 
                        type="text"
                        value={policeNumber}
                        onChange={(e) => setPoliceNumber(e.target.value)}
                        className="p-2 border w-full mt-1"
                        placeholder="Contoh: B1234ABC"
                    />
                </div>
            )}
             <div>
                <label className="font-medium">Kuantitas ({bahanData.satuan})</label>
                <input 
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="p-2 border w-full mt-1"
                />
            </div>
             <div className="flex justify-between items-center mt-8 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button>
                <button onClick={handleSubmit} disabled={isLoading} className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:bg-gray-400">
                    {isLoading ? 'Memproses...' : 'Simpan Transaksi'}
                </button>
            </div>
        </div>
    );
};

export default StockInOutModal;

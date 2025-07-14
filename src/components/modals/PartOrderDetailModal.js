import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, JOBS_COLLECTION, increment } from '../../config/firebase';

const PartOrderDetailModal = ({ closeModal, showNotification, ...jobData }) => {
    const [partItems, setPartItems] = useState(
        (jobData.estimateData?.partItems || []).map(item => ({
            ...item,
            isChecked: item.isOrdered || false,
            hargaBeliAktual: item.hargaBeliAktual || 0,
        }))
    );
    const [isLoading, setIsLoading] = useState(false);

    const handleItemChange = (index, field, value) => {
        const newItems = [...partItems];
        newItems[index][field] = value;
        setPartItems(newItems);
    };

    const handleConfirmOrder = async () => {
        setIsLoading(true);

        const itemsToProcess = partItems.filter(item => item.isChecked && !item.isOrdered);

        if (itemsToProcess.length === 0) {
            showNotification("Tidak ada part baru yang dipilih untuk diproses.", "info");
            setIsLoading(false);
            return;
        }

        if (itemsToProcess.some(item => (item.hargaBeliAktual || 0) <= 0)) {
            showNotification("Harga beli aktual untuk part yang dipilih tidak boleh nol.", "error");
            setIsLoading(false);
            return;
        }
        
        const additionalCost = itemsToProcess.reduce((sum, item) => sum + (item.hargaBeliAktual * item.qty), 0);

        const updatedPartItemsForDB = partItems.map(item => ({
            name: item.name,
            number: item.number,
            qty: item.qty,
            price: item.price,
            isOrdered: item.isChecked,
            hargaBeliAktual: item.hargaBeliAktual
        }));

        const jobRef = doc(db, JOBS_COLLECTION, jobData.id);

        // --- [PERBAIKAN BUG] ---
        // Memperbaiki penggunaan `increment` untuk memastikan kalkulasi Gross Profit akurat.
        // `increment` harus digunakan untuk setiap field yang diupdate secara atomik.
        const dataToUpdate = {
            partOrderStatus: 'Part Sedang Dipesan',
            statusOrderPart: 'On Order',
            'costData.hargaBeliPart': increment(additionalCost), // Tambahkan biaya part
            grossProfit: increment(-additionalCost), // Kurangi gross profit dengan jumlah yang sama
            'estimateData.partItems': updatedPartItemsForDB,
        };

        try {
            await updateDoc(jobRef, dataToUpdate);
            showNotification("Order berhasil diproses dan biaya pembelian telah ditambahkan.", "success");
            closeModal();
        } catch (error) {
            showNotification("Gagal memproses order.", "error");
            console.error("Error processing order: ", error);
        } finally {
            setIsLoading(false);
        }
    };

    const processingTotal = useMemo(() => {
        return partItems
            .filter(item => item.isChecked && !item.isOrdered)
            .reduce((sum, item) => sum + (item.hargaBeliAktual * item.qty), 0);
    }, [partItems]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Proses Order Part ({jobData.policeNumber})</h2>
            <p className="text-sm -mt-4 text-gray-600">Centang part yang akan diproses ordernya dan isi harga belinya.</p>
            <div className="max-h-96 overflow-y-auto pr-4 space-y-3">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="p-2 w-10">Proses?</th>
                            <th className="p-2">Nama Part</th>
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 w-48">Harga Beli Aktual / pcs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {partItems.map((item, index) => (
                            <tr key={index} className={`border-b ${item.isOrdered ? 'bg-gray-50 text-gray-400' : 'bg-white'}`}>
                                <td className="p-2 text-center">
                                    <input 
                                        type="checkbox"
                                        checked={item.isChecked}
                                        disabled={item.isOrdered}
                                        onChange={(e) => handleItemChange(index, 'isChecked', e.target.checked)}
                                        className="h-5 w-5 rounded disabled:cursor-not-allowed"
                                        title={item.isOrdered ? 'Part ini sudah diproses' : 'Proses part ini'}
                                    />
                                </td>
                                <td className="p-2 font-medium">{item.name} <span className="text-gray-400">{item.number}</span></td>
                                <td className="p-2 text-center">{item.qty}</td>
                                <td className="p-2">
                                    <input 
                                        type="number"
                                        value={item.hargaBeliAktual}
                                        disabled={!item.isChecked || item.isOrdered}
                                        onChange={(e) => handleItemChange(index, 'hargaBeliAktual', parseFloat(e.target.value))}
                                        className="p-2 border rounded-md w-full disabled:bg-gray-200"
                                        placeholder="0"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-4 border-t text-right">
                <p className="text-sm text-gray-600">Total Biaya untuk Diproses Saat Ini:</p>
                <p className="text-xl font-bold text-blue-600">
                    Rp {processingTotal.toLocaleString('id-ID')}
                </p>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">Batal</button>
                <button onClick={handleConfirmOrder} disabled={isLoading} className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:bg-gray-400 disabled:cursor-wait">
                    {isLoading ? 'Memproses...' : 'Konfirmasi & Proses Order'}
                </button>
            </div>
        </div>
    );
};

export default PartOrderDetailModal;

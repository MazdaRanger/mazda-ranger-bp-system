import React, { useState } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, SPAREPART_COLLECTION } from '../../../config/firebase';

const StockInModal = ({ closeModal, showNotification, bahanData }) => {
    const [purchase, setPurchase] = useState({
        quantity: 1,
        totalPrice: 0,
        itemsPerUnit: bahanData.isiPerBox || 1,
        density: bahanData.densitas || 1000,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPurchase(p => ({ ...p, [name]: parseFloat(value) || 0 }));
    };

    const getPurchaseUnit = () => {
        switch (bahanData.satuan) {
            case 'Pcs': return 'Pcs';
            case 'Gram': return 'Gram';
            case 'Kaleng': return 'Kaleng';
            case 'Box': return 'Box';
            case 'Kilogram': return 'Kg';
            case 'Liter': return 'Liter';
            default: return 'Item';
        }
    };

    const calculateResult = () => {
        if (purchase.totalPrice <= 0 || purchase.quantity <= 0) {
            return { newStock: 0, newUnitPrice: 0, error: true };
        }

        let totalItems, newUnitPrice;

        switch (bahanData.satuan) {
            case 'Box':
                if (purchase.itemsPerUnit <= 0) return { error: true };
                totalItems = purchase.quantity * purchase.itemsPerUnit;
                newUnitPrice = purchase.totalPrice / totalItems;
                break;
            case 'Kilogram':
                totalItems = purchase.quantity * 1000; // to Gram
                newUnitPrice = purchase.totalPrice / totalItems;
                break;
            case 'Liter':
                if (purchase.density <= 0) return { error: true };
                totalItems = purchase.quantity * purchase.density; // to Gram
                newUnitPrice = purchase.totalPrice / totalItems;
                break;
            default: // Pcs, Gram, Kaleng
                totalItems = purchase.quantity;
                newUnitPrice = purchase.totalPrice / totalItems;
                break;
        }

        return { newStock: totalItems, newUnitPrice, error: false };
    };

    const { newStock, newUnitPrice, error } = calculateResult();

    const handleSubmit = async () => {
        if (error) {
            showNotification("Harap isi semua field dengan nilai lebih dari nol.", "error");
            return;
        }

        setIsLoading(true);
        const bahanRef = doc(db, SPAREPART_COLLECTION, bahanData.id);
        
        try {
            await updateDoc(bahanRef, {
                stok: increment(newStock),
                hargaModal: newUnitPrice,
                // Update default values if they were changed
                isiPerBox: bahanData.satuan === 'Box' ? purchase.itemsPerUnit : (bahanData.isiPerBox || 0),
                densitas: bahanData.satuan === 'Liter' ? purchase.density : (bahanData.densitas || 0)
            });
            showNotification("Stok berhasil ditambahkan dan harga modal diperbarui.", "success");
            closeModal();
        } catch (err) {
            showNotification("Gagal memperbarui stok.", "error");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Stok Masuk: {bahanData.namaBahan}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-gray-50">
                <div>
                    <label>Jumlah Pembelian ({getPurchaseUnit()})</label>
                    <input type="number" name="quantity" value={purchase.quantity} onChange={handleInputChange} className="p-2 border w-full mt-1"/>
                </div>
                <div>
                    <label>Total Harga Pembelian</label>
                    <input type="number" name="totalPrice" value={purchase.totalPrice} onChange={handleInputChange} className="p-2 border w-full mt-1"/>
                </div>
                {bahanData.satuan === 'Box' && (
                    <div>
                        <label>Jumlah Pcs per Box</label>
                        <input type="number" name="itemsPerUnit" value={purchase.itemsPerUnit} onChange={handleInputChange} className="p-2 border w-full mt-1"/>
                    </div>
                )}
                 {bahanData.satuan === 'Liter' && (
                    <div>
                        <label>Densitas (gram per Liter)</label>
                        <input type="number" name="density" value={purchase.density} onChange={handleInputChange} className="p-2 border w-full mt-1"/>
                    </div>
                )}
            </div>

            {!error && (
                <div className="p-4 rounded-lg bg-blue-100 border border-blue-300 text-center">
                    <p className="text-sm font-semibold text-blue-800">HASIL KALKULASI</p>
                    <p className="text-lg">Stok akan bertambah: <span className="font-bold">{newStock.toLocaleString('id-ID')} {bahanData.satuan === 'Kilogram' || bahanData.satuan === 'Liter' ? 'Gram' : 'Pcs'}</span></p>
                    <p className="text-lg">Harga Modal Baru per Satuan: <span className="font-bold">Rp {newUnitPrice.toLocaleString('id-ID', {maximumFractionDigits: 2})}</span></p>
                </div>
            )}
            
            <div className="flex justify-between items-center mt-8 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button>
                <button onClick={handleSubmit} disabled={isLoading || error} className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:bg-gray-400">
                    {isLoading ? 'Memproses...' : 'Simpan Transaksi'}
                </button>
            </div>
        </div>
    );
};

export default StockInModal;

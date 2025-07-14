import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, SPAREPART_COLLECTION } from '../../config/firebase';
import { exportToCsv } from '../../utils/helpers';

const BahanManager = ({ openModal, showNotification }) => {
    const [bahan, setBahan] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const q = query(collection(db, SPAREPART_COLLECTION), where("tipe", "==", "bahan"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBahan(list);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching materials: ", error);
            showNotification("Gagal memuat data bahan.", "error");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [showNotification]);

    const handleExportTemplate = () => {
        const templateData = [{
            namaBahan: 'Amplas Grid 800',
            kodeBahan: 'AMPL-800',
            hargaModal: 5000,
            stok: 100,
            minStok: 20,
            satuan: 'Pcs',
            tipe: 'bahan',
            supplier: 'Supplier Amplas Jaya',
            isiPerBox: '', // Kosongkan jika satuan bukan Box
            densitas: '' // Kosongkan jika satuan bukan Liter
        }];
        exportToCsv('Template_Import_Bahan.csv', templateData);
        showNotification("Gunakan file ini sebagai acuan untuk import massal (fitur segera hadir).", 'info', 5000);
    };
    
    const filteredBahan = bahan.filter(b => 
        (b.namaBahan && b.namaBahan.toLowerCase().includes(filter.toLowerCase())) ||
        (b.kodeBahan && b.kodeBahan.toLowerCase().includes(filter.toLowerCase()))
    );

    if (isLoading) return <div>Memuat data...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Cari nama atau kode bahan..."
                    className="p-2 border rounded-lg w-full max-w-md"
                />
                <div className="flex gap-2">
                    <button onClick={handleExportTemplate} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">Export Template</button>
                    <button onClick={() => openModal('add_edit_bahan', { isNew: true })} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">+ Tambah Bahan</button>
                </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="p-3">Nama Bahan</th>
                            <th className="p-3">Kode</th>
                            <th className="p-3 text-right">Stok</th>
                            <th className="p-3 text-right">Harga Modal / Satuan</th>
                            <th className="p-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBahan.map(b => (
                            <tr key={b.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-semibold">{b.namaBahan}</td>
                                <td className="p-3">{b.kodeBahan}</td>
                                <td className="p-3 text-right font-bold">{b.stok || 0} {b.satuan}</td>
                                <td className="p-3 text-right">Rp {(b.hargaModal || 0).toLocaleString('id-ID')}</td>
                                <td className="p-3 text-center space-x-3">
                                    <button onClick={() => openModal('stock_in_bahan', { bahanData: b })} className="bg-blue-500 text-white text-xs font-bold py-1 px-3 rounded-full">Stok Masuk</button>
                                    <button onClick={() => openModal('add_edit_bahan', { bahanData: b, isNew: false })} className="text-blue-600 font-semibold hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BahanManager;

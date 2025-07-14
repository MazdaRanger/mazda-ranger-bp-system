import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, SPAREPART_COLLECTION } from '../../config/firebase';
import { exportToCsv } from '../../utils/helpers';

const SparepartManager = ({ openModal, showNotification }) => {
    const [spareparts, setSpareparts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        // --- [MODIFIKASI] Menambahkan filter `where` untuk hanya mengambil tipe 'part' ---
        const q = query(collection(db, SPAREPART_COLLECTION), where("tipe", "==", "part"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSpareparts(list);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching spareparts: ", error);
            showNotification("Gagal memuat data sparepart.", "error");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [showNotification]);

    const handleExportTemplate = () => {
        const templateData = [{
            namaBahan: 'Contoh Nama Part',
            kodeBahan: 'N0M0R-P4RT',
            hargaJual: 100000,
            hargaModal: 80000,
            stok: 10,
            minStok: 2,
            satuan: 'Pcs',
            tipe: 'part',
            supplier: 'Nama Supplier Contoh'
        }];
        exportToCsv('Template_Import_Sparepart.csv', templateData);
        showNotification("Fitur import massal sedang dikembangkan. Gunakan file ini sebagai acuan.", 'info', 5000);
    };
    
    const filteredSpareparts = spareparts.filter(part => 
        (part.namaBahan && part.namaBahan.toLowerCase().includes(filter.toLowerCase())) ||
        (part.kodeBahan && part.kodeBahan.toLowerCase().includes(filter.toLowerCase()))
    );

    if (isLoading) return <div>Memuat data...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Cari nama atau nomor part..."
                    className="p-2 border rounded-lg w-full max-w-md"
                />
                <div className="flex gap-2">
                    <button onClick={handleExportTemplate} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">Export Template</button>
                    <button onClick={() => openModal('add_edit_sparepart', { isNew: true })} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">+ Tambah Part</button>
                </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="p-3">Nama Part</th>
                            <th className="p-3">Nomor Part</th>
                            <th className="p-3 text-right">Stok</th>
                            <th className="p-3 text-right">Harga Jual</th>
                            <th className="p-3 text-right">Harga Beli</th>
                            <th className="p-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSpareparts.map(part => (
                            <tr key={part.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-semibold">{part.namaBahan}</td>
                                <td className="p-3">{part.kodeBahan}</td>
                                <td className="p-3 text-right font-bold">{part.stok || 0} {part.satuan}</td>
                                <td className="p-3 text-right">Rp {(part.hargaJual || 0).toLocaleString('id-ID')}</td>
                                <td className="p-3 text-right">Rp {(part.hargaModal || 0).toLocaleString('id-ID')}</td>
                                <td className="p-3 text-center">
                                    <button onClick={() => openModal('add_edit_sparepart', { partData: part, isNew: false })} className="text-blue-600 font-semibold hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SparepartManager;

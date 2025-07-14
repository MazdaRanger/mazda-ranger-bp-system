import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, SUPPLIERS_COLLECTION } from '../../config/firebase';

const SupplierManager = ({ openModal, showNotification }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, SUPPLIERS_COLLECTION));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSuppliers(list);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching suppliers: ", error);
            showNotification("Gagal memuat data supplier.", "error");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [showNotification]);

    const handleDelete = (supplier) => {
        openModal('confirm_delete', {
            title: `Hapus Supplier: ${supplier.namaSupplier}?`,
            message: "Tindakan ini akan menghapus data supplier secara permanen dan tidak dapat dibatalkan.",
            collectionName: SUPPLIERS_COLLECTION,
            docId: supplier.id,
            onConfirm: async () => {
                const { deleteDoc, doc } = await import('firebase/firestore');
                await deleteDoc(doc(db, SUPPLIERS_COLLECTION, supplier.id));
                showNotification("Supplier berhasil dihapus.", "success");
            }
        });
    };

    if (isLoading) return <div>Memuat data...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-end mb-4">
                <button onClick={() => openModal('add_edit_supplier', { isNew: true })} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">+ Tambah Supplier</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="p-3">Nama Supplier</th>
                            <th className="p-3">PIC</th>
                            <th className="p-3">Kontak</th>
                            <th className="p-3">Info Bank</th>
                            <th className="p-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suppliers.map(supplier => (
                            <tr key={supplier.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-semibold">{supplier.namaSupplier}</td>
                                <td className="p-3">{supplier.namaPic}</td>
                                <td className="p-3">{supplier.kontak}</td>
                                <td className="p-3">{supplier.namaBank} - {supplier.noRekening} (a.n {supplier.namaRekening})</td>
                                <td className="p-3 text-center space-x-4">
                                    <button onClick={() => openModal('add_edit_supplier', { supplierData: supplier, isNew: false })} className="text-blue-600 font-semibold hover:underline">Edit</button>
                                    <button onClick={() => handleDelete(supplier)} className="text-red-600 font-semibold hover:underline">Hapus</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SupplierManager;

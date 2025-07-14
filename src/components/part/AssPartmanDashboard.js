import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, SPAREPART_COLLECTION } from '../../config/firebase';

const AssPartmanDashboard = ({ showNotification, openModal, allJobs }) => {
    const [bahanList, setBahanList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newBahan, setNewBahan] = useState({ namaBahan: '', kodeBahan: '', stok: 0, minStok: 0, satuan: 'Kaleng', hargaModal: 0, densitas: 0 });
    // --- [IMPLEMENTASI FITUR 5] State untuk pencarian ---
    const [searchQuery, setSearchQuery] = useState('');

    const readyJobs = useMemo(() => {
        let jobs = allJobs.filter(job => job.woNumber && !job.isClosed);
        // --- [IMPLEMENTASI FITUR 5] Logika filter pencarian ---
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            jobs = jobs.filter(job => 
                (job.policeNumber && job.policeNumber.toLowerCase().includes(query)) ||
                (job.woNumber && job.woNumber.toLowerCase().includes(query))
            );
        }
        return jobs;
    }, [allJobs, searchQuery]);

    useEffect(() => {
        const q = query(collection(db, SPAREPART_COLLECTION), where("tipe", "==", "bahan"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBahanList(list);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching materials: ", error);
            showNotification("Gagal memuat data bahan.", "error");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [showNotification]);

    const handleNewBahanChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? parseFloat(value) || 0 : value;
        setNewBahan(prev => ({...prev, [name]: finalValue}));
    };
    
    const handleAddNewBahan = async (e) => {
        e.preventDefault();
        if(!newBahan.namaBahan || !newBahan.satuan) {
            showNotification("Nama bahan dan satuan wajib diisi.", "error");
            return;
        }
        try {
            await addDoc(collection(db, SPAREPART_COLLECTION), {
                ...newBahan,
                tipe: 'bahan',
                createdAt: serverTimestamp()
            });
            showNotification("Bahan baru berhasil ditambahkan.", "success");
            setNewBahan({ namaBahan: '', kodeBahan: '', stok: 0, minStok: 0, satuan: 'Kaleng', hargaModal: 0, densitas: 0 });
        } catch (error) {
            showNotification("Gagal menambah bahan.", "error");
        }
    }

    const JobCard = ({ job }) => (
        <div className="bg-white rounded-lg p-3 shadow border-l-4 border-blue-500">
            <p className="font-bold text-blue-600">{job.policeNumber}</p>
            <p className="text-sm text-gray-700">{job.carModel}</p>
            <p className="text-xs text-gray-500">WO: {job.woNumber}</p>
            <button
                onClick={() => openModal('assign_materials', { jobData: job, allBahan: bahanList })}
                className="w-full mt-3 bg-blue-500 text-white text-xs font-bold py-1.5 px-2 rounded-md hover:bg-blue-600"
            >
                Bebankan Bahan
            </button>
        </div>
    );

    if (isLoading) return <div>Memuat data stok...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Stok Bahan</h1>
            
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Papan Tugas: Siap Dibebankan Bahan ({readyJobs.length})</h2>
                    {/* --- [IMPLEMENTASI FITUR 5] Input pencarian --- */}
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari No. Polisi / WO..."
                        className="p-2 border rounded-lg w-full max-w-xs"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-72 overflow-y-auto pr-2">
                    {readyJobs.length > 0 ? readyJobs.map(job => 
                        <JobCard key={job.id} job={job} />
                    ) : <p className="text-gray-500 col-span-full text-center py-8">Tidak ada pekerjaan yang menunggu pembebanan bahan.</p>}
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Daftar Stok Bahan</h2>
                 <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-3">Nama Bahan</th><th className="p-3">Stok</th><th className="p-3">Min. Stok</th><th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bahanList.map(bahan => {
                                const isLowStock = bahan.stok <= bahan.minStok;
                                return (
                                    <tr key={bahan.id} className={`border-b ${isLowStock ? 'bg-red-50' : ''}`}>
                                        <td className="p-3 font-semibold">{bahan.namaBahan} <span className="text-gray-400 font-normal">({bahan.kodeBahan})</span></td>
                                        <td className="p-3 font-bold">{bahan.stok} <span className="text-gray-500 font-normal">{bahan.satuan}</span></td>
                                        <td className="p-3">{bahan.minStok} {bahan.satuan}</td>
                                        <td className={`p-3 font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>{isLowStock ? 'Stok Rendah' : 'Cukup'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AssPartmanDashboard;

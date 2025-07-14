import React, { useState, useCallback, memo } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';
import ImageUploader from '../utils/ImageUploader';
import imageCompression from 'browser-image-compression';

// --- [FIX 1] ---
// Komponen untuk satu baris item di antrean upload.
// Dibungkus dengan React.memo agar tidak render ulang jika props-nya tidak berubah.
// Ini adalah kunci utama agar input tidak kehilangan fokus.
const UploadQueueItem = memo(({ item, type, onFileChange, onKeteranganChange, onRemove }) => {
    return (
        <div className="grid grid-cols-12 gap-4 items-center p-3 border rounded-lg bg-gray-50">
            <div className="col-span-4">
                <ImageUploader onChange={(e) => onFileChange(e, type, item.id)} previewUrl={item.preview} />
            </div>
            <div className="col-span-7">
                <label className="text-xs font-medium text-gray-600">Keterangan (Nama Panel)</label>
                 <input 
                    type="text"
                    value={item.keterangan}
                    onChange={(e) => onKeteranganChange(e, type, item.id)}
                    placeholder="Contoh: Pintu Depan Kanan"
                    className="p-2 border w-full rounded-md mt-1"
                />
            </div>
            <div className="col-span-1 flex items-center justify-center">
                 <button onClick={() => onRemove(type, item.id)} className="text-red-500 hover:text-red-800 mt-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );
});

// --- [FIX 2] ---
// Komponen PhotoSection dipindahkan ke luar dari PhotoUploadModal dan dibungkus React.memo.
// Ini mencegah seluruh bagian (section) di-render ulang secara tidak perlu.
const PhotoSection = memo(({ 
    type, 
    queue, 
    existingPhotos, 
    onAddRow, 
    onFileChange, 
    onKeteranganChange, 
    onRemoveFromQueue, 
    onDeleteExisting 
}) => {
    return (
        <div className="space-y-4">
            {/* Bagian untuk item yang akan di-upload */}
            <div className="space-y-3">
                {(queue || []).map((item) => (
                    <UploadQueueItem
                        key={item.id}
                        item={item}
                        type={type}
                        onFileChange={onFileChange}
                        onKeteranganChange={onKeteranganChange}
                        onRemove={onRemoveFromQueue}
                    />
                ))}
            </div>
            <button onClick={() => onAddRow(type)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">+ Tambah Baris Foto</button>

            {/* Bagian untuk galeri foto yang sudah ada */}
            {(existingPhotos || []).length > 0 && (
                <div className="mt-6 border-t pt-4">
                    <h4 className="font-semibold text-gray-600 mb-2">Galeri Foto Ter-upload</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {(existingPhotos || []).map((photo, index) => (
                            <div key={index} className="relative group">
                                <a href={photo.url} target="_blank" rel="noopener noreferrer">
                                    <img src={photo.url} alt={photo.keterangan || type} className="w-full h-32 object-cover rounded-lg shadow-md border-2 border-green-500" />
                                </a>
                                <button onClick={() => onDeleteExisting(photo, type)} className="absolute top-1 right-1 text-white bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                                {photo.keterangan && <p className="text-xs text-center mt-1 truncate" title={photo.keterangan}>{photo.keterangan}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

// Komponen Tombol Tab
const TabButton = ({ tabName, label, activeTab, setActiveTab }) => (
    <button
        onClick={() => setActiveTab(tabName)}
        className={`px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === tabName ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-indigo-100'
        }`}
    >
        {label}
    </button>
);

// Komponen Modal Utama
const PhotoUploadModal = ({ closeModal, showNotification, jobData }) => {
    const [activeTab, setActiveTab] = useState('epoxy');
    const [isUploading, setIsUploading] = useState(false);
    
    const [uploadQueue, setUploadQueue] = useState({
        epoxy: [], salvage: [], selesai: [], peneng: []
    });
    
    const [existingPhotos, setExistingPhotos] = useState(jobData.photos || { epoxy: [], salvage: [], selesai: [], peneng: [] });

    const addRowToQueue = useCallback((type) => {
        setUploadQueue(prev => ({
            ...prev,
            [type]: [...prev[type], { id: Date.now(), file: null, preview: null, keterangan: '' }]
        }));
    }, []);
    
    const handleRemoveFromQueue = useCallback((type, id) => {
        setUploadQueue(prev => ({
            ...prev,
            [type]: prev[type].filter(item => item.id !== id)
        }));
    }, []);

    const handleFileSelected = useCallback((event, type, id) => {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        
        setUploadQueue(prev => ({
            ...prev,
            [type]: prev[type].map(item => 
                item.id === id 
                ? { ...item, file: file, preview: URL.createObjectURL(file) } 
                : item
            )
        }));
    }, []);

    const handleKeteranganChange = useCallback((event, type, id) => {
        const { value } = event.target;
        setUploadQueue(prev => ({
            ...prev,
            [type]: prev[type].map(item => 
                item.id === id 
                ? { ...item, keterangan: value } 
                : item
            )
        }));
    }, []);
    
    const handleUploadAll = async () => {
        setIsUploading(true);
        showNotification("Memulai proses upload...", "info");

        let totalFilesToUpload = 0;
        const uploadPromises = [];
        const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const storage = getStorage();

        for (const type in uploadQueue) {
            for (const item of uploadQueue[type]) {
                if (item.file) {
                    totalFilesToUpload++;
                    uploadPromises.push(
                        (async () => {
                            try {
                                const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };
                                const compressedFile = await imageCompression(item.file, options);
                                
                                const fileName = `${new Date().getTime()}-${compressedFile.name}`;
                                const storageRef = ref(storage, `job_photos/${jobData.id}/${type}/${fileName}`);
                                const snapshot = await uploadBytes(storageRef, compressedFile);
                                const url = await getDownloadURL(snapshot.ref);
                                
                                return { type, data: { url, size: snapshot.metadata.size, keterangan: item.keterangan, uploadedAt: new Date().toISOString() } };
                            } catch (error) {
                                throw new Error(`Gagal memproses/mengupload ${item.file.name}`);
                            }
                        })()
                    );
                }
            }
        }
        
        if (totalFilesToUpload === 0) {
            showNotification("Tidak ada foto baru di antrean untuk di-upload.", "warning");
            setIsUploading(false);
            return;
        }

        try {
            const results = await Promise.all(uploadPromises);
            
            const firestoreUpdatePayload = {};
            results.forEach(result => {
                const { type, data } = result;
                if (!firestoreUpdatePayload[`photos.${type}`]) {
                    firestoreUpdatePayload[`photos.${type}`] = [];
                }
                firestoreUpdatePayload[`photos.${type}`].push(data);
            });
            
            const finalPayload = {};
            for (const key in firestoreUpdatePayload) {
                finalPayload[key] = arrayUnion(...firestoreUpdatePayload[key]);
            }

            const jobDocRef = doc(db, JOBS_COLLECTION, jobData.id);
            await updateDoc(jobDocRef, finalPayload);
            
            showNotification(`${totalFilesToUpload} foto berhasil di-upload dan disimpan.`, "success");
            closeModal();
        } catch (error) {
            console.error("Error during batch upload: ", error);
            showNotification(`Terjadi kesalahan saat meng-upload. Cek koneksi & security rules. Pesan: ${error.message}`, "error");
        } finally {
            setIsUploading(false);
        }
    };
    
    // --- [FIX 3] ---
    // Membungkus handler ini dengan useCallback agar referensi fungsinya stabil
    // dan tidak menyebabkan PhotoSection render ulang jika tidak perlu.
    const handleDeleteExistingPhoto = useCallback(async (photo, photoType) => {
        // Menggunakan konfirmasi bawaan browser, bisa diganti dengan modal custom jika perlu
        if (!window.confirm("Anda yakin ingin menghapus foto ini secara permanen?")) return;
        
        const { getStorage, ref, deleteObject } = await import('firebase/storage');
        const storage = getStorage();
        const photoRef = ref(storage, photo.url);

        try {
            await deleteObject(photoRef);
            const jobDocRef = doc(db, JOBS_COLLECTION, jobData.id);
            await updateDoc(jobDocRef, { [`photos.${photoType}`]: arrayRemove(photo) });
            setExistingPhotos(prev => ({...prev, [photoType]: prev[photoType].filter(p => p.url !== photo.url)}));
            showNotification("Foto berhasil dihapus.", "success");
        } catch (error) {
            console.error("Gagal menghapus foto:", error);
            showNotification("Gagal menghapus foto. Lihat konsol untuk detail.", "error");
        }
    }, [jobData.id, showNotification]); // Dependensi untuk useCallback

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Upload Foto untuk {jobData.policeNumber}</h2>
            <div className="border-b border-gray-200 mb-4">
                <nav className="flex space-x-2">
                    <TabButton tabName="epoxy" label="Foto Epoxy" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton tabName="salvage" label="Foto Salvage" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton tabName="selesai" label="Foto Selesai" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton tabName="peneng" label="Foto Peneng" activeTab={activeTab} setActiveTab={setActiveTab} />
                </nav>
            </div>

            <div className="p-1 min-h-[40vh] max-h-[65vh] overflow-y-auto">
                <PhotoSection
                    type={activeTab}
                    queue={uploadQueue[activeTab]}
                    existingPhotos={existingPhotos[activeTab]}
                    onAddRow={addRowToQueue}
                    onFileChange={handleFileSelected}
                    onKeteranganChange={handleKeteranganChange}
                    onRemoveFromQueue={handleRemoveFromQueue}
                    onDeleteExisting={handleDeleteExistingPhoto}
                />
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <button onClick={closeModal} className="bg-gray-200 px-6 py-2 rounded-lg">Tutup</button>
                <button 
                    onClick={handleUploadAll}
                    disabled={isUploading || Object.values(uploadQueue).every(q => q.length === 0 || q.every(item => !item.file))}
                    className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg disabled:bg-gray-400 disabled:cursor-wait"
                >
                    {isUploading ? 'Meng-upload...' : 'Upload Semua & Simpan'}
                </button>
            </div>
        </div>
    );
};

export default PhotoUploadModal;

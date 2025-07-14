import React from 'react';

const ConfirmDeleteModal = ({ closeModal, showNotification, title, message, onConfirm }) => {
    
    // --- [PERBAIKAN] ---
    // Logika dibuat lebih sederhana dan aman. Modal ini tidak lagi tahu apa-apa
    // tentang database. Tugasnya hanya memanggil fungsi onConfirm yang diberikan.
    const handleConfirm = async () => {
        if (typeof onConfirm === 'function') {
            try {
                // Langsung menjalankan fungsi yang dikirim dari komponen pemanggil,
                // di mana logika async dan deleteDoc sebenarnya berada.
                await onConfirm(); 
                // Notifikasi sukses seharusnya dipanggil oleh komponen pemanggil
                // setelah onConfirm berhasil, bukan di sini.
            } catch (error) {
                // Menampilkan notifikasi error jika promise dari onConfirm gagal.
                showNotification("Terjadi kesalahan saat menjalankan aksi.", "error");
                console.error("Error on confirmation:", error);
            }
        }
        closeModal();
    };

    return (
        <div className="text-center">
            {/* Menggunakan judul dan pesan dinamis langsung dari props */}
            <h2 className="text-2xl font-bold mb-4">{title || 'Konfirmasi Tindakan'}</h2>
            <p className="text-gray-600 mb-6">
                {message || 'Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.'}
            </p>
            <div className="flex justify-center gap-4">
                <button onClick={closeModal} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg">
                    Batal
                </button>
                <button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">
                    Ya, Lanjutkan
                </button>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;

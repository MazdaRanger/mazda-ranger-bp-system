import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';

// --- [PERBAIKAN] ---
// Menggunakan 'rest parameter' (...jobData) untuk mengumpulkan semua properti
// pekerjaan (seperti policeNumber, customerName, dll.) ke dalam satu objek jobData.
const WhatsAppModal = ({ closeModal, showNotification, settings, user, ...jobData }) => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [message, setMessage] = useState('');

    /**
     * Fungsi untuk menghasilkan pesan dari template yang dipilih
     * dan mengganti placeholder dengan data pekerjaan yang relevan.
     */
    const generateMessage = (template) => {
        if (!template) return '';
        let generatedMessage = template.message;
        const placeholders = {
            '{nama_pelanggan}': jobData.customerName || '',
            '{no_polisi}': jobData.policeNumber || '',
            '{model_mobil}': jobData.carModel || '',
            '{tanggal_booking}': jobData.tanggalMasuk || '',
            '{estimasi_selesai}': jobData.tanggalEstimasiSelesai || '',
        };
        for (const key in placeholders) {
            generatedMessage = generatedMessage.replace(new RegExp(key, 'g'), placeholders[key]);
        }
        return generatedMessage;
    };

    /**
     * Menangani perubahan saat pengguna memilih template baru dari dropdown.
     */
    const handleTemplateChange = (e) => {
        const templateIndex = e.target.value;
        if (templateIndex === "") {
            setSelectedTemplate(null);
            setMessage("");
            return;
        }
        const template = settings.whatsappTemplates[templateIndex] || null;
        setSelectedTemplate(template);
        setMessage(generateMessage(template));
    };

    /**
     * Fungsi utama untuk mengirim pesan WhatsApp.
     */
    const handleSendWhatsApp = () => {
        if (!jobData.customerPhone) {
            showNotification("Nomor HP pelanggan tidak ditemukan.", "error");
            return;
        }
        if (!message || message.trim() === '') {
            showNotification("Pesan tidak boleh kosong. Pilih template atau ketik manual.", "error");
            return;
        }
        const internationalPhone = jobData.customerPhone.replace(/[^0-9]/g, '');
        const phone = `62${internationalPhone.startsWith('0') ? internationalPhone.substring(1) : internationalPhone}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        logFollowUp();
    };

    /**
     * Fungsi untuk menyalin pesan ke clipboard.
     */
    const handleCopyMessage = () => {
        if (!message || message.trim() === '') {
            showNotification("Pesan kosong, tidak ada yang bisa disalin.", "warning");
            return;
        }
        navigator.clipboard.writeText(message).then(() => {
            showNotification("Pesan berhasil disalin ke clipboard!", "success");
        }).catch(err => {
            showNotification("Gagal menyalin pesan.", "error");
            console.error("Gagal menyalin pesan: ", err);
        });
    };

    /**
     * Menyimpan catatan (log) follow-up ke database Firestore.
     */
    const logFollowUp = async () => {
        if (!jobData.id) {
            console.error("Job ID tidak ditemukan untuk menyimpan log.");
            return;
        }
        const logEntry = {
            type: selectedTemplate?.title || 'Pesan Manual',
            message: message,
            timestamp: serverTimestamp(),
            sentBy: user?.email || 'unknown'
        };
        try {
            const jobRef = doc(db, JOBS_COLLECTION, jobData.id);
            await updateDoc(jobRef, {
                followUpHistory: arrayUnion(logEntry)
            });
            showNotification("Log follow-up berhasil disimpan.", "info");
        } catch (error) {
            showNotification("Gagal menyimpan log follow-up.", "error");
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-800">Follow Up via WhatsApp ({jobData.policeNumber})</h2>
            <div>
                <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-1">Pilih Template Pesan</label>
                <select 
                    id="template-select"
                    onChange={handleTemplateChange}
                    className="mt-1 p-2 border border-gray-300 rounded-md w-full bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">-- Pilih Template atau Ketik Manual --</option>
                    {(settings.whatsappTemplates || []).map((template, index) => (
                        <option key={index} value={index}>{template.title}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="message-area" className="block text-sm font-medium text-gray-700 mb-1">Isi Pesan (Bisa Diedit)</label>
                <textarea 
                    id="message-area"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows="8"
                    className="mt-1 p-2 border border-gray-300 rounded-md w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Pilih template di atas atau ketik pesan manual di sini..."
                />
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button type="button" onClick={closeModal} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-4 py-2 rounded-lg transition-colors">Batal</button>
                <div className="flex items-center gap-2">
                    <button onClick={handleCopyMessage} className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-clipboard" viewBox="0 0 16 16">
                          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                          <path d="M10.5 1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5m-3 0a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5m-3 0a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5"/>
                        </svg>
                        Salin Pesan
                    </button>
                    <button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-whatsapp" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                        </svg>
                        Kirim via WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppModal;

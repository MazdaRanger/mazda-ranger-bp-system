// --- START: Dropdown Options (Default values, will be overridden by Firestore) ---
export const mazdaModels = ["Mazda 2", "Mazda 2 HB", "Mazda 3", "Mazda 3 HB", "Mazda 6", "Mazda CX-3", "Mazda CX-30", "Mazda CX-5", "Mazda CX-60", "Mazda CX-8", "Mazda CX-9", "Mazda MX-5", "Mazda CX-80 (PHEV)", "Mazda MX-30 EV", "Mazda Biante", "Lainnya"];
export const mazdaColors = ["Soul Red", "Soul Red Crystal Metallic", "Machine Gray Metallic", "Polymetal Gray Metallic", "Snowflake White Pearl Mica", "Jet Black Mica", "Deep Crystal Blue Mica", "Platinum Quartz Metallic", "Zircon Sand Metallic", "Rhodium White Premium", "Artisan Red Metallic", "Melting Cooper Metallic", "Lainnya"];
export const posisiKendaraanOptions = ["Di Pemilik", "Di Bengkel"];
export const sparepartOrderOptions = ["Tidak Ada", "Ada Order Part", "Ada Order Tambahan"];
export const statusOrderPartOptions = ["Ready", "Ready Sebagian", "Part Indent", "On Order"];
export const statusPenagihanOptions = ["Belum ada Penagihan", "Tunggu Pengambilan Salvage", "Proses Penagihan", "Sudah Di Bayar Lunas"];
// --- UPDATED: More comprehensive jobdesk/role options ---
export const jobdeskOptions = ["Service Advisor", "Admin Bengkel", "CRC", "Foreman", "Manager", "Partman", "Ass. Partman"].sort();
// --- END: Dropdown Options ---

// --- START: Initial State Definitions ---
export const initialFormState = {
    policeNumber: '', customerName: '', customerPhone: '', namaSA: '', jumlahPanel: '',
    carModel: mazdaModels[0], carModelLainnya: '', warnaMobil: mazdaColors[0], warnaMobilLainnya: '', namaAsuransi: '', namaAsuransiLainnya: '',
    statusKendaraan: '', statusPekerjaan: "Belum Mulai Perbaikan", posisiKendaraan: posisiKendaraanOptions[0],
    sparepartOrder: sparepartOrderOptions[0], statusOrderPart: statusOrderPartOptions[0], statusPenagihan: "Belum ada Penagihan",
    tanggalOrderPart: '', tanggalMasuk: new Date().toISOString().slice(0, 10), tanggalSelesai: '', tanggalDiambil: '', tanggalMulaiPerbaikan: '', tanggalEstimasiSelesai: '', keterangan: '',
};
export const initialCostState = { hargaJasa: 0, hargaPart: 0, hargaModalBahan: 0, hargaBeliPart: 0, hargaSPKL: 0 };
export const initialEstimateData = { jasaItems: [], partItems: [], discountJasa: 0, discountPart: 0, };
export const initialSettingsState = {
    ppnPercentage: 11,
    monthlyTarget: 600000000,
    weeklyTarget: 150000000,
    afterServiceFollowUpDays: 3, // NEW: Default follow up days
    nationalHolidays: [],
    mechanicNames: ["Mekanik A", "Mekanik B", "Mekanik C", "Mekanik D"].sort(),
    // -- START: Dynamic Options --
    serviceAdvisors: ["Oscar", "Andika"].sort(),
    insuranceOptions: [
        { name: "ABDA / OONA Ins", jasa: 10, part: 5 }, { name: "ACA Insurance", jasa: 10, part: 7.5 },
        { name: "BCA Insurance", jasa: 10, part: 5 }, { name: "BRI Insurance", jasa: 10, part: 5 },
        { name: "Etiqa Insurance", jasa: 10, part: 5 }, { name: "Garda Oto Ins", jasa: 10, part: 5 },
        { name: "Harta Insurance", jasa: 10, part: 5 }, { name: "KB Insurance", jasa: 10, part: 5 },
        { name: "KSK Insurance", jasa: 10, part: 5 }, { name: "Lippo Insurance", jasa: 10, part: 5 },
        { name: "MAG Insurance", jasa: 10, part: 5 }, { name: "MNC Insurance", jasa: 10, part: 5 },
        { name: "MSIG Insurance", jasa: 10, part: 5 }, { name: "Maximus Insurance", jasa: 10, part: 5 },
        { name: "Rama Insurance", jasa: 10, part: 5 }, { name: "Ramayana Insurance", jasa: 10, part: 5 },
        { name: "Reliance Insurance", jasa: 10, part: 5 }, { name: "Sahabat Insurance", jasa: 10, part: 5 },
        { name: "Sompo Insurance", jasa: 10, part: 5 }, { name: "TAP Insurance", jasa: 10, part: 5 },
        { name: "TOB Insurance", jasa: 10, part: 5 }, { name: "Tugu Insurance", jasa: 10, part: 7.5 },
        { name: "Tokio Marine Ins", jasa: 10, part: 5 }, { name: "Zurich Insurance", jasa: 10, part: 5 },
        { name: "Umum / Pribadi", jasa: 10, part: 5 }, { name: "Lainnya", jasa: 10, part: 5 }
    ],
    statusKendaraanOptions: ["Banding Harga SPK", "Booking Masuk", "Klaim Asuransi", "Pengajuan Penambahan", "Rawat Jalan", "SPK Langsung Tunggu Estimasi", "Tunggu Part Lengkap", "Tunggu Pengambilan", "Tunggu SPK", "Tunggu SPK Penambahan", "Work In Progress", "Selesai", "Sudah Di ambil Pemilik"].sort(),
    statusPekerjaanOptions: ["Belum Mulai Perbaikan", "Las Ketok", "Bongkar", "Dempul", "Cat", "Poles", "Pemasangan", "Finishing", "Quality Control", "Tunggu Part", "Selesai"],
    whatsappTemplates: [
        { title: 'Konfirmasi Booking', message: 'Selamat pagi/siang, Bapak/Ibu {nama_pelanggan}.\n\nKami dari Mazda Ranger ingin mengonfirmasi jadwal booking Anda untuk mobil {model_mobil} ({no_polisi}) pada tanggal {tanggal_booking}.\n\nMohon konfirmasi kedatangan Anda. Terima kasih.' },
        { title: 'Info Kendaraan Selesai', message: 'Selamat pagi/siang, Bapak/Ibu {nama_pelanggan}.\n\nKami informasikan bahwa mobil {model_mobil} ({no_polisi}) Anda telah selesai diperbaiki dan siap untuk diambil.\n\nTerima kasih.' },
        { title: 'Follow Up After Service', message: 'Selamat pagi/siang, Bapak/Ibu {nama_pelanggan}.\n\nTerima kasih telah melakukan perbaikan mobil {no_polisi} di Mazda Ranger. Untuk meningkatkan kualitas layanan kami, mohon kesediaannya untuk memberikan rating kepuasan Anda.\n\nTerima kasih.' }
    ],
    // -- END: Dynamic Options --
    userRoles: {},
};

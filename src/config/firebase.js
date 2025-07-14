import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, increment } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


// --- START: Firebase Configuration ---
// Pastikan konfigurasi ini sesuai dengan proyek Anda di Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDbDgpLiwWlQyNgFGj47WpLaZKf-5HNr-0",
    authDomain: "mazda-ranger-system.firebaseapp.com",
    projectId: "mazda-ranger-system",
    // --- [PENTING] PASTIKAN NILAI INI BENAR ---
    // Buka Firebase Console > Project Settings, cari nilai Storage bucket.
    // Biasanya formatnya: `nama-proyek.appspot.com`
    storageBucket: "mazda-ranger-system.firebasestorage.app", 
    messagingSenderId: "245961631009",
    appId: "1:245961631009:web:7787306dad9450e2854a60"
};
// --- END: Firebase Configuration ---

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- ADMIN & COLLECTION CONFIGURATION ---
const ADMIN_UID = "sa4QbuTtBSfmnNwDgefOtTaNYl83";
const JOBS_COLLECTION = "shared-bengkel-jobs";
const SETTINGS_COLLECTION = "bengkel-settings";
const USERS_COLLECTION = "users";
const SPAREPART_COLLECTION = "bengkel-spareparts-master";
const SUPPLIERS_COLLECTION = "bengkel-suppliers";

export { 
    app, 
    auth, 
    db,
    storage,
    increment,
    ADMIN_UID,
    JOBS_COLLECTION,
    SETTINGS_COLLECTION,
    USERS_COLLECTION,
    SPAREPART_COLLECTION,
    SUPPLIERS_COLLECTION
};

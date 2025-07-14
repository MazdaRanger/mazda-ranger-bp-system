import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth, USERS_COLLECTION } from '../../config/firebase';
import { jobdeskOptions } from '../../utils/constants';

const ProfileModal = ({ closeModal, showNotification, user, userData }) => {
    const [profileData, setProfileData] = useState({ displayName: userData.displayName || '', jobdesk: userData.jobdesk || 'Service Advisor' });

    const handleInputChange = (e) => setProfileData(p => ({...p, [e.target.name]: e.target.value}));

    const handleSaveProfile = async () => {
        const userDocRef = doc(db, USERS_COLLECTION, user.uid);
        try {
            await updateDoc(userDocRef, { 
                displayName: profileData.displayName, 
                jobdesk: profileData.jobdesk 
            });
            showNotification("Profil berhasil diperbarui.", "success");
            closeModal();
        } catch (error) {
            showNotification("Gagal memperbarui profil.", "error");
        }
    };

    const handleResetPassword = () => {
        sendPasswordResetEmail(auth, user.email)
            .then(() => showNotification("Email reset password telah dikirim.", "success"))
            .catch((error) => showNotification(`Gagal mengirim email: ${error.message}`, "error"));
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Edit Profil</h2>
            <div>
                <label className="block text-sm font-medium text-gray-700">Nama User</label>
                <input type="text" name="displayName" value={profileData.displayName} onChange={handleInputChange} className="mt-1 p-2 border rounded-md w-full"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Jobdesk</label>
                <select 
                    name="jobdesk" 
                    value={profileData.jobdesk} 
                    onChange={handleInputChange} 
                    className="mt-1 p-2 border rounded-md w-full bg-white">
                    {jobdeskOptions.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Ganti Password</label>
                <p className="text-xs text-gray-500 mb-2">Klik tombol di bawah untuk mengirim link reset password ke email Anda.</p>
                <button onClick={handleResetPassword} className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Kirim Link Reset Password</button>
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button>
                <button onClick={handleSaveProfile} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Simpan Profil</button>
            </div>
        </div>
    );
};

export default ProfileModal;

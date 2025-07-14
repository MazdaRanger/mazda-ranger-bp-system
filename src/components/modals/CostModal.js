import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';

function CostModal({ closeModal, showNotification, user, ...jobData }) {
    
    // --- [PERBAIKAN KONSISTENSI] ---
    // Menyamakan nama state dengan nama field di Firestore untuk kejelasan
    const [costState, setCostState] = useState({
        hargaModalBahan: jobData.costData?.hargaModalBahan || 0,
        hargaBeliPart: jobData.costData?.hargaBeliPart || 0,
        jasaExternal: jobData.costData?.jasaExternal || 0,
    });
    
    const [financeDocs, setFinanceDocs] = useState(jobData.financeDocs || {});
    const [isClosingWO, setIsClosingWO] = useState(jobData.isClosed || false);

    const isPrivateJob = jobData.namaAsuransi === 'Umum / Pribadi';

    const handleCostChange = (e) => {
        const { name, value } = e.target;
        setCostState(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleDocsChange = (e) => {
        const { name, checked } = e.target;
        setFinanceDocs(prev => ({ ...prev, [name]: checked }));
    };

    const handleSave = async () => {
        const totalRevenue = (jobData.hargaJasa || 0) + (jobData.hargaPart || 0);
        const totalExpenses = (costState.hargaModalBahan || 0) + (costState.hargaBeliPart || 0) + (costState.jasaExternal || 0);
        
        // Lakukan kalkulasi ulang penuh dan SET nilai final GP.
        // Ini memastikan data selalu benar dan memperbaiki kesalahan sebelumnya.
        const finalGrossProfit = totalRevenue - totalExpenses;

        const dataToUpdate = {
            // SET nilai biaya yang final, bukan increment.
            costData: {
                hargaModalBahan: costState.hargaModalBahan,
                hargaBeliPart: costState.hargaBeliPart,
                jasaExternal: costState.jasaExternal,
            },
            grossProfit: finalGrossProfit, // SET nilai GP final.
            financeDocs,
            updatedAt: serverTimestamp(),
            lastUpdatedBy: user.email,
        };

        if (isClosingWO && !jobData.isClosed) {
            dataToUpdate.isClosed = true;
            dataToUpdate.closedAt = serverTimestamp();
            dataToUpdate.statusKendaraan = 'Sudah Di ambil Pemilik';
            const finishDate = jobData.tanggalSelesai || new Date().toISOString().slice(0, 10);
            dataToUpdate.tanggalSelesai = finishDate;
            if (!jobData.tanggalDiambil) {
                dataToUpdate.tanggalDiambil = finishDate;
            }
        }

        try {
            await updateDoc(doc(db, JOBS_COLLECTION, jobData.id), dataToUpdate);
            showNotification('Data biaya dan dokumen berhasil diperbarui.', 'success');
            closeModal();
        } catch (error) {
            showNotification('Gagal memperbarui data biaya.', 'error');
            console.error('Error updating cost data:', error);
        }
    };

    const documentList = [
        { id: 'hasSpkAsuransi', label: 'SPK Asuransi' }, { id: 'hasWoEstimasi', label: 'WO & Estimasi Bengkel' },
        { id: 'hasApprovalBiaya', label: 'Approval Biaya Perbaikan' }, { id: 'hasFotoPeneng', label: 'Foto No. Peneng' },
        { id: 'hasFotoEpoxy', label: 'Foto Epoxy' }, { id: 'hasGesekRangka', label: 'Gesek Rangka' },
        { id: 'hasFotoSelesai', label: 'Foto Selesai Perbaikan' }, { id: 'hasInvoice', label: 'Invoice' },
        { id: 'hasFakturPajak', label: 'Faktur Pajak' }
    ];

    const totalRevenue = (jobData.hargaJasa || 0) + (jobData.hargaPart || 0);
    const totalExpenses = (costState.hargaModalBahan || 0) + (costState.hargaBeliPart || 0) + (costState.jasaExternal || 0);
    const calculatedGrossProfit = totalRevenue - totalExpenses;

    const canCloseWO = jobData.statusPekerjaan === 'Selesai' &&
                       (jobData.statusOrderPart === 'Ready' || jobData.statusOrderPart === 'Tidak Ada' || jobData.statusOrderPart === 'Ready Sebagian') &&
                       (isPrivateJob || documentList.every(docItem => financeDocs[docItem.id]));

    return (
        <div className='space-y-6'>
             <h2 className='text-2xl font-bold'>Pembebanan Biaya & Close WO ({jobData.policeNumber})</h2>
            <p className='-mt-4 rounded-md bg-gray-100 p-2 text-center text-sm font-semibold text-gray-600'>Asuransi: {jobData.namaAsuransi}</p>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
                    <h3 className='mb-3 text-lg font-bold text-blue-800'>Revenue (Setelah Diskon)</h3>
                    <div className='space-y-2'>
                        <div className='flex justify-between'><span>Harga Jasa</span><span className='font-semibold'>Rp {(jobData.hargaJasa || 0).toLocaleString('id-ID')}</span></div>
                        <div className='flex justify-between'><span>Harga Part</span><span className='font-semibold'>Rp {(jobData.hargaPart || 0).toLocaleString('id-ID')}</span></div>
                        <div className='mt-2 flex justify-between border-t pt-2'><span className='font-bold'>Total Revenue</span><span className='font-bold text-blue-700'>Rp {totalRevenue.toLocaleString('id-ID')}</span></div>
                    </div>
                </div>
                <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
                    <h3 className='mb-3 text-lg font-bold text-red-800'>Expenses</h3>
                    <div className='space-y-2'>
                        <div><label className='text-sm'>Biaya Bahan</label><input type='number' name='hargaModalBahan' value={costState.hargaModalBahan || ''} onChange={handleCostChange} className='mt-1 w-full rounded-lg border p-2' /></div>
                        <div><label className='text-sm'>Harga Beli Part</label><input type='number' name='hargaBeliPart' value={costState.hargaBeliPart || ''} onChange={handleCostChange} className='mt-1 w-full rounded-lg border p-2' /></div>
                        <div><label className='text-sm'>Jasa Eksternal (SPKL)</label><input type='number' name='jasaExternal' value={costState.jasaExternal || ''} onChange={handleCostChange} className='mt-1 w-full rounded-lg border p-2' /></div>
                        <div className='mt-2 flex justify-between border-t pt-2'><span className='font-bold'>Total Expenses</span><span className='font-bold text-red-700'>Rp {totalExpenses.toLocaleString('id-ID')}</span></div>
                    </div>
                </div>
            </div>
            <div className='rounded-lg bg-green-100 p-4 text-center'>
                <p className='text-sm font-semibold text-green-800'>GROSS PROFIT</p>
                <p className='text-2xl font-extrabold text-green-700'>Rp {calculatedGrossProfit.toLocaleString('id-ID')}</p>
            </div>
            {!isPrivateJob ? (
                <fieldset className='rounded-lg border p-4'>
                    <legend className='px-2 font-semibold text-indigo-600'>Checklist Dokumen Penagihan</legend>
                    <div className='grid grid-cols-2 gap-4 md:grid-cols-3'>
                        {documentList.map(docItem => (<div key={docItem.id} className='flex items-center'><input type='checkbox' id={docItem.id} name={docItem.id} checked={!!financeDocs[docItem.id]} onChange={handleDocsChange} className='h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500' /><label htmlFor={docItem.id} className='ml-2 text-sm font-medium text-gray-700'>{docItem.label}</label></div>))}
                    </div>
                </fieldset>
            ) : (<div className='rounded-lg bg-gray-100 p-3 text-center text-gray-600'>Checklist dokumen tidak diperlukan untuk pekerjaan pribadi/umum.</div>)}
            <div className={`rounded-lg border p-4 ${canCloseWO ? 'border-green-400 bg-green-100' : 'border-yellow-400 bg-yellow-100'}`}>
                <label className='flex cursor-pointer items-center gap-3'>
                    <input type='checkbox' checked={isClosingWO} onChange={(e) => setIsClosingWO(e.target.checked)} disabled={!canCloseWO} className='h-5 w-5 rounded disabled:cursor-not-allowed' />
                    <span className={`font-bold ${canCloseWO ? 'text-green-800' : 'text-yellow-800'}`}>Close Work Order</span>
                </label>
                {!canCloseWO && (<p className='mt-1 ml-8 text-xs text-yellow-700'>Pastikan status pekerjaan 'Selesai', semua part 'Ready'{!isPrivateJob && ', dan semua dokumen penagihan sudah lengkap'}, untuk bisa menutup WO.</p>)}
            </div>
            <div className='mt-6 flex items-center justify-between border-t pt-4'>
                <button type='button' onClick={closeModal} className='rounded-lg bg-gray-200 px-4 py-2'>Batal</button>
                <button onClick={handleSave} className='rounded-lg bg-blue-600 px-6 py-2 text-white'>Simpan & Close WO</button>
            </div>
        </div>
    );
}

export default CostModal;

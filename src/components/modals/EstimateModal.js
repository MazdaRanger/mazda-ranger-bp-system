import React, { useState, useMemo } from 'react';
import { doc, updateDoc, serverTimestamp, runTransaction, query, collection, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, JOBS_COLLECTION, SPAREPART_COLLECTION } from '../../config/firebase';
import { formatCurrency, generatePDF } from '../../utils/helpers';

const EstimateModal = ({ closeModal, showNotification, user, settings, ...jobData }) => {
    
    const [jasaItems, setJasaItems] = useState(
        jobData.estimateData?.jasaItems || jobData.jasaItems || []
    );
    const [partItems, setPartItems] = useState(
        (jobData.estimateData?.partItems || jobData.partItems || []).map(item => ({ ...item, isOrdered: item.isOrdered || false }))
    );

    const getInitialDiscounts = () => {
        const data = jobData.estimateData || jobData; 
        if (data.jasaItems?.length > 0 || data.partItems?.length > 0) {
            return { 
                jasa: data.discountJasa || 0, 
                part: data.discountPart || 0 
            };
        }
        const insuranceData = (settings.insuranceOptions || []).find(opt => opt.name === jobData.namaAsuransi);
        return insuranceData ? { jasa: insuranceData.jasa || 0, part: insuranceData.part || 0 } : { jasa: 0, part: 0 };
    };

    const [discounts, setDiscounts] = useState(getInitialDiscounts());
    const { ppnPercentage } = settings;

    // --- [IMPLEMENTASI FITUR] Fungsi untuk auto-load data part ---
    const handlePartNumberBlur = async (index, partNumber) => {
        if (!partNumber) return;

        const partNumberUpper = partNumber.toUpperCase();
        
        // Cek dulu apakah part number berubah, jika tidak, jangan query
        if (partItems[index].number === partNumberUpper) return;

        showNotification(`Mencari data untuk part ${partNumberUpper}...`, "info", 1500);
        
        const q = query(collection(db, SPAREPART_COLLECTION), where("kodeBahan", "==", partNumberUpper));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const partMasterData = querySnapshot.docs[0].data();
            const updatedItems = [...partItems];
            updatedItems[index] = {
                ...updatedItems[index],
                number: partMasterData.kodeBahan,
                name: partMasterData.namaBahan,
                price: partMasterData.hargaJual || 0
            };
            setPartItems(updatedItems);
            showNotification(`Data untuk ${partMasterData.namaBahan} berhasil dimuat.`, "success");
        } else {
            showNotification(`Data part baru untuk ${partNumberUpper}. Silakan isi manual.`, "info");
            // Jika tidak ditemukan, pastikan nomor part yang diketik tetap tersimpan
            const updatedItems = [...partItems];
            updatedItems[index].number = partNumberUpper;
            setPartItems(updatedItems);
        }
    };

    const handleItemChange = (type, index, field, value) => {
        const isNumeric = ['qty', 'price'].includes(field);
        const val = isNumeric ? parseFloat(value) || 0 : value;
        if (type === 'jasa') {
            setJasaItems(p => p.map((item, i) => i === index ? { ...item, [field]: val } : item));
        } else {
            setPartItems(p => p.map((item, i) => i === index ? { ...item, [field]: val } : item));
        }
    };

    const addItem = (type) => {
        if (type === 'jasa') {
            setJasaItems([...jasaItems, { name: '', price: 0 }]);
        } else {
            setPartItems([...partItems, { name: '', number: '', qty: 1, price: 0, isOrdered: false }]);
        }
    };

    const removeItem = (type, index) => {
        if (type === 'jasa') setJasaItems(jasaItems.filter((_, i) => i !== index));
        else setPartItems(partItems.filter((_, i) => i !== index));
    };

    const totals = useMemo(() => {
        const subtotalJasa = jasaItems.reduce((acc, item) => acc + item.price, 0);
        const subtotalPart = partItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
        const discountJasaAmount = Math.round(subtotalJasa * (discounts.jasa / 100));
        const discountPartAmount = Math.round(subtotalPart * (discounts.part / 100));
        const totalAfterDiscount = (subtotalJasa - discountJasaAmount) + (subtotalPart - discountPartAmount);
        const ppnAmount = Math.round(totalAfterDiscount * (ppnPercentage / 100));
        const grandTotal = totalAfterDiscount + ppnAmount;
        return { subtotalJasa, subtotalPart, discountJasaAmount, discountPartAmount, grandTotal, ppnAmount, totalAfterDiscount };
    }, [jasaItems, partItems, discounts, ppnPercentage]);

    const createMasterSpareparts = async (parts) => {
        const sparepartRef = collection(db, SPAREPART_COLLECTION);
        const batch = writeBatch(db);
        let newPartsCount = 0;

        for (const part of parts) {
            if (!part.number) continue;
            
            const q = query(sparepartRef, where("kodeBahan", "==", part.number.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                const newPartRef = doc(sparepartRef);
                batch.set(newPartRef, {
                    namaBahan: part.name,
                    kodeBahan: part.number.toUpperCase(),
                    hargaJual: part.price,
                    hargaModal: 0,
                    stok: 0,
                    minStok: 1,
                    satuan: "Pcs",
                    tipe: "part",
                    supplier: "",
                    createdAt: serverTimestamp(),
                });
                newPartsCount++;
            }
        }
        if (newPartsCount > 0) {
            await batch.commit();
            showNotification(`${newPartsCount} sparepart baru berhasil ditambahkan ke database master.`, "info");
        }
    };

    const handleSaveEstimate = async (isFinalWO = false) => {
        let woNumber = jobData.woNumber;
        
        if (isFinalWO && !woNumber) {
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const counterRef = doc(db, "counters", `wo-${now.getFullYear()}-${month}`);
            try {
                const newCount = await runTransaction(db, async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;
                    const nextCount = currentCount + 1;
                    transaction.set(counterRef, { count: nextCount });
                    return nextCount;
                });
                woNumber = `BW${year}${month}${newCount.toString().padStart(4, '0')}`;
            } catch (e) {
                showNotification("Gagal membuat nomor WO. Coba lagi.", "error");
                console.error("Error generating WO number:", e);
                return;
            }
        }

        const processedPartItems = partItems.map(item => ({
            name: item.name, number: item.number, qty: item.qty, price: item.price, isOrdered: item.isOrdered || false
        }));

        const estimateData = { 
            jasaItems, 
            partItems: processedPartItems, 
            discountJasa: discounts.jasa, 
            discountPart: discounts.part, 
            ...totals 
        };
        
        const dataToUpdate = {
            estimateData,
            hargaJasa: totals.subtotalJasa - totals.discountJasaAmount,
            hargaPart: totals.subtotalPart - totals.discountPartAmount,
            grossProfit: totals.totalAfterDiscount,
            updatedAt: serverTimestamp(),
            lastUpdatedBy: user.email,
            woNumber: woNumber || null,
            jasaItems: null,
            partItems: null,
            discountJasa: null,
            discountPart: null
        };

        if (partItems.length > 0 && !jobData.partOrderStatus) {
             dataToUpdate.partOrderStatus = 'Menunggu Konfirmasi Partman';
             dataToUpdate.statusOrderPart = 'Menunggu Konfirmasi Partman';
        }

        if (isFinalWO) {
            dataToUpdate.isWoConfirmed = true;
        }

        try {
            await updateDoc(doc(db, JOBS_COLLECTION, jobData.id), dataToUpdate);
            
            if (isFinalWO && partItems.length > 0) {
                await createMasterSpareparts(partItems);
            }

            const notificationMessage = isFinalWO ? "Work Order berhasil disimpan!" : "Estimasi berhasil disimpan.";
            showNotification(notificationMessage, "success");
            if (isFinalWO) {
                generatePDF({ ...jobData, ...dataToUpdate, estimateData }, true, showNotification);
            }
            closeModal();
        } catch (error) {
             showNotification("Gagal menyimpan data ke database.", "error");
             console.error("Error updating document:", error);
        }
    };

    const handlePrintEstimate = () => {
        const fullJobDataForPrint = { ...jobData, estimateData: { jasaItems, partItems, discountJasa: discounts.jasa, discountPart: discounts.part, ...totals } };
        generatePDF(fullJobDataForPrint, false, showNotification);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Estimasi Biaya ({jobData.policeNumber})</h2>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                <div>
                    <h3 className="font-bold text-lg mb-2">Jasa</h3>
                    <div className="flex items-center gap-4 mb-2">
                        <label>Diskon Jasa (%):</label>
                        <input type="number" value={discounts.jasa} onChange={e => setDiscounts({ ...discounts, jasa: parseFloat(e.target.value) || 0 })} className="p-1 border w-24 rounded-md" />
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50"><tr><th className="p-2">Nama Jasa</th><th className="p-2">Harga</th><th className="w-10"></th></tr></thead>
                        <tbody>{jasaItems.map((item, index) => (
                            <tr key={index}>
                                <td><input value={item.name} onChange={e => handleItemChange('jasa', index, 'name', e.target.value)} placeholder="Nama Jasa" className="p-1 border w-full rounded-md" /></td>
                                <td><input type="number" value={item.price} onChange={e => handleItemChange('jasa', index, 'price', e.target.value)} className="p-1 border w-full rounded-md" /></td>
                                <td><button onClick={() => removeItem('jasa', index)} className="text-red-500 px-2 font-bold">X</button></td>
                            </tr>
                        ))}</tbody>
                    </table>
                    <button onClick={() => addItem('jasa')} className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800">+ Tambah Jasa</button>
                </div>
                <div className="mt-6">
                    <h3 className="font-bold text-lg mb-2">Suku Cadang</h3>
                    <div className="flex items-center gap-4 mb-2">
                        <label>Diskon Part (%):</label>
                        <input type="number" value={discounts.part} onChange={e => setDiscounts({ ...discounts, part: parseFloat(e.target.value) || 0 })} className="p-1 border w-24 rounded-md" />
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50"><tr><th className="p-2">No. Part</th><th className="p-2">Nama Part</th><th className="w-20">Qty</th><th className="p-2">Harga</th><th className="p-2">Total</th><th className="w-10"></th></tr></thead>
                        <tbody>{partItems.map((item, index) => (
                            <tr key={index}>
                                <td>
                                    {/* --- [IMPLEMENTASI FITUR] Menambahkan onBlur event handler --- */}
                                    <input 
                                        value={item.number || ''} 
                                        onChange={e => handleItemChange('part', index, 'number', e.target.value)} 
                                        onBlur={(e) => handlePartNumberBlur(index, e.target.value)}
                                        placeholder="No. Part" 
                                        className="p-1 border w-full rounded-md" 
                                    />
                                </td>
                                <td><input value={item.name} onChange={e => handleItemChange('part', index, 'name', e.target.value)} placeholder="Nama Part" className="p-1 border w-full rounded-md" /></td>
                                <td><input type="number" value={item.qty} onChange={e => handleItemChange('part', index, 'qty', e.target.value)} placeholder="Qty" className="p-1 border w-20 rounded-md" /></td>
                                <td><input type="number" value={item.price} onChange={e => handleItemChange('part', index, 'price', e.target.value)} placeholder="Harga" className="p-1 border w-full rounded-md" /></td>
                                <td className="p-2">{formatCurrency(item.qty * item.price)}</td>
                                <td><button onClick={() => removeItem('part', index)} className="text-red-500 px-2 font-bold">X</button></td>
                            </tr>
                        ))}</tbody>
                    </table>
                    <button onClick={() => addItem('part')} className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800">+ Tambah Part</button>
                </div>
            </div>
            <div className="mt-6 border-t pt-4 text-right space-y-1">
                <p>Subtotal Jasa: {formatCurrency(totals.subtotalJasa)}</p>
                <p>Subtotal Part: {formatCurrency(totals.subtotalPart)}</p>
                <p className="text-red-600">Diskon Jasa ({discounts.jasa}%): ({formatCurrency(totals.discountJasaAmount)})</p>
                <p className="text-red-600">Diskon Part ({discounts.part}%): ({formatCurrency(totals.discountPartAmount)})</p>
                <p>PPN ({ppnPercentage}%): {formatCurrency(totals.ppnAmount)}</p>
                <p className="font-bold text-xl">Grand Total: <span className="font-bold text-xl">{formatCurrency(totals.grandTotal)}</span></p>
            </div>
            <div className="flex justify-between items-center mt-8 pt-4 border-t">
                <button type="button" onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">Batal</button>
                <div className="flex gap-4">
                    <button onClick={() => handleSaveEstimate(false)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Simpan Estimasi</button>
                    <button onClick={handlePrintEstimate} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">Cetak Estimasi</button>
                    <button onClick={() => handleSaveEstimate(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Save & Cetak WO</button>
                </div>
            </div>
        </div>
    );
};

export default EstimateModal;

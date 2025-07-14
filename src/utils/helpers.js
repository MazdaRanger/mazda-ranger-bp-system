export const formatCurrency = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number || 0);

export const toYyyyMmDd = (date) => {
    if (!date) return '';
    if (date.toDate) {
      date = date.toDate();
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
};

export const exportToCsv = (filename, rows) => {
    if (!rows || rows.length === 0) {
        alert("Tidak ada data untuk diekspor.");
        return;
    }
    const separator = ';';

    const processRow = (row) => {
        let finalVal = '';
        for (let j = 0; j < row.length; j++) {
            let innerValue = row[j] === null || row[j] === undefined ? '' : row[j].toString();

            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString('id-ID');
            }

            let result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0) {
                result = '"' + result + '"';
            }
            if (j > 0) {
                finalVal += separator;
            }
            finalVal += result;
        }
        return finalVal + '\n';
    };

    const headers = Object.keys(rows[0]);
    let csvFile = 'sep=' + separator + '\n';
    csvFile += processRow(headers);

    for (let i = 0; i < rows.length; i++) {
        csvFile += processRow(Object.values(rows[i]));
    }

    const blob = new Blob(['\uFEFF' + csvFile], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const generatePDF = (jobData, isWO, showNotification) => { 
    const executePdfGeneration = () => { 
        try { 
            const { jsPDF } = window.jspdf; 
            const doc = new jsPDF(); 
            const estimateData = jobData.estimateData || {}; 
            const jasaItems = estimateData.jasaItems || []; 
            const partItems = estimateData.partItems || []; 
            const totals = { 
                subtotalJasa: estimateData.subtotalJasa || 0, 
                discountJasaAmount: estimateData.discountJasaAmount || 0, 
                subtotalPart: estimateData.subtotalPart || 0, 
                discountPartAmount: estimateData.discountPartAmount || 0, 
                ppnAmount: estimateData.ppnAmount || 0, 
                grandTotal: estimateData.grandTotal || 0, 
            }; 
            const discounts = { jasa: estimateData.discountJasa || 0, part: estimateData.discountPart || 0 }; 
            const title = isWO ? "WORK ORDER" : "ESTIMASI BIAYA"; 
            const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); 
            doc.setFontSize(18); 
            doc.text(title, 14, 22); 
            doc.setFontSize(11); 
            let yPos = 32; 
            doc.text(`No. Polisi: ${jobData.policeNumber}`, 14, yPos); 
            doc.text(`Tanggal Cetak: ${today}`, 140, yPos); 
            yPos += 6; 
            doc.text(`Pelanggan: ${jobData.customerName}`, 14, yPos); 
            if (isWO && jobData.woNumber) { 
                doc.text(`No. Work Order: ${jobData.woNumber}`, 140, yPos); 
            } 
            yPos += 6; 
            doc.text(`Model: ${jobData.carModel} (${jobData.warnaMobil || 'N/A'})`, 14, yPos); 
            yPos += 6; 
            if (jobData.namaAsuransi && jobData.namaAsuransi !== "Umum / Pribadi") { 
                doc.text(`Asuransi: ${jobData.namaAsuransi}`, 14, yPos); 
                yPos += 6; 
            } 
            doc.autoTable({ 
                startY: yPos + 5, 
                head: [['JASA PERBAIKAN', 'HARGA']], 
                body: jasaItems.map(j => [j.name, formatCurrency(j.price)]), 
                theme: 'striped', 
                headStyles: { fillColor: [41, 128, 185] }, 
            }); 
            doc.autoTable({ 
                startY: doc.autoTable.previous.finalY + 10, 
                head: [['NO. PART', 'NAMA PART', 'QTY', 'HARGA SATUAN', 'SUBTOTAL']], 
                body: partItems.map(p => [p.number, p.name, p.qty, formatCurrency(p.price), formatCurrency(p.qty * p.price)]), 
                theme: 'striped', 
                headStyles: { fillColor: [41, 128, 185] }, 
            }); 
            const finalY = doc.autoTable.previous.finalY; 
            const rightColX = 140; 
            doc.setFontSize(10); 
            doc.text(`Subtotal Jasa:`, rightColX, finalY + 10); 
            doc.text(formatCurrency(totals.subtotalJasa), 200, finalY + 10, { align: 'right' }); 
            doc.text(`Diskon Jasa (${discounts.jasa}%):`, rightColX, finalY + 15); 
            doc.text(`-${formatCurrency(totals.discountJasaAmount)}`, 200, finalY + 15, { align: 'right' }); 
            doc.text(`Subtotal Part:`, rightColX, finalY + 20); 
            doc.text(formatCurrency(totals.subtotalPart), 200, finalY + 20, { align: 'right' }); 
            doc.text(`Diskon Part (${discounts.part}%):`, rightColX, finalY + 25); 
            doc.text(`-${formatCurrency(totals.discountPartAmount)}`, 200, finalY + 25, { align: 'right' }); 
            doc.text(`PPN:`, rightColX, finalY + 30); 
            doc.text(formatCurrency(totals.ppnAmount), 200, finalY + 30, { align: 'right' }); 
            doc.setFontSize(12); 
            doc.setFont('helvetica', 'bold'); 
            doc.text(`GRAND TOTAL:`, rightColX, finalY + 40); 
            doc.text(formatCurrency(totals.grandTotal), 200, finalY + 40, { align: 'right' }); 
            let signY = finalY + 60; 
            if (signY > 260) { 
                doc.addPage(); 
                signY = 20; 
            } 
            doc.setFontSize(10); 
            doc.setFont('helvetica', 'normal'); 
            doc.text("Dibuat oleh,", 20, signY); 
            doc.text("Disetujui oleh,", 140, signY); 
            signY += 20; 
            doc.text(`( ${jobData.namaSA || '................'} )`, 20, signY); 
            doc.text(`( ${jobData.customerName} )`, 140, signY); 
            doc.save(`${isWO ? 'WO' : 'Estimasi'}-${jobData.policeNumber}.pdf`); 
        } catch (e) { 
            showNotification("Gagal membuat PDF. Coba lagi.", "error"); 
            console.error("PDF Generation Error:", e); 
        } 
    }; 
    
    const checkReady = (retries = 10) => { 
        if (typeof window.jspdf?.jsPDF === 'function' && typeof new window.jspdf.jsPDF().autoTable === 'function') { 
            executePdfGeneration(); 
        } else if (retries > 0) { 
            setTimeout(() => checkReady(retries - 1), 500); 
        } else { 
            showNotification("Pustaka PDF belum siap. Periksa koneksi internet Anda atau muat ulang halaman.", "error"); 
        } 
    }; 
    checkReady(); 
};

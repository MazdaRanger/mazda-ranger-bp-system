import React, { useState } from 'react';
import SupplierManager from './SupplierManager';
import SparepartManager from './SparepartManager';
// --- [IMPLEMENTASI FITUR 1] Impor komponen baru ---
import BahanManager from './BahanManager';

const InventoryDashboard = ({ openModal, showNotification, settings }) => {
    const [activeTab, setActiveTab] = useState('sparepart');

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Manajemen Inventaris</h1>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('sparepart')}
                        className={`${
                            activeTab === 'sparepart'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Master Suku Cadang (Sparepart)
                    </button>
                    {/* --- [IMPLEMENTASI FITUR 1] Tombol tab baru untuk Master Bahan --- */}
                    <button
                        onClick={() => setActiveTab('bahan')}
                        className={`${
                            activeTab === 'bahan'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Master Bahan (Non-Part)
                    </button>
                    <button
                        onClick={() => setActiveTab('supplier')}
                        className={`${
                            activeTab === 'supplier'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Master Supplier
                    </button>
                    <button
                        onClick={() => showNotification('Fitur Stock Opname sedang dalam pengembangan.', 'info')}
                        className="border-transparent text-gray-400 cursor-not-allowed whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                        title="Segera Hadir"
                    >
                        Stock Opname
                    </button>
                </nav>
            </div>

            <div>
                {activeTab === 'sparepart' && <SparepartManager openModal={openModal} showNotification={showNotification} />}
                {/* --- [IMPLEMENTASI FITUR 1] Render komponen baru --- */}
                {activeTab === 'bahan' && <BahanManager openModal={openModal} showNotification={showNotification} />}
                {activeTab === 'supplier' && <SupplierManager openModal={openModal} showNotification={showNotification} />}
            </div>
        </div>
    );
};

export default InventoryDashboard;

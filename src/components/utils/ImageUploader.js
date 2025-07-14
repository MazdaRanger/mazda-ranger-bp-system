import React, { useRef } from 'react';

/**
 * Komponen UI untuk memilih file gambar. Logika dipindahkan ke parent.
 * @param {function} onChange - Callback standar `onChange` dari input file.
 * @param {string} previewUrl - URL blob dari gambar yang dipilih untuk ditampilkan sebagai preview.
 */
const ImageUploader = ({ onChange, previewUrl }) => {
    
    // --- [FIX] Menggunakan useRef untuk ID yang stabil dan tidak berubah setiap render ---
    const inputId = useRef(`image-upload-${Math.random().toString(36).substring(2, 9)}`);

    return (
        <div className="w-full">
            <label 
                htmlFor={inputId.current} 
                className="aspect-w-4 aspect-h-3 w-full bg-gray-100 rounded-lg border-2 border-dashed cursor-pointer flex items-center justify-center text-gray-400 hover:border-indigo-500 hover:bg-gray-50 transition-colors overflow-hidden"
            >
                {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-xs mt-1 block">Pilih Gambar</span>
                    </div>
                )}
            </label>
            <input
                id={inputId.current}
                type="file"
                accept="image/*"
                onChange={onChange}
                className="hidden"
            />
        </div>
    );
};

export default ImageUploader;

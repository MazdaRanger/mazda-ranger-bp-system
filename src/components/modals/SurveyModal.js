import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, JOBS_COLLECTION } from '../../config/firebase';

// --- [PERBAIKAN] ---
// Menggunakan 'rest parameter' (...jobData) untuk mengumpulkan properti pekerjaan.
const SurveyModal = ({ closeModal, showNotification, settings, user, ...jobData }) => {
    const [answers, setAnswers] = useState({});
    const [overallScore, setOverallScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const surveyQuestions = settings.surveyQuestions || [];

    const handleAnswerChange = (question, answer) => {
        setAnswers(prev => ({ ...prev, [question]: answer }));
    };

    const handleSaveSurvey = async () => {
        if (Object.keys(answers).length !== surveyQuestions.length || overallScore === 0) {
            showNotification("Harap isi semua pertanyaan dan berikan skor kepuasan.", "error");
            return;
        }

        setIsSaving(true);

        const surveyResults = surveyQuestions.map(q => ({
            question: q,
            answer: answers[q] || ''
        }));

        const surveyLog = {
            surveyTaker: user.email,
            timestamp: serverTimestamp(),
            score: overallScore,
            results: surveyResults
        };

        try {
            const jobRef = doc(db, JOBS_COLLECTION, jobData.id);
            await updateDoc(jobRef, {
                surveyCompleted: true,
                surveySent: true,
                surveyScore: overallScore,
                surveyData: surveyLog
            });
            showNotification("Hasil survey berhasil disimpan.", "success");
            closeModal();
        } catch (error) {
            showNotification("Gagal menyimpan survey. Silakan coba lagi.", "error");
            console.error("Error saving survey:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const StarRating = ({ score, setScore }) => (
        <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    onClick={() => !isSaving && setScore(star)}
                    className={`w-10 h-10 cursor-pointer ${score >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Formulir Survey Kepuasan Pelanggan</h2>
            <div className="text-center bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-700">{jobData.customerName}</p>
                <p className="text-sm text-gray-600">{jobData.policeNumber} - {jobData.carModel}</p>
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-4">
                {surveyQuestions.map((question, index) => (
                    <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {index + 1}. {question}
                        </label>
                        <textarea
                            rows="2"
                            value={answers[question] || ''}
                            onChange={(e) => handleAnswerChange(question, e.target.value)}
                            className="p-2 border rounded-md w-full shadow-sm"
                            placeholder="Tulis jawaban pelanggan di sini..."
                            disabled={isSaving}
                        />
                    </div>
                ))}
            </div>

            <div className="border-t pt-6 text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Skor Kepuasan Keseluruhan</h3>
                <StarRating score={overallScore} setScore={setOverallScore} />
            </div>

            <div className="flex justify-between items-center pt-4 border-t mt-4">
                <button type="button" onClick={closeModal} disabled={isSaving} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50">
                    Batal
                </button>
                <button onClick={handleSaveSurvey} disabled={isSaving} className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-wait">
                    {isSaving ? 'Menyimpan...' : 'Simpan Survey'}
                </button>
            </div>
        </div>
    );
};

export default SurveyModal;

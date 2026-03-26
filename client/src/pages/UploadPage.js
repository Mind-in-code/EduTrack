import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, BookOpen } from 'lucide-react';

export default function UploadPage() {
  const navigate = useNavigate();
  const [subjectName, setSubjectName] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!subjectName.trim()) {
      setError('Please enter a subject name');
      return;
    }
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('Extracting text from PDF...');

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('subjectName', subjectName);

      setStatus('Breaking down your PDF into lessons with AI...');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const data = await res.json();
      setStatus('Organizing course structure...');

      // Save to localStorage
      const stored = JSON.parse(localStorage.getItem('edutrack_subjects') || '[]');
      const newSubject = {
        id: `subject-${Date.now()}`,
        name: data.subjectName,
        courseData: data.courseData,
        totalPages: data.totalPages,
        createdAt: new Date().toISOString()
      };
      stored.push(newSubject);
      localStorage.setItem('edutrack_subjects', JSON.stringify(stored));

      navigate(`/course/${newSubject.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Upload New Subject</h1>
      </div>

      <div className="max-w-lg mx-auto px-5 mt-4">
        {/* Subject Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name</label>
          <input
            type="text"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="e.g. Ancient History"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            disabled={loading}
          />
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">PDF File</label>
          <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
            file ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
          } ${loading ? 'pointer-events-none opacity-60' : ''}`}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => { setFile(e.target.files[0]); setError(''); }}
              className="hidden"
              disabled={loading}
            />
            {file ? (
              <div className="text-center">
                <BookOpen className="mx-auto text-blue-500 mb-2" size={32} />
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-500">Click to upload PDF</p>
                <p className="text-xs text-gray-400 mt-1">Up to 50MB</p>
              </div>
            )}
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
            <Loader2 className="animate-spin text-blue-500" size={20} />
            <p className="text-sm text-blue-700 font-medium">{status}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleUpload}
          disabled={loading}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
            loading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25'
          }`}
        >
          {loading ? 'Processing...' : 'Process with AI'}
        </button>
      </div>
    </div>
  );
}

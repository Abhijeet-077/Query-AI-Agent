import React, { useState, useCallback } from 'react';
import { DocumentTextIcon, CpuChipIcon, UploadIcon } from './Icons';
import Spinner from './Spinner';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  onProcess: () => void;
  isProcessing: boolean;
  isReadingFile: boolean;
  file: File | null;
  hasContent: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, onProcess, isProcessing, isReadingFile, file, hasContent }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileChange(e.dataTransfer.files[0]);
    }
  }, [onFileChange]);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      onFileChange(e.target.files ? e.target.files[0] : null);
  };

  const buttonDisabled = isProcessing || isReadingFile || !hasContent;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex-grow w-full">
        <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.txt"
            disabled={isProcessing || isReadingFile}
        />
        <label
            htmlFor="file-upload"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200
                ${isDragging ? 'border-cyan-400 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'}
                ${(isProcessing || isReadingFile) ? 'cursor-not-allowed opacity-60' : ''}`}
        >
            {file ? (
                <div className="flex items-center gap-4 text-left">
                    <DocumentTextIcon className="w-10 h-10 text-cyan-400 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-gray-200 truncate max-w-xs">{file.name}</p>
                        <p className="text-sm text-gray-400">
                            {isReadingFile ? 'Reading file...' : `${(file.size / 1024).toFixed(2)} KB - Ready to process.`}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center">
                    <UploadIcon className="w-10 h-10 text-gray-500 mb-3" />
                    <p className="font-semibold text-gray-300">
                        <span className="text-cyan-400">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF or TXT files</p>
                </div>
            )}
        </label>
      </div>
      <button
        onClick={onProcess}
        disabled={buttonDisabled}
        className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-3 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105"
        aria-label="Process the uploaded document"
      >
        {isProcessing ? (
          <>
            <Spinner />
            Processing...
          </>
        ) : (
          <>
            <CpuChipIcon className="w-6 h-6" />
            Process Document
          </>
        )}
      </button>
    </div>
  );
};

export default FileUpload;

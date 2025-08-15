import React, { useState, useCallback, useEffect } from 'react';
import { ExtractedEntity } from './types';
import { extractEntitiesFromText } from './services/geminiService';
import FileUpload from './components/FileUpload';
import ResultsTable from './components/ResultsTable';
import Verification from './components/Verification';
import { DownloadIcon, SparklesIcon } from './components/Icons';

export default function App(): React.ReactNode {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedEntity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setDocumentText(null);
      return;
    }

    const readFileContent = async () => {
      setIsReadingFile(true);
      setError(null);
      setExtractedData(null);

      try {
        if (file.type === 'text/plain') {
          const text = await file.text();
          setDocumentText(text);
        } else if (file.type === 'application/pdf') {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

          const doc = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
          const numPages = doc.numPages;
          let fullText = '';
          for (let i = 1; i <= numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => ('str' in item ? item.str : '')).join(' ');
            fullText += pageText + '\n';
          }
          setDocumentText(fullText);
        } else {
          throw new Error('Unsupported file type. Please upload a .txt or .pdf file.');
        }
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Failed to read file.';
        setError(message);
        setDocumentText(null);
        setFile(null);
      } finally {
        setIsReadingFile(false);
      }
    };

    readFileContent();
  }, [file]);

  const handleProcessDocument = useCallback(async () => {
    if (!documentText) {
      setError('No document content to process.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setExtractedData(null);
    try {
      const data = await extractEntitiesFromText(documentText);
      setExtractedData(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsProcessing(false);
    }
  }, [documentText]);

  const handleDownloadCsv = useCallback(() => {
    if (!extractedData) return;

    const headers = ['PAN', 'Relation', 'Entity Name', 'Entity Type'];
    const csvRows = [
      headers.join(','),
      ...extractedData.map(item => 
        [
          `"${item.pan}"`, 
          `"${item.relation}"`, 
          `"${item.entityName.replace(/"/g, '""')}"`, 
          `"${item.entityType}"`
        ].join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'extracted_entities.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [extractedData]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <main className="w-full max-w-6xl mx-auto flex flex-col gap-8">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
            AI Document Entity Extractor
          </h1>
          <p className="text-lg text-gray-400">
            Upload a document to extract PANs, names, and organizations using Gemini.
          </p>
        </header>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-2xl shadow-cyan-500/10 flex flex-col gap-6">
          <FileUpload 
            onFileChange={setFile} 
            onProcess={handleProcessDocument} 
            isProcessing={isProcessing} 
            isReadingFile={isReadingFile}
            file={file}
            hasContent={!!documentText}
          />

          {isProcessing && (
            <div className="flex flex-col items-center justify-center p-8 text-cyan-400">
                <SparklesIcon className="w-12 h-12 animate-pulse mb-4" />
                <p className="text-xl font-semibold">Gemini is analyzing the document...</p>
                <p className="text-gray-400">Extracting entities and relations. This might take a moment.</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
              <p className="font-bold">An Error Occurred</p>
              <p>{error}</p>
            </div>
          )}

          {extractedData && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-200">Extraction Results</h2>
                  <button
                    onClick={handleDownloadCsv}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-colors duration-200"
                    disabled={!extractedData || extractedData.length === 0}
                  >
                    <DownloadIcon className="w-5 h-5" />
                    Download CSV
                  </button>
                </div>
                <ResultsTable data={extractedData} />
              </div>
              <Verification aiData={extractedData} />
            </div>
          )}
        </div>
        <footer className="text-center text-gray-500 text-sm mt-4">
          <p>Hey, this is Abhijeet's AI agent.</p>
        </footer>
      </main>
    </div>
  );
}
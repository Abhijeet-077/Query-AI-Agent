// All code is now in this single file to work with the in-browser Babel compiler.

import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPE DEFINITIONS (from types.ts) ---
interface ExtractedEntity {
  pan: string;
  relation: 'PAN_Of';
  entityName: string;
  entityType: 'Organisation' | 'Name';
}

interface ComparisonResult {
  matches: ExtractedEntity[];
  aiOnly: ExtractedEntity[];
  groundTruthOnly: ExtractedEntity[];
}

// --- GEMINI SERVICE (from services/geminiService.ts) ---
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY is not set. AI features will fail if the key is not provided by the hosting environment.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const entitySchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      pan: {
        type: Type.STRING,
        description: "The 10-character Permanent Account Number (PAN). Should be uppercase alphanumeric.",
      },
      relation: {
        type: Type.STRING,
        description: "The relationship. This should always be the string 'PAN_Of'.",
      },
      entityName: {
        type: Type.STRING,
        description: "The full name of the person or organization associated with the PAN.",
      },
      entityType: {
        type: Type.STRING,
        description: "The type of entity. Should be either 'Organisation' for companies or 'Name' for individuals.",
      },
    },
    required: ["pan", "relation", "entityName", "entityType"],
  },
};

async function extractEntitiesFromText(text: string): Promise<ExtractedEntity[]> {
  const prompt = `
    Based on the following document text, extract all entities of type 'Organisation', 'Name', and 'PAN'.
    For each PAN found, create a relation 'PAN_Of' linking it to the corresponding Name or Organisation.
    - If an entity name contains 'PVT. LTD.', 'LTD.', 'SERVICES', 'AGENCIES', 'TRADERS', 'COMMERCIALS', 'UDYOG', 'ENTERPRISES', 'CONSULTANTS', 'DEVELOPERS', 'BUILDERS', 'LOGISTICS', 'MARKETING', or 'MERCHANTS', classify it as an 'Organisation'.
    - If an entity name is followed by '(HUF)', classify it as a 'Name' and include '(HUF)' in the entityName.
    - For all other cases, classify the entity as a 'Name'.
    Ensure every PAN in the document is extracted along with its corresponding entity.

    Document Text:
    ---
    ${text}
    ---
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: entitySchema,
      },
    });

    const jsonResponse = response.text.trim();
    if (!jsonResponse) {
        throw new Error("AI returned an empty response.");
    }

    const parsedData = JSON.parse(jsonResponse) as ExtractedEntity[];
    
    if (!Array.isArray(parsedData)) {
      throw new Error("AI response is not in the expected array format.");
    }

    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse the AI's response. The data may be malformed.");
    }
    throw new Error("Failed to extract entities from the document. The AI model returned an error.");
  }
}

// --- UI COMPONENTS ---

// from components/Spinner.tsx
const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// from components/Icons.tsx
type IconProps = { className?: string };
const DocumentTextIcon: React.FC<IconProps> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}> <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /> </svg> );
const CpuChipIcon: React.FC<IconProps> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}> <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 21v-1.5M15.75 3v1.5m0 16.5v-1.5m-3.75 0v-1.5m-3.75 0v-1.5m-3.75 0v-1.5m-3.75 0v-1.5m3.75 0v-1.5m3.75 0v-1.5m3.75 0v-1.5m3.75 0v-1.5M12 8.25v7.5" /> </svg> );
const DownloadIcon: React.FC<IconProps> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}> <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /> </svg> );
const SparklesIcon: React.FC<IconProps> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}> <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /> </svg> );
const UploadIcon: React.FC<IconProps> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}> <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /> </svg> );
const CheckCircleIcon: React.FC<IconProps> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}> <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> </svg> );
const XCircleIcon: React.FC<IconProps> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}> <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> </svg> );
const MinusCircleIcon: React.FC<IconProps> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}> <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> </svg> );

// from components/ResultsTable.tsx
interface ResultsTableProps { data: ExtractedEntity[] }
const ResultsTable: React.FC<ResultsTableProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 px-4 bg-gray-800 rounded-lg border-x border-b border-gray-700">
        <p className="text-gray-400">No entities found in this category.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto bg-gray-800/50 rounded-b-lg border-x border-b border-gray-700">
      <div className="max-h-[60vh] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Entity (PAN)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Relation</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Entity (Name / Organisation)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Entity Type</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {data.map((item, index) => (
              <tr key={`${item.pan}-${index}`} className="hover:bg-gray-800/70 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-300">{item.pan}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{item.relation}</td>
                <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-200">{item.entityName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ item.entityType === 'Organisation' ? 'bg-blue-900 text-blue-200' : 'bg-green-900 text-green-200' }`}>
                    {item.entityType}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// from components/Verification.tsx
interface VerificationProps { aiData: ExtractedEntity[] }
const Verification: React.FC<VerificationProps> = ({ aiData }) => {
  const [groundTruthFile, setGroundTruthFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  
  const parseCsv = (csvText: string): ExtractedEntity[] => {
      const result: ExtractedEntity[] = [];
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length < 2) return result;
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const panIndex = headers.indexOf('PAN');
      const nameIndex = headers.indexOf('Entity Name');
      const typeIndex = headers.indexOf('Entity Type');
      if (panIndex === -1 || nameIndex === -1 || typeIndex === -1) {
          throw new Error('CSV must contain "PAN", "Entity Name", and "Entity Type" headers.');
      }
      for (let i = 1; i < lines.length; i++) {
          const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '')) ?? [];
          const entity: ExtractedEntity = {
              pan: values[panIndex]?.trim() ?? '',
              relation: 'PAN_Of',
              entityName: values[nameIndex]?.trim() ?? '',
              entityType: values[typeIndex]?.trim() === 'Organisation' ? 'Organisation' : 'Name',
          };
          if (entity.pan && entity.entityName) result.push(entity);
      }
      return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroundTruthFile(file);
      setComparisonResult(null);
      setError(null);
    }
  };
  
  const handleVerify = useCallback(async () => {
    if (!groundTruthFile) return;
    setIsVerifying(true);
    setError(null);
    setComparisonResult(null);
    try {
        const csvText = await groundTruthFile.text();
        const groundTruthData = parseCsv(csvText);
        const aiPans = new Set(aiData.map(d => d.pan));
        const gtPans = new Set(groundTruthData.map(d => d.pan));
        const matches = aiData.filter(d => gtPans.has(d.pan));
        const aiOnly = aiData.filter(d => !gtPans.has(d.pan));
        const groundTruthOnly = groundTruthData.filter(d => !aiPans.has(d.pan));
        setComparisonResult({ matches, aiOnly, groundTruthOnly });
    } catch(err) {
        setError(err instanceof Error ? err.message : 'Failed to parse or compare CSV file.');
    } finally {
        setIsVerifying(false);
    }
  }, [groundTruthFile, aiData]);

  interface ResultCategoryProps { title: string; count: number; icon: React.ReactNode; data: ExtractedEntity[]; }
  const ResultCategory: React.FC<ResultCategoryProps> = ({ title, count, icon, data }) => {
      const [isOpen, setIsOpen] = useState(true);
      if (count === 0 && title !== "Matching Entries") return null;
      return (
          <div>
              <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-t-lg">
                  <div className="flex items-center gap-3">
                      {icon}
                      <h3 className="font-semibold text-lg text-gray-200">{title}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-sm font-bold bg-gray-800 rounded-full">{count}</span>
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                  </div>
              </button>
              {isOpen && <ResultsTable data={data} />}
          </div>
      );
  };

  return (
    <div className="border-t border-gray-700 pt-6">
      <h2 className="text-2xl font-bold text-gray-200 mb-4">Verify with Ground Truth</h2>
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <label htmlFor="csv-upload" className="w-full sm:w-auto flex-grow flex items-center gap-3 px-4 py-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700/50">
            <UploadIcon className="w-6 h-6 text-gray-400"/>
            <span className="text-gray-300 truncate">{groundTruthFile?.name ?? 'Upload ground truth CSV...'}</span>
        </label>
        <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        <button onClick={handleVerify} disabled={!groundTruthFile || isVerifying} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-colors">
          {isVerifying ? <><Spinner /> Verifying...</> : 'Verify'}
        </button>
      </div>
      {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{error}</div>}
      {comparisonResult && (
        <div className="mt-6 space-y-6">
            <ResultCategory title="Matching Entries" count={comparisonResult.matches.length} data={comparisonResult.matches} icon={<CheckCircleIcon className="w-6 h-6 text-green-400" />} />
            <ResultCategory title="Found Only by AI" count={comparisonResult.aiOnly.length} data={comparisonResult.aiOnly} icon={<XCircleIcon className="w-6 h-6 text-amber-400" />} />
            <ResultCategory title="Found Only in CSV File" count={comparisonResult.groundTruthOnly.length} data={comparisonResult.groundTruthOnly} icon={<MinusCircleIcon className="w-6 h-6 text-red-400" />} />
        </div>
      )}
    </div>
  );
};


// from components/FileUpload.tsx
interface FileUploadProps { onFileChange: (file: File | null) => void; onProcess: () => void; isProcessing: boolean; isReadingFile: boolean; file: File | null; hasContent: boolean; }
const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, onProcess, isProcessing, isReadingFile, file, hasContent }) => {
  const [isDragging, setIsDragging] = useState(false);
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { onFileChange(e.dataTransfer.files[0]); } }, [onFileChange]);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { onFileChange(e.target.files ? e.target.files[0] : null); };
  const buttonDisabled = isProcessing || isReadingFile || !hasContent;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex-grow w-full">
        <input id="file-upload" type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.txt" disabled={isProcessing || isReadingFile} />
        <label htmlFor="file-upload" onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${isDragging ? 'border-cyan-400 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'} ${(isProcessing || isReadingFile) ? 'cursor-not-allowed opacity-60' : ''}`}>
            {file ? (
                <div className="flex items-center gap-4 text-left">
                    <DocumentTextIcon className="w-10 h-10 text-cyan-400 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-gray-200 truncate max-w-xs">{file.name}</p>
                        <p className="text-sm text-gray-400">{isReadingFile ? 'Reading file...' : `${(file.size / 1024).toFixed(2)} KB - Ready to process.`}</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center">
                    <UploadIcon className="w-10 h-10 text-gray-500 mb-3" />
                    <p className="font-semibold text-gray-300"><span className="text-cyan-400">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500">PDF or TXT files</p>
                </div>
            )}
        </label>
      </div>
      <button onClick={onProcess} disabled={buttonDisabled} className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-3 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105" aria-label="Process the uploaded document">
        {isProcessing ? ( <><Spinner /> Processing...</> ) : ( <><CpuChipIcon className="w-6 h-6" /> Process Document</> )}
      </button>
    </div>
  );
};

// --- MAIN APP COMPONENT (from App.tsx) ---
function App(): React.ReactNode {
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
    if (!API_KEY) {
      setError('API_KEY is not configured. Cannot process document.');
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
          <FileUpload onFileChange={setFile} onProcess={handleProcessDocument} isProcessing={isProcessing} isReadingFile={isReadingFile} file={file} hasContent={!!documentText} />
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
                  <button onClick={handleDownloadCsv} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-colors duration-200" disabled={!extractedData || extractedData.length === 0}>
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


// --- RENDER THE APP (original index.tsx) ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

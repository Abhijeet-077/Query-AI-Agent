import React, { useState, useCallback } from 'react';
import type { ExtractedEntity, ComparisonResult } from '../types';
import { UploadIcon, CheckCircleIcon, XCircleIcon, MinusCircleIcon } from './Icons';
import ResultsTable from './ResultsTable';
import Spinner from './Spinner';

interface VerificationProps {
  aiData: ExtractedEntity[];
}

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
        // Regex to handle quoted commas
        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '')) ?? [];
        const entity: ExtractedEntity = {
            pan: values[panIndex]?.trim() ?? '',
            relation: 'PAN_Of',
            entityName: values[nameIndex]?.trim() ?? '',
            entityType: values[typeIndex]?.trim() === 'Organisation' ? 'Organisation' : 'Name',
        };
        if (entity.pan && entity.entityName) {
            result.push(entity);
        }
    }
    return result;
};


const Verification: React.FC<VerificationProps> = ({ aiData }) => {
  const [groundTruthFile, setGroundTruthFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

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

  return (
    <div className="border-t border-gray-700 pt-6">
      <h2 className="text-2xl font-bold text-gray-200 mb-4">Verify with Ground Truth</h2>
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <label htmlFor="csv-upload" className="w-full sm:w-auto flex-grow flex items-center gap-3 px-4 py-2 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700/50">
            <UploadIcon className="w-6 h-6 text-gray-400"/>
            <span className="text-gray-300 truncate">{groundTruthFile?.name ?? 'Upload ground truth CSV...'}</span>
        </label>
        <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        <button
            onClick={handleVerify}
            disabled={!groundTruthFile || isVerifying}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
        >
          {isVerifying ? <><Spinner /> Verifying...</> : 'Verify'}
        </button>
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">
            {error}
        </div>
      )}
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

interface ResultCategoryProps {
    title: string;
    count: number;
    icon: React.ReactNode;
    data: ExtractedEntity[];
}

const ResultCategory: React.FC<ResultCategoryProps> = ({ title, count, icon, data }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (count === 0) return null;

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


export default Verification;

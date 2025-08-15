
import React from 'react';
import type { ExtractedEntity } from '../types';

interface ResultsTableProps {
  data: ExtractedEntity[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 px-4 bg-gray-800 rounded-lg">
        <p className="text-gray-400">No entities were extracted from the document.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="max-h-[60vh] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Entity (PAN)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Relation
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Entity (Name / Organisation)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                Entity Type
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {data.map((item, index) => (
              <tr key={`${item.pan}-${index}`} className="hover:bg-gray-800/70 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-300">{item.pan}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{item.relation}</td>
                <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-200">{item.entityName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    item.entityType === 'Organisation' 
                      ? 'bg-blue-900 text-blue-200' 
                      : 'bg-green-900 text-green-200'
                  }`}>
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

export default ResultsTable;

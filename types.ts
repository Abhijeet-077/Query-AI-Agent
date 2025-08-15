export interface ExtractedEntity {
  pan: string;
  relation: 'PAN_Of';
  entityName: string;
  entityType: 'Organisation' | 'Name';
}

export interface ComparisonResult {
  matches: ExtractedEntity[];
  aiOnly: ExtractedEntity[];
  groundTruthOnly: ExtractedEntity[];
}

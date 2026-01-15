import React from 'react';
import { FaturaWizardData } from './WizardContext';
import { FaturaImportCard } from './FaturaImportCard';
import { GeracaoImportCard } from './GeracaoImportCard';

interface FileImportCardProps {
  onImport: (data: Partial<FaturaWizardData>) => void;
}

export function FileImportCard({ onImport }: FileImportCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FaturaImportCard onImport={onImport} />
      <GeracaoImportCard onImport={onImport} />
    </div>
  );
}

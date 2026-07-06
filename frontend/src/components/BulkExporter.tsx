import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';

interface BulkExporterProps {
  onImportComplete: () => void;
}

export const BulkExporter: React.FC<BulkExporterProps> = ({ onImportComplete }) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  // Trigger file selection Dialog
  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse rows as array of JSON objects
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rows.length === 0) {
          toast.error('The spreadsheet contains zero asset rows.');
          setImporting(false);
          return;
        }

        let successCount = 0;
        let failCount = 0;

        // Loop and register each row in loop
        for (const row of rows) {
          try {
            const assetData = {
              name: row.Name || row['Equipment Name'] || '',
              category: row.Category || 'General Clinical',
              manufacturer: row.Manufacturer || 'Unknown',
              modelNumber: row['Model Number'] || row.Model || '',
              serialNumber: row['Serial Number'] || row.Serial || `SN-${Math.floor(1000 + Math.random() * 9000)}`,
              department: row.Department || 'Radiology',
              location: row.Location || '',
              purchaseDate: row['Purchase Date'] || '',
              installationDate: row['Installation Date'] || '',
              warrantyExpiry: row['Warranty Expiry'] || '',
              vendorDetails: row['Vendor Details'] || row.Vendor || '',
              equipmentCost: Number(row.Cost || row['Equipment Cost'] || 0),
              status: row.Status || 'Active'
            };

            if (!assetData.name || !assetData.serialNumber) {
              failCount++;
              continue;
            }

            await api.post('/equipment', assetData);
            successCount++;
          } catch (err) {
            failCount++;
          }
        }

        toast.success(`Import finished: ${successCount} assets registered successfully. ${failCount} failed.`);
        onImportComplete();
      } catch (err) {
        toast.error('Failed to parse Excel file format.');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Download template Excel file
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Equipment Name': 'GE Healthcare Monitor B40',
        Category: 'Cardiovascular',
        Manufacturer: 'GE HealthCare',
        'Model Number': 'B40-MON',
        'Serial Number': 'GE-B40-10291',
        Department: 'Cardiology',
        Location: 'ICU Room 10',
        'Purchase Date': '2025-02-12',
        'Installation Date': '2025-02-15',
        'Warranty Expiry': '2028-02-15',
        'Vendor Details': 'BioMed Corp Inc.',
        'Equipment Cost': 8900,
        Status: 'Active'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asset Import Template');
    XLSX.writeFile(wb, 'biotrack_import_template.xlsx');
    toast.success('Template downloaded. Populate rows and import.');
  };

  return (
    <div className="flex gap-2">
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        ref={fileInputRef}
        onChange={handleUploadFile}
        className="hidden"
      />
      <button
        onClick={handleDownloadTemplate}
        disabled={importing}
        className="px-3.5 py-2 border border-glass bg-glass hover:bg-white/5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" />
        Download Import Template
      </button>
      <button
        onClick={handleTriggerUpload}
        disabled={importing}
        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
      >
        {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        Bulk Import Excel
      </button>
    </div>
  );
};

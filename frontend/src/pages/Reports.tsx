import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { 
  FileText, Download, Calendar, Layers, Activity, 
  DollarSign, RefreshCw, CheckCircle, Info
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { GlassCard } from '../components/GlassCard';

type ReportType = 'Equipment' | 'Maintenance' | 'Calibration' | 'CostAnalysis';

export const Reports: React.FC = () => {
  const toast = useToast();

  const [reportType, setReportType] = useState<ReportType>('Equipment');
  const [downloading, setDownloading] = useState(false);

  const fetchCompilationData = async () => {
    try {
      const [eq, pm, bkd, cal, inv] = await Promise.all([
        api.get('/equipment'),
        api.get('/maintenance'),
        api.get('/breakdowns'),
        api.get('/calibration'),
        api.get('/inventory')
      ]);
      return { eq, pm, bkd, cal, inv };
    } catch (e) {
      toast.error('Failed to query database for report compilation.');
      throw e;
    }
  };

  const handleExportPDF = async () => {
    setDownloading(true);
    try {
      const data = await fetchCompilationData();
      const doc = new jsPDF();
      const today = new Date().toLocaleDateString();

      // 1. Render Header
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('BioTrack Biomedical Report', 14, 20);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Generated on: ${today} • Hospital BioTrack Telemetry Central`, 14, 26);
      doc.line(14, 29, 196, 29);

      let y = 38;

      if (reportType === 'Equipment') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Active Equipment Inventory Registry', 14, y);
        
        y += 10;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('List of all registered hospital medical assets and operational statuses.', 14, y);
        
        y += 8;
        // Table Header
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(14, y, 182, 7, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.text('ID', 16, y + 5);
        doc.text('Name', 35, y + 5);
        doc.text('Department', 90, y + 5);
        doc.text('Warranty Expiry', 135, y + 5);
        doc.text('Status', 170, y + 5);
        
        doc.setFont('Helvetica', 'normal');
        data.eq.forEach((eq: any) => {
          y += 8;
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(eq.id, 16, y + 5);
          doc.text(eq.name.substring(0, 24), 35, y + 5);
          doc.text(eq.department, 90, y + 5);
          doc.text(eq.warrantyExpiry || 'N/A', 135, y + 5);
          doc.text(eq.status, 170, y + 5);
        });

      } else if (reportType === 'Maintenance') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Preventive Maintenance Log Report', 14, y);
        
        y += 10;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Scheduled intervals, checklist status, and resolution comments.', 14, y);
        
        y += 8;
        // Table Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 182, 7, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.text('Task ID', 16, y + 5);
        doc.text('Equipment', 35, y + 5);
        doc.text('Interval', 90, y + 5);
        doc.text('Assigned Tech', 125, y + 5);
        doc.text('Status', 165, y + 5);
        
        doc.setFont('Helvetica', 'normal');
        data.pm.forEach((pm: any) => {
          y += 8;
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(pm.id, 16, y + 5);
          doc.text(pm.equipmentName.substring(0, 24), 35, y + 5);
          doc.text(pm.frequency, 90, y + 5);
          doc.text(pm.assignedTechnician, 125, y + 5);
          doc.text(pm.status, 165, y + 5);
        });

      } else if (reportType === 'Calibration') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Equipment Calibration Compliance Audit', 14, y);
        
        y += 10;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Validation tracking dates, next due parameters, and certificate references.', 14, y);
        
        y += 8;
        // Table Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 182, 7, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.text('ID', 16, y + 5);
        doc.text('Equipment', 35, y + 5);
        doc.text('Calib Date', 90, y + 5);
        doc.text('Next Due', 125, y + 5);
        doc.text('Status', 165, y + 5);
        
        doc.setFont('Helvetica', 'normal');
        data.cal.forEach((c: any) => {
          y += 8;
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(c.equipmentId, 16, y + 5);
          doc.text(c.equipmentName.substring(0, 24), 35, y + 5);
          doc.text(c.calibrationDate, 90, y + 5);
          doc.text(c.nextDueDate, 125, y + 5);
          doc.text(c.status, 165, y + 5);
        });

      } else if (reportType === 'CostAnalysis') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Maintenance Cost & Expenditure Analysis', 14, y);
        
        y += 10;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Corrective repairs costs, parts expenditures, and equipment valuations.', 14, y);
        
        y += 8;
        // Table Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 182, 7, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.text('Asset ID', 16, y + 5);
        doc.text('Equipment', 35, y + 5);
        doc.text('Asset Value', 90, y + 5);
        doc.text('Repair Spend', 125, y + 5);
        doc.text('Downtime (hr)', 165, y + 5);
        
        doc.setFont('Helvetica', 'normal');
        data.eq.forEach((eq: any) => {
          // Sum repairs on this equipment
          const repairs = data.bkd.filter((b: any) => b.equipmentId === eq.id && b.status === 'Completed');
          const repairSpend = repairs.reduce((sum: number, b: any) => sum + b.repairCost, 0);
          const downtime = repairs.reduce((sum: number, b: any) => sum + b.downtimeHours, 0);

          y += 8;
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(eq.id, 16, y + 5);
          doc.text(eq.name.substring(0, 24), 35, y + 5);
          doc.text(`$${eq.equipmentCost?.toLocaleString()}`, 90, y + 5);
          doc.text(`$${repairSpend}`, 125, y + 5);
          doc.text(`${downtime} hrs`, 165, y + 5);
        });
      }

      doc.save(`biotrack_report_${reportType.toLowerCase()}_${Date.now()}.pdf`);
      toast.success('PDF report downloaded successfully.');
    } catch (err) {
      toast.error('Failed to generate PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      const data = await fetchCompilationData();
      let sheetData: any[] = [];
      let filename = `biotrack_${reportType.toLowerCase()}`;

      if (reportType === 'Equipment') {
        sheetData = data.eq.map((e: any) => ({
          'Asset ID': e.id,
          'Name': e.name,
          'Category': e.category,
          'Manufacturer': e.manufacturer,
          'Model Number': e.modelNumber,
          'Serial Number': e.serialNumber,
          'Department': e.department,
          'Cost ($)': e.equipmentCost,
          'Status': e.status,
          'Next Calibration': e.nextCalibrationDate || 'N/A'
        }));
      } else if (reportType === 'Maintenance') {
        sheetData = data.pm.map((p: any) => ({
          'PM Task ID': p.id,
          'Equipment ID': p.equipmentId,
          'Equipment Name': p.equipmentName,
          'Frequency': p.frequency,
          'Scheduled Date': p.scheduledDate,
          'Assigned Tech': p.assignedTechnician,
          'Status': p.status,
          'Notes': p.notes,
          'Completion Time': p.completedAt || 'N/A'
        }));
      } else if (reportType === 'Calibration') {
        sheetData = data.cal.map((c: any) => ({
          'Calibration ID': c.id,
          'Equipment ID': c.equipmentId,
          'Equipment Name': c.equipmentName,
          'Calibration Date': c.calibrationDate,
          'Next Due Date': c.nextDueDate,
          'Certificate No': c.certificateNumber,
          'Performed By': c.performedBy,
          'Status': c.status,
          'Notes': c.notes
        }));
      } else if (reportType === 'CostAnalysis') {
        sheetData = data.eq.map((e: any) => {
          const repairs = data.bkd.filter((b: any) => b.equipmentId === e.id && b.status === 'Completed');
          const totalRepairSpend = repairs.reduce((sum: number, b: any) => sum + b.repairCost, 0);
          const totalDowntime = repairs.reduce((sum: number, b: any) => sum + b.downtimeHours, 0);
          return {
            'Equipment ID': e.id,
            'Name': e.name,
            'Department': e.department,
            'Purchase Value ($)': e.equipmentCost,
            'Closed Breakdown Count': repairs.length,
            'Total Corrective Repair Spend ($)': totalRepairSpend,
            'Cumulative Downtime (hrs)': totalDowntime
          };
        });
      }

      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, reportType);
      XLSX.writeFile(wb, `${filename}_${Date.now()}.xlsx`);
      
      toast.success('Excel spreadsheet downloaded successfully.');
    } catch (err) {
      toast.error('Failed to generate Excel sheet.');
    } finally {
      setDownloading(false);
    }
  };

  const reportsList = [
    { type: 'Equipment' as ReportType, title: 'Equipment Inventory', desc: 'Asset logs, locations, specifications, and statuses.', icon: Layers },
    { type: 'Maintenance' as ReportType, title: 'Servicing & PM Records', desc: 'Schedules checklist reports and completed preventive routines.', icon: Calendar },
    { type: 'Calibration' as ReportType, title: 'Calibration Compliance', desc: 'Calibrator logs, audit dates, certificate reference numbers.', icon: Activity },
    { type: 'CostAnalysis' as ReportType, title: 'Cost & Downtime Analysis', desc: 'Total asset valuations, repair expenditure margins, downtime rates.', icon: DollarSign },
  ];

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Clinical Reports Center</h1>
        <p className="text-slate-400 text-sm mt-1">Compile and export regulatory PDFs and Excel worksheets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportsList.map(item => {
          const Icon = item.icon;
          return (
            <GlassCard
              key={item.type}
              onClick={() => setReportType(item.type)}
              className={`
                flex gap-4 items-start border cursor-pointer relative overflow-hidden group
                ${reportType === item.type 
                  ? 'border-cyan-500/30 bg-gradient-to-tr from-slate-900 to-slate-900/60 shadow-lg ring-1 ring-cyan-500/25' 
                  : 'border-white/5 bg-slate-900/40 hover:border-white/10'}
              `}
            >
              <div className={`
                p-3 rounded-xl flex-shrink-0
                ${reportType === item.type ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-950/20 text-slate-400'}
              `}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-200">{item.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed pr-2">{item.desc}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Downloader box */}
      <GlassCard className="border-cyan-500/10 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-6 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><Info className="w-5 h-5" /></div>
          <div className="text-xs text-slate-400">
            Selected: <span className="text-cyan-400 font-bold">{reportType} Report</span>. Exports compile live data from database collections.
          </div>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportPDF}
            disabled={downloading}
            className="flex-1 sm:flex-initial py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Export PDF
          </button>
          
          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="flex-1 sm:flex-initial py-2.5 px-5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/10 transition-colors disabled:opacity-50"
          >
            {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Excel
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

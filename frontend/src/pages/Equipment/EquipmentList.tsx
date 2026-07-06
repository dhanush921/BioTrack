import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { 
  Plus, Search, Filter, SlidersHorizontal, Eye, Edit2, 
  Trash2, X, Download, Camera, Wrench, ShieldAlert,
  Activity, Calendar, FileText, ChevronRight, UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { GlassCard } from '../../components/GlassCard';
import { StatusBadge } from '../../components/StatusBadge';
import { TableSkeleton } from '../../components/SkeletonLoader';
import { BulkExporter } from '../../components/BulkExporter';

interface Equipment {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  department: string;
  location: string;
  purchaseDate: string;
  installationDate: string;
  warrantyExpiry: string;
  vendorDetails: string;
  equipmentCost: number;
  status: string;
  qrCode: string;
  barcode: string;
  image?: string;
  manualUrl?: string;
  calibrationCertificateUrl?: string;
  assignedTechnician?: string;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  branch?: string;
  lifecycle?: string;
}

export const EquipmentList: React.FC<{ urlQueryId?: string }> = ({ urlQueryId }) => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  
  // Forms & Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formEquipmentId, setFormEquipmentId] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [warranty, setWarranty] = useState('');
  const [calibration, setCalibration] = useState('');

  // Dropdown options lists
  const [departments, setDepartments] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    category: 'Imaging',
    manufacturer: '',
    modelNumber: '',
    serialNumber: '',
    department: 'Radiology',
    location: '',
    purchaseDate: '',
    installationDate: '',
    warrantyExpiry: '',
    vendorDetails: '',
    equipmentCost: 0,
    status: 'Active',
    assignedTechnician: '',
    manualUrl: '',
    calibrationCertificateUrl: '',
    lastCalibrationDate: '',
    nextCalibrationDate: '',
    branch: 'City Central Hospital'
  });

  // Check URL queries on launch (for search queries passed by notifications)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    const addParam = params.get('add');
    if (searchParam) {
      setSearch(searchParam);
    }
    if (addParam === 'true') {
      handleOpenCreateForm();
    }
  }, []);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (department) queryParams.append('department', department);
      if (category) queryParams.append('category', category);
      if (status) queryParams.append('status', status);
      if (warranty) queryParams.append('warranty', warranty);
      if (calibration) queryParams.append('calibration', calibration);

      const data = await api.get(`/equipment?${queryParams.toString()}`);
      setEquipmentList(data);

      // Populate unique categories/depts for filter boxes if not set
      if (departments.length === 0) {
        const uniqueDepts: string[] = Array.from(new Set(data.map((e: Equipment) => e.department)));
        const uniqueCats: string[] = Array.from(new Set(data.map((e: Equipment) => e.category)));
        const uniqueMans: string[] = Array.from(new Set(data.map((e: Equipment) => e.manufacturer)));
        setDepartments(uniqueDepts);
        setCategories(uniqueCats);
        setManufacturers(uniqueMans);
      }
    } catch (err) {
      toast.error('Failed to load equipment registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, [search, department, category, status, warranty, calibration]);

  // Open asset drawer and fetch historical logs
  const openDrawer = async (item: Equipment) => {
    try {
      const details = await api.get(`/equipment/${item.id}`);
      setSelectedItem(details);
      
      // Generate QR Code data url in client
      const qrData = await QRCode.toDataURL(item.qrCode || `biotrack://equipment/${item.id}`);
      setQrCodeDataUrl(qrData);
      setDrawerOpen(true);
    } catch (e) {
      toast.error('Could not fetch asset service history.');
    }
  };

  const handleOpenEditForm = (item: Equipment) => {
    setEditMode(true);
    setFormEquipmentId(item.id);
    setFormData({
      name: item.name || '',
      category: item.category || 'Imaging',
      manufacturer: item.manufacturer || '',
      modelNumber: item.modelNumber || '',
      serialNumber: item.serialNumber || '',
      department: item.department || 'Radiology',
      location: item.location || '',
      purchaseDate: item.purchaseDate || '',
      installationDate: item.installationDate || '',
      warrantyExpiry: item.warrantyExpiry || '',
      vendorDetails: item.vendorDetails || '',
      equipmentCost: item.equipmentCost || 0,
      status: item.status || 'Active',
      assignedTechnician: item.assignedTechnician || '',
      manualUrl: item.manualUrl || '',
      calibrationCertificateUrl: item.calibrationCertificateUrl || '',
      lastCalibrationDate: item.lastCalibrationDate || '',
      nextCalibrationDate: item.nextCalibrationDate || '',
      branch: item.branch || 'City Central Hospital'
    });
    setFormOpen(true);
  };

  const handleOpenCreateForm = () => {
    setEditMode(false);
    setFormEquipmentId('');
    setFormData({
      name: '',
      category: 'Imaging',
      manufacturer: '',
      modelNumber: '',
      serialNumber: '',
      department: 'Radiology',
      location: '',
      purchaseDate: '',
      installationDate: '',
      warrantyExpiry: '',
      vendorDetails: '',
      equipmentCost: 0,
      status: 'Active',
      assignedTechnician: '',
      manualUrl: '',
      calibrationCertificateUrl: '',
      lastCalibrationDate: '',
      nextCalibrationDate: '',
      branch: 'City Central Hospital'
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/equipment/${formEquipmentId}`, formData);
        toast.success(`Asset ${formEquipmentId} updated successfully.`);
      } else {
        const generatedId = `EQ-${Math.floor(100 + Math.random() * 900)}`;
        await api.post('/equipment', {
          id: generatedId,
          ...formData
        });
        toast.success(`Asset ${generatedId} registered successfully.`);
      }
      setFormOpen(false);
      loadEquipment();
      if (drawerOpen && selectedItem?.id === formEquipmentId) {
        // Refresh drawer details
        openDrawer(selectedItem);
      }
    } catch (err: any) {
      toast.error(err.message || 'Form submission failed.');
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm(`Are you sure you want to archive equipment ${id}?`)) return;

    try {
      await api.delete(`/equipment/${id}`);
      toast.success(`Equipment ${id} archived.`);
      setDrawerOpen(false);
      loadEquipment();
    } catch (err: any) {
      toast.error(err.message || 'Archive failed.');
    }
  };

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Biomedical Equipment Registry</h1>
          <p className="text-slate-400 text-sm mt-1">Deploy, monitor, and audit clinical devices.</p>
        </div>
        <div className="flex gap-2">
          {hasRole(['Administrator', 'Biomedical Engineer']) && (
            <>
              <BulkExporter onImportComplete={loadEquipment} />
              <button
                onClick={handleOpenCreateForm}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 font-semibold text-xs text-white rounded-xl shadow-lg shadow-cyan-500/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Equipment
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters card */}
      <GlassCard className="border-white/5 bg-slate-900/40 p-4 space-y-4">
        {/* Search & filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by asset ID, model, brand..."
              className="w-full pl-9 pr-3 py-2 border border-glass bg-slate-950/20 text-slate-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Department Select */}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-2 border border-glass bg-slate-950/20 text-slate-200 rounded-xl text-sm focus:outline-none appearance-none"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Category Select */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-glass bg-slate-950/20 text-slate-200 rounded-xl text-sm focus:outline-none appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Status Select */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-glass bg-slate-950/20 text-slate-200 rounded-xl text-sm focus:outline-none appearance-none"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Out of Service">Out of Service</option>
          </select>

          {/* Calibrations and warranties */}
          <select
            value={calibration}
            onChange={(e) => setCalibration(e.target.value)}
            className="px-3 py-2 border border-glass bg-slate-950/20 text-slate-200 rounded-xl text-sm focus:outline-none appearance-none"
          >
            <option value="">Calibration Status</option>
            <option value="Active">Calibrated (OK)</option>
            <option value="Due">Calibration Due</option>
            <option value="Overdue">Calibration Overdue</option>
          </select>
        </div>
      </GlassCard>

      {/* Main registry list */}
      {loading ? (
        <TableSkeleton />
      ) : equipmentList.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-2xl bg-slate-900/20 text-slate-500">
          No equipment registered matching active filter parameters.
        </div>
      ) : (
        <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/30 overflow-x-auto shadow-lg">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 font-semibold text-xs border-b border-white/5">
                <th className="py-4 px-6">Asset ID</th>
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Next Calibration</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {equipmentList.map(eq => (
                <tr 
                  key={eq.id}
                  className="hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => openDrawer(eq)}
                >
                  <td className="py-4.5 px-6 font-mono text-xs text-cyan-400 font-semibold">{eq.id}</td>
                  <td className="py-4.5 px-6 font-semibold text-slate-200">
                    <div>{eq.name}</div>
                    <span className="text-[10px] text-slate-500 font-normal">{eq.manufacturer} • {eq.modelNumber}</span>
                  </td>
                  <td className="py-4.5 px-6">{eq.category}</td>
                  <td className="py-4.5 px-6 text-xs text-slate-400">{eq.department}</td>
                  <td className="py-4.5 px-6 font-mono text-xs">
                    {eq.nextCalibrationDate ? (
                      <span className={new Date(eq.nextCalibrationDate) < new Date() ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {eq.nextCalibrationDate}
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td className="py-4.5 px-6"><StatusBadge status={eq.status} /></td>
                  <td className="py-4.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openDrawer(eq)}
                        className="p-1.5 rounded-lg border border-glass bg-glass text-slate-400 hover:text-cyan-400 transition-colors"
                        title="View Asset Details"
                      >
                        <Eye className="w-3.8 h-3.8" />
                      </button>
                      {hasRole(['Administrator', 'Biomedical Engineer', 'Technician']) && (
                        <button
                          onClick={() => handleOpenEditForm(eq)}
                          className="p-1.5 rounded-lg border border-glass bg-glass text-slate-400 hover:text-amber-400 transition-colors"
                          title="Edit Specs"
                        >
                          <Edit2 className="w-3.8 h-3.8" />
                        </button>
                      )}
                      {hasRole(['Administrator']) && (
                        <button
                          onClick={() => handleDeleteEquipment(eq.id)}
                          className="p-1.5 rounded-lg border border-rose-500/10 hover:bg-rose-500/10 text-rose-400 transition-colors"
                          title="Archive Asset"
                        >
                          <Trash2 className="w-3.8 h-3.8" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Side drawer (Slideout) */}
      {drawerOpen && selectedItem && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-2xl border-l border-white/10 bg-slate-900 text-slate-100 shadow-2xl flex flex-col h-full animate-slide-up">
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-semibold">{selectedItem.id}</span>
                  <h3 className="font-bold text-xl text-slate-200 mt-1">{selectedItem.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {hasRole(['Administrator', 'Biomedical Engineer', 'Technician']) && (
                    <button
                      onClick={() => handleOpenEditForm(selectedItem)}
                      className="px-3.5 py-1.5 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Specs
                    </button>
                  )}
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* QR and image layout */}
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start bg-slate-950/20 p-4 border border-white/5 rounded-2xl">
                  {qrCodeDataUrl && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-white rounded-xl shadow-inner w-36 h-36 flex items-center justify-center">
                        <img src={qrCodeDataUrl} alt="Equipment QR Code" className="w-full h-full" />
                      </div>
                      <a 
                        href={qrCodeDataUrl} 
                        download={`qrcode_${selectedItem.id}.png`}
                        className="text-[10px] text-cyan-400 flex items-center gap-1 hover:underline mt-1 font-semibold"
                      >
                        <Download className="w-3 h-3" />
                        Download Tag
                      </a>
                    </div>
                  )}
                  <div className="flex-1 space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-slate-400">Barcode:</span>
                      <span className="font-mono text-xs">{selectedItem.barcode}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-slate-400">Manufacturer:</span>
                      <span className="font-semibold">{selectedItem.manufacturer}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-slate-400">Model No:</span>
                      <span>{selectedItem.modelNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-slate-400">Serial No:</span>
                      <span className="font-mono text-xs">{selectedItem.serialNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-slate-400">Status:</span>
                      <StatusBadge status={selectedItem.status} />
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-slate-400">Lifecycle State:</span>
                      <span className="font-semibold text-cyan-400">{selectedItem.lifecycle || 'Active'}</span>
                    </div>
                    {hasRole(['Administrator', 'Biomedical Engineer', 'Technician']) && (
                      <div className="pt-2">
                        <label className="text-[10px] text-slate-500 block mb-1 font-semibold uppercase tracking-wider">Modify Lifecycle Node:</label>
                        <div className="flex gap-1 flex-wrap">
                          {['Installed', 'Active', 'Under Repair', 'Retired', 'Disposed'].map(state => (
                            <button
                              key={state}
                              onClick={async () => {
                                try {
                                  const updated = await api.put(`/equipment/${selectedItem.id}`, { lifecycle: state });
                                  setSelectedItem(prev => ({ ...prev, ...updated }));
                                  toast.success(`Lifecycle set to ${state}.`);
                                  loadEquipment();
                                } catch (e) {
                                  toast.error('Failed to adjust lifecycle.');
                                }
                              }}
                              className={`
                                px-2 py-1 rounded text-[9px] border transition-all
                                ${selectedItem.lifecycle === state
                                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 font-bold'
                                  : 'border-white/5 bg-slate-950/20 text-slate-400 hover:text-white'}
                              `}
                            >
                              {state}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logistics */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 border border-white/5 bg-slate-950/15 rounded-xl">
                    <p className="text-slate-500 font-semibold uppercase tracking-wider mb-2">Location & Custody</p>
                    <div className="space-y-1 text-slate-300">
                      <p>Department: <span className="text-slate-100 font-medium">{selectedItem.department}</span></p>
                      <p>Room/Suite: <span className="text-slate-100 font-medium">{selectedItem.location || 'N/A'}</span></p>
                      <p>Owner: <span className="text-slate-100 font-medium">BioMed B1</span></p>
                    </div>
                  </div>
                  
                  <div className="p-3.5 border border-white/5 bg-slate-950/15 rounded-xl">
                    <p className="text-slate-500 font-semibold uppercase tracking-wider mb-2">Vendor & Cost</p>
                    <div className="space-y-1 text-slate-300">
                      <p>Cost: <span className="text-slate-100 font-mono">${selectedItem.equipmentCost?.toLocaleString() || '0'}</span></p>
                      <p>Expiry: <span className="text-slate-100 font-medium">{selectedItem.warrantyExpiry || 'N/A'}</span></p>
                      <p>Vendor: <span className="text-slate-100 truncate block font-medium">{selectedItem.vendorDetails || 'N/A'}</span></p>
                    </div>
                  </div>
                </div>

                {/* Uploaded Manuals/Certificates */}
                <div className="space-y-2.5">
                  <h4 className="font-semibold text-sm">Associated Documentation</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedItem.manualUrl ? (
                      <a
                        href={selectedItem.manualUrl}
                        target="_blank"
                        className="flex items-center gap-2 p-3 border border-white/5 rounded-xl bg-slate-950/20 hover:bg-white/5 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span className="truncate flex-1 font-medium">User Operation Manual</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 p-3 border border-white/5 border-dashed rounded-xl text-slate-500">
                        <FileText className="w-4 h-4" />
                        <span>No Manual Uploaded</span>
                      </div>
                    )}
                    {selectedItem.calibrationCertificateUrl ? (
                      <a
                        href={selectedItem.calibrationCertificateUrl}
                        target="_blank"
                        className="flex items-center gap-2 p-3 border border-white/5 rounded-xl bg-slate-950/20 hover:bg-white/5 transition-colors"
                      >
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="truncate flex-1 font-medium">Calibration Certificate</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 p-3 border border-white/5 border-dashed rounded-xl text-slate-500">
                        <Activity className="w-4 h-4" />
                        <span>No Calibration Cert</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Historical Maintenance Log Timeline */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Chronological Maintenance Timeline</h4>
                  {selectedItem.history?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No servicing actions logged for this equipment.</p>
                  ) : (
                    <div className="relative border-l border-white/5 pl-4 ml-2 space-y-5 text-xs">
                      {selectedItem.history?.map((hist: any, index: number) => {
                        let dotColor = 'bg-cyan-500';
                        if (hist.type === 'Breakdown') dotColor = 'bg-rose-500';
                        if (hist.type === 'Calibration') dotColor = 'bg-emerald-500';

                        return (
                          <div key={index} className="relative">
                            {/* Dot indicator */}
                            <span className={`absolute -left-[20.5px] top-0.5 w-3.5 h-3.5 rounded-full border border-slate-900 ${dotColor}`}></span>
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-200">{hist.title}</span>
                                <span className="text-[10px] text-slate-500">{new Date(hist.date).toLocaleDateString()}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1">{hist.description}</p>
                              <div className="flex gap-4 text-[10px] text-slate-500 mt-1.5">
                                <span>Technician: {hist.technician || 'External Service'}</span>
                                {hist.cost > 0 && <span className="font-mono">Cost: ${hist.cost}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer footer actions */}
              <div className="p-6 border-t border-white/5 flex gap-2">
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    // Navigate to breakdowns, trigger report breakdown modal or form with pre-filled ID
                    navigate(`/breakdowns?preFill=${selectedItem.id}`);
                  }}
                  className="flex-1 py-2 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Report Breakdown
                </button>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate(`/maintenance?preFill=${selectedItem.id}`);
                  }}
                  className="flex-1 py-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Schedule PM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register/Edit Equipment Modal Form Overlay */}
      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setFormOpen(false)}
          />

          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-2xl border border-white/10 rounded-3xl bg-slate-900 text-white shadow-2xl p-6 overflow-hidden z-10 animate-scale-up">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <h3 className="font-bold text-lg">{editMode ? `Edit Equipment Specs: ${formEquipmentId}` : 'Register New Equipment'}</h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-slate-400">Equipment Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Revolution CT Scanner"
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Brand/Manufacturer */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Manufacturer</label>
                    <input
                      type="text"
                      required
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="e.g. GE HealthCare"
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Model Number */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Model Number</label>
                    <input
                      type="text"
                      required
                      value={formData.modelNumber}
                      onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                      placeholder="e.g. REV-CT-256"
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Serial Number */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Serial Number</label>
                    <input
                      type="text"
                      required
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder="e.g. GE-SN-88019"
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Category Sector</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                    >
                      <option value="Imaging">Imaging</option>
                      <option value="Cardiovascular">Cardiovascular</option>
                      <option value="Respiratory">Respiratory</option>
                      <option value="Anesthesia">Anesthesia</option>
                      <option value="General Clinical">General Clinical</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Clinical Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                    >
                      <option value="Radiology">Radiology</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Obstetrics & Gynecology">OB/GYN</option>
                      <option value="ICU">ICU</option>
                      <option value="OR">Operating Room</option>
                    </select>
                  </div>

                  {/* Location Room */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Room Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Imaging Suite B"
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Warranty Expiry */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Warranty Expiration Date</label>
                    <input
                      type="date"
                      value={formData.warrantyExpiry}
                      onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Equipment Cost */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Asset Cost ($)</label>
                    <input
                      type="number"
                      value={formData.equipmentCost}
                      onChange={(e) => setFormData({ ...formData, equipmentCost: Number(e.target.value) })}
                      placeholder="e.g. 120000"
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Assigned Technician */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Assigned In-House Technician</label>
                    <input
                      type="text"
                      value={formData.assignedTechnician}
                      onChange={(e) => setFormData({ ...formData, assignedTechnician: e.target.value })}
                      placeholder="e.g. Marcus Chen"
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Branch */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Hospital Branch</label>
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                    >
                      <option value="City Central Hospital">City Central Hospital</option>
                      <option value="Westside Medical Clinic">Westside Medical Clinic</option>
                      <option value="Mercy General Branch">Mercy General Branch</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Operational Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none appearance-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Out of Service">Out of Service</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-cyan-500/10"
                  >
                    Save Asset
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

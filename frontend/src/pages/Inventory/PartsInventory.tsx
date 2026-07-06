import React, { useState, useEffect } from 'react';
import { 
  Box, Plus, Edit2, Trash2, X, AlertTriangle, 
  RefreshCw, DollarSign, Package, MapPin
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { GlassCard } from '../../components/GlassCard';
import { TableSkeleton } from '../../components/SkeletonLoader';

interface Part {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  vendor: string;
  minimumStock: number;
  purchaseCost: number;
  location: string;
}

export const PartsInventory: React.FC = () => {
  const { user, hasRole } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<Part[]>([]);
  
  // Modals state
  const [formOpen, setFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formPartId, setFormPartId] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    partNumber: '',
    quantity: 0,
    vendor: '',
    minimumStock: 1,
    purchaseCost: 0,
    location: ''
  });

  const loadParts = async () => {
    setLoading(true);
    try {
      const data = await api.get('/inventory');
      setParts(data);
    } catch (err) {
      toast.error('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParts();
  }, []);

  const handleOpenEdit = (part: Part) => {
    setEditMode(true);
    setFormPartId(part.id);
    setFormData({
      name: part.name,
      partNumber: part.partNumber,
      quantity: part.quantity,
      vendor: part.vendor,
      minimumStock: part.minimumStock,
      purchaseCost: part.purchaseCost,
      location: part.location
    });
    setFormOpen(true);
  };

  const handleOpenCreate = () => {
    setEditMode(false);
    setFormPartId('');
    setFormData({
      name: '',
      partNumber: '',
      quantity: 0,
      vendor: '',
      minimumStock: 2,
      purchaseCost: 0,
      location: ''
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/inventory/${formPartId}`, formData);
        toast.success('Part updated successfully.');
      } else {
        await api.post('/inventory', formData);
        toast.success('New spare part registered.');
      }
      setFormOpen(false);
      loadParts();
    } catch (err: any) {
      toast.error(err.message || 'Form submission failed.');
    }
  };

  const handleDeletePart = async (id: string) => {
    if (!window.confirm('Delete this part from inventory permanently?')) return;
    try {
      await api.delete(`/inventory/${id}`);
      toast.success('Part deleted.');
      loadParts();
    } catch (err: any) {
      toast.error(err.message || 'Deletion failed.');
    }
  };

  const lowStockCount = parts.filter(p => p.quantity <= p.minimumStock).length;

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Spare Parts Inventory</h1>
          <p className="text-slate-400 text-sm mt-1">Manage components, vendors, and low stock warnings.</p>
        </div>
        {hasRole(['Administrator', 'Biomedical Engineer', 'Technician']) && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 font-semibold text-xs text-white rounded-xl shadow-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Part
          </button>
        )}
      </div>

      {/* Warning Alert if Low Stock */}
      {lowStockCount > 0 && (
        <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex items-start gap-3 text-sm text-amber-400 animate-pulse">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Critical Stock Notice</p>
            <p className="text-xs text-slate-400 mt-0.5">
              There are {lowStockCount} components at or below safe minimum quantities. Replenishment orders recommended.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : parts.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-2xl bg-slate-900/20 text-slate-500">
          No spare parts catalogued in inventory.
        </div>
      ) : (
        <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/30 overflow-x-auto shadow-lg">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 font-semibold text-xs border-b border-white/5">
                <th className="py-4 px-6">Part Number</th>
                <th className="py-4 px-6">Part Name</th>
                <th className="py-4 px-6">Vendor</th>
                <th className="py-4 px-6">Storage Location</th>
                <th className="py-4 px-6">Purchase Cost</th>
                <th className="py-4 px-6">Stock Level</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {parts.map(p => {
                const isLow = p.quantity <= p.minimumStock;
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-cyan-400 font-semibold">{p.partNumber}</td>
                    <td className="py-4 px-6 font-semibold text-slate-200">{p.name}</td>
                    <td className="py-4 px-6 text-xs text-slate-400">{p.vendor}</td>
                    <td className="py-4 px-6 text-xs text-slate-400 flex items-center gap-1.5 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{p.location || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs">${p.purchaseCost}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold font-mono text-sm ${isLow ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                          {p.quantity}
                        </span>
                        <span className="text-[10px] text-slate-500">/ min {p.minimumStock}</span>
                        {isLow && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-bold border border-rose-500/20">
                            Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg border border-glass bg-glass text-slate-400 hover:text-amber-400 transition-colors"
                          title="Edit Part Details"
                        >
                          <Edit2 className="w-3.8 h-3.8" />
                        </button>
                        {hasRole(['Administrator', 'Biomedical Engineer']) && (
                          <button
                            onClick={() => handleDeletePart(p.id)}
                            className="p-1.5 rounded-lg border border-rose-500/10 hover:bg-rose-500/10 text-rose-400 transition-colors"
                            title="Delete Part"
                          >
                            <Trash2 className="w-3.8 h-3.8" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Part Form Dialog */}
      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setFormOpen(false)}
          />

          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-md border border-white/10 rounded-3xl bg-slate-900 text-white shadow-2xl p-6 overflow-hidden z-10 animate-scale-up">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <h3 className="font-bold text-lg">{editMode ? 'Edit Spare Part' : 'Register New Spare Part'}</h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Part Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. O2 Sensor Cell"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Part Number */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Part Number / SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.partNumber}
                    onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    placeholder="e.g. O2-CELL-M4"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Current Qty in Stock</label>
                    <input
                      type="number"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  {/* Min Stock */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Minimum stock alert limit</label>
                    <input
                      type="number"
                      required
                      value={formData.minimumStock}
                      onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Purchase Cost */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Unit Purchase Cost ($)</label>
                  <input
                    type="number"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: Number(e.target.value) })}
                    placeholder="e.g. 150"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Vendor */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Vendor / Distributor Details</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="e.g. GE Parts Inc."
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Storage Location */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Storage Location Bin</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Cabinet C, Shelf 4"
                    className="w-full px-3.5 py-2 border border-glass bg-slate-950/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/10"
                  >
                    Save Part
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

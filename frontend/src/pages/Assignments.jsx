import React, { useState, useEffect, useContext, useCallback } from 'react';
import { api } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { Filter, Search, RotateCcw, ChevronLeft, ChevronRight, Inbox, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Assignments = () => {
    const { user } = useContext(AuthContext);
    const [assignments, setAssignments] = useState([]);
    const [bases, setBases] = useState([]);
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination & API Response State
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Create Form State
    const [form, setForm] = useState({ 
        base_id: user?.role === 'Base Commander' ? user.base_id : '', 
        equipment_id: '', 
        personnel_name: '', 
        quantity: '' 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableStock, setAvailableStock] = useState(null);

    // List Filters State
    const isBaseLocked = user?.role === 'Base Commander';
    const initialFilters = {
        base_id: isBaseLocked ? user.base_id : '',
        equipment_id: '',
        status: '',
        search: '',
        page: 1,
        limit: 5
    };
    const [filters, setFilters] = useState(initialFilters);

    const fetchReferences = useCallback(async () => {
        try {
            const [basesRes, equipRes] = await Promise.all([
                api.get('/bases?all=true'),
                api.get('/equipment')
            ]);
            setBases(basesRes.data);
            setEquipment(equipRes.data);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const fetchAssignments = useCallback(async (appliedFilters = filters) => {
        setLoading(true);
        try {
            const res = await api.get('/assignments', { params: appliedFilters });
            setAssignments(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setFilters(appliedFilters);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchReferences();
        fetchAssignments(initialFilters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (form.base_id && form.equipment_id) {
            fetchInventory(form.base_id, form.equipment_id);
        } else {
            setAvailableStock(null);
        }
    }, [form.base_id, form.equipment_id]);

    const fetchInventory = async (baseId, equipId) => {
        try {
            const res = await api.get(`/inventory?baseId=${baseId}&equipmentId=${equipId}`);
            setAvailableStock(res.data.available);
        } catch (error) {
            console.error(error);
            setAvailableStock(null);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/assignments', form);
            setForm({ ...form, personnel_name: '', quantity: '' });
            fetchAssignments({ ...filters, page: 1 });
            if (form.base_id && form.equipment_id) fetchInventory(form.base_id, form.equipment_id);
            toast.success("Assignment recorded!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Error recording assignment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAction = async (id, action) => {
        const confirmMsg = action === 'return' 
            ? "Are you sure you want to RETURN this equipment to stock?" 
            : "Are you sure you want to mark this equipment as EXPENDED?";
        
        if (!window.confirm(confirmMsg)) return;

        try {
            await api.put(`/assignments/${id}/${action}`);
            fetchAssignments();
            if (form.base_id && form.equipment_id) fetchInventory(form.base_id, form.equipment_id);
            toast.success(`Successfully marked as ${action === 'return' ? 'returned' : 'expended'}`);
        } catch (error) {
            toast.error(error.response?.data?.message || "Error performing action");
        }
    };

    const handleFilterApply = (e) => {
        e.preventDefault();
        fetchAssignments({ ...filters, page: 1 });
    };

    const handleFilterReset = () => {
        setFilters(initialFilters);
        fetchAssignments(initialFilters);
    };

    const changePage = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchAssignments({ ...filters, page: newPage });
        }
    };

    return (
        <div className="pb-10">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Personnel Assignments & Expenditures</h1>
            
            {/* Create Assignment Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <h2 className="text-lg font-bold mb-4 text-gray-800">Assign Equipment</h2>
                <form onSubmit={handleCreateSubmit} className="flex gap-4 items-end flex-wrap">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Base</label>
                        <select 
                            className="border p-2 rounded w-40 bg-white" 
                            value={form.base_id} 
                            onChange={e => setForm({...form, base_id: e.target.value})} 
                            required
                            disabled={isBaseLocked}
                        >
                            <option value="">Select Base</option>
                            {bases.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Equipment</label>
                        <select 
                            className="border p-2 rounded w-40 bg-white" 
                            value={form.equipment_id} 
                            onChange={e => setForm({...form, equipment_id: e.target.value})} 
                            required
                        >
                            <option value="">Select Equipment</option>
                            {equipment.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.category_name})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Personnel Name</label>
                        <input 
                            type="text" 
                            className="border p-2 rounded w-48" 
                            value={form.personnel_name} 
                            onChange={e => setForm({...form, personnel_name: e.target.value})} 
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                        <input 
                            type="number" 
                            className="border p-2 rounded w-24" 
                            value={form.quantity} 
                            onChange={e => setForm({...form, quantity: e.target.value})} 
                            required 
                            min="1"
                            step="1"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`px-6 py-2 rounded font-medium text-white transition-colors ${isSubmitting ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'}`}
                    >
                        {isSubmitting ? 'Assigning...' : 'Assign'}
                    </button>
                </form>
                {availableStock !== null && (
                    <p className="mt-4 text-sm font-medium text-gray-700">
                        Available stock: <span className="text-amber-600">{availableStock}</span>
                    </p>
                )}
            </div>

            {/* List Filters */}
            <div className="bg-white p-4 rounded-t-xl shadow-sm border border-gray-100 border-b-0 flex flex-wrap gap-4 items-end">
                <div className="flex items-center text-gray-400 mr-2">
                    <Filter size={20} />
                    <span className="ml-2 font-medium text-gray-600">Filter Records</span>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search personnel, base..." 
                        className="border p-2 pl-9 rounded text-sm w-56"
                        value={filters.search}
                        onChange={e => setFilters({...filters, search: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleFilterApply(e)}
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-500 mb-1">Base</label>
                    <select 
                        className="border p-2 rounded text-sm w-36 bg-white disabled:bg-gray-50"
                        value={filters.base_id}
                        onChange={e => setFilters({...filters, base_id: e.target.value})}
                        disabled={isBaseLocked}
                    >
                        <option value="">All Bases</option>
                        {bases.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Equipment</label>
                    <select 
                        className="border p-2 rounded text-sm w-36 bg-white"
                        value={filters.equipment_id}
                        onChange={e => setFilters({...filters, equipment_id: e.target.value})}
                    >
                        <option value="">All Equipment</option>
                        {equipment.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Status</label>
                    <select 
                        className="border p-2 rounded text-sm w-32 bg-white"
                        value={filters.status}
                        onChange={e => setFilters({...filters, status: e.target.value})}
                    >
                        <option value="">All Statuses</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Returned">Returned</option>
                        <option value="Expended">Expended</option>
                    </select>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleFilterApply} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                        Filter
                    </button>
                    <button onClick={handleFilterReset} className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded transition-colors" title="Reset Filters">
                        <RotateCcw size={18} />
                    </button>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-b-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="p-4 font-semibold text-gray-600 text-sm">Personnel</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Base</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Equipment</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm text-center">Qty</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm text-center">Status</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                        <span className="ml-3">Loading assignments...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : assignments.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="bg-gray-50 p-4 rounded-full mb-3">
                                            <Inbox size={32} className="text-gray-400" />
                                        </div>
                                        <p className="font-medium text-gray-600">No assignments found</p>
                                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search terms.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            assignments.map(a => (
                                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-800">
                                        <div className="flex flex-col">
                                            <span>{a.personnel_name}</span>
                                            <span className="text-xs text-gray-400">{new Date(a.assignment_date).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{a.base_name}</td>
                                    <td className="p-4 text-gray-600">{a.equipment_name}</td>
                                    <td className="p-4 text-center font-bold text-gray-700">{a.quantity}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${a.status === 'Assigned' ? 'bg-amber-100 text-amber-800' : (a.status === 'Returned' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}`}>
                                            {a.status === 'Assigned' ? <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> : null}
                                            {a.status === 'Returned' ? <CheckCircle size={12} /> : null}
                                            {a.status === 'Expended' ? <XCircle size={12} /> : null}
                                            {a.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {a.status === 'Assigned' ? (
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => handleAction(a.id, 'return')} 
                                                    className="text-xs font-medium bg-green-50 text-green-700 hover:bg-green-600 hover:text-white px-3 py-1.5 rounded transition-colors border border-green-200 hover:border-green-600"
                                                >
                                                    Return
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(a.id, 'expend')} 
                                                    className="text-xs font-medium bg-red-50 text-red-700 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded transition-colors border border-red-200 hover:border-red-600"
                                                >
                                                    Expend
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">No actions available</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {!loading && assignments.length > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-sm text-gray-600">
                        <div>
                            Showing <span className="font-medium">{(filters.page - 1) * filters.limit + 1}</span> to <span className="font-medium">{Math.min(filters.page * filters.limit, total)}</span> of <span className="font-medium">{total}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => changePage(filters.page - 1)}
                                disabled={filters.page === 1}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="font-medium px-2">Page {filters.page} of {totalPages}</span>
                            <button 
                                onClick={() => changePage(filters.page + 1)}
                                disabled={filters.page === totalPages}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Assignments;

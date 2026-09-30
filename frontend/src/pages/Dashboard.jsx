import React, { useState, useEffect, useContext } from 'react';
import { api } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { BarChart3, Activity, ArrowDownToLine, ArrowUpFromLine, PackageSearch, X, RotateCcw, Filter } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    
    // Data state
    const [metrics, setMetrics] = useState(null);
    const [charts, setCharts] = useState(null);
    const [details, setDetails] = useState(null); // Modal details
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    // Reference state for filters
    const [bases, setBases] = useState([]);
    const [categories, setCategories] = useState([]);

    // Filters state
    const isBaseCommander = user?.role === 'Base Commander';
    const initialFilters = {
        fromDate: '',
        toDate: '',
        base_id: isBaseCommander ? user.base_id : '',
        category_id: ''
    };
    const [filters, setFilters] = useState(initialFilters);
    
    // UI state
    const [showPopup, setShowPopup] = useState(false);
    const [activeTab, setActiveTab] = useState('purchases'); // purchases | transfersIn | transfersOut

    useEffect(() => {
        fetchReferences();
        fetchDashboard(initialFilters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchReferences = async () => {
        try {
            const [bRes, eRes] = await Promise.all([
                api.get('/bases?all=true'), // Get all for dropdown if admin
                api.get('/equipment')
            ]);
            setBases(bRes.data);
            
            // Extract unique categories from equipment
            const uniqueCats = [];
            const seen = new Set();
            for (let eq of eRes.data) {
                if (!seen.has(eq.category_id)) {
                    seen.add(eq.category_id);
                    uniqueCats.push({ id: eq.category_id, name: eq.category_name });
                }
            }
            setCategories(uniqueCats);
        } catch (error) {
            console.error("Error fetching refs", error);
        }
    };

    const fetchDashboard = async (appliedFilters) => {
        setLoading(true);
        try {
            const res = await api.get('/dashboard', { params: appliedFilters });
            setMetrics(res.data.metrics);
            setCharts(res.data.charts);
        } catch (error) {
            console.error("Error fetching metrics", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMovementDetails = async () => {
        setLoadingDetails(true);
        try {
            const res = await api.get('/dashboard/movement-details', { params: filters });
            setDetails(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleApplyFilters = (e) => {
        e.preventDefault();
        fetchDashboard(filters);
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
        fetchDashboard(initialFilters);
    };

    const handleOpenPopup = () => {
        setShowPopup(true);
        if (!details) {
            fetchMovementDetails();
        }
    };

    const StatCard = ({ title, value, icon, onClick, color }) => (
        <div 
            onClick={onClick} 
            className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow ring-2 ring-transparent hover:ring-indigo-100' : ''}`}
        >
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <h3 className={`text-3xl font-bold mt-2 ${color}`}>
                    {loading ? <div className="h-9 w-24 bg-gray-200 animate-pulse rounded"></div> : value}
                </h3>
            </div>
            <div className={`p-4 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
                {icon}
            </div>
        </div>
    );

    return (
        <div className="pb-10">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Command Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">Overview of asset metrics and movements</p>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex items-center text-gray-400 mr-2">
                    <Filter size={20} />
                    <span className="ml-2 font-medium text-gray-600">Filters</span>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">From Date</label>
                    <input 
                        type="date" 
                        className="border p-2 rounded text-sm w-40" 
                        value={filters.fromDate}
                        onChange={e => setFilters({...filters, fromDate: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">To Date</label>
                    <input 
                        type="date" 
                        className="border p-2 rounded text-sm w-40" 
                        value={filters.toDate}
                        onChange={e => setFilters({...filters, toDate: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Base</label>
                    <select 
                        className="border p-2 rounded text-sm w-40 bg-white disabled:bg-gray-50"
                        value={filters.base_id}
                        onChange={e => setFilters({...filters, base_id: e.target.value})}
                        disabled={isBaseCommander}
                    >
                        <option value="">All Bases</option>
                        {bases.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Equipment Type</label>
                    <select 
                        className="border p-2 rounded text-sm w-40 bg-white"
                        value={filters.category_id}
                        onChange={e => setFilters({...filters, category_id: e.target.value})}
                    >
                        <option value="">All Types</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleApplyFilters} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                        Apply
                    </button>
                    <button onClick={handleResetFilters} className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded transition-colors" title="Reset Filters">
                        <RotateCcw size={18} />
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                <StatCard 
                    title="Opening Balance" 
                    value={metrics?.openingBalance} 
                    icon={<PackageSearch size={24} className="text-gray-600"/>} 
                    color="text-gray-700" 
                />
                <StatCard 
                    title="Closing Balance" 
                    value={metrics?.closingBalance} 
                    icon={<PackageSearch size={24} className="text-blue-600"/>} 
                    color="text-blue-600" 
                />
                <StatCard 
                    title="Net Movement" 
                    value={metrics?.netMovement > 0 ? `+${metrics.netMovement}` : metrics?.netMovement} 
                    icon={<Activity size={24} className="text-indigo-600"/>} 
                    color="text-indigo-600" 
                    onClick={handleOpenPopup}
                />
                <StatCard 
                    title="Total Assigned" 
                    value={metrics?.assigned} 
                    icon={<ArrowUpFromLine size={24} className="text-amber-600"/>} 
                    color="text-amber-600" 
                />
                <StatCard 
                    title="Total Expended" 
                    value={metrics?.expended} 
                    icon={<ArrowDownToLine size={24} className="text-red-600"/>} 
                    color="text-red-600" 
                />
            </div>

            {/* Charts & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Balance by Base Bar Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Asset Balance by Base</h2>
                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="h-full w-full bg-gray-50 animate-pulse rounded-lg"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts?.balanceByBase || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="base_name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <RechartsTooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Bar dataKey="balance" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Current Balance" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Recent Activity List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-indigo-600"/> Recent Activity
                    </h2>
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-lg"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                            {charts?.recentActivity?.length > 0 ? charts.recentActivity.map((act, i) => (
                                <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors">
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">{act.type}</p>
                                        <p className="text-xs text-gray-500">{act.equipment}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-700">{act.quantity}</p>
                                        <p className="text-xs text-gray-400">{new Date(act.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-gray-500 text-center py-8">No recent activity found.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Movement Time Series Line Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-3">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Movement Over Time</h2>
                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="h-full w-full bg-gray-50 animate-pulse rounded-lg"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={charts?.movementTimeSeries || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tickFormatter={(str) => {
                                        const d = new Date(str);
                                        return `${d.getMonth()+1}/${d.getDate()}`;
                                    }} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend iconType="circle" />
                                    <Line type="monotone" dataKey="purchases" stroke="#16A34A" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} name="Purchases" />
                                    <Line type="monotone" dataKey="transfersIn" stroke="#2563EB" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} name="Transfers In" />
                                    <Line type="monotone" dataKey="transfersOut" stroke="#DC2626" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} name="Transfers Out" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Net Movement Popup Modal */}
            {showPopup && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Net Movement Ledger</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Total Net: <span className="font-bold text-indigo-600">{metrics?.netMovement > 0 ? `+${metrics.netMovement}` : metrics?.netMovement}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowPopup(false)} className="text-gray-400 hover:text-gray-700 bg-white p-2 rounded-full shadow-sm">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex border-b border-gray-200">
                            <button onClick={() => setActiveTab('purchases')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'purchases' ? 'border-green-500 text-green-700 bg-green-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                                Purchases ({details?.purchases?.length || 0})
                            </button>
                            <button onClick={() => setActiveTab('transfersIn')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transfersIn' ? 'border-blue-500 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                                Transfers In ({details?.transfersIn?.length || 0})
                            </button>
                            <button onClick={() => setActiveTab('transfersOut')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transfersOut' ? 'border-red-500 text-red-700 bg-red-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                                Transfers Out ({details?.transfersOut?.length || 0})
                            </button>
                        </div>

                        <div className="p-6 overflow-auto flex-1">
                            {loadingDetails ? (
                                <div className="flex justify-center items-center h-40">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[500px]">
                                        <thead>
                                        <tr className="bg-gray-50 text-gray-600 text-sm">
                                            <th className="p-3 font-semibold rounded-tl-lg">Date</th>
                                            <th className="p-3 font-semibold">Equipment</th>
                                            <th className="p-3 font-semibold">
                                                {activeTab === 'purchases' ? 'Base' : (activeTab === 'transfersIn' ? 'From Base' : 'To Base')}
                                            </th>
                                            <th className="p-3 font-semibold rounded-tr-lg">Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {activeTab === 'purchases' && details?.purchases?.map(r => (
                                            <tr key={r.id} className="border-b border-gray-100 hover:bg-green-50/30">
                                                <td className="p-3">{new Date(r.purchase_date).toLocaleString()}</td>
                                                <td className="p-3">{r.equipment_name}</td>
                                                <td className="p-3">{r.base_name}</td>
                                                <td className="p-3 font-bold text-green-600">+{r.quantity}</td>
                                            </tr>
                                        ))}
                                        {activeTab === 'transfersIn' && details?.transfersIn?.map(r => (
                                            <tr key={r.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                                                <td className="p-3">{new Date(r.transfer_date).toLocaleString()}</td>
                                                <td className="p-3">{r.equipment_name}</td>
                                                <td className="p-3">{r.from_base_name}</td>
                                                <td className="p-3 font-bold text-blue-600">+{r.quantity}</td>
                                            </tr>
                                        ))}
                                        {activeTab === 'transfersOut' && details?.transfersOut?.map(r => (
                                            <tr key={r.id} className="border-b border-gray-100 hover:bg-red-50/30">
                                                <td className="p-3">{new Date(r.transfer_date).toLocaleString()}</td>
                                                <td className="p-3">{r.equipment_name}</td>
                                                <td className="p-3">{r.to_base_name}</td>
                                                <td className="p-3 font-bold text-red-600">-{r.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            )}
                            
                            {(!loadingDetails && details && details[activeTab]?.length === 0) && (
                                <div className="text-center py-8 text-gray-500">No records found for this category.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

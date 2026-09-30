import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, ArrowRightLeft, Users, LogOut, ShieldAlert, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { user, logout } = useContext(AuthContext);

    const navItems = [
        { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        ...(user?.role !== 'Logistics Officer' ? [{ path: '/purchases', name: 'Purchases', icon: <ShoppingCart size={20} /> }] : []),
        { path: '/transfers', name: 'Transfers', icon: <ArrowRightLeft size={20} /> },
        { path: '/assignments', name: 'Assignments', icon: <Users size={20} /> },
    ];

    return (
        <div className={`
            fixed lg:static inset-y-0 left-0 z-30
            w-64 bg-gray-900 h-screen flex flex-col text-gray-300
            transform transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
            <div className="p-6 flex items-center justify-between gap-3 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="text-blue-500" size={28} />
                    <span className="text-xl font-bold text-white tracking-wider">MAMS</span>
                </div>
                <button 
                    className="lg:hidden text-gray-400 hover:text-white"
                    onClick={() => setIsOpen(false)}
                >
                    <X size={24} />
                </button>
            </div>
            
            <div className="p-4 text-sm bg-stone-800/50 border-b border-stone-800 flex flex-col gap-2">
                <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">Logged in as:</div>
                <div className="font-bold text-stone-100">{user?.username}</div>
                <div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider shadow-sm
                        ${user?.role === 'Admin' ? 'bg-red-900/50 text-red-400 border border-red-700/50' : 
                          user?.role === 'Base Commander' ? 'bg-blue-900/50 text-blue-400 border border-blue-700/50' : 
                          'bg-green-900/50 text-green-400 border border-green-700/50'}`}
                    >
                        {user?.role}
                    </span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 hover:text-white'
                            }`
                        }
                    >
                        {item.icon}
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <button 
                    onClick={logout}
                    className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;

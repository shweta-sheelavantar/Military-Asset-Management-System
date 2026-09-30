import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const Layout = () => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-900 text-stone-100 font-mono tracking-widest uppercase">Establishing Secure Uplink...</div>;
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-screen bg-stone-100 overflow-hidden font-sans relative">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            
            <main className="flex-1 overflow-y-auto flex flex-col relative w-full h-full">
                {/* Mobile Header */}
                <div className="lg:hidden bg-stone-900 text-stone-100 p-4 flex justify-between items-center z-10 shrink-0 shadow-md">
                    <span className="font-bold tracking-wider">MAMS</span>
                    <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-stone-800 rounded">
                        <Menu size={24} />
                    </button>
                </div>

                <div className="flex-1 p-4 md:p-8 overflow-y-auto relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3 }}
                            className="h-full"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default Layout;

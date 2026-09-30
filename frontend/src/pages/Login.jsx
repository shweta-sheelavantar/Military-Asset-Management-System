import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(username, password);
            toast.success("Authentication successful");
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-800 to-stone-950">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-stone-800 p-8 rounded-xl shadow-2xl shadow-stone-900/50 w-96 border border-stone-700 relative overflow-hidden"
            >
                {/* Decorative camouflage-like accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-700 via-green-600 to-green-800"></div>
                
                <div className="flex justify-center mb-6 mt-2">
                    <div className="bg-stone-900 p-4 rounded-full border border-stone-700 shadow-inner">
                        <Shield className="w-10 h-10 text-green-600" />
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold text-center text-stone-100 mb-2 tracking-wide uppercase">MAMS Portal</h2>
                <p className="text-center text-stone-400 text-xs mb-8 uppercase tracking-widest font-semibold">Restricted Access</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                        <label className="block text-stone-400 text-xs font-semibold uppercase tracking-wider mb-2">Username / Callsign</label>
                        <input 
                            type="text" 
                            className="w-full p-3 bg-stone-900 text-stone-100 rounded border border-stone-700 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-colors placeholder-stone-600"
                            placeholder="Enter callsign"
                            value={username} onChange={(e) => setUsername(e.target.value)} required 
                        />
                    </div>
                    <div className="mb-8">
                        <label className="block text-stone-400 text-xs font-semibold uppercase tracking-wider mb-2">Clearance Code</label>
                        <input 
                            type="password" 
                            className="w-full p-3 bg-stone-900 text-stone-100 rounded border border-stone-700 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-colors placeholder-stone-600"
                            placeholder="••••••••"
                            value={password} onChange={(e) => setPassword(e.target.value)} required 
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full font-bold py-3 px-4 rounded transition duration-200 uppercase tracking-wide text-sm
                            ${loading ? 'bg-stone-700 text-stone-500 cursor-not-allowed' : 'bg-green-700 hover:bg-green-600 text-stone-100 shadow-lg shadow-green-900/30'}
                        `}
                    >
                        {loading ? 'Authenticating...' : 'Establish Uplink'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Sparkles } from 'lucide-react';
import { authApi } from '@/lib/backendApi';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasToken, setHasToken] = useState(false);

    useEffect(() => {
        // Check if token exists in URL
        const token = searchParams.get('token');
        if (token) {
            setHasToken(true);
        }
    }, [searchParams]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }
        
        const token = searchParams.get('token');
        if (!token) {
            setError("Reset token is missing. Please use the link from your email.");
            return;
        }
        
        setError('');
        setLoading(true);
        const { error: resetError } = await authApi.resetPassword(token, password);
        setLoading(false);
        if (!resetError) {
            navigate('/login');
        } else {
            setError(resetError.message || "Failed to reset password. The token may be invalid or expired.");
        }
    };
    
    if (!hasToken) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center">
                <h1 className="text-xl font-semibold">Invalid Reset Link</h1>
                <p className="text-slate-600 mt-2">Please use the password reset link from your email.</p>
            </div>
        )
    }

    return (
        <>
            <Helmet>
                <title>Reset Password - PharaohVault</title>
            </Helmet>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-slate-50 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md"
                >
                    <div className="bg-white p-8 md:p-12 rounded-2xl shadow-2xl border border-slate-200">
                         <div className="text-center mb-8">
                          <a href="/" className="inline-flex items-center justify-center space-x-2 mb-4">
                            <Sparkles className="w-10 h-10 text-amber-500" />
                            <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
                              PharaohVault
                            </span>
                          </a>
                          <h1 className="text-3xl font-bold text-slate-900">Set New Password</h1>
                          <p className="text-slate-600 mt-2">Enter a new password for your account.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <Label htmlFor="password">New Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="mt-2"
                                />
                            </div>
                             <div>
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="mt-2"
                                />
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-lg py-6" disabled={loading}>
                                {loading ? 'Updating...' : (
                                    <>
                                        <KeyRound className="w-5 h-5 mr-2" />
                                        Update Password
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default ResetPasswordPage;
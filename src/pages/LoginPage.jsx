import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogIn, Sparkles, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, session, sendPasswordResetEmail } = useAuth();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  // Show success message if coming from signup
  useEffect(() => {
    if (location.state?.message) {
      toast({
        title: "Account Created! 🎉",
        description: location.state.message,
      });
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

  useEffect(() => {
    if (session) {
      navigate(from, { replace: true });
    }
  }, [session, navigate, from]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (!error) {
      navigate(from, { replace: true });
    }
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    await sendPasswordResetEmail(resetEmail);
    setLoading(false);
    setIsForgotPasswordOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>Log In - PharaohVault</title>
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-slate-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-2xl border border-slate-200">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center justify-center space-x-2 mb-4">
                <Sparkles className="w-10 h-10 text-amber-500" />
                <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
                  PharaohVault
                </span>
              </Link>
              <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>
              <p className="text-slate-600 mt-2">Log in to access your dashboard.</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
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
              <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-lg py-6" disabled={loading}>
                {loading ? 'Logging in...' : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Log In
                  </>
                )}
              </Button>
            </form>
            
            <div className="text-center mt-6 text-sm">
              <button onClick={() => setIsForgotPasswordOpen(true)} className="hover:text-amber-600 transition-colors text-slate-600">Forgot Password?</button>
              <p className="mt-4">
                Don't have an account?{' '}
                <Link to="/signup" state={{ from: location.state?.from }} className="font-semibold text-amber-600 hover:underline">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      
      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-amber-500"/>Forgot Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <DialogFooter>
            <Button onClick={handlePasswordReset} disabled={loading} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LoginPage;
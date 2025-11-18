import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Loader, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSessionStatus, syncStripeSubscriptions } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';


const ReturnPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [status, setStatus] = useState('loading'); // 'loading', 'success', 'pending', or 'error'
    const [message, setMessage] = useState('Checking payment status...');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        const sessionId = new URLSearchParams(location.search).get('session_id');

        if (!sessionId) {
            setStatus('error');
            setMessage('No session ID found. Unable to verify payment.');
            return;
        }

        const checkStatus = async () => {
            try {
                const { status: paymentStatus } = await getSessionStatus(sessionId);

                if (paymentStatus === 'complete') {
                    setStatus('success');
                    setMessage('Your subscription has been activated successfully! Redirecting...');
                    
                    if (user?.email) {
                        await syncStripeSubscriptions(user.email);
                    }
                    
                    setTimeout(() => navigate('/dashboard'), 2000);

                } else if (paymentStatus === 'open' && retryCount < 5) {
                    setStatus('pending');
                    setMessage(`Your payment is processing... We're confirming the details. (Attempt ${retryCount + 1})`);
                    // Retry after a short delay
                    setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                    }, 2000);
                } else {
                    setStatus('error');
                    setMessage(paymentStatus === 'open' 
                        ? 'Payment is still processing. Please check your dashboard shortly.'
                        : `Payment failed with status: ${paymentStatus}. Please try again.`
                    );
                }
            } catch (error) {
                console.error("Error fetching session status:", error);
                setStatus('error');
                setMessage('An error occurred while verifying your payment. Please contact support.');
            }
        };

        checkStatus();
    }, [location.search, user, navigate, retryCount]);

    const renderIcon = () => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-16 h-16 text-green-500" />;
            case 'pending':
                return <RefreshCw className="w-16 h-16 animate-spin text-yellow-500" />;
            case 'error':
                return <AlertTriangle className="w-16 h-16 text-red-500" />;
            default:
                return <Loader className="w-16 h-16 animate-spin text-amber-500" />;
        }
    };

    return (
        <>
            <Helmet>
                <title>Payment Status - PharaohVault</title>
                <meta name="description" content="Checking your payment and subscription status." />
            </Helmet>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl mx-auto py-20 px-4 sm:px-6 lg:px-8 text-center"
            >
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center">
                    <div className="mb-6">
                        {renderIcon()}
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-4">
                        {status === 'loading' && 'Verifying Payment...'}
                        {status === 'success' && 'Payment Successful!'}
                        {status === 'pending' && 'Payment Processing'}
                        {status === 'error' && 'Payment Issue'}
                    </h1>
                    <p className="text-slate-600 mb-8">{message}</p>
                    <Button onClick={() => navigate('/dashboard')}>
                        Go to Your Dashboard
                    </Button>
                </div>
            </motion.div>
        </>
    );
};

export default ReturnPage;
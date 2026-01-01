import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, Lock, Package, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SubscriptionModal from '@/components/SubscriptionModal';
import { fetchMetalPrices, triggerPriceUpdate } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import goldImage from '../../public/gold_hero.jpeg';
const plans = [
    { name: 'Gold Plan', metal: 'gold' },
    { name: 'Silver Plan', metal: 'silver' }
];

const HomePage = () => {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [metalPrices, setMetalPrices] = useState({ gold: 2650, silver: 32 });
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const goldPricePerGram = Number(metalPrices.gold ?? 0);
  const silverPricePerOz = Number(metalPrices.silver ?? 0);

  const getPrices = useCallback(async () => {
    try {
      setLoadingPrices(true);
      const prices = await fetchMetalPrices();
      setMetalPrices(prices);
    } catch (error) {
      console.error("Failed to fetch metal prices:", error);
      toast({
        title: "Error",
        description: "Could not fetch live metal prices. Using cached data.",
        variant: "destructive",
      });
    } finally {
      setLoadingPrices(false);
    }
  }, [toast]);

  useEffect(() => {
    getPrices();
  }, [getPrices]);

  const handleGetStarted = (plan) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in or sign up to continue.",
      });
      navigate('/login', { state: { from: { pathname: '/' } } });
      return;
    }
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const handleManualUpdate = async () => {
    setIsUpdating(true);
    toast({
      title: "Updating Prices...",
      description: "Fetching latest data from the Gold API. Please wait.",
    });
    try {
      await triggerPriceUpdate();
      toast({
        title: "Success!",
        description: "Metal prices have been updated successfully.",
        variant: "success",
      });
      await getPrices();
    } catch (error) {
      console.error("Manual update failed:", error);
      let description = "Could not update prices. Please check the function logs.";
      if (error.message && error.message.includes("Monthly API quota exceeded")) {
        description = "The Gold API monthly quota has been exceeded. Please try again later or upgrade your API plan.";
      }
      toast({
        title: "Update Failed",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const features = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Dollar-Cost Averaging",
      description: "Invest consistently and reduce market timing risk with automated monthly contributions"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure Storage",
      description: "Your precious metals are stored in our high-security vaults until you're ready to receive them"
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Automatic Delivery",
      description: "Once your accumulated value reaches the metal price, we ship directly to you"
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Flexible Options",
      description: "Choose to receive your metals or keep them safely stored in our vault"
    }
  ];

  return (
    <>
      <Helmet>
        <title>PharaohVault - Invest in Gold & Silver from $10/month</title>
        <meta name="description" content="Start investing in physical gold and silver bars with as little as $10 per month. Dollar-cost averaging made simple with secure storage and automatic delivery." />
      </Helmet>

      <div>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-slate-50 pt-20 pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
                  Invest in Real
                  <span className="bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent"> Gold & Silver</span>
                </h1>
                <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                  Start building your precious metals portfolio with as little as $10 per month. 
                  We make investing in physical gold and silver simple, secure, and accessible.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    onClick={() => handleGetStarted(plans.find(p => p.metal === 'gold'))}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    Invest in Gold
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleGetStarted(plans.find(p => p.metal === 'silver'))}
                    className="bg-slate-600 hover:bg-slate-700 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    Invest in Silver
                  </Button>
                </div>
                <div className="mt-4">
                  <Button 
                    variant="link"
                    onClick={() => {
                      const element = document.getElementById('how-it-works');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-600 hover:text-amber-600"
                  >
                    Learn More
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <img className="rounded-2xl shadow-2xl w-full h-auto" alt="Professional financial setting with gold and silver assets, symbolizing wealth management and secure investment opportunities" src={goldImage} />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 md:mb-16"
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Why Choose PharaohVault?</h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                The smartest way to invest in precious metals with complete peace of mind
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-gradient-to-br from-slate-50 to-amber-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Simple, transparent, and designed for your success
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Choose Your Plan",
                  description: "Select gold or silver and set your monthly contribution (minimum $10)"
                },
                {
                  step: "2",
                  title: "We Accumulate",
                  description: "Your contributions build up each month until they reach the current metal price"
                },
                {
                  step: "3",
                  title: "Receive or Store",
                  description: "Get your physical metals shipped or keep them secure in our vault"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="relative"
                >
                  <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-amber-200 hover:border-amber-400 transition-all">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6 mx-auto">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3 text-center">{item.title}</h3>
                    <p className="text-slate-600 text-center">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Start Your Investment Journey</h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Flexible plans that grow with your investment goals
              </p>
            </motion.div>
            
            <div className="flex justify-center my-8">
                {loadingPrices ? (
                    <div className="text-center"><p className="text-slate-600">Loading live prices...</p></div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="bg-gradient-to-br from-amber-50 to-yellow-100 p-8 rounded-2xl shadow-lg border-2 border-amber-200"
                        >
                            <h3 className="text-3xl font-bold text-amber-900 text-center mb-2">Gold Plan</h3>
                            <p className="text-center text-amber-700 font-semibold mb-6">Current Price: ~${goldPricePerGram.toFixed(2)}/g</p>
                            <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-lg py-6" onClick={() => handleGetStarted(plans.find(p => p.metal === 'gold'))}>
                                Start a Gold Plan
                            </Button>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-br from-slate-100 to-slate-200 p-8 rounded-2xl shadow-lg border-2 border-slate-300"
                        >
                            <h3 className="text-3xl font-bold text-slate-800 text-center mb-2">Silver Plan</h3>
                            <p className="text-center text-slate-600 font-semibold mb-6">Current Price: ~${silverPricePerOz.toFixed(2)}/oz</p>
                            <Button className="w-full bg-slate-600 hover:bg-slate-700 text-white text-lg py-6" onClick={() => handleGetStarted(plans.find(p => p.metal === 'silver'))}>
                                Start a Silver Plan
                            </Button>
                        </motion.div>
                    </div>
                )}
            </div>
            {role === 'admin' && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={handleManualUpdate}
                  disabled={isUpdating}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                  {isUpdating ? 'Updating...' : 'Refresh Prices'}
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-amber-600 to-yellow-500 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold mb-6">Ready to Build Real Wealth?</h2>
              <p className="text-xl mb-8 text-amber-50">
                Join thousands of investors who are securing their future with precious metals
              </p>
              <Button 
                size="lg"
                onClick={() => handleGetStarted(plans.find(p => p.metal === 'gold'))}
                className="bg-white text-amber-600 hover:bg-amber-50 shadow-xl hover:shadow-2xl transition-all text-lg px-8"
              >
                Get Started Today
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-300 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                   <Sparkles className="w-6 h-6 text-amber-500" />
                   <span className="text-lg font-bold text-white">PharaohVault</span>
                </div>
                <p className="text-sm">
                  Making precious metals investment accessible to everyone through smart, automated dollar-cost averaging.
                </p>
              </div>
              <div>
                <span className="font-semibold text-white block mb-3">Company</span>
                <p className="text-sm mb-2 cursor-pointer hover:text-amber-400 transition-colors">About Us</p>
                <p className="text-sm mb-2 cursor-pointer hover:text-amber-400 transition-colors">How It Works</p>
                <p className="text-sm cursor-pointer hover:text-amber-400 transition-colors">Security</p>
              </div>
              <div>
                <span className="font-semibold text-white block mb-3">Legal</span>
                <p className="text-sm mb-2 cursor-pointer hover:text-amber-400 transition-colors">Terms of Service</p>
                <p className="text-sm mb-2 cursor-pointer hover:text-amber-400 transition-colors">Privacy Policy</p>
                <p className="text-sm cursor-pointer hover:text-amber-400 transition-colors">Contact</p>
              </div>
            </div>
            <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm">
              <p>&copy; 2025 PharaohVault. All rights reserved.</p>
            </div>
          </div>
        </footer>

        {user && <SubscriptionModal 
          isOpen={showModal}
          onOpenChange={setShowModal}
          plan={selectedPlan}
          prices={metalPrices}
        />}
      </div>
    </>
  );
};

export default HomePage;
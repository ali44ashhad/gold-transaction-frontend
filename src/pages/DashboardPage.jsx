
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { TrendingUp, Package, Archive as Vault, DollarSign, PlusCircle, Trash2, Loader, Users, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
// import { supabase } from '@/lib/customSupabaseClient';
import SubscriptionCard from '@/components/SubscriptionCard';
import SubscriptionModal from '@/components/SubscriptionModal';
import { useToast } from '@/components/ui/use-toast';
import { fetchMetalPrices, syncStripeSubscriptions } from '@/lib/api';
import { subscriptionApi, userApi, dashboardApi } from '@/lib/backendApi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DashboardPage = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [metalPrices, setMetalPrices] = useState({ gold: 0, silver: 0 });
  const [userLookup, setUserLookup] = useState({});
  const [dashboardStats, setDashboardStats] = useState({
    totalInvested: 0,
    monthlyInvested: 0,
    userCount: 0,
  });
  const [userStats, setUserStats] = useState({
    totalInvested: 0,
    currentInvestment: 0,
    accumulatedGold: 0,
    accumulatedSilver: 0,
  });
  
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const firstName = user?.user_metadata?.first_name;
  const isAdmin = role === 'admin';

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // First, trigger a sync with Stripe. This will also update prices and accumulations.
      // if (user.email) {
      //   await syncStripeSubscriptions(user.email);
      // }

      // Then, fetch the freshly synced data from our DB
      const transformSubscription = (sub) => ({
        ...sub,
        id: sub.id || sub._id,
        user_id: sub.user_id || sub.userId?.toString?.(),
        plan_name: sub.plan_name || sub.planName,
        target_weight: sub.target_weight ?? sub.targetWeight,
        target_unit: sub.target_unit ?? sub.targetUnit,
        monthly_investment: sub.monthly_investment ?? sub.monthlyInvestment,
        accumulated_value: sub.accumulated_value ?? sub.accumulatedValue ?? 0,
        accumulated_weight: sub.accumulated_weight ?? sub.accumulatedWeight ?? 0,
        current_period_end: sub.current_period_end || sub.currentPeriodEnd,
        stripe_subscription_id: sub.stripe_subscription_id || sub.stripeSubscriptionId,
        stripe_customer_id: sub.stripe_customer_id || sub.stripeCustomerId,
        created_at: sub.created_at || sub.createdAt,
        updated_at: sub.updated_at || sub.updatedAt,
        status: sub.status || sub.status, // Ensure status is preserved
        userId: sub.userId || sub.user_id, // keep camel version to avoid loss
        planName: sub.planName || sub.plan_name,
        targetWeight: sub.targetWeight ?? sub.target_weight,
        targetUnit: sub.targetUnit ?? sub.target_unit,
        monthlyInvestment: sub.monthlyInvestment ?? sub.monthly_investment,
        accumulatedValue: sub.accumulatedValue ?? sub.accumulated_value ?? 0,
        accumulatedWeight: sub.accumulatedWeight ?? sub.accumulated_weight ?? 0,
        currentPeriodEnd: sub.currentPeriodEnd || sub.current_period_end,
        stripeSubscriptionId: sub.stripeSubscriptionId || sub.stripe_subscription_id,
        stripeCustomerId: sub.stripeCustomerId || sub.stripe_customer_id,
        targetPrice: sub.targetPrice ?? sub.target_price ?? 0,
      });

      const subscriptionsPromise = subscriptionApi.list();
      const pricesPromise = fetchMetalPrices();
      const userListPromise = isAdmin ? userApi.listUsers() : Promise.resolve({ data: null, error: null });
      const dashboardStatsPromise = isAdmin ? dashboardApi.getStats() : Promise.resolve({ data: null, error: null });
      const userStatsPromise = !isAdmin ? dashboardApi.getUserStats() : Promise.resolve({ data: null, error: null });

      const [{ data: subsData, error: subsError }, prices, userList, statsResult, userStatsResult] = await Promise.all([
        subscriptionsPromise,
        pricesPromise,
        userListPromise,
        dashboardStatsPromise,
        userStatsPromise,
      ]);

      if (subsError) throw new Error(subsError.message);
      const normalizedSubscriptions =
        subsData?.subscriptions?.map((sub) => transformSubscription(sub)) || [];
      setSubscriptions(normalizedSubscriptions);
      setMetalPrices(prices);
      
      if (isAdmin) {
        if (userList?.error) {
          throw new Error(userList.error.message || 'Failed to fetch user list');
        }
        const users = userList?.data?.users || [];
        const lookup = users.reduce((acc, u) => {
          const id = u.id || u._id;
          if (!id) return acc;
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
          acc[id] = name || u.email || 'Unknown User';
          return acc;
        }, {});
        setUserLookup(lookup);

        // Set dashboard stats
        if (statsResult?.error) {
          console.error('Failed to fetch dashboard stats:', statsResult.error);
        } else if (statsResult?.data) {
          setDashboardStats({
            totalInvested: statsResult.data.totalInvested || 0,
            monthlyInvested: statsResult.data.monthlyInvested || 0,
            userCount: statsResult.data.userCount || 0,
          });
        }
      } else {
        setUserLookup({});
        
        // Set user stats
        if (userStatsResult?.error) {
          console.error('Failed to fetch user stats:', userStatsResult.error);
        } else if (userStatsResult?.data) {
          setUserStats({
            totalInvested: userStatsResult.data.totalInvested || 0,
            currentInvestment: userStatsResult.data.currentInvestment || 0,
            accumulatedGold: userStatsResult.data.accumulatedGold || 0,
            accumulatedSilver: userStatsResult.data.accumulatedSilver || 0,
          });
        }
      }

    } catch (error) {
      toast({
        title: 'Error Fetching Data',
        description: error.message || 'Could not fetch dashboard data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, isAdmin]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time listener for subscription updates from webhooks
  // useEffect(() => {
  //   if (!user) return;

  //   const channel = supabase.channel('subscriptions-channel')
  //     .on(
  //       'postgres_changes',
  //       { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
  //       (payload) => {
  //         console.log('Real-time change received!', payload);
  //         // Re-fetch all data to ensure consistency
  //         fetchDashboardData();
  //       }
  //     )
  //     .subscribe();

  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, [user, fetchDashboardData]);

  const handleStartPlan = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const handleDeletePending = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await subscriptionApi.deletePending();
      if (error) {
        throw new Error(error.message || 'Failed to delete pending plans.');
      }
      toast({
        title: 'Success',
        description: `${data?.deletedCount ?? 0} pending plans have been deleted.`,
        variant: 'success',
      });
      await fetchDashboardData(); // Refresh data
    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Could not delete pending plans.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && subscriptions.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold">Loading Dashboard...</div>
      </div>
    );
  }

  const displaySubscriptions = isAdmin ? subscriptions : subscriptions.filter(s => s.user_id === user.id);
  const pendingSubscriptionsCount = displaySubscriptions.filter(sub => sub.status === 'pending_payment').length;
  
  // Separate active and cancelled subscriptions
  const activeSubscriptions = displaySubscriptions.filter(sub => 
    !['canceled', 'incomplete_expired'].includes(sub.status)
  );
  const cancelledSubscriptions = displaySubscriptions.filter(sub => 
    sub.status === 'canceled'
  );
  
  const totalInvested = displaySubscriptions.reduce((sum, sub) => sum + (sub.accumulated_value || 0), 0);
  const activeSubscriptionsCount = activeSubscriptions.filter(sub => ['active', 'trialing', 'canceling'].includes(sub.status)).length;
  const inVaultCount = displaySubscriptions.filter(sub => sub.accumulated_weight > 0).length;

  const hasActiveGold = activeSubscriptions.some(s => s.metal === 'gold' && ['active', 'trialing', 'canceling'].includes(s.status));
  const hasActiveSilver = activeSubscriptions.some(s => s.metal === 'silver' && ['active', 'trialing', 'canceling'].includes(s.status));

  return (
    <>
      <Helmet>
        <title>Dashboard - PharaohVault</title>
        <meta name="description" content="Track your precious metals investments and manage your subscriptions" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {isAdmin ? "Admin Dashboard" : `Welcome back, ${firstName || 'User'}!`}
              </h1>
              <p className="text-slate-600 mt-1">
                {isAdmin ? "Viewing all user subscriptions." : "Here's an overview of your investments."}
              </p>
            </div>
            {isAdmin && pendingSubscriptionsCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting} className="w-full md:w-auto">
                    {isDeleting ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {isDeleting ? 'Deleting...' : `Delete ${pendingSubscriptionsCount} Pending Plans`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete {pendingSubscriptionsCount} pending subscription(s).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePending}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </motion.div>

        <div className={`grid gap-6 mb-8 ${isAdmin ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
          {isAdmin ? (
            <>
              <StatCard icon={DollarSign} label="Total Invested" value={`$${dashboardStats.totalInvested.toFixed(2)}`} color="green" />
              <StatCard icon={TrendingUp} label="Monthly Invested" value={`$${dashboardStats.monthlyInvested.toFixed(2)}`} color="amber" delay={0.1} />
              <StatCard icon={Users} label="Number of Users" value={dashboardStats.userCount} color="blue" delay={0.2} />
            </>
          ) : (
            <>
              <StatCard icon={DollarSign} label="Total Invested" value={`$${userStats.totalInvested.toFixed(2)}`} color="green" />
              <StatCard icon={TrendingUp} label="Current Investment" value={`$${userStats.currentInvestment.toFixed(2)}`} color="amber" delay={0.1} />
              <StatCard 
                icon={Coins} 
                label="Accumulated Gold" 
                value={`${userStats.accumulatedGold.toFixed(2)} g`} 
                color="amber" 
                delay={0.2}
                bgTint="amber"
              />
              <StatCard 
                icon={Coins} 
                label="Accumulated Silver" 
                value={`${userStats.accumulatedSilver.toFixed(2)} oz`} 
                color="gray" 
                delay={0.3}
                bgTint="slate"
              />
            </>
          )}
        </div>

        {/* Active Subscriptions Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {isAdmin ? "Active Subscriptions" : "Your Active Subscriptions"}
          </h2>
          {activeSubscriptions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center"
            >
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Active Subscriptions</h3>
              <p className="text-slate-600 mb-6">
                {isAdmin ? "There are no active subscriptions in the system yet." : "Start your precious metals investment journey today!"}
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {activeSubscriptions.map((subscription, index) => {
                const subscriptionUserId =
                  subscription.user_id ||
                  (typeof subscription.userId === 'string'
                    ? subscription.userId
                    : subscription.userId?._id);
                return (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    index={index}
                    onSubscriptionUpdate={fetchDashboardData}
                    metalPrices={metalPrices}
                    isAdminView={isAdmin}
                    userName={isAdmin ? userLookup[subscriptionUserId] : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Cancelled Subscriptions Section */}
        {cancelledSubscriptions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-600 mb-6 flex items-center gap-2">
              <Vault className="w-6 h-6" />
              {isAdmin ? "Cancelled Subscriptions" : "Cancelled Subscriptions"}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {cancelledSubscriptions.map((subscription, index) => {
                const subscriptionUserId =
                  subscription.user_id ||
                  (typeof subscription.userId === 'string'
                    ? subscription.userId
                    : subscription.userId?._id);
                return (
                  <div key={subscription.id} className="opacity-75">
                    <SubscriptionCard
                      subscription={subscription}
                      index={index}
                      onSubscriptionUpdate={fetchDashboardData}
                      metalPrices={metalPrices}
                      isAdminView={isAdmin}
                      userName={isAdmin ? userLookup[subscriptionUserId] : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isAdmin && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Start a New Plan</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <NewPlanCard 
                metal="Gold" 
                price={metalPrices.gold} 
                onStart={() => handleStartPlan({ name: 'Gold Plan', metal: 'gold' })}
                // disabled={hasActiveGold}
              />
              <NewPlanCard 
                metal="Silver" 
                price={metalPrices.silver} 
                onStart={() => handleStartPlan({ name: 'Silver Plan', metal: 'silver' })}
                // disabled={hasActiveSilver}
              />
            </div>
          </div>
        )}
      </div>
      
      <SubscriptionModal 
        isOpen={showModal}
        onOpenChange={setShowModal}
        plan={selectedPlan}
        prices={metalPrices}
        onSubscriptionUpdate={fetchDashboardData}
      />
    </>
  );
};

const StatCard = ({ icon: Icon, label, value, color, delay = 0, bgTint }) => {
    const bgClass = bgTint === 'amber' 
        ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200' 
        : bgTint === 'slate' 
        ? 'bg-gradient-to-br from-gray-100 to-white border-gray-300'
        : 'bg-white border-slate-200';
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`p-6 rounded-xl shadow-sm border ${bgClass}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">{label}</span>
                <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
        </motion.div>
    );
};

const NewPlanCard = ({ metal, price, onStart, disabled }) => {
  const isGold = metal === 'Gold';
  const normalizedPrice = Number(price ?? 0);
  const displayPrice = normalizedPrice;
  const unitLabel = isGold ? 'g' : 'oz';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: isGold ? 0.1 : 0.2 }}
      className={`p-6 rounded-xl shadow-md border-2 ${isGold ? 'bg-amber-50 border-amber-200' : 'bg-slate-100 border-slate-300'} ${disabled ? 'opacity-50' : ''}`}
    >
      <h3 className={`text-2xl font-bold ${isGold ? 'text-amber-900' : 'text-slate-800'}`}>{metal} Plan</h3>
      <p className={`font-semibold ${isGold ? 'text-amber-700' : 'text-slate-600'}`}>~${displayPrice.toFixed(2)}/{unitLabel}</p>
      <Button 
        className="w-full mt-4" 
        onClick={onStart} 
        disabled={disabled}
      >
        <PlusCircle className="w-4 h-4 mr-2" />
        {disabled ? 'Plan Active' : `Start ${metal} Plan`}
      </Button>
    </motion.div>
  );
};

export default DashboardPage;

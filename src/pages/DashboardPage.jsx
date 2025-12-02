
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { TrendingUp, Package, Archive as Vault, DollarSign, PlusCircle, Trash2, Loader, Users, Coins, ChevronDown, RefreshCw, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
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
import DataTable from '@/components/DataTable';
import SearchBar from '@/components/SearchBar';
import { cn } from '@/lib/utils';

const DashboardPage = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
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

  // Admin-specific state for user management
  const [adminUsers, setAdminUsers] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [subscriptionsMap, setSubscriptionsMap] = useState(new Map());
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(new Set());
  const [collapsedSections, setCollapsedSections] = useState(new Map());
  const [searchQuery, setSearchQuery] = useState('');

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
        // Filter to only show users with role "user" (exclude admins)
        const regularUsers = users.filter((u) => u.role === 'user');
        setAdminUsers(regularUsers);
        
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
        setAdminUsers([]);
        
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

  // Admin-specific functions for user management
  const normalizeId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value._id) return String(value._id);
      if (value.id) return String(value.id);
      if (typeof value.toString === 'function') return value.toString();
    }
    return '';
  };

  const fetchUserSubscriptions = async (userId) => {
    const normalizedId = normalizeId(userId);
    
    // If already loaded, don't fetch again
    if (subscriptionsMap.has(normalizedId)) {
      return;
    }

    setLoadingSubscriptions((prev) => new Set(prev).add(normalizedId));

    try {
      const response = await subscriptionApi.list({ userId: normalizedId });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch subscriptions');
      }

      const subscriptions = response.data?.subscriptions || [];
      setSubscriptionsMap((prev) => {
        const next = new Map(prev);
        next.set(normalizedId, subscriptions);
        return next;
      });
    } catch (error) {
      toast({
        title: 'Error fetching subscriptions',
        description: error.message,
        variant: 'destructive',
      });
      // Set empty array on error so we don't retry
      setSubscriptionsMap((prev) => {
        const next = new Map(prev);
        next.set(normalizedId, []);
        return next;
      });
    } finally {
      setLoadingSubscriptions((prev) => {
        const next = new Set(prev);
        next.delete(normalizedId);
        return next;
      });
    }
  };

  const handleRowExpand = (userId) => {
    const normalizedId = normalizeId(userId);
    const isExpanded = expandedRows.has(normalizedId);

    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(normalizedId);
      } else {
        next.add(normalizedId);
        // Fetch subscriptions when expanding
        fetchUserSubscriptions(userId);
      }
      return next;
    });
  };

  const toggleSection = (userId, sectionType) => {
    const normalizedId = normalizeId(userId);
    const key = `${normalizedId}-${sectionType}`;
    
    setCollapsedSections((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, true);
      }
      return next;
    });
  };

  const isSectionCollapsed = (userId, sectionType) => {
    const normalizedId = normalizeId(userId);
    const key = `${normalizedId}-${sectionType}`;
    return collapsedSections.has(key);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending_payment: 'bg-yellow-100 text-yellow-800',
      trialing: 'bg-blue-100 text-blue-800',
      canceling: 'bg-orange-100 text-orange-800',
      canceled: 'bg-red-100 text-red-800',
      past_due: 'bg-red-100 text-red-800',
      unpaid: 'bg-red-100 text-red-800',
      incomplete: 'bg-yellow-100 text-yellow-800',
      incomplete_expired: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getUserFullName = (user) => {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'N/A';
  };

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
  
  // Separate active and cancelled subscriptions (for non-admin users)
  const activeSubscriptions = !isAdmin ? displaySubscriptions.filter(sub => 
    !['canceled', 'incomplete_expired'].includes(sub.status)
  ) : [];
  const cancelledSubscriptions = !isAdmin ? displaySubscriptions.filter(sub => 
    sub.status === 'canceled'
  ) : [];
  
  const totalInvested = displaySubscriptions.reduce((sum, sub) => sum + (sub.accumulated_value || 0), 0);
  const activeSubscriptionsCount = activeSubscriptions.filter(sub => ['active', 'trialing', 'canceling'].includes(sub.status)).length;
  const inVaultCount = displaySubscriptions.filter(sub => sub.accumulated_weight > 0).length;

  const hasActiveGold = activeSubscriptions.some(s => s.metal === 'gold' && ['active', 'trialing', 'canceling'].includes(s.status));
  const hasActiveSilver = activeSubscriptions.some(s => s.metal === 'silver' && ['active', 'trialing', 'canceling'].includes(s.status));

  // Admin: Filter users by search query
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredUsers = normalizedSearch
    ? adminUsers.filter((user) => {
        const fullName = getUserFullName(user).toLowerCase();
        const email = user.email?.toLowerCase() || '';
        const phone = user.phone?.toLowerCase() || '';
        return (
          fullName.includes(normalizedSearch) ||
          email.includes(normalizedSearch) ||
          phone.includes(normalizedSearch)
        );
      })
    : adminUsers;

  // Admin: Define columns for user table
  const adminColumns = [
    {
      id: 'expander',
      header: '',
      cellClassName: 'w-12 align-middle',
      cell: (user) => {
        const rowId = normalizeId(user._id || user.id);
        const isExpanded = expandedRows.has(rowId);
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleRowExpand(user._id || user.id)}
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </Button>
        );
      },
    },
    {
      id: 'serial',
      header: 'S.No',
      cellClassName: 'w-16 text-slate-500 align-middle',
      cell: (_user, index) => index + 1,
    },
    {
      id: 'name',
      header: 'Name',
      cellClassName: 'max-w-[200px] align-middle',
      cell: (user) => (
        <p className="font-medium text-slate-900 truncate">
          {getUserFullName(user)}
        </p>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      cellClassName: 'max-w-[250px] align-middle',
      cell: (user) => (
        <p className="text-slate-600 truncate">{user.email || 'N/A'}</p>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      cellClassName: 'align-middle',
      cell: (user) => <p className="text-slate-600">{user.phone || 'N/A'}</p>,
    },
    {
      id: 'createdAt',
      header: 'Joined',
      cellClassName: 'align-middle',
      cell: (user) => formatDate(user.createdAt),
    },
  ];

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

        {/* Admin: Users and Subscriptions Section */}
        {isAdmin ? (
          <div className="mb-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Users and Subscriptions</h2>
              <div className="flex flex-col gap-3 w-full xl:max-w-2xl xl:flex-row xl:items-center">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search users by name, email, or phone..."
                  className="flex-1 min-w-0"
                />
                <Button onClick={fetchDashboardData} variant="outline" className="w-full sm:w-auto">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-slate-200">
              <div className="overflow-x-auto">
                <DataTable
                  columns={adminColumns}
                  data={filteredUsers}
                  emptyMessage={searchQuery ? 'No users match your search.' : 'No users found.'}
                  getRowKey={(row) => normalizeId(row._id || row.id)}
                  expandedRowKeys={expandedRows}
                  className="min-w-[720px]"
                  renderExpandedContent={(user) => {
                    const userId = normalizeId(user._id || user.id);
                    const subscriptions = subscriptionsMap.get(userId) || [];
                    const isLoading = loadingSubscriptions.has(userId);

                    // Split subscriptions into active and cancelled
                    const activeSubscriptions = subscriptions.filter(
                      (s) => s.status === 'active' || s.status === 'trialing'
                    );
                    const cancelledSubscriptions = subscriptions.filter(
                      (s) => s.status === 'canceled' || s.status === 'canceling'
                    );

                    const isActiveCollapsed = isSectionCollapsed(userId, 'active');
                    const isCancelledCollapsed = isSectionCollapsed(userId, 'cancelled');

                    const renderSubscriptionCard = (subscription) => {
                      const metal = subscription.metal?.toLowerCase();
                      const borderClass = metal === 'gold' 
                        ? 'border-2 border-amber-400' 
                        : metal === 'silver'
                        ? 'border-2 border-slate-400'
                        : 'border border-slate-200';
                      const bgClass = metal === 'gold'
                        ? 'bg-amber-50'
                        : metal === 'silver'
                        ? 'bg-slate-50'
                        : 'bg-white';
                      
                      return (
                        <div
                          key={subscription._id || subscription.id}
                          className={`${borderClass} ${bgClass} rounded-lg p-4`}
                        >
                          <div className="grid gap-2 text-sm md:grid-cols-2">
                            <div>
                              <p className="font-semibold text-slate-800">Plan</p>
                              <p className="text-slate-600">{subscription.planName || subscription.plan_name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">Status</p>
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(subscription.status)}`}
                              >
                                {subscription.status || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">Metal</p>
                              <p className="text-slate-600 capitalize">
                                {subscription.metal || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">Monthly Investment</p>
                              <p className="text-slate-600">
                                ${(subscription.monthlyInvestment || subscription.monthly_investment || 0).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">Target Weight</p>
                              <p className="text-slate-600">
                                {subscription.targetWeight || subscription.target_weight || '0'} {subscription.targetUnit || subscription.target_unit || 'oz'}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">Accumulated Weight</p>
                              <p className="text-slate-600">
                                {(subscription.accumulatedWeight || subscription.accumulated_weight || 0).toFixed(4)}{' '}
                                {subscription.targetUnit || subscription.target_unit || 'oz'}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">Accumulated Value</p>
                              <p className="text-slate-600">
                                ${(subscription.accumulatedValue || subscription.accumulated_value || 0).toFixed(2)}
                              </p>
                            </div>
                            {(subscription.currentPeriodEnd || subscription.current_period_end) && (
                              <div>
                                <p className="font-semibold text-slate-800">Current Period End</p>
                                <p className="text-slate-600">
                                  {formatDate(subscription.currentPeriodEnd || subscription.current_period_end)}
                                </p>
                              </div>
                            )}
                            {(subscription.stripeSubscriptionId || subscription.stripe_subscription_id) && (
                              <div className="md:col-span-2">
                                <p className="font-semibold text-slate-800">Stripe Subscription ID</p>
                                <p className="text-slate-600 font-mono text-xs">
                                  {subscription.stripeSubscriptionId || subscription.stripe_subscription_id}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Prefer Stripe subscription ID for filtering orders, fallback to MongoDB _id
                                const stripeSubId = subscription.stripeSubscriptionId || subscription.stripe_subscription_id;
                                const mongoId = subscription._id || subscription.id;
                                const subId = stripeSubId || mongoId;
                                if (subId) {
                                  navigate(`/payments?subscriptionId=${subId}`);
                                } else {
                                  toast({
                                    title: 'Unable to view payments',
                                    description: 'Subscription ID not found.',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                              className="w-full"
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              View Payments
                            </Button>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="py-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-slate-800 mb-2">User Details</h3>
                          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                            <div>
                              <p className="font-semibold text-slate-800">User ID</p>
                              <p className="font-mono text-xs">{userId}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">Email Verified</p>
                              <p>{user.emailVerified ? 'Yes' : 'No'}</p>
                            </div>
                            {user.billingAddress && (
                              <div>
                                <p className="font-semibold text-slate-800">Billing Address</p>
                                <p>
                                  {user.billingAddress.street}, {user.billingAddress.city},{' '}
                                  {user.billingAddress.state} {user.billingAddress.zip}
                                </p>
                              </div>
                            )}
                            {user.shippingAddress && (
                              <div>
                                <p className="font-semibold text-slate-800">Shipping Address</p>
                                <p>
                                  {user.shippingAddress.street}, {user.shippingAddress.city},{' '}
                                  {user.shippingAddress.state} {user.shippingAddress.zip}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-800">Created At</p>
                              <p>{formatDate(user.createdAt)}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">Last Updated</p>
                              <p>{formatDate(user.updatedAt)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Active Subscriptions Section */}
                        <div className="mb-4">
                          <div 
                            className="flex items-center gap-2 cursor-pointer mb-2"
                            onClick={() => toggleSection(userId, 'active')}
                          >
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 transition-transform duration-200',
                                !isActiveCollapsed && 'rotate-180'
                              )}
                            />
                            <h3 className="text-lg font-semibold text-slate-800">
                              Active Subscriptions ({activeSubscriptions.length})
                            </h3>
                          </div>
                          {!isActiveCollapsed && (
                            <>
                              {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader className="w-5 h-5 animate-spin text-amber-500 mr-2" />
                                  <p className="text-slate-600">Loading subscriptions...</p>
                                </div>
                              ) : activeSubscriptions.length === 0 ? (
                                <p className="text-slate-500 text-sm py-4">No active subscriptions found.</p>
                              ) : (
                                <div className="space-y-3">
                                  {activeSubscriptions.map(renderSubscriptionCard)}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Cancelled Subscriptions Section */}
                        <div>
                          <div 
                            className="flex items-center gap-2 cursor-pointer mb-2"
                            onClick={() => toggleSection(userId, 'cancelled')}
                          >
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 transition-transform duration-200',
                                !isCancelledCollapsed && 'rotate-180'
                              )}
                            />
                            <h3 className="text-lg font-semibold text-slate-800">
                              Cancelled Subscriptions ({cancelledSubscriptions.length})
                            </h3>
                          </div>
                          {!isCancelledCollapsed && (
                            <>
                              {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader className="w-5 h-5 animate-spin text-amber-500 mr-2" />
                                  <p className="text-slate-600">Loading subscriptions...</p>
                                </div>
                              ) : cancelledSubscriptions.length === 0 ? (
                                <p className="text-slate-500 text-sm py-4">No cancelled subscriptions found.</p>
                              ) : (
                                <div className="space-y-3">
                                  {cancelledSubscriptions.map(renderSubscriptionCard)}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Active Subscriptions Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Your Active Subscriptions
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
                    Start your precious metals investment journey today!
                  </p>
                </motion.div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {activeSubscriptions.map((subscription, index) => {
                    return (
                      <SubscriptionCard
                        key={subscription.id}
                        subscription={subscription}
                        index={index}
                        onSubscriptionUpdate={fetchDashboardData}
                        metalPrices={metalPrices}
                        isAdminView={false}
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
                  Cancelled Subscriptions
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {cancelledSubscriptions.map((subscription, index) => {
                    return (
                      <div key={subscription.id} className="opacity-75">
                        <SubscriptionCard
                          subscription={subscription}
                          index={index}
                          onSubscriptionUpdate={fetchDashboardData}
                          metalPrices={metalPrices}
                          isAdminView={false}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
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

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Shield, Calendar, Edit, Trash2, AlertTriangle, Clock, Target, Repeat, PiggyBank, Gem, User as UserIcon, Loader2, ArrowDownCircle, CreditCard } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { cancelSubscription } from '@/lib/api';
import { subscriptionApi, withdrawalRequestApi } from '@/lib/backendApi';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const GRAMS_PER_OUNCE = 31.1035;

const convertWeight = (weight = 0, fromUnit = 'g', toUnit = 'g') => {
  if (fromUnit === toUnit) return weight;
  if (fromUnit === 'oz' && toUnit === 'g') {
    return weight * GRAMS_PER_OUNCE;
  }
  if (fromUnit === 'g' && toUnit === 'oz') {
    return weight / GRAMS_PER_OUNCE;
  }
  return weight;
};

const normalizeMonthlyAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 10;
  return Math.min(Math.max(numeric, 10), 1000);
};

const SubscriptionCard = ({ subscription, index, onSubscriptionUpdate, metalPrices, isAdminView = false, userName }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    id, metal, plan_name, status, target_weight, target_unit, 
    accumulated_value, current_period_end, monthly_investment, accumulated_weight,
    quantity
  } = subscription;

  const isGold = metal === 'gold';
  const tradeUnit = isGold ? 'g' : 'oz';
  const storedUnit = target_unit || tradeUnit;
  const normalizedTargetWeight = convertWeight(target_weight || 0, storedUnit, tradeUnit);
  const normalizedAccumulatedWeight = convertWeight(accumulated_weight || 0, storedUnit, tradeUnit);
  const pricePerTradeUnit = metal === 'gold'
    ? Number(metalPrices?.gold ?? 0)
    : Number(metalPrices?.silver ?? 0);

  const [currentTargetPrice, setCurrentTargetPrice] = useState(0);
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetails, setCancelDetails] = useState('');
  const [cancelPreferredDate, setCancelPreferredDate] = useState('');
  const [isModifyDialogOpen, setIsModifyDialogOpen] = useState(false);
  const [modifyAmount, setModifyAmount] = useState('');
  const [isSubmittingModification, setIsSubmittingModification] = useState(false);
  const [modifyError, setModifyError] = useState('');
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  

  useEffect(() => {
    if (!metal || !metalPrices) {
      setCurrentTargetPrice(0);
      return;
    }

    const validPrice = Math.max(pricePerTradeUnit, 0);
    if (!validPrice) {
      setCurrentTargetPrice(0);
      return;
    }

    const premium = tradeUnit === 'g' ? 1.26 : 1.15;
    const basePrice = validPrice * normalizedTargetWeight;
    setCurrentTargetPrice(basePrice * premium);
  }, [metal, metalPrices, pricePerTradeUnit, tradeUnit, normalizedTargetWeight]);

  const displayPlanName = metal ? metal.charAt(0).toUpperCase() + metal.slice(1) + " Plan" : "Plan";
  const hasCancellationRequest = subscription?.cancellationRequestId;
  const hasWithdrawalRequest = subscription?.withdrawalRequestId;

  // Check if withdraw button should be shown
  const canWithdraw = (() => {
    if (hasCancellationRequest) return false;
    if (!['active', 'trialing'].includes(status)) return false;
    
    if (isGold) {
      // Gold: accumulated >= 1g OR >= target weight
      const minGoldGrams = 1;
      const accumulatedGrams = convertWeight(normalizedAccumulatedWeight, tradeUnit, 'g');
      const targetGrams = convertWeight(normalizedTargetWeight, tradeUnit, 'g');
      return accumulatedGrams >= minGoldGrams || accumulatedGrams >= targetGrams;
    } else {
      // Silver: accumulated >= 3.5 oz OR >= target weight
      const minSilverOz = 3.5;
      const accumulatedOz = convertWeight(normalizedAccumulatedWeight, tradeUnit, 'oz');
      const targetOz = convertWeight(normalizedTargetWeight, tradeUnit, 'oz');
      return accumulatedOz >= minSilverOz || accumulatedOz >= targetOz;
    }
  })();

  const initializeModifyState = () => {
    const currentAmount = Number(monthly_investment ?? subscription?.monthlyInvestment ?? 0);
    const normalizedAmount = normalizeMonthlyAmount(currentAmount || 10);
    setModifyAmount(normalizedAmount.toFixed(0));
    setModifyError('');
  };

  const handleModifyClick = () => {
    if (!canModifyPlan) {
      return;
    }
    initializeModifyState();
    setIsModifyDialogOpen(true);
  };

  const resetCancelForm = () => {
    setCancelReason('');
    setCancelDetails('');
    setCancelPreferredDate('');
  };

  const resetWithdrawForm = () => {
    setWithdrawNotes('');
    setWithdrawError('');
  };

  const handleWithdrawClick = () => {
    console.log('[DEBUG] Withdraw button clicked', {
      subscriptionId: id,
      canWithdraw,
      normalizedAccumulatedWeight,
      tradeUnit,
      formattedAccumulatedWeight,
      status,
      hasCancellationRequest,
      hasWithdrawalRequest,
    });

    if (!canWithdraw) {
      console.warn('[DEBUG] Cannot withdraw - requirements not met', {
        subscriptionId: id,
        status,
        hasCancellationRequest,
        normalizedAccumulatedWeight,
      });
      toast({
        title: 'Cannot Withdraw',
        description: 'You do not meet the minimum withdrawal requirements for this subscription.',
      });
      return;
    }
    console.log('[DEBUG] Opening withdrawal dialog', {
      subscriptionId: id,
      accumulatedWeight: normalizedAccumulatedWeight,
      tradeUnit,
      estimatedValue: normalizedAccumulatedWeight * pricePerTradeUnit,
    });
    setIsWithdrawDialogOpen(true);
  };

  const handleSubmitWithdrawal = async (event) => {
    event.preventDefault();

    console.log('[DEBUG] Submitting withdrawal request', {
      subscriptionId: id,
      normalizedAccumulatedWeight,
      tradeUnit,
      metal,
      pricePerTradeUnit,
      notes: withdrawNotes || null,
    });

    if (normalizedAccumulatedWeight <= 0) {
      console.error('[DEBUG] No accumulated weight available', {
        subscriptionId: id,
        normalizedAccumulatedWeight,
      });
      setWithdrawError('No accumulated weight available for withdrawal.');
      return;
    }

    try {
      setIsSubmittingWithdrawal(true);
      const pricePerUnit = pricePerTradeUnit;
      const estimatedValue = normalizedAccumulatedWeight * pricePerUnit;

      const withdrawalPayload = {
        subscriptionId: id,
        metal: metal,
        requestedWeight: normalizedAccumulatedWeight,
        requestedUnit: tradeUnit,
        estimatedValue: estimatedValue,
        notes: withdrawNotes || undefined,
      };

      console.log('[DEBUG] Calling withdrawalRequestApi.create with payload', withdrawalPayload);

      const { data, error } = await withdrawalRequestApi.create(withdrawalPayload);

      console.log('[DEBUG] Withdrawal API response', { data, error });

      if (error) {
        console.error('[DEBUG] Withdrawal API returned error', {
          error,
          subscriptionId: id,
          payload: withdrawalPayload,
        });
        throw new Error(error.message || 'Failed to submit withdrawal request.');
      }

      console.log('[DEBUG] Withdrawal request created successfully', {
        requestId: data?.request?._id || data?.request?.id,
        subscriptionId: id,
        status: data?.request?.status,
      });

      toast({
        title: 'Withdrawal Request Submitted',
        description: 'We received your withdrawal request and will process it soon.',
        variant: 'success',
      });
      resetWithdrawForm();
      setIsWithdrawDialogOpen(false);
      console.log('[DEBUG] Calling onSubscriptionUpdate callback');
      onSubscriptionUpdate?.();
    } catch (error) {
      console.error('[DEBUG] Error submitting withdrawal request', {
        error: error.message,
        stack: error.stack,
        subscriptionId: id,
      });
      toast({
        title: 'Withdrawal Failed',
        description: error.message || 'There was a problem submitting your withdrawal request.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingWithdrawal(false);
      console.log('[DEBUG] Withdrawal submission completed');
    }
  };

  const canCancel = ['active', 'trialing'].includes(status) && !hasWithdrawalRequest;
  const canModifyPlan = ['active', 'trialing'].includes(status) && !hasCancellationRequest && !hasWithdrawalRequest;

  const handleCancelClick = () => {
    if (!canCancel) {
      toast({
        title: 'Cannot Cancel',
        description: 'This plan is not active and cannot be canceled.',
      });
      return;
    }
    setIsCancelDialogOpen(true);
  };

  const handleModifySubmit = async (event) => {
    event.preventDefault();
    const parsedAmount = Number(modifyAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 10 || parsedAmount > 1000) {
      setModifyError('Enter an amount between $10 and $1000.');
      return;
    }

    try {
      setIsSubmittingModification(true);
      const { error } = await subscriptionApi.update(id, {
        monthlyInvestment: parsedAmount,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update subscription.');
      }

      toast({
        title: 'Plan Updated',
        description: 'Your new amount will apply starting with the next billing cycle.',
        variant: 'success',
      });
      setIsModifyDialogOpen(false);
      onSubscriptionUpdate?.();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Unable to modify this plan right now.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingModification(false);
    }
  };

  const handleSubmitCancellation = async (event) => {
    event.preventDefault();

    try {
      setIsSubmittingCancellation(true);
      await cancelSubscription(id, {
        reason: cancelReason || undefined,
        details: cancelDetails || undefined,
        preferredCancellationDate: cancelPreferredDate || undefined,
      });
      toast({
        title: 'Request Submitted',
        description: 'We received your cancellation request and will follow up soon.',
        variant: 'success',
      });
      resetCancelForm();
      setIsCancelDialogOpen(false);
      onSubscriptionUpdate();
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'There was a problem submitting your cancellation request.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  const statusMap = {
    active: { text: 'Active', color: 'bg-green-100 text-green-800' },
    trialing: { text: 'Trialing', color: 'bg-blue-100 text-blue-800' },
    pending: { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    pending_payment: { text: 'Pending Payment', color: 'bg-yellow-100 text-yellow-800' },
    canceling: { text: 'Canceling', color: 'bg-orange-100 text-orange-800' },
    canceled: { text: 'Canceled', color: 'bg-gray-100 text-gray-800' },
    incomplete: { text: 'Incomplete', color: 'bg-red-100 text-red-800' },
    incomplete_expired: { text: 'Expired', color: 'bg-red-100 text-red-800' },
    past_due: { text: 'Past Due', color: 'bg-red-100 text-red-800' },
    unpaid: { text: 'Unpaid', color: 'bg-red-100 text-red-800' },
  };
  const currentStatus = statusMap[status] || statusMap.canceled;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const totalMonthlyCharge = (monthly_investment || 0) * (quantity || 1);
  const progressPercentage = normalizedTargetWeight > 0 ? (normalizedAccumulatedWeight / normalizedTargetWeight) * 100 : 0;

  const currentValue = normalizedAccumulatedWeight * Math.max(pricePerTradeUnit, 0);
  const formattedTargetWeight =
    tradeUnit === 'g'
      ? normalizedTargetWeight.toFixed(2)
      : normalizedTargetWeight.toFixed(4);
  const formattedAccumulatedWeight =
    tradeUnit === 'g'
      ? normalizedAccumulatedWeight.toFixed(2)
      : normalizedAccumulatedWeight.toFixed(4);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-6 rounded-xl shadow-md border-2 flex flex-col ${isGold ? 'bg-amber-50 border-amber-200' : 'bg-slate-100 border-slate-300'}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className={`text-xl font-bold ${isGold ? 'text-amber-900' : 'text-slate-800'}`}>
            {displayPlanName}
          </h3>
          {isAdminView && (
            <p className="flex items-center text-sm text-slate-500 mt-1">
              <UserIcon className="w-4 h-4 mr-2" />
              <span className="font-medium text-slate-700">{userName || 'Unknown User'}</span>
            </p>
          )}
          <p className={`font-semibold text-lg ${isGold ? 'text-amber-700' : 'text-slate-600'}`}>
            ${totalMonthlyCharge.toFixed(2)} USD / Month
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${currentStatus.color}`}>
          {currentStatus.text}
        </span>
      </div>

      <div className="mt-6 space-y-4 text-sm flex-grow">
        <InfoRow icon={Target} label="Targeted Weight" value={`${formattedTargetWeight}${tradeUnit}`} isGold={isGold} />
        <InfoRow icon={Gem} label="Current Value" value={`$${currentValue.toFixed(2)}`} isGold={isGold} />
        <InfoRow icon={PiggyBank} label="Total Invested" value={`$${(accumulated_value || 0).toFixed(2)}`} isGold={isGold} />
        <InfoRow icon={Shield} label="Total Accumulated" value={`${formattedAccumulatedWeight}${tradeUnit}`} isGold={isGold} />
        
        {status !== 'canceled' && (
          <div className="pt-2">
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div 
                      className={`h-2.5 rounded-full ${isGold ? 'bg-amber-500' : 'bg-slate-600'}`} 
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  ></div>
              </div>
              <p className="text-xs text-right mt-1 text-slate-500">
                  {Math.floor(progressPercentage)}% of target weight accumulated
              </p>
          </div>
        )}

        {['active', 'trialing', 'canceling'].includes(status) && current_period_end && (
          <InfoRow icon={Clock} label="Next Payment" value={formatDate(current_period_end)} isGold={isGold} />
        )}
      </div>
      
      {status === 'canceling' && (
        <div className="mt-4 p-3 bg-orange-100 text-orange-800 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Cancels on {formatDate(current_period_end)}.</span>
        </div>
      )}

      {/* Hide action buttons if subscription is cancelled */}
      {status !== 'canceled' && (
        <>
          <div className="mt-6 pt-4 border-t border-dashed border-slate-300 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:flex-1"
              onClick={handleModifyClick}
              disabled={!canModifyPlan || isSubmittingModification}
            >
                {isSubmittingModification ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Edit className="w-4 h-4 mr-2" />
                )}
                Modify
            </Button> 
            {hasCancellationRequest ? (
              <Button variant="destructive" size="sm" className="w-full sm:flex-1" disabled>
                <Clock className="w-4 h-4 mr-2" />
                Cancel Pending
              </Button>
            ) : hasWithdrawalRequest ? (
              <Button variant="destructive" size="sm" className="w-full sm:flex-1" disabled>
                {/* <Clock className="w-4 h-4 mr-2" /> */}
                Cancel
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                className="w-full sm:flex-1"
                onClick={handleCancelClick}
                disabled={isSubmittingCancellation || !canCancel}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>

          {canWithdraw && !hasWithdrawalRequest && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleWithdrawClick}
                disabled={isSubmittingWithdrawal}
              >
                {isSubmittingWithdrawal ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                )}
                Withdraw
              </Button>
            </div>
          )}

          {hasWithdrawalRequest && (
            <div className="mt-3">
              <Button variant="outline" size="sm" className="w-full" disabled>
                <Clock className="w-4 h-4 mr-2" />
                Withdrawal Pending
              </Button>
            </div>
          )}
        </>
      )}

      {/* View Payments button - always visible if subscription has Stripe ID */}
      {(subscription.stripeSubscriptionId || subscription.stripe_subscription_id) && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
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
          >
            <CreditCard className="w-4 h-4 mr-2" />
            View Payments
          </Button>
        </div>
      )}

      <Dialog
        open={isCancelDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isSubmittingCancellation) {
            resetCancelForm();
          }
          setIsCancelDialogOpen(open);
        }}
      >
        <DialogContent>
          <form onSubmit={handleSubmitCancellation} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Submit Cancellation Request</DialogTitle>
              <DialogDescription>
                Tell us why you&apos;re canceling so the team can review your request.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Reason
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="e.g. Switching plans"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Details
              </label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Share more context for our support team"
                rows={4}
                value={cancelDetails}
                onChange={(e) => setCancelDetails(e.target.value)}
                maxLength={1000}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Preferred Cancellation Date
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={cancelPreferredDate}
                onChange={(e) => setCancelPreferredDate(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!isSubmittingCancellation) {
                    setIsCancelDialogOpen(false);
                  }
                }}
                disabled={isSubmittingCancellation}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmittingCancellation}
              >
                {isSubmittingCancellation && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isModifyDialogOpen}
        onOpenChange={(open) => {
          if (!open && isSubmittingModification) {
            return;
          }
          if (open) {
            initializeModifyState();
          }
          setIsModifyDialogOpen(open);
        }}
      >
        <DialogContent>
          <form onSubmit={handleModifySubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Modify Monthly Investment</DialogTitle>
              <DialogDescription>
                Updates take effect on your next billing cycle without immediate charges.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                New Monthly Amount (USD)
              </label>
              <Input
                type="number"
                step="1"
                min="10"
                max="1000"
                value={modifyAmount}
                onChange={(event) => {
                  setModifyAmount(event.target.value);
                  setModifyError('');
                }}
                disabled={isSubmittingModification}
                required
              />
              {modifyError && (
                <p className="text-xs text-red-600">{modifyError}</p>
              )}
              <p className="text-xs text-slate-500">
                Enter between $10 and $1000. The change applies to your next scheduled payment.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModifyDialogOpen(false)}
                disabled={isSubmittingModification}
              >
                Close
              </Button>
              <Button type="submit" disabled={isSubmittingModification}>
                {isSubmittingModification && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isWithdrawDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isSubmittingWithdrawal) {
            resetWithdrawForm();
          }
          setIsWithdrawDialogOpen(open);
        }}
      >
        <DialogContent>
          <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Confirm Withdrawal Request</DialogTitle>
              <DialogDescription>
                You are about to withdraw all accumulated {metal} from this subscription.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Total Weight to Withdraw:</span>
                <span className="text-sm font-bold text-slate-900">{formattedAccumulatedWeight} {tradeUnit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Estimated Value:</span>
                <span className="text-sm font-bold text-slate-900">
                  ${(normalizedAccumulatedWeight * pricePerTradeUnit).toFixed(2)} USD
                </span>
              </div>
            </div>

            {withdrawError && (
              <p className="text-xs text-red-600">{withdrawError}</p>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Notes (Optional)
              </label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Add any additional notes for the withdrawal request"
                rows={3}
                value={withdrawNotes}
                onChange={(e) => setWithdrawNotes(e.target.value)}
                maxLength={500}
                disabled={isSubmittingWithdrawal}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!isSubmittingWithdrawal) {
                    setIsWithdrawDialogOpen(false);
                  }
                }}
                disabled={isSubmittingWithdrawal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={isSubmittingWithdrawal}
              >
                {isSubmittingWithdrawal && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Confirm Withdrawal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

const InfoRow = ({ icon: Icon, label, value, isGold }) => (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
            <Icon className={`w-4 h-4 mr-3 ${isGold ? 'text-amber-600' : 'text-slate-500'}`} />
            <span className="text-slate-600">{label}</span>
        </div>
        <strong className="font-bold text-slate-800 text-left sm:text-right">{value}</strong>
    </div>
);

export default SubscriptionCard;
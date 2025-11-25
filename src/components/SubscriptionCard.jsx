import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Shield, Calendar, Edit, Trash2, AlertTriangle, Clock, Target, Repeat, PiggyBank, Gem, User as UserIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { cancelSubscription } from '@/lib/api';
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

const SubscriptionCard = ({ subscription, index, onSubscriptionUpdate, metalPrices, isAdminView = false, userName }) => {
  const { toast } = useToast();
  const { 
    id, metal, plan_name, status, target_weight, target_unit, 
    accumulated_value, current_period_end, monthly_investment, accumulated_weight,
    quantity
  } = subscription;

  const [currentTargetPrice, setCurrentTargetPrice] = useState(0);
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetails, setCancelDetails] = useState('');
  const [cancelPreferredDate, setCancelPreferredDate] = useState('');

  const isGold = metal === 'gold';
  const tradeUnit = isGold ? 'g' : 'oz';
  const storedUnit = target_unit || tradeUnit;
  const normalizedTargetWeight = convertWeight(target_weight || 0, storedUnit, tradeUnit);
  const normalizedAccumulatedWeight = convertWeight(accumulated_weight || 0, storedUnit, tradeUnit);
  const pricePerTradeUnit = metal === 'gold'
    ? Number(metalPrices?.gold ?? 0)
    : Number(metalPrices?.silver ?? 0);

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

  const handleNotImplemented = () => {
    toast({
      title: '🚧 Feature in progress!',
      description: "Modifying plans will be available soon.",
    });
  };

  const resetCancelForm = () => {
    setCancelReason('');
    setCancelDetails('');
    setCancelPreferredDate('');
  };

  const canCancel = ['active', 'trialing'].includes(status);

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
  const progressPercentage = currentTargetPrice > 0 ? (accumulated_value / currentTargetPrice) * 100 : 0;

  const currentValue = normalizedAccumulatedWeight * Math.max(pricePerTradeUnit, 0);
  const formattedTargetWeight =
    tradeUnit === 'g'
      ? normalizedTargetWeight.toFixed(2)
      : normalizedTargetWeight.toFixed(4);
  const formattedAccumulatedWeight =
    tradeUnit === 'g'
      ? normalizedAccumulatedWeight.toFixed(2)
      : normalizedAccumulatedWeight.toFixed(4);

  const hasCancellationRequest = subscription?.cancellationRequestId;

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
        
        <div className="pt-2">
            <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div 
                    className={`h-2.5 rounded-full ${isGold ? 'bg-amber-500' : 'bg-slate-600'}`} 
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                ></div>
            </div>
            <p className="text-xs text-right mt-1 text-slate-500">
                {Math.floor(progressPercentage)}% to next accumulation
            </p>
        </div>

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

      <div className="mt-6 pt-4 border-t border-dashed border-slate-300 flex space-x-2">
        <Button variant="outline" size="sm" className="w-full" onClick={handleNotImplemented} disabled={status !== 'active' || hasCancellationRequest}>
            <Edit className="w-4 h-4 mr-2" />
            Modify
        </Button> 
        {hasCancellationRequest ? (
          <Button variant="destructive" size="sm" className="w-full" disabled>
            <Clock className="w-4 h-4 mr-2" />
            Cancel Pending
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleCancelClick}
            disabled={isSubmittingCancellation || !canCancel}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>

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
    </motion.div>
  );
};

const InfoRow = ({ icon: Icon, label, value, isGold }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center">
            <Icon className={`w-4 h-4 mr-3 ${isGold ? 'text-amber-600' : 'text-slate-500'}`} />
            <span className="text-slate-600">{label}</span>
        </div>
        <strong className="font-bold text-slate-800">{value}</strong>
    </div>
);

export default SubscriptionCard;
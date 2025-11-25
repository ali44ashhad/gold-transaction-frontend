import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Shield, Calendar, Edit, Trash2, AlertTriangle, Clock, Target, Repeat, PiggyBank, Gem, User as UserIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { cancelSubscription } from '@/lib/api';

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

  useEffect(() => {
    if (!metalPrices || !metal) return;

    const tradeUnit = metal === 'gold' ? 'g' : 'oz';
    const storedUnit = target_unit || tradeUnit;
    const normalizedTargetWeight = convertWeight(target_weight || 0, storedUnit, tradeUnit);

    const priceFromApi = metal === 'gold' ? Number(metalPrices.gold ?? 0) : Number(metalPrices.silver ?? 0);
    if (!priceFromApi) {
        setCurrentTargetPrice(0);
        return;
    }

    const pricePerTradeUnit = Math.max(priceFromApi, 0);
    const premium = tradeUnit === 'g' ? 1.26 : 1.15;
    const basePrice = pricePerTradeUnit * normalizedTargetWeight;
    setCurrentTargetPrice(basePrice * premium);
  }, [metalPrices, metal, target_weight, target_unit]);

  const isGold = metal === 'gold';
  const displayPlanName = metal ? metal.charAt(0).toUpperCase() + metal.slice(1) + " Plan" : "Plan";

  const handleNotImplemented = () => {
    toast({
      title: '🚧 Feature in progress!',
      description: "Modifying plans will be available soon.",
    });
  };

  const handleCancel = async () => {
    if (!['active', 'trialing'].includes(status)) {
        toast({ title: 'Cannot Cancel', description: 'This plan is not active and cannot be canceled.' });
        return;
    }
    
    try {
        await cancelSubscription(id);
        toast({
            title: 'Cancellation Pending',
            description: 'Your plan will be canceled at the end of the current billing period.',
            variant: 'success',
        });
        onSubscriptionUpdate();
    } catch (error) {
        toast({
            title: 'Cancellation Failed',
            description: error.message || 'There was a problem canceling your subscription.',
            variant: 'destructive',
        });
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

  const tradeUnit = isGold ? 'g' : 'oz';
  const storedUnit = target_unit || tradeUnit;
  const normalizedTargetWeight = convertWeight(target_weight || 0, storedUnit, tradeUnit);
  const normalizedAccumulatedWeight = convertWeight(accumulated_weight || 0, storedUnit, tradeUnit);
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
        <InfoRow icon={Gem} label="Targeted Price" value={`$${currentTargetPrice.toFixed(2)}`} isGold={isGold} />
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
        <Button variant="outline" size="sm" className="w-full" onClick={handleNotImplemented} disabled={status !== 'active'}>
            <Edit className="w-4 h-4 mr-2" />
            Modify
        </Button>
        <Button variant="destructive" size="sm" className="w-full" onClick={handleCancel} disabled={!['active', 'trialing'].includes(status)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Cancel
        </Button>
      </div>
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
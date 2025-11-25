
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { createCheckoutSession } from '@/lib/api';
import { persistCheckoutContext } from '@/lib/utils';
import { Loader } from 'lucide-react';

const INVESTMENT_MIN = 10;
const INVESTMENT_MAX = 1000;
const INVESTMENT_STEP = 1;

const SubscriptionModal = ({ isOpen, onOpenChange, plan, prices, onSubscriptionUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [investmentAmount, setInvestmentAmount] = useState(50);
  const [investmentInputValue, setInvestmentInputValue] = useState('50');
  const [targetWeight, setTargetWeight] = useState(1);
  const derivedUnit = plan?.metal === 'silver' ? 'oz' : 'g';
  const [targetUnit, setTargetUnit] = useState(derivedUnit);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const metalPriceFromApi = plan?.metal === 'gold' ? Number(prices?.gold ?? 0) : Number(prices?.silver ?? 0);
  const metalPricePerUnit = Math.max(metalPriceFromApi, 0);

  const resetState = useCallback(() => {
    setInvestmentAmount(50);
    setInvestmentInputValue('50');
    setTargetWeight(1);
    setTargetUnit(derivedUnit);
    setIsCreatingSession(false);
    setStatusMessage('');
  }, [derivedUnit]);

  useEffect(() => {
    setTargetUnit(derivedUnit);
  }, [derivedUnit]);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handleSliderChange = useCallback((value) => {
    const nextValue = value[0];
    setInvestmentAmount(nextValue);
    setInvestmentInputValue(String(nextValue));
  }, []);

  const handleInvestmentInputChange = useCallback((event) => {
    const { value } = event.target;
    setInvestmentInputValue(value);

    if (value === '') {
      return;
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return;
    }

    if (numericValue < INVESTMENT_MIN || numericValue > INVESTMENT_MAX) {
      return;
    }

    setInvestmentAmount(numericValue);
  }, []);

  const handleInvestmentInputBlur = useCallback(() => {
    if (investmentInputValue === '') {
      setInvestmentAmount(INVESTMENT_MIN);
      setInvestmentInputValue(String(INVESTMENT_MIN));
      return;
    }

    const numericValue = Number(investmentInputValue);
    if (Number.isNaN(numericValue)) {
      setInvestmentInputValue(String(investmentAmount));
      return;
    }

    const clampedValue = Math.min(Math.max(numericValue, INVESTMENT_MIN), INVESTMENT_MAX);
    setInvestmentAmount(clampedValue);
    setInvestmentInputValue(String(clampedValue));
  }, [investmentAmount, investmentInputValue]);

  const handleCreateSession = useCallback(async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a subscription.", variant: "destructive" });
      return;
    }

    setIsCreatingSession(true);
    setStatusMessage('');
    try {
      const pricePerUnit = metalPricePerUnit;
      const estimatedTargetPrice =
        pricePerUnit > 0 ? Number((pricePerUnit * targetWeight).toFixed(2)) : undefined;

      const payload = {
        amount: investmentAmount,
        currency: 'usd',
        mode: 'subscription',
        productName: plan?.name || 'PharaohVault Subscription',
        description: `Monthly ${plan?.metal || 'metal'} accumulation plan`,
        interval: 'month',
        intervalCount: 1,
        quantity: 1,
        customerEmail: user.email,
        metadata: {
          plan: plan?.name,
          metal: plan?.metal,
          targetWeight,
          targetUnit,
          initiatedBy: user.email,
        },
        subscriptionDetails: {
          planName: plan?.name || `${plan?.metal ? plan.metal.charAt(0).toUpperCase() + plan.metal.slice(1) : 'Metal'} Plan`,
          metal: plan?.metal || 'gold',
          targetWeight,
          targetUnit,
          monthlyInvestment: investmentAmount,
          quantity: 1,
          targetPrice: estimatedTargetPrice,
        },
      };

      const session = await createCheckoutSession(payload);
      persistCheckoutContext({
        orderId: session.orderId,
        sessionId: session.sessionId,
        plan: plan?.name,
        amount: investmentAmount,
        metal: plan?.metal,
      });

      setStatusMessage('Redirecting you to our secure Stripe checkout...');
      setTimeout(() => {
        window.location.assign(session.url);
      }, 600);
    } catch (error) {
      console.error('[Frontend] Error creating checkout session:', error);
      toast({
        title: "Payment Session Error",
        description: error.message || "Could not create a payment session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingSession(false);
    }
  }, [user, targetWeight, targetUnit, plan, investmentAmount, toast, metalPricePerUnit]);

  const handleModalChange = (open) => {
    if (!open && onSubscriptionUpdate) {
      onSubscriptionUpdate();
    }
    onOpenChange(open);
  };

  const estimatedMonths = metalPricePerUnit > 0 && investmentAmount > 0
    ? Math.ceil((metalPricePerUnit * targetWeight) / investmentAmount)
    : 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={handleModalChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize Your {plan?.name}</DialogTitle>
          <DialogDescription>
            Set your monthly investment and target. You can update these details later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="investment-amount">Monthly Investment: ${investmentAmount}</Label>
            <p className="text-xs text-slate-500">
              Enter an amount between ${INVESTMENT_MIN} and ${INVESTMENT_MAX}.
            </p>
            <div className="flex items-center gap-4">
              <Slider
                id="investment-amount"
                min={INVESTMENT_MIN}
                max={INVESTMENT_MAX}
                step={INVESTMENT_STEP}
                value={[investmentAmount]}
                onValueChange={handleSliderChange}
                className="flex-1"
              />
              <div className="relative w-28">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                <Input
                  type="number"
                  min={INVESTMENT_MIN}
                  max={INVESTMENT_MAX}
                  step={INVESTMENT_STEP}
                  value={investmentInputValue}
                  onChange={handleInvestmentInputChange}
                  onBlur={handleInvestmentInputBlur}
                  className="pl-6"
                  aria-label="Monthly investment amount input"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="col-span-2 grid gap-2">
              <Label htmlFor="target-weight">Target Weight</Label>
              <Input
                id="target-weight"
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(Number(e.target.value))}
                min="1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target-unit">Unit</Label>
              <Input
                id="target-unit"
                value={targetUnit === 'g' ? 'Grams (g)' : 'Ounces (oz)'}
                readOnly
              />
            </div>
          </div>
          <div className="text-sm text-slate-600 bg-slate-100 p-3 rounded-md">
            Based on the current price of ~${metalPricePerUnit.toFixed(2)}/{targetUnit}, it will take an estimated <span className="font-bold">{estimatedMonths} months</span> to reach your goal.
          </div>
        </div>
        <DialogFooter className="flex flex-col items-stretch gap-2">
          <Button
            type="button"
            onClick={handleCreateSession}
            disabled={isCreatingSession}
          >
            {isCreatingSession && <Loader className="w-4 h-4 mr-2 animate-spin" />}
            {isCreatingSession ? 'Creating Session...' : 'Continue to Payment'}
          </Button>
          {statusMessage && (
            <p className="text-sm text-center text-slate-500">{statusMessage}</p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;

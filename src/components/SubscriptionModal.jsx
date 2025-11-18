
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { createCheckoutSession } from '@/lib/api';
import { persistCheckoutContext } from '@/lib/utils';
import { Loader } from 'lucide-react';

const GRAMS_PER_OUNCE = 31.1035;

const SubscriptionModal = ({ isOpen, onOpenChange, plan, prices, onSubscriptionUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [investmentAmount, setInvestmentAmount] = useState(50);
  const [targetWeight, setTargetWeight] = useState(1);
  const [targetUnit, setTargetUnit] = useState('oz');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const metalPrice = plan?.metal === 'gold' ? prices.gold : prices.silver;

  const resetState = useCallback(() => {
    setInvestmentAmount(50);
    setTargetWeight(1);
    setTargetUnit('oz');
    setIsCreatingSession(false);
    setStatusMessage('');
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handleCreateSession = useCallback(async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a subscription.", variant: "destructive" });
      return;
    }

    setIsCreatingSession(true);
    setStatusMessage('');
    try {
      const pricePerUnit =
        targetUnit === 'oz'
          ? metalPrice
          : metalPrice > 0
          ? metalPrice / GRAMS_PER_OUNCE
          : 0;
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
  }, [user, targetWeight, targetUnit, plan, investmentAmount, toast]);

  const handleModalChange = (open) => {
    if (!open && onSubscriptionUpdate) {
      onSubscriptionUpdate();
    }
    onOpenChange(open);
  };

  const estimatedMonths = metalPrice > 0 && investmentAmount > 0
    ? Math.ceil((metalPrice * targetWeight) / investmentAmount)
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
            <Slider
              id="investment-amount"
              min={10}
              max={1000}
              step={5}
              value={[investmentAmount]}
              onValueChange={(value) => setInvestmentAmount(value[0])}
            />
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
              <Select value={targetUnit} onValueChange={setTargetUnit}>
                <SelectTrigger id="target-unit">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oz">Ounces (oz)</SelectItem>
                  <SelectItem value="g">Grams (g)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm text-slate-600 bg-slate-100 p-3 rounded-md">
            Based on the current price of ~${metalPrice.toFixed(2)}/oz, it will take an estimated <span className="font-bold">{estimatedMonths} months</span> to reach your goal.
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

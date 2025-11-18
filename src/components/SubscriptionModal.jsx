
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import CheckoutWrapper from '@/components/CheckoutWrapper';
import { createCheckoutSession, getStripePublishableKey } from '@/lib/api';
import { Loader } from 'lucide-react';

const SubscriptionModal = ({ isOpen, onOpenChange, plan, prices, onSubscriptionUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [investmentAmount, setInvestmentAmount] = useState(50);
  const [targetWeight, setTargetWeight] = useState(1);
  const [targetUnit, setTargetUnit] = useState('oz');
  const [clientSecret, setClientSecret] = useState(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [publishableKey, setPublishableKey] = useState(null);
  const [isFetchingKey, setIsFetchingKey] = useState(false);

  const metalPrice = plan?.metal === 'gold' ? prices.gold : prices.silver;

  const fetchKey = useCallback(async () => {
    if (publishableKey) return;
    setIsFetchingKey(true);
    try {
      const key = await getStripePublishableKey();
      setPublishableKey(key);
    } catch (error) {
      toast({
        title: "Payment Initialization Failed",
        description: error.message || "Could not connect to our payment provider. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingKey(false);
    }
  }, [publishableKey, toast]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep(1);
      setClientSecret(null);
      setInvestmentAmount(50);
      setTargetWeight(1);
      setTargetUnit('oz');
      setIsCreatingSession(false);
      fetchKey();
    }
  }, [isOpen, fetchKey]);

  const handleCreateSession = useCallback(async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a subscription.", variant: "destructive" });
      return;
    }

    setIsCreatingSession(true);
    setClientSecret(null); // Reset previous secret
    try {
      const payload = {
        userId: user.id,
        userEmail: user.email,
        targetWeight,
        targetUnit,
        metal: plan.metal,
        investmentAmount,
      };
      
      console.log("[Frontend] Sending to create-checkout-session:", payload);
      const secret = await createCheckoutSession(payload); // Expects a clientSecret string now
      
      console.log("[Frontend] Received clientSecret:", secret);
      setClientSecret(secret);
      setStep(2);

    } catch (error) {
      console.error("[Frontend] Error creating checkout session:", error);
      toast({
        title: "Payment Session Error",
        description: error.message || "Could not create a payment session. Please try again.",
        variant: "destructive",
      });
      // Stay on step 1 if session creation fails
      setStep(1);
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
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Customize Your {plan?.name}</DialogTitle>
              <DialogDescription>
                Set your monthly investment and target. You can change this anytime.
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
            <DialogFooter>
              <Button
                type="button"
                onClick={handleCreateSession}
                disabled={isCreatingSession || isFetchingKey || !publishableKey}
              >
                {isCreatingSession ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isCreatingSession ? 'Creating Session...' : 'Continue to Payment'}
              </Button>
            </DialogFooter>
          </>
        )}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Complete Your Payment</DialogTitle>
              <DialogDescription>
                Securely enter your payment details below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 min-h-[300px]">
              <CheckoutWrapper 
                clientSecret={clientSecret} 
                publishableKey={publishableKey}
                onRetry={handleCreateSession}
                isRetrying={isCreatingSession}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;

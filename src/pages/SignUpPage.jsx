import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { states } from '@/lib/states';
import { Sparkles, UserPlus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';


const SignUpPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    billingStreet: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    shippingStreet: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
  });
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmailExistsDialog, setShowEmailExistsDialog] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  const handleCheckboxChange = (checked) => {
    setSameAsBilling(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        shippingStreet: prev.billingStreet,
        shippingCity: prev.billingCity,
        shippingState: prev.billingState,
        shippingZip: prev.billingZip,
      }));
    } else {
        setFormData((prev) => ({
        ...prev,
        shippingStreet: '',
        shippingCity: '',
        shippingState: '',
        shippingZip: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(formData.email, formData.password, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      billingAddress: {
        street: formData.billingStreet,
        city: formData.billingCity,
        state: formData.billingState,
        zip: formData.billingZip,
      },
      shippingAddress: {
        street: formData.shippingStreet,
        city: formData.shippingCity,
        state: formData.shippingState,
        zip: formData.shippingZip,
      },
    });
    
    setLoading(false);
    if (error) {
        if (error.message.includes('User already registered')) {
            setShowEmailExistsDialog(true);
        }
        // The useAuth hook handles the general error toast
    } else {
      // Redirect to login page after successful signup
      navigate('/login', { 
        state: { 
          message: 'Account created successfully! Please login to continue.',
          email: formData.email 
        } 
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign Up - PharaohVault</title>
        <meta name="description" content="Create an account with PharaohVault to start your precious metal investment journey." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-slate-50 p-4"
      >
        <div className="w-full max-w-4xl my-8">
          <div className="bg-slate-50/80 p-8 md:p-12 rounded-2xl shadow-2xl border border-slate-200 backdrop-blur-sm">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center justify-center space-x-2 mb-4">
                <Sparkles className="w-10 h-10 text-amber-500" />
                <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
                  PharaohVault
                </span>
              </Link>
              <h1 className="text-3xl font-bold text-slate-900">Create Your Account</h1>
              <p className="text-slate-600 mt-2">Join PharaohVault and start investing today.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <InputGroup>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange} required className="border-slate-300"/>
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange} required className="border-slate-300"/>
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className="border-slate-300"/>
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required className="border-slate-300"/>
                </InputGroup>
                <InputGroup className="md:col-span-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className="border-slate-300"/>
                </InputGroup>
              </div>

              <Fieldset legend="Billing Address">
                <InputGroup className="col-span-2">
                  <Label htmlFor="billingStreet">Street Address</Label>
                  <Input id="billingStreet" name="billingStreet" value={formData.billingStreet} onChange={handleChange} required className="border-slate-300"/>
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="billingCity">City</Label>
                  <Input id="billingCity" name="billingCity" value={formData.billingCity} onChange={handleChange} required className="border-slate-300"/>
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="billingState">State</Label>
                    <Select name="billingState" onValueChange={(value) => handleSelectChange('billingState', value)} value={formData.billingState}>
                        <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select State" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                            {states.map(state => <SelectItem key={state.abbreviation} value={state.abbreviation}>{state.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="billingZip">Zip Code</Label>
                  <Input id="billingZip" name="billingZip" value={formData.billingZip} onChange={handleChange} required className="border-slate-300"/>
                </InputGroup>
              </Fieldset>
              
              <div className="flex items-center space-x-2">
                  <Checkbox id="sameAsBilling" onCheckedChange={handleCheckboxChange} checked={sameAsBilling}/>
                  <Label htmlFor="sameAsBilling" className="text-sm font-medium leading-none">Shipping address is the same as my billing address</Label>
              </div>

              <Fieldset legend="Shipping Address">
                <InputGroup className="col-span-2">
                  <Label htmlFor="shippingStreet">Street Address</Label>
                  <Input id="shippingStreet" name="shippingStreet" value={formData.shippingStreet} onChange={handleChange} required disabled={sameAsBilling} className="border-slate-300"/>
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="shippingCity">City</Label>
                  <Input id="shippingCity" name="shippingCity" value={formData.shippingCity} onChange={handleChange} required disabled={sameAsBilling} className="border-slate-300"/>
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="shippingState">State</Label>
                  <Select name="shippingState" onValueChange={(value) => handleSelectChange('shippingState', value)} value={formData.shippingState} disabled={sameAsBilling}>
                        <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select State" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                            {states.map(state => <SelectItem key={state.abbreviation} value={state.abbreviation}>{state.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="shippingZip">Zip Code</Label>
                  <Input id="shippingZip" name="shippingZip" value={formData.shippingZip} onChange={handleChange} required disabled={sameAsBilling} className="border-slate-300"/>
                </InputGroup>
              </Fieldset>

              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-lg py-6">
                <UserPlus className="w-5 h-5 mr-2" />
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center mt-6 text-sm">
              <p className="text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-amber-600 hover:underline">
                  Log In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
      <AlertDialog open={showEmailExistsDialog} onOpenChange={setShowEmailExistsDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Email Already Registered</AlertDialogTitle>
            <AlertDialogDescription>
                The email address you entered is already associated with an account. Would you like to log in or reset your password?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/login')}>Go to Login</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const InputGroup = ({ children, className }) => <div className={`space-y-2 ${className}`}>{children}</div>
const Fieldset = ({ legend, children }) => (
    <fieldset className="border-t border-slate-200 pt-6">
        <legend className="text-lg font-semibold text-slate-800 mb-4">{legend}</legend>
        <div className="grid md:grid-cols-3 gap-6">{children}</div>
    </fieldset>
);


export default SignUpPage;
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { userApi } from '@/lib/backendApi';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { states } from '@/lib/states';
import { User, Shield, Users } from 'lucide-react';

const AccountPage = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const { role } = useAuth();

  useEffect(() => {
    setIsAdmin(role === 'admin');
    setLoading(false);
  }, [role]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold">Loading Account Details...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Account Management - PharaohVault</title>
        <meta name="description" content="Manage your account details and settings." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Account Management</h1>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {isAdmin ? <AdminUserManagement /> : <UserProfileForm />}
          </div>
          <div className="lg:col-span-1">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg flex items-center"><Shield className="w-5 h-5 mr-2 text-amber-600"/> Security</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">Email: {user.email}</p>
                <p className="text-xs text-slate-500">Your email is your unique identifier and cannot be changed.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

const UserProfileForm = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '',
        billingStreet: '', billingCity: '', billingState: '', billingZip: '',
        shippingStreet: '', shippingCity: '', shippingState: '', shippingZip: '',
    });

    useEffect(() => {
        if (user?.user_metadata) {
            setFormData({
                firstName: user.user_metadata.first_name || '',
                lastName: user.user_metadata.last_name || '',
                phone: user.user_metadata.phone || '',
                billingStreet: user.user_metadata.billing_address?.street || '',
                billingCity: user.user_metadata.billing_address?.city || '',
                billingState: user.user_metadata.billing_address?.state || '',
                billingZip: user.user_metadata.billing_address?.zip || '',
                shippingStreet: user.user_metadata.shipping_address?.street || '',
                shippingCity: user.user_metadata.shipping_address?.city || '',
                shippingState: user.user_metadata.shipping_address?.state || '',
                shippingZip: user.user_metadata.shipping_address?.zip || '',
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    
    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    const { refreshAuth } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await userApi.updateProfile({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            billingAddress: { 
                street: formData.billingStreet, 
                city: formData.billingCity, 
                state: formData.billingState, 
                zip: formData.billingZip 
            },
            shippingAddress: { 
                street: formData.shippingStreet, 
                city: formData.shippingCity, 
                state: formData.shippingState, 
                zip: formData.shippingZip 
            },
        });
        if (error) {
            toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Profile Updated!', description: 'Your information has been saved.' });
            await refreshAuth(); // Refresh user data
        }
        setLoading(false);
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h2 className="font-bold text-xl flex items-center mb-6"><User className="w-5 h-5 mr-2 text-amber-600"/> Your Profile</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-4">
                    <div><Label htmlFor="firstName">First Name</Label><Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className="border-slate-400" /></div>
                    <div><Label htmlFor="lastName">Last Name</Label><Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className="border-slate-400" /></div>
                    <div className="md:col-span-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="border-slate-400" /></div>
                </div>
                <Fieldset legend="Billing Address">
                    <div className="col-span-2"><Label>Street</Label><Input name="billingStreet" value={formData.billingStreet} onChange={handleChange} className="border-slate-400" /></div>
                    <div><Label>City</Label><Input name="billingCity" value={formData.billingCity} onChange={handleChange} className="border-slate-400" /></div>
                    <div><Label>State</Label><Select name="billingState" onValueChange={(v) => handleSelectChange('billingState', v)} value={formData.billingState}><SelectTrigger className="border-slate-400"><SelectValue/></SelectTrigger><SelectContent>{states.map(s => <SelectItem key={s.abbreviation} value={s.abbreviation}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Zip</Label><Input name="billingZip" value={formData.billingZip} onChange={handleChange} className="border-slate-400" /></div>
                </Fieldset>
                <Fieldset legend="Shipping Address">
                    <div className="col-span-2"><Label>Street</Label><Input name="shippingStreet" value={formData.shippingStreet} onChange={handleChange} className="border-slate-400" /></div>
                    <div><Label>City</Label><Input name="shippingCity" value={formData.shippingCity} onChange={handleChange} className="border-slate-400" /></div>
                    <div><Label>State</Label><Select name="shippingState" onValueChange={(v) => handleSelectChange('shippingState', v)} value={formData.shippingState}><SelectTrigger className="border-slate-400"><SelectValue/></SelectTrigger><SelectContent>{states.map(s => <SelectItem key={s.abbreviation} value={s.abbreviation}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Zip</Label><Input name="shippingZip" value={formData.shippingZip} onChange={handleChange} className="border-slate-400" /></div>
                </Fieldset>
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
            </form>
        </div>
    );
};

const AdminUserManagement = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const { data, error } = await userApi.listUsers();
        if (error) {
            toast({ title: 'Error Fetching Users', description: error.message, variant: 'destructive' });
        } else {
            setUsers(data?.users || []);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = async (targetUserId, newRole) => {
        const { error } = await userApi.updateUserRole(targetUserId, newRole);
        if (error) {
            toast({ title: 'Role Update Failed', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Role Updated!', description: 'User permissions have been changed.' });
            fetchUsers();
        }
    };

    if (loading) return <div>Loading user list...</div>;

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-start gap-3">
                    <Users className="w-6 h-6 text-amber-600 mt-0.5"/>
                    <div>
                        <h2 className="font-bold text-xl text-slate-900">User Management</h2>
                        <p className="text-sm text-slate-500">Toggle admin access or refresh to sync with Supabase.</p>
                    </div>
                </div>
                <Button onClick={fetchUsers} variant="outline" className="w-full sm:w-auto">
                    Refresh
                </Button>
            </div>

            {users.length === 0 ? (
                <div className="text-center text-slate-500 py-8 border border-dashed border-slate-200 rounded-lg">
                    No users found.
                </div>
            ) : (
                <>
                    <div className="space-y-4 md:hidden">
                        {users.map((u) => {
                            const userId = u.id || u._id;
                            return (
                                <div key={userId} className="rounded-lg border border-slate-200 p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-slate-900">
                                                {[u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unnamed User'}
                                            </p>
                                            <p className="text-sm text-slate-500 break-all">{u.email}</p>
                                        </div>
                                        <Switch
                                            checked={u.role === 'admin'}
                                            onCheckedChange={(checked) => handleRoleChange(userId, checked ? 'admin' : 'user')}
                                        />
                                    </div>
                                    <div className="mt-3 text-xs text-slate-500">
                                        <span className="uppercase tracking-wide">Role:</span> {u.role || 'user'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-[600px] divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Admin</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {users.map((u) => (
                                    <tr key={u.id || u._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {[u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unnamed User'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Switch
                                                checked={u.role === 'admin'}
                                                onCheckedChange={(checked) => handleRoleChange(u.id || u._id, checked ? 'admin' : 'user')}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

const Fieldset = ({ legend, children }) => (
    <fieldset className="border-t border-slate-200 pt-6">
        <legend className="text-lg font-semibold text-slate-800 mb-4">{legend}</legend>
        <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </fieldset>
);

export default AccountPage;
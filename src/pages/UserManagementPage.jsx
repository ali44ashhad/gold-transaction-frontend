import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { authApi, userApi, subscriptionApi } from '@/lib/backendApi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader, RefreshCw, ChevronDown, Users, Edit, Trash2, UserPlus } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { cn } from '@/lib/utils';
import SearchBar from '@/components/SearchBar';

const getEmptyAddress = () => ({
  street: '',
  city: '',
  state: '',
  zip: '',
});

const getInitialCreateForm = () => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  billingAddress: getEmptyAddress(),
  shippingAddress: getEmptyAddress(),
});

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [subscriptionsMap, setSubscriptionsMap] = useState(new Map());
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(new Set());
  const [collapsedSections, setCollapsedSections] = useState(new Map());
  const [editingUser, setEditingUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
    },
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
    },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [newUserForm, setNewUserForm] = useState(getInitialCreateForm());
  const [isShippingSameAsBilling, setIsShippingSameAsBilling] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.listUsers();

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch users');
      }

      // Filter to only show users with role "user" (exclude admins)
      const regularUsers = (response.data?.users || []).filter(
        (user) => user.role === 'user'
      );

      setUsers(regularUsers);
      setExpandedRows(new Set());
      setSubscriptionsMap(new Map());
    } catch (error) {
      toast({
        title: 'Error fetching users',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      user: 'bg-blue-100 text-blue-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
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

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      billingAddress: user.billingAddress || {
        street: '',
        city: '',
        state: '',
        zip: '',
      },
      shippingAddress: user.shippingAddress || {
        street: '',
        city: '',
        state: '',
        zip: '',
      },
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenCreateDialog = () => {
    setNewUserForm(getInitialCreateForm());
    setIsShippingSameAsBilling(false);
    setIsCreateDialogOpen(true);
  };

  const handleCreateDialogChange = (open) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      setNewUserForm(getInitialCreateForm());
      setIsShippingSameAsBilling(false);
    }
  };

  const handleBillingAddressChange = (field, value) => {
    setNewUserForm((prev) => {
      const updatedBilling = {
        ...prev.billingAddress,
        [field]: value,
      };
      return {
        ...prev,
        billingAddress: updatedBilling,
        shippingAddress: isShippingSameAsBilling
          ? { ...updatedBilling }
          : prev.shippingAddress,
      };
    });
  };

  const handleShippingAddressChange = (field, value) => {
    if (isShippingSameAsBilling) return;
    setNewUserForm((prev) => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        [field]: value,
      },
    }));
  };

  const handleSameAddressToggle = (checked) => {
    setIsShippingSameAsBilling(checked);
    setNewUserForm((prev) => ({
      ...prev,
      shippingAddress: checked ? { ...prev.billingAddress } : getEmptyAddress(),
    }));
  };

  const handleCreateUser = async () => {
    const email = newUserForm.email.trim();
    const password = newUserForm.password.trim();

    if (!email || !password) {
      toast({
        title: 'Missing required fields',
        description: 'Email and password are required to create a user.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const userDetails = {
        firstName: newUserForm.firstName || undefined,
        lastName: newUserForm.lastName || undefined,
        phone: newUserForm.phone || undefined,
        billingAddress: newUserForm.billingAddress,
        shippingAddress: newUserForm.shippingAddress,
      };

      const { data, error } = await authApi.signUp(email, password, userDetails);

      if (error) {
        throw new Error(error.message || 'Failed to create user');
      }

      if (data?.user && (data.user.role === 'user' || !data.user.role)) {
        setUsers((prev) => [data.user, ...prev]);
      } else if (data?.user) {
        // Keep admins out of the listing but provide manual refresh hint
        await fetchUsers();
      }

      toast({
        title: 'Success',
        description: 'User created successfully.',
        variant: 'success',
      });

      setIsCreateDialogOpen(false);
      setNewUserForm(getInitialCreateForm());
    } catch (error) {
      toast({
        title: 'Create failed',
        description: error.message || 'Failed to create user.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    setUpdating(true);
    try {
      const { data, error } = await userApi.updateUser(
        normalizeId(editingUser._id || editingUser.id),
        formData
      );

      if (error) {
        throw new Error(error.message || 'Failed to update user');
      }

      // Update the user in the list
      setUsers(users.map(u => 
        normalizeId(u._id || u.id) === normalizeId(editingUser._id || editingUser.id) 
          ? data.user 
          : u
      ));

      toast({
        title: 'Success',
        description: 'User updated successfully.',
        variant: 'success',
      });

      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (user) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    setDeleting(true);
    try {
      const { error } = await userApi.deleteUser(
        normalizeId(deletingUser._id || deletingUser.id)
      );

      if (error) {
        throw new Error(error.message || 'Failed to delete user');
      }

      // Remove the user from the list
      setUsers(users.filter(u => 
        normalizeId(u._id || u.id) !== normalizeId(deletingUser._id || deletingUser.id)
      ));

      toast({
        title: 'Success',
        description: 'User deleted successfully.',
        variant: 'success',
      });

      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredUsers = normalizedSearch
    ? users.filter((user) => {
        const fullName = getUserFullName(user).toLowerCase();
        const email = user.email?.toLowerCase() || '';
        const phone = user.phone?.toLowerCase() || '';
        return (
          fullName.includes(normalizedSearch) ||
          email.includes(normalizedSearch) ||
          phone.includes(normalizedSearch)
        );
      })
    : users;

  const columns = [
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
      id: 'role',
      header: 'Role',
      cellClassName: 'align-middle',
      cell: (user) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
        >
          {user.role || 'user'}
        </span>
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
    {
      id: 'actions',
      header: 'Actions',
      cellClassName: 'whitespace-nowrap align-middle',
      cell: (user) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditClick(user)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteClick(user)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
        <p className="ml-4 text-lg">Loading Users...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin - User Management - PharaohVault</title>
        <meta name="description" content="Manage users and view their subscriptions." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-slate-700" />
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          </div>
          <div className="flex flex-col gap-3 w-full xl:max-w-2xl xl:flex-row xl:items-center">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search users by name, email, or phone..."
              className="flex-1 min-w-0"
            />
            <Button onClick={fetchUsers} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleOpenCreateDialog} className="w-full sm:w-auto">
              <UserPlus className="w-4 h-4 mr-2" />
              New User
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-slate-200">
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
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
                        <p className="text-slate-600">{subscription.planName || 'N/A'}</p>
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
                          ${subscription.monthlyInvestment?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Target Weight</p>
                        <p className="text-slate-600">
                          {subscription.targetWeight || '0'} {subscription.targetUnit || 'oz'}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Accumulated Weight</p>
                        <p className="text-slate-600">
                          {subscription.accumulatedWeight?.toFixed(4) || '0.0000'}{' '}
                          {subscription.targetUnit || 'oz'}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Accumulated Value</p>
                        <p className="text-slate-600">
                          ${subscription.accumulatedValue?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      {subscription.currentPeriodEnd && (
                        <div>
                          <p className="font-semibold text-slate-800">Current Period End</p>
                          <p className="text-slate-600">
                            {formatDate(subscription.currentPeriodEnd)}
                          </p>
                        </div>
                      )}
                      {subscription.stripeSubscriptionId && (
                        <div className="md:col-span-2">
                          <p className="font-semibold text-slate-800">Stripe Subscription ID</p>
                          <p className="text-slate-600 font-mono text-xs">
                            {subscription.stripeSubscriptionId}
                          </p>
                        </div>
                      )}
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

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>
                Provide the details below to create a new user account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="newFirstName">First Name</Label>
                  <input
                    id="newFirstName"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newUserForm.firstName}
                    onChange={(e) =>
                      setNewUserForm((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newLastName">Last Name</Label>
                  <input
                    id="newLastName"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newUserForm.lastName}
                    onChange={(e) =>
                      setNewUserForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newEmail">Email *</Label>
                <input
                  id="newEmail"
                  type="email"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newPassword">Temporary Password *</Label>
                <input
                  id="newPassword"
                  type="password"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newPhone">Phone</Label>
                <input
                  id="newPhone"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newUserForm.phone}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label className="font-semibold">Billing Address</Label>
                <div className="grid gap-2 grid-cols-2">
                  <input
                    placeholder="Street"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newUserForm.billingAddress.street}
                    onChange={(e) => handleBillingAddressChange('street', e.target.value)}
                  />
                  <input
                    placeholder="City"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newUserForm.billingAddress.city}
                    onChange={(e) => handleBillingAddressChange('city', e.target.value)}
                  />
                  <input
                    placeholder="State"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newUserForm.billingAddress.state}
                    onChange={(e) => handleBillingAddressChange('state', e.target.value)}
                  />
                  <input
                    placeholder="ZIP"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newUserForm.billingAddress.zip}
                    onChange={(e) => handleBillingAddressChange('zip', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="font-semibold">Shipping Address</Label>
                <div className="grid gap-2 grid-cols-2">
                  <input
                    placeholder="Street"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newUserForm.shippingAddress.street}
                    onChange={(e) => handleShippingAddressChange('street', e.target.value)}
                    disabled={isShippingSameAsBilling}
                  />
                  <input
                    placeholder="City"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newUserForm.shippingAddress.city}
                    onChange={(e) => handleShippingAddressChange('city', e.target.value)}
                    disabled={isShippingSameAsBilling}
                  />
                  <input
                    placeholder="State"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newUserForm.shippingAddress.state}
                    onChange={(e) => handleShippingAddressChange('state', e.target.value)}
                    disabled={isShippingSameAsBilling}
                  />
                  <input
                    placeholder="ZIP"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newUserForm.shippingAddress.zip}
                    onChange={(e) => handleShippingAddressChange('zip', e.target.value)}
                    disabled={isShippingSameAsBilling}
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    id="same-address"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    checked={isShippingSameAsBilling}
                    onChange={(e) => handleSameAddressToggle(e.target.checked)}
                  />
                  <Label htmlFor="same-address" className="text-sm font-normal">
                    Use billing address for shipping
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleCreateDialogChange(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information. All fields are optional.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <input
                  id="firstName"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <input
                  id="lastName"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <input
                  id="email"
                  type="email"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <input
                  id="phone"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="font-semibold">Billing Address</Label>
                <div className="grid gap-2 grid-cols-2">
                  <input
                    placeholder="Street"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.billingAddress.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, street: e.target.value }
                    })}
                  />
                  <input
                    placeholder="City"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.billingAddress.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, city: e.target.value }
                    })}
                  />
                  <input
                    placeholder="State"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.billingAddress.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, state: e.target.value }
                    })}
                  />
                  <input
                    placeholder="ZIP"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.billingAddress.zip}
                    onChange={(e) => setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, zip: e.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="font-semibold">Shipping Address</Label>
                <div className="grid gap-2 grid-cols-2">
                  <input
                    placeholder="Street"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.shippingAddress.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      shippingAddress: { ...formData.shippingAddress, street: e.target.value }
                    })}
                  />
                  <input
                    placeholder="City"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.shippingAddress.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      shippingAddress: { ...formData.shippingAddress, city: e.target.value }
                    })}
                  />
                  <input
                    placeholder="State"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.shippingAddress.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      shippingAddress: { ...formData.shippingAddress, state: e.target.value }
                    })}
                  />
                  <input
                    placeholder="ZIP"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.shippingAddress.zip}
                    onChange={(e) => setFormData({
                      ...formData,
                      shippingAddress: { ...formData.shippingAddress, zip: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updating}>
                {updating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {deletingUser && (
              <div className="grid gap-2 text-sm text-slate-600 py-4">
                <div><strong>Name:</strong> {getUserFullName(deletingUser)}</div>
                <div><strong>Email:</strong> {deletingUser.email}</div>
                <div><strong>User ID:</strong> <span className="font-mono text-xs">{normalizeId(deletingUser._id || deletingUser.id)}</span></div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
};

export default UserManagementPage;


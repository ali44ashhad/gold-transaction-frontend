import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { authApi } from '@/lib/backendApi';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount and when needed
  const checkAuth = useCallback(async () => {
    try {
      const { data, error } = await authApi.getCurrentUser();
      if (error || !data?.user) {
        setUser(null);
        setSession(null);
        setRole(null);
        setLoading(false);
        return;
      }

      // Transform backend user to match frontend expectations
      const backendUser = data.user;
      const transformedUser = {
        id: backendUser.id || backendUser._id,
        _id: backendUser.id || backendUser._id,
        email: backendUser.email,
        user_metadata: {
          first_name: backendUser.firstName,
          last_name: backendUser.lastName,
          phone: backendUser.phone,
          billing_address: backendUser.billingAddress,
          shipping_address: backendUser.shippingAddress,
        },
        emailVerified: backendUser.emailVerified,
        createdAt: backendUser.createdAt,
        updatedAt: backendUser.updatedAt,
      };

      setUser(transformedUser);
      setSession({ user: transformedUser }); // Create session-like object
      setRole(backendUser.role || 'user');
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setSession(null);
      setRole(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signUp = useCallback(async (email, password, options) => {
    try {
      const userData = {
        firstName: options?.data?.first_name || options?.firstName,
        lastName: options?.data?.last_name || options?.lastName,
        phone: options?.data?.phone || options?.phone,
        billingAddress: options?.data?.billing_address || options?.billingAddress,
        shippingAddress: options?.data?.shipping_address || options?.shippingAddress,
      };

      const { data, error } = await authApi.signUp(email, password, userData);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Sign up Failed",
          description: error.message || "Something went wrong",
        });
        return { data: null, error };
      }

      // DO NOT set user state - user must login separately
      // Just show success message
      toast({
        title: "Account Created! 🎉",
        description: "Please login to continue.",
      });

      return { data, error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
      return { data: null, error };
    }
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await authApi.signIn(email, password);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Sign in Failed",
          description: error.message || "Something went wrong",
        });
        return { data: null, error };
      }

      // Transform and set user
      if (data?.user) {
        const transformedUser = {
          id: data.user.id || data.user._id,
          _id: data.user.id || data.user._id,
          email: data.user.email,
          user_metadata: {
            first_name: data.user.firstName,
            last_name: data.user.lastName,
            phone: data.user.phone,
            billing_address: data.user.billingAddress,
            shipping_address: data.user.shippingAddress,
          },
          emailVerified: data.user.emailVerified,
        };
        setUser(transformedUser);
        setSession({ user: transformedUser });
        setRole(data.user.role || 'user');
      }

      return { data, error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
      return { data: null, error };
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await authApi.signOut();
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Sign out Failed",
          description: error.message || "Something went wrong",
        });
        return { error };
      }

      setUser(null);
      setSession(null);
      setRole(null);
      
      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
      return { error };
    }
  }, [toast]);

  const sendPasswordResetEmail = useCallback(async (email) => {
    try {
      const { error } = await authApi.sendPasswordResetEmail(email);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Password Reset Failed",
          description: error.message || "Something went wrong.",
        });
      } else {
        toast({
          title: "Password Reset Email Sent",
          description: "Check your inbox for a link to reset your password.",
        });
      }
      return { error };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: error.message || "Something went wrong.",
      });
      return { error };
    }
  }, [toast]);

  const updateUserPassword = useCallback(async (newPassword) => {
    // For password reset with token, we need to get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: "Reset token is missing.",
      });
      return { error: { message: "Reset token is missing" } };
    }

    try {
      const { error } = await authApi.resetPassword(token, newPassword);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Password Update Failed",
          description: error.message || "Something went wrong.",
        });
      } else {
        toast({
          title: "Password Updated Successfully",
          description: "Your password has been changed.",
        });
        // Refresh auth state after password reset
        await checkAuth();
      }
      return { error };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: error.message || "Something went wrong.",
      });
      return { error };
    }
  }, [toast, checkAuth]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    role,
    signUp,
    signIn,
    signOut,
    sendPasswordResetEmail,
    updateUserPassword,
    refreshAuth: checkAuth, // Expose refresh function
  }), [user, session, loading, role, signUp, signIn, signOut, sendPasswordResetEmail, updateUserPassword, checkAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

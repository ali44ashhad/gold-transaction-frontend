import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, LogOut, LayoutDashboard, UserCircle, XCircle, Users, ArrowDownCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const navigate = useNavigate();
  const { user, signOut, session, role } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  
  const firstName = user?.user_metadata?.first_name;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Sparkles className="w-8 h-8 text-amber-500" />
            </motion.div>
            <motion.span 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.1 }}
              className="text-xl font-bold bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
              PharaohVault
            </motion.span>
          </Link>
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center space-x-4">
            {session ? (
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative rounded-full p-2">
                     <div className="flex items-center space-x-2">
                        <UserCircle className="w-8 h-8 text-slate-600" />
                        {firstName && <span className="hidden sm:inline text-sm font-medium">{firstName}</span>}
                     </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{firstName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Account Management</span>
                  </DropdownMenuItem>
                  {role !== 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/withdrawal-requests')}>
                        <ArrowDownCircle className="mr-2 h-4 w-4" />
                        <span>My Withdrawal Requests</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/cancellation-requests')}>
                        <XCircle className="mr-2 h-4 w-4" />
                        <span>My Cancellation Requests</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  {role === 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>User Management</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/cancellation-requests')}>
                        <XCircle className="mr-2 h-4 w-4" />
                        <span>Cancellation Requests</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/withdrawal-requests')}>
                        <ArrowDownCircle className="mr-2 h-4 w-4" />
                        <span>Withdrawal Requests</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/help')}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Need help</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Log In
                </Button>
                <Button 
                  onClick={() => navigate('/signup')}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                >
                  Sign Up
                </Button>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default Header;
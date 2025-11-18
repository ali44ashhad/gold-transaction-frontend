import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { getAllUsers, updateUserRole } from '@/api/admin';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader, Users } from 'lucide-react';

const RoleSelector = ({ value, onChange }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-28">
      <SelectValue placeholder="Select role" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="user">User</SelectItem>
      <SelectItem value="admin">Admin</SelectItem>
    </SelectContent>
  </Select>
);

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
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

  const handleRoleChange = async (userId, newRole) => {
    const originalUsers = [...users];
    const updatedUsers = users.map(u => u.user_id === userId ? { ...u, role: newRole } : u);
    setUsers(updatedUsers);

    try {
      await updateUserRole(userId, newRole);
      toast({
        title: 'Success',
        description: `User role updated to ${newRole}.`,
        variant: 'success',
      });
    } catch (error) {
      setUsers(originalUsers);
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
        <p className="ml-4 text-lg">Loading Admin Panel...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Panel - PharaohVault</title>
        <meta name="description" content="Manage users and roles." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-slate-700"/>
                <h1 className="text-3xl font-bold text-slate-900">Admin Panel - User Management</h1>
            </div>
          <Button onClick={fetchUsers}>Refresh Data</Button>
        </div>
        
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>First Name</TableHead>
                        <TableHead>Last Name</TableHead>
                        <TableHead>Role</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.user_id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>{user.first_name || 'N/A'}</TableCell>
                            <TableCell>{user.last_name || 'N/A'}</TableCell>
                            <TableCell>
                                <RoleSelector 
                                    value={user.role || 'user'} 
                                    onChange={(newRole) => handleRoleChange(user.user_id, newRole)}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {users.length === 0 && (
                <div className="text-center p-8 text-slate-500">
                    No users found.
                </div>
            )}
        </div>
      </motion.div>
    </>
  );
};

export default AdminPage;
import { supabase } from '@/lib/customSupabaseClient';

export const getAllUsers = async () => {
    const { data, error } = await supabase.rpc('get_all_users_with_roles');

    if (error) {
        console.error('Error fetching users:', error);
        throw new Error(error.message);
    }

    return data;
};

export const updateUserRole = async (userId, newRole) => {
    const { error } = await supabase.rpc('set_user_role', {
        target_user_id: userId,
        new_role: newRole,
    });

    if (error) {
        console.error('Error updating user role:', error);
        throw new Error(error.message);
    }

    return { success: true };
};
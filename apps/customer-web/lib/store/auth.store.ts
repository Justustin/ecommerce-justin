import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';

// ============================================================================
// AUTH STORE STATE INTERFACE
// ============================================================================

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

// ============================================================================
// CREATE AUTH STORE
// ============================================================================

/**
 * Zustand store for authentication state
 * 
 * Features:
 * - Persists to localStorage automatically
 * - Survives page refreshes
 * - Auto-rehydrates on app load
 * - Used by API client to attach JWT tokens
 * 
 * Storage key: 'auth-storage'
 * This matches what the API client looks for in localStorage
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // INITIAL STATE
      // ============================================================================
      
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      
      // ============================================================================
      // ACTIONS
      // ============================================================================
      
      /**
       * Set user data
       * Updates user and authentication status
       */
      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
        });
      },
      
      /**
       * Set authentication token
       * Token is automatically picked up by API client
       */
      setToken: (token: string) => {
        set({ token });
      },
      
      /**
       * Login action
       * Sets both user and token, marks as authenticated
       * 
       * Usage after successful login API call:
       * const { login } = useAuthStore();
       * login(userData, jwtToken);
       */
      login: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },
      
      /**
       * Logout action
       * Clears all auth data from store and localStorage
       * 
       * Usage:
       * const { logout } = useAuthStore();
       * logout();
       * router.push('/login');
       */
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
      
      /**
       * Update user data partially
       * Useful for profile updates without re-authenticating
       * 
       * Usage:
       * const { updateUser } = useAuthStore();
       * updateUser({ first_name: 'New Name', avatar_url: '...' });
       */
      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...updates,
            },
          });
        }
      },
      
      /**
       * Set loading state
       * Used during login/logout operations
       */
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    
    // ============================================================================
    // PERSISTENCE CONFIGURATION
    // ============================================================================
    {
      name: 'auth-storage', // localStorage key (matches what API client expects)
      storage: createJSONStorage(() => localStorage),
      
      /**
       * Partialize - only persist these fields
       * We don't persist isLoading since it's ephemeral
       */
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================================================
// SELECTOR HOOKS (Performance Optimization)
// ============================================================================

/**
 * Hook to get only the user data
 * Prevents unnecessary re-renders when token changes
 */
export const useUser = () => useAuthStore((state) => state.user);

/**
 * Hook to get only authentication status
 */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

/**
 * Hook to get only the token
 */
export const useToken = () => useAuthStore((state) => state.token);

/**
 * Hook to get only auth actions (doesn't cause re-renders)
 */
export const useAuthActions = () => useAuthStore((state) => ({
  login: state.login,
  logout: state.logout,
  setUser: state.setUser,
  setToken: state.setToken,
  updateUser: state.updateUser,
  setLoading: state.setLoading,
}));

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user has a specific role
 * 
 * @param requiredRole - Role to check for
 * @returns true if user has the role
 */
export const useHasRole = (requiredRole: string): boolean => {
  const user = useUser();
  return user?.role === requiredRole;
};

/**
 * Check if current user is a customer
 */
export const useIsCustomer = (): boolean => {
  return useHasRole('customer');
};

/**
 * Check if current user is factory owner
 */
export const useIsFactoryOwner = (): boolean => {
  return useHasRole('factory_owner');
};

/**
 * Check if current user is office staff
 */
export const useIsOfficeStaff = (): boolean => {
  return useHasRole('office_staff');
};

/**
 * Check if current user is admin
 */
export const useIsAdmin = (): boolean => {
  return useHasRole('admin');
};

/**
 * Get user's full name
 */
export const useUserFullName = (): string => {
  const user = useUser();
  if (!user) return '';
  
  return user.last_name 
    ? `${user.first_name} ${user.last_name}`
    : user.first_name;
};

/**
 * Get user's initials for avatar fallback
 */
export const useUserInitials = (): string => {
  const user = useUser();
  if (!user) return '';
  
  const firstInitial = user.first_name.charAt(0).toUpperCase();
  const lastInitial = user.last_name?.charAt(0).toUpperCase() || '';
  
  return lastInitial ? `${firstInitial}${lastInitial}` : firstInitial;
};

// ============================================================================
// EXPORT DEFAULT STORE
// ============================================================================

export default useAuthStore;

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Login page - handle successful login
 * 
 * import { useAuthStore } from '@/lib/store/auth.store';
 * import { useRouter } from 'next/navigation';
 * import apiClient from '@/lib/api/client';
 * 
 * function LoginPage() {
 *   const { login } = useAuthStore();
 *   const router = useRouter();
 *   
 *   const handleLogin = async (phoneNumber: string, password: string) => {
 *     try {
 *       const response = await apiClient.post('/auth/login', {
 *         phone_number: phoneNumber,
 *         password
 *       });
 *       
 *       const { user, token } = response.data.data;
 *       login(user, token);
 *       router.push('/');
 *     } catch (error) {
 *       console.error('Login failed:', error);
 *     }
 *   };
 * }
 */

/**
 * Example 2: Protected page - check authentication
 * 
 * import { useIsAuthenticated } from '@/lib/store/auth.store';
 * import { useRouter } from 'next/navigation';
 * import { useEffect } from 'react';
 * 
 * function ProfilePage() {
 *   const isAuthenticated = useIsAuthenticated();
 *   const router = useRouter();
 *   
 *   useEffect(() => {
 *     if (!isAuthenticated) {
 *       router.push('/login');
 *     }
 *   }, [isAuthenticated, router]);
 *   
 *   if (!isAuthenticated) return null;
 *   
 *   return <div>Profile Page</div>;
 * }
 */

/**
 * Example 3: Display user info in header
 * 
 * import { useUser, useUserFullName, useUserInitials } from '@/lib/store/auth.store';
 * 
 * function UserMenu() {
 *   const user = useUser();
 *   const fullName = useUserFullName();
 *   const initials = useUserInitials();
 *   
 *   if (!user) return <LoginButton />;
 *   
 *   return (
 *     <div>
 *       {user.avatar_url ? (
 *         <img src={user.avatar_url} alt={fullName} />
 *       ) : (
 *         <div>{initials}</div>
 *       )}
 *       <span>{fullName}</span>
 *     </div>
 *   );
 * }
 */

/**
 * Example 4: Logout button
 * 
 * import { useAuthActions } from '@/lib/store/auth.store';
 * import { useRouter } from 'next/navigation';
 * 
 * function LogoutButton() {
 *   const { logout } = useAuthActions();
 *   const router = useRouter();
 *   
 *   const handleLogout = () => {
 *     logout();
 *     router.push('/login');
 *   };
 *   
 *   return <button onClick={handleLogout}>Keluar</button>;
 * }
 */

/**
 * Example 5: Update user profile
 * 
 * import { useAuthActions } from '@/lib/store/auth.store';
 * import apiClient from '@/lib/api/client';
 * 
 * function UpdateProfileForm() {
 *   const { updateUser } = useAuthActions();
 *   
 *   const handleSubmit = async (formData: any) => {
 *     try {
 *       const response = await apiClient.put('/users/profile', formData);
 *       const updatedUser = response.data.data;
 *       
 *       // Update local state without re-authenticating
 *       updateUser(updatedUser);
 *     } catch (error) {
 *       console.error('Update failed:', error);
 *     }
 *   };
 * }
 */

/**
 * Example 6: Role-based rendering
 * 
 * import { useIsCustomer, useIsFactoryOwner } from '@/lib/store/auth.store';
 * 
 * function Dashboard() {
 *   const isCustomer = useIsCustomer();
 *   const isFactoryOwner = useIsFactoryOwner();
 *   
 *   if (isCustomer) {
 *     return <CustomerDashboard />;
 *   }
 *   
 *   if (isFactoryOwner) {
 *     return <FactoryDashboard />;
 *   }
 *   
 *   return <div>Access Denied</div>;
 * }
 */
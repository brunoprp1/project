import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  getIdTokenResult
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  addDoc
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { User, Activity } from '../../types/firebase';

export const signUp = async (email: string, password: string, name: string, role: 'admin' | 'client', createdBy?: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    // Create user document in Firestore
    const userData: Omit<User, 'id'> = {
      email,
      name,
      role,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    
    // Log the user creation activity
    await logActivity({
      type: 'system',
      description: `User ${name} created with role ${role}`,
      userId: createdBy || user.uid,
      metadata: { createdUserId: user.uid }
    });

    return userCredential;
  } catch (error) {
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }

    const userData = userDoc.data() as User;
    
    // Check if user is active
    if (userData.status === 'inactive') {
      await firebaseSignOut(auth);
      throw new Error('Account is inactive, please contact support');
    }
    
    // Update last login
    await updateDoc(doc(db, 'users', userCredential.user.uid), {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Log login activity
    await logUserAccess(userCredential.user.uid, 'login');
    
    return { user: userCredential.user, userData };
  } catch (error) {
    // Log failed login attempt if we can find the user
    if (email) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userId = querySnapshot.docs[0].id;
          await logUserAccess(userId, 'failed_login', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      } catch (logError) {
        console.error('Error logging failed login:', logError);
      }
    }
    
    throw error;
  }
};

export const signOut = async () => {
  try {
    const userId = auth.currentUser?.uid;
    
    if (userId) {
      await logUserAccess(userId, 'logout');
    }
    
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) return null;

  return { ...userDoc.data(), id: user.uid } as User;
};

// Password reset functionality
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
    
    // Try to log the reset request if we can find the user
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userId = querySnapshot.docs[0].id;
      await logUserAccess(userId, 'password_reset_requested');
    }
  } catch (error) {
    throw error;
  }
};

// Change password functionality
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    
    if (!user || !user.email) {
      throw new Error('User not authenticated');
    }
    
    // Re-authenticate the user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update the password
    await updatePassword(user, newPassword);
    
    // Log the password change
    await logUserAccess(user.uid, 'password_changed');
  } catch (error) {
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Update Firestore data
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    // Update Firebase Auth profile if display name is provided
    if (auth.currentUser && data.name) {
      await updateProfile(auth.currentUser, {
        displayName: data.name
      });
    }
    
    // Log the profile update
    await logUserAccess(userId, 'profile_updated');
    
    const userDoc = await getDoc(userRef);
    return { ...userDoc.data(), id: userId } as User;
  } catch (error) {
    throw error;
  }
};

// Update user status (admin only function)
export const updateUserStatus = async (userId: string, status: 'active' | 'inactive', updatedBy: string): Promise<User> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    // Log the status update
    await logActivity({
      type: 'system',
      description: `User status updated to ${status}`,
      userId: updatedBy,
      metadata: { targetUserId: userId, newStatus: status }
    });
    
    const userDoc = await getDoc(userRef);
    return { ...userDoc.data(), id: userId } as User;
  } catch (error) {
    throw error;
  }
};

// Get user refresh token
export const getRefreshToken = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    
    const tokenResult = await getIdTokenResult(user);
    return {
      token: await user.getIdToken(),
      expirationTime: tokenResult.expirationTime,
      claims: tokenResult.claims
    };
  } catch (error) {
    throw error;
  }
};

// Log user access (login, logout, etc.)
export const logUserAccess = async (userId: string, action: string, details?: any): Promise<void> => {
  try {
    await addDoc(collection(db, 'user_access_logs'), {
      userId,
      action,
      details: details || {},
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent
    });
  } catch (error) {
    console.error('Error logging user access:', error);
    // Don't throw to prevent interrupting the main flow
  }
};

// Log general activity
export const logActivity = async (activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'activities'), {
      ...activity,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw to prevent interrupting the main flow
  }
};

// Get user access logs
export const getUserAccessLogs = async (userId: string, maxResults: number = 50): Promise<any[]> => {
  try {
    const logsRef = collection(db, 'user_access_logs');
    const q = query(
      logsRef, 
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Get all users (admin only function)
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as User[];
  } catch (error) {
    throw error;
  }
};

// Get filtered users (admin only function)
export const getFilteredUsers = async (filters: { role?: 'admin' | 'client', status?: 'active' | 'inactive' }): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users');
    let q = query(usersRef);
    
    if (filters.role) {
      q = query(q, where('role', '==', filters.role));
    }
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as User[];
  } catch (error) {
    throw error;
  }
};
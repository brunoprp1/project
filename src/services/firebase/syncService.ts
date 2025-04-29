import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  Timestamp,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { asaasService } from '../api/asaas';
import { AsaasCustomer, User, Client, SyncReport } from '../../types/asaas';
import { hashPassword } from '../../utils/auth';

// Collection references
const usersCollection = collection(db, 'users');
const clientsCollection = collection(db, 'clients');
const syncReportsCollection = collection(db, 'sync_reports');

/**
 * Service for synchronizing Asaas customers with Firestore
 */
export const syncService = {
  /**
   * Start the synchronization process
   * @returns The sync report
   */
  startSync: async (): Promise<SyncReport> => {
    // Check if there's already a sync in progress
    const activeSyncs = await syncService.getActiveSyncs();
    if (activeSyncs.length > 0) {
      throw new Error('There is already a synchronization in progress');
    }

    // Create a new sync report
    const syncReport: SyncReport = {
      totalProcessed: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      startedAt: new Date(),
      status: 'running'
    };

    // Save the initial sync report to get an ID
    const syncReportRef = await addDoc(syncReportsCollection, {
      ...syncReport,
      startedAt: Timestamp.fromDate(syncReport.startedAt),
    });

    // Start the sync process asynchronously
    syncService.processSyncInBackground(syncReportRef.id)
      .catch(error => {
        console.error('Error in background sync process:', error);
      });

    return {
      ...syncReport,
      id: syncReportRef.id
    };
  },

  /**
   * Process the synchronization in the background
   * @param syncReportId The ID of the sync report
   */
  processSyncInBackground: async (syncReportId: string): Promise<void> => {
    try {
      // Get the sync report
      const syncReportRef = doc(syncReportsCollection, syncReportId);
      
      try {
        // Fetch all customers from Asaas
        const customers = await asaasService.getAllCustomers();
        
        let totalProcessed = 0;
        let created = 0;
        let updated = 0;
        let failed = 0;
        const errors: Array<{ email: string; error: string }> = [];
        
        // Process each customer
        for (const customer of customers) {
          try {
            const result = await syncService.processCustomer(customer);
            
            totalProcessed++;
            
            if (result.action === 'created') {
              created++;
            } else if (result.action === 'updated') {
              updated++;
            }
            
            // Update the sync report periodically (every 10 customers)
            if (totalProcessed % 10 === 0) {
              await updateDoc(syncReportRef, {
                totalProcessed,
                created,
                updated,
                failed,
                errors,
                updatedAt: serverTimestamp()
              });
            }
          } catch (error: any) {
            failed++;
            errors.push({
              email: customer.email,
              error: error.message || 'Unknown error'
            });
            
            console.error(`Error processing customer ${customer.email}:`, error);
          }
        }
        
        // Update the sync report with final results
        await updateDoc(syncReportRef, {
          totalProcessed,
          created,
          updated,
          failed,
          errors,
          endedAt: serverTimestamp(),
          status: 'completed',
          updatedAt: serverTimestamp()
        });
        
      } catch (error: any) {
        // Update the sync report with error status
        await updateDoc(syncReportRef, {
          endedAt: serverTimestamp(),
          status: 'failed',
          updatedAt: serverTimestamp(),
          errors: [{ email: 'general', error: error.message || 'Unknown error' }]
        });
        
        throw error;
      }
    } catch (error) {
      console.error('Error in sync process:', error);
      throw error;
    }
  },

  /**
   * Process a single customer from Asaas
   * @param customer The Asaas customer to process
   * @returns The result of the processing
   */
  processCustomer: async (customer: AsaasCustomer): Promise<{ action: 'created' | 'updated'; userId: string }> => {
    try {
      console.log(`Processing customer: ${customer.name} (${customer.email})`);
      
      // Check if the user already exists by asaasId
      const asaasIdQuery = query(usersCollection, where('asaasId', '==', customer.id));
      const asaasIdQuerySnapshot = await getDocs(asaasIdQuery);
      
      // Check if the user already exists by email
      const emailQuery = query(usersCollection, where('email', '==', customer.email));
      const emailQuerySnapshot = await getDocs(emailQuery);
      
      // If user exists by asaasId or email, update it
      if (!asaasIdQuerySnapshot.empty || !emailQuerySnapshot.empty) {
        console.log(`User already exists for ${customer.email}`);
        let existingUserDoc;
        
        if (!asaasIdQuerySnapshot.empty) {
          existingUserDoc = asaasIdQuerySnapshot.docs[0];
          console.log(`Found by asaasId: ${customer.id}`);
        } else {
          existingUserDoc = emailQuerySnapshot.docs[0];
          console.log(`Found by email: ${customer.email}`);
        }
        
        const existingUserId = existingUserDoc.id;
        
        // Update the user
        const updatedUser: Partial<User> = {
          name: customer.name,
          email: customer.email,
          phone: customer.mobilePhone || customer.phone || '',
          asaasId: customer.id,
          importedFromAsaas: true,
          role: 'client',
          status: customer.status === 'ACTIVE' ? 'active' : 'inactive',
          updatedAt: new Date()
        };
        
        console.log(`Updating user data for ${customer.email}`);
        await updateDoc(existingUserDoc.ref, {
          ...updatedUser,
          updatedAt: serverTimestamp()
        });
        
        // Check if client record exists
        const clientQuery = query(clientsCollection, where('userId', '==', existingUserId));
        const clientQuerySnapshot = await getDocs(clientQuery);
        
        if (!clientQuerySnapshot.empty) {
          console.log(`Updating client record for user ${existingUserId}`);
          const clientDoc = clientQuerySnapshot.docs[0];
          
          // Update client record
          const updatedClient: Partial<Client> = {
            contactName: customer.name,
            contactEmail: customer.email,
            contactPhone: customer.mobilePhone || customer.phone || '',
            address: `${customer.address}, ${customer.addressNumber} ${customer.complement ? '- ' + customer.complement : ''}, ${customer.province}`,
            cnpj: customer.cpfCnpj,
            updatedAt: new Date()
          };
          
          await updateDoc(clientDoc.ref, {
            ...updatedClient,
            updatedAt: serverTimestamp()
          });
        } else {
          console.log(`Creating new client record for existing user ${existingUserId}`);
          // Create new client record
          const newClient: Client = {
            userId: existingUserId,
            contactName: customer.name,
            contactEmail: customer.email,
            contactPhone: customer.mobilePhone || customer.phone || '',
            address: `${customer.address}, ${customer.addressNumber} ${customer.complement ? '- ' + customer.complement : ''}, ${customer.province}`,
            cnpj: customer.cpfCnpj,
            commissionPercentage: 10, // Valor padrão
            contractStartDate: new Date().toISOString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            dueDate: 10, // Valor padrão
            plan: 'partner', // Valor padrão
            platform: 'shopify', // Valor padrão
            settings: {
              notificationEmail: true,
              notificationSystem: true,
              notificationWhatsapp: false
            },
            storeName: 'Loja Padrão',
            storeUrl: 'https://seudominio.com',
            subscriptionStatus: 'active',
            subscriptionValue: 0
          };
          
          const newClientRef = doc(clientsCollection);
          await setDoc(newClientRef, {
            ...newClient,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        return {
          action: 'updated',
          userId: existingUserId
        };
      } else {
        console.log(`Creating new user for ${customer.email}`);
        // Create a new user
        const hashedPassword = await hashPassword('admin123');
        
        const newUser: User = {
          name: customer.name,
          email: customer.email,
          phone: customer.mobilePhone || customer.phone || '',
          password: hashedPassword,
          asaasId: customer.id,
          importedFromAsaas: true,
          role: 'client',
          status: customer.status === 'ACTIVE' ? 'active' : 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
          firstLogin: true
        };
        
        const newUserRef = doc(usersCollection);
        const newUserId = newUserRef.id;
        
        console.log(`Saving new user with ID: ${newUserId}`);
        await setDoc(newUserRef, {
          ...newUser,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Create client record
        console.log(`Creating client record for new user ${newUserId}`);
        const newClient: Client = {
          userId: newUserId,
          contactName: customer.name,
          contactEmail: customer.email,
          contactPhone: customer.mobilePhone || customer.phone || '',
          address: `${customer.address}, ${customer.addressNumber} ${customer.complement ? '- ' + customer.complement : ''}, ${customer.province}`,
          cnpj: customer.cpfCnpj,
          commissionPercentage: 10, // Valor padrão
          contractStartDate: new Date().toISOString(),
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate: 10, // Valor padrão
          plan: 'partner', // Valor padrão
          platform: 'shopify', // Valor padrão
          settings: {
            notificationEmail: true,
            notificationSystem: true,
            notificationWhatsapp: false
          },
          storeName: 'Loja Padrão',
          storeUrl: 'https://seudominio.com',
          subscriptionStatus: 'active',
          subscriptionValue: 0
        };
        
        const newClientRef = doc(clientsCollection);
        await setDoc(newClientRef, {
          ...newClient,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        return {
          action: 'created',
          userId: newUserId
        };
      }
    } catch (error: any) {
      console.error(`Error processing customer ${customer.email}:`, error);
      throw error;
    }
  },

  /**
   * Get active synchronizations
   * @returns List of active sync reports
   */
  getActiveSyncs: async (): Promise<SyncReport[]> => {
    try {
      const activeSyncsQuery = query(syncReportsCollection, where('status', '==', 'running'));
      const activeSyncsSnapshot = await getDocs(activeSyncsQuery);
      
      return activeSyncsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SyncReport[];
    } catch (error) {
      console.error('Error getting active syncs:', error);
      throw error;
    }
  },

  /**
   * Get a sync report by ID
   * @param syncReportId The ID of the sync report
   * @returns The sync report
   */
  getSyncReport: async (syncReportId: string): Promise<SyncReport | null> => {
    try {
      const syncReportRef = doc(syncReportsCollection, syncReportId);
      const syncReportSnapshot = await getDoc(syncReportRef);
      
      if (!syncReportSnapshot.exists()) {
        return null;
      }
      
      return {
        ...syncReportSnapshot.data(),
        id: syncReportSnapshot.id
      } as SyncReport;
    } catch (error) {
      console.error('Error getting sync report:', error);
      throw error;
    }
  },

  /**
   * Get all sync reports
   * @returns List of all sync reports
   */
  getAllSyncReports: async (): Promise<SyncReport[]> => {
    try {
      const syncReportsSnapshot = await getDocs(syncReportsCollection);
      
      return syncReportsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SyncReport[];
    } catch (error) {
      console.error('Error getting all sync reports:', error);
      throw error;
    }
  }
};

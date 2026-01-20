
// IndexedDB Wrapper for Code Vortex
// Handles large data storage (projects, code, assets)

const DB_NAME = 'CodeVortexDB';
const DB_VERSION = 2;

export interface DBStore {
  projects: {
    id: string;
    name: string;
    type: string;
    files: any[];
    createdAt: number;
    updatedAt: number;
    description?: string;
    thumbnail?: string;
  };
  deployments: {
    id: string;
    projectId: string;
    status: string;
    logs: string[];
    url?: string;
    provider: string;
    timestamp: number;
  };
  community: {
    id: string;
    content: any;
    type: string;
    timestamp: number;
  };
  assets: {
    id: string;
    data: Blob | string;
    type: string;
    name: string;
  };
  execution_history: {
    id: string;
    projectId: string;
    timestamp: number;
    status: string;
  };
  community_projects: any;
  community_comments: any;
  community_users: any;
  courses: any;
  user_progress: any;
  github_cache: any;
  perplexity_history: any;
  workspace_settings: any;
  project_templates: any;
}

let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject("Could not open database");
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Projects Store
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        projectStore.createIndex('type', 'type', { unique: false });
      }

      // Deployments Store
      if (!db.objectStoreNames.contains('deployments')) {
        const deployStore = db.createObjectStore('deployments', { keyPath: 'id' });
        deployStore.createIndex('projectId', 'projectId', { unique: false });
      }

      // Community Store
      if (!db.objectStoreNames.contains('community')) {
        db.createObjectStore('community', { keyPath: 'id' });
      }

      // Assets Store (Images, Videos)
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: 'id' });
      }

      // Execution History Store
      if (!db.objectStoreNames.contains('execution_history')) {
        const execStore = db.createObjectStore('execution_history', { keyPath: 'id' });
        execStore.createIndex('projectId', 'projectId', { unique: false });
      }

      // Community Stores
      if (!db.objectStoreNames.contains('community_projects')) {
        const store = db.createObjectStore('community_projects', { keyPath: 'id' });
        store.createIndex('authorId', 'authorId', { unique: false });
      }
      if (!db.objectStoreNames.contains('community_comments')) {
        const store = db.createObjectStore('community_comments', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('authorId', 'authorId', { unique: false });
      }
      if (!db.objectStoreNames.contains('community_users')) {
        const store = db.createObjectStore('community_users', { keyPath: 'id' });
        store.createIndex('username', 'username', { unique: true });
      }

      // Courses & Progress
      if (!db.objectStoreNames.contains('courses')) {
        const store = db.createObjectStore('courses', { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
      }
      if (!db.objectStoreNames.contains('user_progress')) {
        const store = db.createObjectStore('user_progress', { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Other Stores
      if (!db.objectStoreNames.contains('github_cache')) {
        db.createObjectStore('github_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('perplexity_history')) {
        db.createObjectStore('perplexity_history', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('workspace_settings')) {
        db.createObjectStore('workspace_settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('project_templates')) {
        db.createObjectStore('project_templates', { keyPath: 'id' });
      }
    };
  });
};

export const db = {
  async get<T>(storeName: keyof DBStore, id: string): Promise<T | undefined> {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll<T>(storeName: keyof DBStore): Promise<T[]> {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async put<T>(storeName: keyof DBStore, data: T): Promise<string> {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(storeName: keyof DBStore, id: string): Promise<void> {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

// Mock database driver for web, bypassing native expo-sqlite completely.

export interface MockDatabase {
  execSync: (sql: string) => void;
  runSync: (sql: string, params?: any[]) => { lastInsertRowId: number; changes: number };
  getFirstSync: <T>(sql: string, params?: any[]) => T | null;
  getAllSync: <T>(sql: string, params?: any[]) => T[];
}

export const getDB = (): MockDatabase => {
  return {
    execSync: () => {},
    runSync: () => ({ lastInsertRowId: 1, changes: 1 }),
    getFirstSync: () => null,
    getAllSync: () => [],
  };
};

export const initDatabase = () => {
  console.log('MediTrack Web Mode: Bypassing native SQLite initialization');
};

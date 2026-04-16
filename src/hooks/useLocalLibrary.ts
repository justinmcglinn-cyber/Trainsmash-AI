import { useState, useCallback, useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

export interface LocalFile {
  name: string;
  uri: string;
}

export interface LocalFolder {
  name: string;       // e.g. "20240416"
  uri: string;        // file:// path to the folder
  children: LocalFile[];
}

/** Root of all imported photos on-device. */
export const TRAINSMASH_DIR = (FileSystem.documentDirectory ?? '') + 'Trainsmash/';

/** Reads the Trainsmash/ directory tree from device storage. */
export function useLocalLibrary() {
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Create root if missing
      const root = await FileSystem.getInfoAsync(TRAINSMASH_DIR);
      if (!root.exists) {
        await FileSystem.makeDirectoryAsync(TRAINSMASH_DIR, { intermediates: true });
        setFolders([]);
        return;
      }

      const dirs = await FileSystem.readDirectoryAsync(TRAINSMASH_DIR);
      const result: LocalFolder[] = [];

      // Sort newest-first (YYYYMMDD folders sort lexicographically)
      for (const dir of [...dirs].sort().reverse()) {
        const folderPath = TRAINSMASH_DIR + dir + '/';
        const info = await FileSystem.getInfoAsync(folderPath);
        if (!info.isDirectory) continue;

        const names = await FileSystem.readDirectoryAsync(folderPath);
        const imageFiles = names
          .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
          .sort()
          .map(f => ({ name: f, uri: folderPath + f }));

        if (imageFiles.length > 0) {
          result.push({ name: dir, uri: folderPath, children: imageFiles });
        }
      }

      setFolders(result);
    } catch (e) {
      console.error('useLocalLibrary refresh error:', e);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { folders, loading, refresh };
}

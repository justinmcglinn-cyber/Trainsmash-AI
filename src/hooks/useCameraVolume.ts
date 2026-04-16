import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export interface CameraFolder {
  name: string;
  uri: string;
  children?: CameraFile[];
}

export interface CameraFile {
  name: string;
  uri: string;
  size?: number;
  isRaw: boolean;
}

const RAW_EXTENSIONS = new Set([
  'arw', 'dng', 'nef', 'cr2', 'cr3', 'raf', 'rw2', 'orf', 'srw', 'pef',
]);

function isRawFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return RAW_EXTENSIONS.has(ext);
}

export function useCameraVolume() {
  const [folders, setFolders] = useState<CameraFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCamera = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Open system folder picker — user navigates to camera/DCIM
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        setLoading(false);
        return;
      }

      const rootUri = result.assets[0].uri;
      await loadFolderStructure(rootUri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open camera');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFolderStructure = useCallback(async (rootUri: string) => {
    try {
      const info = await FileSystem.getInfoAsync(rootUri);
      if (!info.exists) {
        setError('Selected location does not exist');
        return;
      }

      if (info.isDirectory) {
        // List directory contents
        const contents = await FileSystem.readDirectoryAsync(rootUri);
        const discovered: CameraFolder[] = [];

        for (const name of contents.sort()) {
          const childUri = rootUri.endsWith('/') ? `${rootUri}${name}` : `${rootUri}/${name}`;
          const childInfo = await FileSystem.getInfoAsync(childUri);
          if (childInfo.isDirectory) {
            // This is a dated folder (e.g., YYYYMMDD or 100MSDCF)
            const files = await listRawFiles(childUri);
            if (files.length > 0) {
              discovered.push({ name, uri: childUri, children: files });
            }
          }
        }

        if (discovered.length > 0) {
          setFolders(discovered);
        } else {
          // Root might be the dated folder itself
          const files = await listRawFiles(rootUri);
          if (files.length > 0) {
            const folderName = rootUri.split('/').pop() ?? 'Selected Folder';
            setFolders([{ name: folderName, uri: rootUri, children: files }]);
          } else {
            setError('No RAW files found. Navigate to the camera DCIM folder.');
          }
        }
      } else {
        // Single file selected — wrap it
        setFolders([{
          name: 'Selected Files',
          uri: rootUri,
          children: isRawFile(rootUri) ? [{ name: rootUri.split('/').pop() ?? '', uri: rootUri, isRaw: true }] : [],
        }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read folder');
    }
  }, []);

  const refreshFolder = useCallback(async (folderUri: string) => {
    const files = await listRawFiles(folderUri);
    setFolders(prev =>
      prev.map(f => (f.uri === folderUri ? { ...f, children: files } : f))
    );
  }, []);

  return { folders, loading, error, openCamera, refreshFolder };
}

async function listRawFiles(dirUri: string): Promise<CameraFile[]> {
  try {
    const contents = await FileSystem.readDirectoryAsync(dirUri);
    const files: CameraFile[] = [];
    for (const name of contents.sort()) {
      if (isRawFile(name)) {
        const fileUri = dirUri.endsWith('/') ? `${dirUri}${name}` : `${dirUri}/${name}`;
        const info = await FileSystem.getInfoAsync(fileUri, { size: true });
        files.push({
          name,
          uri: fileUri,
          size: 'size' in info ? info.size : undefined,
          isRaw: true,
        });
      }
    }
    return files;
  } catch {
    return [];
  }
}

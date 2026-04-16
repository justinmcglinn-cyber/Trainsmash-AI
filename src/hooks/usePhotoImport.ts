import { useState, useCallback } from 'react';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { extractPreview } from '../modules/arw-processor';
import { useCollageStore } from '../store/collage.store';
import { Photo } from '../store/types';

let nextId = 1;
function generateId(): string {
  return `photo_${nextId++}_${Date.now()}`;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  );
}

/**
 * Load local JPEG files from device storage into the collage store.
 * Each URI should be a file:// path to a .jpg/.jpeg/.png file.
 */
export function usePhotoImport() {
  const addPhotos = useCollageStore(s => s.addPhotos);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  /** Load pre-extracted local JPEG files (from Trainsmash/ library) into store. */
  const importLocalFiles = useCallback(async (uris: string[]) => {
    setImporting(true);
    setError(null);
    setProgress({ done: 0, total: uris.length });

    const imported: Photo[] = [];

    for (let i = 0; i < uris.length; i++) {
      const uri = uris[i];
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        const { width, height } = await getImageSize(uri);

        imported.push({
          id: generateId(),
          uri,
          previewDataUrl: dataUrl,
          naturalWidth: width,
          naturalHeight: height,
          fileName: uri.split('/').pop() ?? uri,
        });
      } catch (e) {
        console.warn(`Failed to load local file ${uri}:`, e);
      }
      setProgress(prev => ({ ...prev, done: i + 1 }));
    }

    addPhotos(imported);
    setImporting(false);
    return imported;
  }, [addPhotos]);

  /** Legacy: import ARW files directly from camera (SAF URIs). */
  const importFiles = useCallback(async (uris: string[]) => {
    setImporting(true);
    setError(null);
    setProgress({ done: 0, total: uris.length });

    const imported: Photo[] = [];
    const CONCURRENCY = 3;

    for (let i = 0; i < uris.length; i += CONCURRENCY) {
      const batch = uris.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(uri => extractPreview(uri))
      );

      for (let j = 0; j < batch.length; j++) {
        const uri = batch[j];
        const r = results[j];
        if (r.status === 'fulfilled') {
          imported.push({
            id: generateId(),
            uri,
            previewDataUrl: r.value.dataUrl,
            naturalWidth: r.value.width,
            naturalHeight: r.value.height,
            fileName: uri.split('/').pop() ?? uri,
          });
        }
        setProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }
    }

    addPhotos(imported);
    setImporting(false);
    return imported;
  }, [addPhotos]);

  return { importLocalFiles, importFiles, importing, progress, error };
}

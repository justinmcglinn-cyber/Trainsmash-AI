import { useState, useCallback } from 'react';
import { Image } from 'react-native';
import { extractPreview } from '../modules/arw-processor';
import { useCollageStore } from '../store/collage.store';
import { Photo } from '../store/types';

let nextId = 1;
function generateId(): string {
  return `photo_${nextId++}_${Date.now()}`;
}

export function usePhotoImport() {
  const addPhotos = useCollageStore(s => s.addPhotos);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const importFiles = useCallback(async (uris: string[]) => {
    setImporting(true);
    setError(null);
    setProgress({ done: 0, total: uris.length });

    const imported: Photo[] = [];
    const CONCURRENCY = 3;

    for (let i = 0; i < uris.length; i += CONCURRENCY) {
      const batch = uris.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (uri) => {
          const result = await extractPreview(uri);
          return result;
        })
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

  return { importFiles, importing, progress, error };
}

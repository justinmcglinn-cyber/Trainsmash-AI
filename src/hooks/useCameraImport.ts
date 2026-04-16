import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { extractPreview } from '../modules/arw-processor';
import { TRAINSMASH_DIR } from './useLocalLibrary';

const RAW_EXTS = new Set([
  'arw', 'dng', 'nef', 'cr2', 'cr3', 'raf', 'rw2', 'orf', 'srw', 'pef',
]);

function getExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function todayFolder(): string {
  const d = new Date();
  return (
    String(d.getFullYear()) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
}

/** Use EXIF captureDate "YYYYMMDD" if valid, otherwise fall back to today. */
function folderForDate(captureDate?: string): string {
  if (captureDate && /^\d{8}$/.test(captureDate)) return captureDate;
  return todayFolder();
}

export interface ImportProgress {
  done: number;
  total: number;
  currentFile: string;
}

/**
 * Opens the system file picker (supports multi-select).
 * For RAW files: extracts embedded JPEG preview via ArwProcessor.
 * For JPEG/PNG files: copies directly.
 * Saves results to Trainsmash/YYYYMMDD/ on device storage.
 * Returns the number of files successfully saved.
 */
export function useCameraImport() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    done: 0,
    total: 0,
    currentFile: '',
  });
  const [error, setError] = useState<string | null>(null);

  const importFromCamera = useCallback(async (): Promise<number> => {
    setError(null);

    let picked: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      picked = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
        multiple: true,
      });
    } catch {
      setError('Could not open file picker');
      return 0;
    }

    if (picked.canceled || !picked.assets?.length) return 0;

    const files = picked.assets.filter(a => {
      const ext = getExt(a.name ?? a.uri);
      return RAW_EXTS.has(ext) || ext === 'jpg' || ext === 'jpeg' || ext === 'png';
    });

    if (files.length === 0) {
      setError('Select RAW (.arw .nef .dng …) or JPEG files to import.');
      return 0;
    }

    setImporting(true);
    setProgress({ done: 0, total: files.length, currentFile: '' });

    let saved = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name ?? `photo_${i}`;
      const ext = getExt(name);
      const baseName = name.replace(/\.[^.]+$/, '');

      setProgress({ done: i, total: files.length, currentFile: name });

      try {
        if (RAW_EXTS.has(ext)) {
          // Extract embedded JPEG preview — captureDate comes from EXIF
          const preview = await extractPreview(file.uri);
          const targetDir = TRAINSMASH_DIR + folderForDate(preview.captureDate) + '/';
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
          const targetPath = `${targetDir}${baseName}.jpg`;
          const already = await FileSystem.getInfoAsync(targetPath);
          if (already.exists) {
            saved++;
          } else {
            const base64 = preview.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
            await FileSystem.writeAsStringAsync(targetPath, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            saved++;
          }
        } else {
          // JPEG or PNG — no EXIF extraction, use today's date folder
          const targetDir = TRAINSMASH_DIR + todayFolder() + '/';
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
          const targetPath = `${targetDir}${baseName}.jpg`;
          const already = await FileSystem.getInfoAsync(targetPath);
          if (already.exists) {
            saved++;
          } else {
            await FileSystem.copyAsync({ from: file.uri, to: targetPath });
            saved++;
          }
        }
      } catch (e) {
        console.warn(`Import failed for ${name}:`, e);
      }

      setProgress({ done: i + 1, total: files.length, currentFile: name });
    }

    setImporting(false);
    return saved;
  }, []);

  return { importFromCamera, importing, progress, error };
}

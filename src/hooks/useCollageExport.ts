import { useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useCollageStore } from '../store/collage.store';
import { PRESETS } from '../store/types';
import { TEMPLATES } from '../templates/templates';

/** Multiplier: export-res coords → display-res coords */
export const DISPLAY_SCALE = 0.4;

export function useCollageExport() {
  const store = useCollageStore();

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  }, []);

  /**
   * Export the current collage to JPEG and save to media library + share.
   *
   * NOTE: React Native Skia's off-screen surface API is used here.
   * We import makeImageSnapshot lazily to avoid circular refs.
   */
  const exportCollage = useCallback(async () => {
    const { Skia, ImageFormat } = await import('@shopify/react-native-skia');

    store.setExportStatus('exporting');

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        throw new Error('Media library permission denied');
      }

      const preset = PRESETS[store.canvasPreset];
      const exportW = preset.width;
      const exportH = preset.height;
      const exportGap = store.gapPx;

      // Build export-resolution slot rects
      const slotRects = TEMPLATES[store.activeTemplate].getSlots(
        exportW,
        exportH,
        exportGap
      );

      // Create off-screen Skia surface at full export resolution
      const surface = Skia.Surface.Make(exportW, exportH);
      if (!surface) throw new Error('Failed to create Skia surface');

      const canvas = surface.getCanvas();

      // Draw background
      const bgPaint = Skia.Paint();
      bgPaint.setColor(Skia.Color(store.backgroundColor));
      canvas.drawRect(Skia.XYWHRect(0, 0, exportW, exportH), bgPaint);

      const photoMap = new Map(store.photos.map(p => [p.id, p]));

      // Draw each slot
      for (let i = 0; i < slotRects.length; i++) {
        const slotRect = slotRects[i];
        const slot = store.slots[i];
        if (!slot?.photoId) continue;

        const photo = photoMap.get(slot.photoId);
        if (!photo) continue;

        // Load image from data URL
        const data = Skia.Data.fromBase64(
          photo.previewDataUrl.replace(/^data:image\/jpeg;base64,/, '')
        );
        const skImage = Skia.Image.MakeImageFromEncoded(data);
        if (!skImage) continue;

        // Compute cover-fit dimensions at export scale
        const coverScale = Math.max(
          slotRect.w / photo.naturalWidth,
          slotRect.h / photo.naturalHeight
        ) * slot.scale;

        const imgW = photo.naturalWidth * coverScale;
        const imgH = photo.naturalHeight * coverScale;

        // Convert display-res offsets to export-res
        const imgX = slotRect.x + slot.offsetX;
        const imgY = slotRect.y + slot.offsetY;

        // Clip to slot bounds
        canvas.save();
        const clipRect = Skia.XYWHRect(slotRect.x, slotRect.y, slotRect.w, slotRect.h);
        canvas.clipRect(clipRect, 0 /* Intersect */, false);

        const destRect = Skia.XYWHRect(imgX, imgY, imgW, imgH);
        canvas.drawImageRect(
          skImage,
          Skia.XYWHRect(0, 0, photo.naturalWidth, photo.naturalHeight),
          destRect,
          Skia.Paint()
        );

        canvas.restore();
      }

      // Snapshot as JPEG
      const image = surface.makeImageSnapshot();
      const jpegBytes = image.encodeToBytes(ImageFormat.JPEG, 92);
      if (!jpegBytes) throw new Error('Failed to encode image');

      // Write to cache
      const fileName = `collage_${preset.id}_${Date.now()}.jpg`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(
        filePath,
        // Convert Uint8Array to base64
        uint8ToBase64(jpegBytes),
        { encoding: FileSystem.EncodingType.Base64 }
      );

      // Save to gallery
      const asset = await MediaLibrary.saveToLibraryAsync(filePath);
      store.setLastExportUri(filePath);
      store.setExportStatus('done');

      // Share
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share your collage',
        });
      }

      return filePath;
    } catch (e) {
      store.setExportStatus('error');
      throw e;
    }
  }, [store, requestPermissions]);

  return { exportCollage };
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Rect, useImage } from '@shopify/react-native-skia';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useCollageStore } from '../../store/collage.store';
import { PRESETS } from '../../store/types';
import { TEMPLATES } from '../../templates/templates';
import { SkiaSlot, SkiaSlotImage } from './SkiaSlot';

/** The canvas is displayed at this fraction of the export resolution */
const DISPLAY_SCALE = 0.4;

interface Props {
  /** Called when user drops a photo onto a slot index */
  onSlotDrop?: (slotIndex: number, photoId: string) => void;
  activeDragPhotoId?: string | null;
}

export { DISPLAY_SCALE };

export function SkiaCollageCanvas({ onSlotDrop, activeDragPhotoId }: Props) {
  const canvasPreset = useCollageStore(s => s.canvasPreset);
  const backgroundColor = useCollageStore(s => s.backgroundColor);
  const gapPx = useCollageStore(s => s.gapPx);
  const activeTemplate = useCollageStore(s => s.activeTemplate);
  const slots = useCollageStore(s => s.slots);
  const photos = useCollageStore(s => s.photos);

  const preset = PRESETS[canvasPreset];
  const displayW = preset.width * DISPLAY_SCALE;
  const displayH = preset.height * DISPLAY_SCALE;
  const displayGap = gapPx * DISPLAY_SCALE;

  const slotRects = useMemo(
    () => TEMPLATES[activeTemplate].getSlots(displayW, displayH, displayGap),
    [activeTemplate, displayW, displayH, displayGap]
  );

  const photoMap = useMemo(() => {
    const map = new Map(photos.map(p => [p.id, p]));
    return map;
  }, [photos]);

  // We need to load Skia images for each occupied slot.
  // useImage must be called unconditionally so we pre-build an array.
  const slotPhotos = slots.map((slot, i) =>
    slot.photoId ? photoMap.get(slot.photoId) ?? null : null
  );

  return (
    <View style={styles.wrapper}>
      <GestureHandlerRootView style={{ width: displayW, height: displayH }}>
        <View style={{ width: displayW, height: displayH }}>
          {/* Skia Canvas for rendering */}
          <Canvas style={{ width: displayW, height: displayH }}>
            {/* Background */}
            <Rect
              x={0}
              y={0}
              width={displayW}
              height={displayH}
              color={backgroundColor}
            />

            {/* Slot placeholders and images */}
            {slotRects.map((slotRect, i) => {
              const slot = slots[i];
              const photo = slotPhotos[i];
              return (
                <SlotImageLayer
                  key={i}
                  slotRect={slotRect}
                  slot={slot}
                  photo={photo}
                  displayScale={DISPLAY_SCALE}
                />
              );
            })}
          </Canvas>

          {/* Gesture overlay — transparent Views over each slot for touch handling */}
          {slotRects.map((slotRect, i) => {
            const slot = slots[i];
            const photo = slotPhotos[i];
            return (
              <SkiaSlot
                key={i}
                index={i}
                slotRect={slotRect}
                slot={slot}
                photo={photo}
                displayScale={DISPLAY_SCALE}
              />
            );
          })}
        </View>
      </GestureHandlerRootView>
    </View>
  );
}

/**
 * Inner component that calls useImage (a hook) — must be a separate component
 * so hooks are called in stable order even when photo changes.
 */
function SlotImageLayer({
  slotRect,
  slot,
  photo,
  displayScale,
}: {
  slotRect: any;
  slot: any;
  photo: any;
  displayScale: number;
}) {
  const skImage = useImage(photo?.previewDataUrl ?? null);

  if (!photo || !skImage) {
    // Render empty slot placeholder
    return (
      <Rect
        x={slotRect.x + 0.5}
        y={slotRect.y + 0.5}
        width={slotRect.w - 1}
        height={slotRect.h - 1}
        color="#e8e8e8"
      />
    );
  }

  return (
    <SkiaSlotImage
      slotRect={slotRect}
      slot={slot}
      photo={photo}
      skImage={skImage}
      displayScale={displayScale}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});

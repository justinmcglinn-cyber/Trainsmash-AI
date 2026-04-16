import React, { useCallback, useMemo } from 'react';
import {
  Canvas,
  Image,
  Rect,
  Group,
  useImage,
  rect,
  SkImage,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { SlotRect, CollageSlot, Photo } from '../../store/types';
import { useCollageStore } from '../../store/collage.store';

interface Props {
  index: number;
  slotRect: SlotRect;
  slot: CollageSlot;
  photo: Photo | null;
  /** DISPLAY_SCALE factor (canvas display size / export size) */
  displayScale: number;
  onDropTarget?: (slotIndex: number) => void;
}

/**
 * Compute the initial "cover fit" dimensions so the photo fills the slot
 * with no letterboxing, preserving aspect ratio.
 */
function coverFit(
  photoW: number,
  photoH: number,
  slotW: number,
  slotH: number,
  userScale: number
): { w: number; h: number } {
  const scale = Math.max(slotW / photoW, slotH / photoH) * userScale;
  return { w: photoW * scale, h: photoH * scale };
}

/**
 * Clamp pan offset so the image always covers the slot — no blank edges.
 */
function clampOffset(
  offsetX: number,
  offsetY: number,
  imgW: number,
  imgH: number,
  slotW: number,
  slotH: number
): { x: number; y: number } {
  const maxX = 0;
  const minX = -(imgW - slotW);
  const maxY = 0;
  const minY = -(imgH - slotH);
  return {
    x: Math.min(maxX, Math.max(minX, offsetX)),
    y: Math.min(maxY, Math.max(minY, offsetY)),
  };
}

export function SkiaSlot({
  index,
  slotRect,
  slot,
  photo,
  displayScale,
}: Props) {
  const updateSlotOffset = useCollageStore(s => s.updateSlotOffset);
  const updateSlotScale = useCollageStore(s => s.updateSlotScale);
  const clearSlot = useCollageStore(s => s.clearSlot);

  const skImage = useImage(photo?.previewDataUrl ?? null);

  // Shared values for gesture-driven pan/scale
  const panX = useSharedValue(slot.offsetX * displayScale);
  const panY = useSharedValue(slot.offsetY * displayScale);
  const scale = useSharedValue(slot.scale);
  const savedPanX = useSharedValue(slot.offsetX * displayScale);
  const savedPanY = useSharedValue(slot.offsetY * displayScale);
  const savedScale = useSharedValue(slot.scale);

  const slotW = slotRect.w;
  const slotH = slotRect.h;

  const saveOffset = useCallback(
    (x: number, y: number, s: number) => {
      updateSlotOffset(index, {
        x: x / displayScale,
        y: y / displayScale,
      });
      updateSlotScale(index, s);
    },
    [index, displayScale, updateSlotOffset, updateSlotScale]
  );

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      if (!photo) return;
      const { w: imgW, h: imgH } = coverFit(
        photo.naturalWidth,
        photo.naturalHeight,
        slotW,
        slotH,
        scale.value
      );
      const clamped = clampOffset(
        savedPanX.value + e.translationX,
        savedPanY.value + e.translationY,
        imgW,
        imgH,
        slotW,
        slotH
      );
      panX.value = clamped.x;
      panY.value = clamped.y;
    })
    .onEnd(() => {
      savedPanX.value = panX.value;
      savedPanY.value = panY.value;
      runOnJS(saveOffset)(panX.value, panY.value, scale.value);
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(0.5, Math.min(5, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(saveOffset)(panX.value, panY.value, scale.value);
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      // Reset pan/scale on double-tap
      panX.value = 0;
      panY.value = 0;
      scale.value = 1;
      savedPanX.value = 0;
      savedPanY.value = 0;
      savedScale.value = 1;
      runOnJS(saveOffset)(0, 0, 1);
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);
  const withDoubleTap = Gesture.Exclusive(doubleTapGesture, composed);

  // Render nothing if no image — slot placeholder drawn by parent
  if (!skImage || !photo) {
    return null;
  }

  const { w: imgW, h: imgH } = coverFit(
    photo.naturalWidth,
    photo.naturalHeight,
    slotW,
    slotH,
    slot.scale
  );

  return (
    <GestureDetector gesture={withDoubleTap}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          // Position the gesture area over the slot
          {
            left: slotRect.x,
            top: slotRect.y,
            width: slotW,
            height: slotH,
            overflow: 'hidden',
          },
        ]}
      >
        {/* The image is rendered on the parent Skia Canvas, not here —
            this View is only for gesture capture. The actual drawing
            happens via SkiaSlotImage which is composed in SkiaCollageCanvas. */}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Pure Skia rendering component — rendered inside the parent Canvas.
 * Separated from gesture handling (SkiaSlot) because react-native-gesture-handler
 * wraps RN Views, not Skia canvas nodes.
 */
export interface SkiaSlotImageProps {
  slotRect: SlotRect;
  slot: CollageSlot;
  photo: Photo;
  skImage: SkImage;
  displayScale: number;
}

export function SkiaSlotImage({
  slotRect,
  slot,
  photo,
  skImage,
  displayScale,
}: SkiaSlotImageProps) {
  const clipR = rect(slotRect.x, slotRect.y, slotRect.w, slotRect.h);
  const { w: imgW, h: imgH } = coverFit(
    photo.naturalWidth,
    photo.naturalHeight,
    slotRect.w,
    slotRect.h,
    slot.scale
  );

  const imgX = slotRect.x + slot.offsetX * displayScale;
  const imgY = slotRect.y + slot.offsetY * displayScale;

  return (
    <Group clip={clipR}>
      <Image
        image={skImage}
        x={imgX}
        y={imgY}
        width={imgW}
        height={imgH}
        fit="fill"
      />
    </Group>
  );
}

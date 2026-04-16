export type ExportPresetId =
  | 'instagram_square'
  | 'instagram_portrait'
  | 'instagram_story'
  | 'facebook_square'
  | 'facebook_landscape';

export interface ExportPreset {
  id: ExportPresetId;
  label: string;
  width: number;
  height: number;
}

export const PRESETS: Record<ExportPresetId, ExportPreset> = {
  instagram_square: { id: 'instagram_square', label: 'Instagram Square', width: 1080, height: 1080 },
  instagram_portrait: { id: 'instagram_portrait', label: 'Instagram Portrait', width: 1080, height: 1350 },
  instagram_story: { id: 'instagram_story', label: 'Instagram Story', width: 1080, height: 1920 },
  facebook_square: { id: 'facebook_square', label: 'Facebook Square', width: 1200, height: 1200 },
  facebook_landscape: { id: 'facebook_landscape', label: 'Facebook Landscape', width: 1200, height: 630 },
};

export type TemplateId =
  | '1x1'
  | '2x1'
  | '1x2'
  | '2x2'
  | '3x1'
  | '1x3'
  | '3x2'
  | '2x3'
  | '1_plus_2'
  | '2_plus_1'
  | 'L_left'
  | 'L_right';

export interface SlotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CollageSlot {
  photoId: string | null;
  /** Pan offset X in export-resolution pixels */
  offsetX: number;
  /** Pan offset Y in export-resolution pixels */
  offsetY: number;
  /** Scale multiplier (1.0 = cover fit) */
  scale: number;
}

export interface Photo {
  id: string;
  uri: string;
  /** base64 data URL of extracted JPEG preview */
  previewDataUrl: string;
  /** Natural width of the preview image */
  naturalWidth: number;
  /** Natural height of the preview image */
  naturalHeight: number;
  fileName: string;
}

export type ExportStatus = 'idle' | 'exporting' | 'done' | 'error';

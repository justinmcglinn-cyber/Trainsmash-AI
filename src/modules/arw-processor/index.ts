import { NativeModules, Platform } from 'react-native';

const { ArwProcessor } = NativeModules;

export interface ArwPreviewResult {
  /** base64 data URL, e.g. "data:image/jpeg;base64,..." */
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Extract the embedded JPEG preview from a RAW file (ARW, DNG, NEF, CR2, etc.)
 * by parsing the TIFF/IFD structure without decoding the RAW sensor data.
 *
 * @param uri - content:// or file:// URI of the RAW file
 * @returns Preview JPEG as base64 data URL with dimensions
 */
export async function extractPreview(uri: string): Promise<ArwPreviewResult> {
  if (Platform.OS !== 'android') {
    throw new Error('ArwProcessor is only supported on Android');
  }
  return ArwProcessor.extractPreview(uri);
}

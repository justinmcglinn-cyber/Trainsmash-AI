import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Photo } from '../../store/types';

interface Props {
  photo: Photo;
  onLongPress: (photo: Photo) => void;
  onPress?: (photo: Photo) => void;
  /** Highlight as being dragged */
  isDragging?: boolean;
}

export function PhotoThumbnail({ photo, onLongPress, onPress, isDragging }: Props) {
  return (
    <TouchableOpacity
      style={[styles.container, isDragging && styles.dragging]}
      onLongPress={() => onLongPress(photo)}
      onPress={() => onPress?.(photo)}
      delayLongPress={250}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: photo.previewDataUrl }}
        style={styles.image}
        resizeMode="cover"
      />
      <Text style={styles.name} numberOfLines={1}>
        {photo.fileName}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 72,
    marginBottom: 6,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dragging: {
    opacity: 0.5,
    borderColor: '#007AFF',
  },
  image: {
    width: 72,
    height: 72,
  },
  name: {
    fontSize: 9,
    color: '#888',
    paddingHorizontal: 2,
    paddingVertical: 2,
    backgroundColor: '#f8f8f8',
    textAlign: 'center',
  },
});

import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LocalFolder } from '../../hooks/useLocalLibrary';

interface Props {
  folder: LocalFolder;
  expanded: boolean;
  onToggle: () => void;
  onSelectAll: () => void;
  selectedUris: Set<string>;
  onToggleFile: (uri: string) => void;
}

export function FolderRow({
  folder,
  expanded,
  onToggle,
  onSelectAll,
  selectedUris,
  onToggleFile,
}: Props) {
  const files = folder.children;
  const selectedCount = files.filter(f => selectedUris.has(f.uri)).length;
  const allSelected = files.length > 0 && selectedCount === files.length;

  return (
    <View>
      <TouchableOpacity style={styles.folderHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
        <View style={styles.folderInfo}>
          <Text style={styles.folderName}>{formatFolderName(folder.name)}</Text>
          <Text style={styles.folderMeta}>
            {files.length} photo{files.length !== 1 ? 's' : ''}
            {selectedCount > 0 ? `  ·  ${selectedCount} selected` : ''}
          </Text>
        </View>
        {files.length > 0 && (
          <TouchableOpacity
            style={[styles.selectAllBtn, allSelected && styles.selectAllBtnActive]}
            onPress={onSelectAll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.selectAllText, allSelected && styles.selectAllTextActive]}>
              {allSelected ? 'Deselect' : 'All'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.grid}>
          {files.map(file => {
            const selected = selectedUris.has(file.uri);
            return (
              <TouchableOpacity
                key={file.uri}
                style={[styles.photoCell, selected && styles.photoCellSelected]}
                onPress={() => onToggleFile(file.uri)}
                activeOpacity={0.75}
              >
                <Image
                  source={{ uri: file.uri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                {selected && (
                  <View style={styles.checkOverlay}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
                <Text style={styles.photoName} numberOfLines={1}>
                  {file.name.replace(/\.[^.]+$/, '')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** "20240416" → "16 Apr 2024", falls back to raw string */
function formatFolderName(name: string): string {
  if (/^\d{8}$/.test(name)) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const m = parseInt(name.slice(4, 6), 10) - 1;
    return `${name.slice(6, 8)} ${months[m] ?? ''} ${name.slice(0, 4)}`;
  }
  return name;
}

const CELL = 96;
const GAP = 6;

const styles = StyleSheet.create({
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  chevron: { fontSize: 16, color: '#555', marginRight: 8, width: 16 },
  folderInfo: { flex: 1 },
  folderName: { fontSize: 15, fontWeight: '600', color: '#111' },
  folderMeta: { fontSize: 12, color: '#888', marginTop: 1 },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectAllBtnActive: { backgroundColor: '#007AFF' },
  selectAllText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  selectAllTextActive: { color: '#fff' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: GAP,
    gap: GAP,
    backgroundColor: '#fff',
  },
  photoCell: {
    width: CELL,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  photoCellSelected: { borderColor: '#007AFF' },
  thumbnail: { width: CELL, height: CELL, backgroundColor: '#eee' },
  checkOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  photoName: {
    fontSize: 9,
    color: '#666',
    paddingHorizontal: 3,
    paddingVertical: 3,
    backgroundColor: '#f8f8f8',
    textAlign: 'center',
  },
});

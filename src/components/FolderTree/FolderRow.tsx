import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraFolder } from '../../hooks/useCameraVolume';

interface Props {
  folder: CameraFolder;
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
  const files = folder.children ?? [];
  const selectedCount = files.filter(f => selectedUris.has(f.uri)).length;
  const allSelected = files.length > 0 && selectedCount === files.length;

  return (
    <View>
      <TouchableOpacity style={styles.folderHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
        <View style={styles.folderInfo}>
          <Text style={styles.folderName}>{folder.name}</Text>
          <Text style={styles.folderMeta}>{files.length} RAW files</Text>
        </View>
        {files.length > 0 && (
          <TouchableOpacity
            style={[styles.selectAllBtn, allSelected && styles.selectAllBtnActive]}
            onPress={onSelectAll}
          >
            <Text style={[styles.selectAllText, allSelected && styles.selectAllTextActive]}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {expanded &&
        files.map(file => {
          const selected = selectedUris.has(file.uri);
          return (
            <TouchableOpacity
              key={file.uri}
              style={[styles.fileRow, selected && styles.fileRowSelected]}
              onPress={() => onToggleFile(file.uri)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                {file.size != null && (
                  <Text style={styles.fileSize}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  chevron: {
    fontSize: 16,
    color: '#555',
    marginRight: 8,
    width: 16,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  folderMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectAllBtnActive: {
    backgroundColor: '#007AFF',
  },
  selectAllText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  selectAllTextActive: {
    color: '#fff',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingLeft: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  fileRowSelected: {
    backgroundColor: '#EEF4FF',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#bbb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileName: {
    fontSize: 13,
    color: '#222',
    flex: 1,
    marginRight: 8,
  },
  fileSize: {
    fontSize: 11,
    color: '#999',
  },
});

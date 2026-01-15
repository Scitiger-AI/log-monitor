'use client';

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Plus, X, Edit2, Check, FolderOpen } from 'lucide-react';
import { LogGroup } from '@/store';

interface GroupTabBarProps {
  groups: LogGroup[];
  activeGroupId: string | null;
  onGroupChange: (groupId: string | null) => void;
  onAddGroup: () => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  ungroupedCount: number;  // 未分组日志数量
}

// 单个分组 Tab
interface GroupTabProps {
  group: LogGroup;
  isActive: boolean;
  onClick: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

const GroupTab = memo(function GroupTab({
  group,
  isActive,
  onClick,
  onRename,
  onDelete,
}: GroupTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(group.name);
    setIsEditing(true);
  }, [group.name]);

  const handleSave = useCallback(() => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== group.name) {
      onRename(trimmedName);
    }
    setIsEditing(false);
  }, [editName, group.name, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditName(group.name);
      setIsEditing(false);
    }
  }, [handleSave, group.name]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  return (
    <div
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-b-2 transition-colors
        min-w-[80px] max-w-[160px] group
        ${isActive
          ? 'border-blue-500 bg-[#1a1a1a] text-gray-200'
          : 'border-transparent bg-transparent text-gray-400 hover:text-gray-300 hover:bg-[#2a2a2a]'}
      `}
    >
      <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500" />

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-[#333] text-gray-200 text-sm px-1 py-0.5 rounded border border-blue-500 outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-sm truncate flex-1" title={group.name}>
          {group.name}
        </span>
      )}

      {!isEditing && (
        <button
          onClick={handleDelete}
          className="p-0.5 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          title="删除分组"
        >
          <X className="w-3 h-3 text-gray-400" />
        </button>
      )}
    </div>
  );
});

// 未分组 Tab
interface UngroupedTabProps {
  isActive: boolean;
  count: number;
  onClick: () => void;
}

const UngroupedTab = memo(function UngroupedTab({
  isActive,
  count,
  onClick,
}: UngroupedTabProps) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-b-2 transition-colors
        min-w-[80px]
        ${isActive
          ? 'border-blue-500 bg-[#1a1a1a] text-gray-200'
          : 'border-transparent bg-transparent text-gray-400 hover:text-gray-300 hover:bg-[#2a2a2a]'}
      `}
    >
      <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
      <span className="text-sm">全部</span>
      {count > 0 && (
        <span className="text-xs text-gray-500">({count})</span>
      )}
    </div>
  );
});

export const GroupTabBar = memo(function GroupTabBar({
  groups,
  activeGroupId,
  onGroupChange,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
  ungroupedCount,
}: GroupTabBarProps) {
  return (
    <div className="flex items-center bg-[#252525] border-b border-gray-700 overflow-x-auto">
      {/* 全部（未分组）Tab */}
      <UngroupedTab
        isActive={activeGroupId === null}
        count={ungroupedCount}
        onClick={() => onGroupChange(null)}
      />

      {/* 分组 Tabs */}
      {groups.map(group => (
        <GroupTab
          key={group.id}
          group={group}
          isActive={activeGroupId === group.id}
          onClick={() => onGroupChange(group.id)}
          onRename={(newName) => onRenameGroup(group.id, newName)}
          onDelete={() => onDeleteGroup(group.id)}
        />
      ))}

      {/* 添加分组按钮 */}
      <button
        onClick={onAddGroup}
        className="flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a] transition-colors"
        title="新建分组"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
});

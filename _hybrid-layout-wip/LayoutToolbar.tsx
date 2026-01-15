'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Grid3X3, Search, X, ChevronDown } from 'lucide-react';
import { LayoutConfig, LAYOUT_PRESETS } from '@/store';

interface LayoutToolbarProps {
  currentLayout: LayoutConfig;
  onLayoutChange: (layout: LayoutConfig) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalPanels: number;
  activeCount: number;
}

// 布局选择器下拉菜单
interface LayoutSelectorProps {
  currentLayout: LayoutConfig;
  onSelect: (layout: LayoutConfig) => void;
}

const LayoutSelector = memo(function LayoutSelector({
  currentLayout,
  onSelect,
}: LayoutSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = useCallback((layout: LayoutConfig) => {
    onSelect(layout);
    setIsOpen(false);
  }, [onSelect]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
      >
        <Grid3X3 className="w-4 h-4 text-gray-300" />
        <span className="text-sm text-gray-200">{currentLayout.name}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-[120px]">
          {LAYOUT_PRESETS.map(layout => (
            <button
              key={layout.name}
              onClick={() => handleSelect(layout)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left
                hover:bg-gray-700 transition-colors
                ${layout.name === currentLayout.name ? 'bg-gray-700 text-blue-400' : 'text-gray-200'}
              `}
            >
              <span className="text-sm">{layout.name}</span>
              <span className="text-xs text-gray-500 ml-auto">
                {layout.rows * layout.cols}格
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export const LayoutToolbar = memo(function LayoutToolbar({
  currentLayout,
  onLayoutChange,
  searchQuery,
  onSearchChange,
  totalPanels,
  activeCount,
}: LayoutToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleClearSearch = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-[#252525] border-b border-gray-700">
      {/* 状态统计 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">日志:</span>
        <span className="text-gray-200">{totalPanels}</span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-400">显示:</span>
        <span className="text-blue-400">{activeCount}</span>
        <span className="text-gray-500">/ {currentLayout.rows * currentLayout.cols}</span>
      </div>

      {/* 分隔线 */}
      <div className="h-4 w-px bg-gray-700" />

      {/* 布局选择器 */}
      <LayoutSelector
        currentLayout={currentLayout}
        onSelect={onLayoutChange}
      />

      {/* 弹性空间 */}
      <div className="flex-1" />

      {/* 搜索框 */}
      <div
        className={`
          flex items-center gap-2 px-2 py-1 rounded
          transition-all duration-200
          ${isSearchFocused
            ? 'bg-gray-700 ring-1 ring-blue-500 w-48'
            : 'bg-gray-800 w-36'}
        `}
      >
        <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="搜索日志..."
          className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="p-0.5 hover:bg-gray-600 rounded"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
});

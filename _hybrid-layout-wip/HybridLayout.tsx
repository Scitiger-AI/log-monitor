'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import { LayoutToolbar } from './LayoutToolbar';
import { LogStatusList } from './LogStatusList';
import { SplitViewGrid } from './SplitViewGrid';
import {
  useStore,
  LogPanel,
  LayoutConfig,
} from '@/store';

interface HybridLayoutProps {
  panels: LogPanel[];
  onClose: (panel: LogPanel) => void;
  onTerminalReady: (logFileId: string, terminal: Terminal) => void;
}

export const HybridLayout = memo(function HybridLayout({
  panels,
  onClose,
  onTerminalReady,
}: HybridLayoutProps) {
  const {
    activeViewIds,
    currentLayout,
    maximizedPanelId,
    lastLogLines,
    addToActiveView,
    removeFromActiveView,
    setActiveViewIds,
    setCurrentLayout,
    setMaximizedPanel,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');

  // 过滤后的面板列表
  const filteredPanels = useMemo(() => {
    if (!searchQuery.trim()) return panels;

    const query = searchQuery.toLowerCase();
    return panels.filter(panel =>
      panel.logFile.name.toLowerCase().includes(query) ||
      panel.logFile.path.toLowerCase().includes(query) ||
      panel.server.name.toLowerCase().includes(query)
    );
  }, [panels, searchQuery]);

  // 切换视图显示
  const handleToggleView = useCallback((panelId: string) => {
    if (activeViewIds.includes(panelId)) {
      removeFromActiveView(panelId);
    } else {
      addToActiveView(panelId);
    }
  }, [activeViewIds, addToActiveView, removeFromActiveView]);

  // 从视图中移除
  const handleRemoveFromView = useCallback((panelId: string) => {
    removeFromActiveView(panelId);
  }, [removeFromActiveView]);

  // 关闭面板（完全移除）
  const handleRemovePanel = useCallback((panel: LogPanel) => {
    onClose(panel);
  }, [onClose]);

  // 布局变更
  const handleLayoutChange = useCallback((layout: LayoutConfig) => {
    setCurrentLayout(layout);
  }, [setCurrentLayout]);

  // 重新排序
  const handleReorder = useCallback((panelIds: string[]) => {
    setActiveViewIds(panelIds);
  }, [setActiveViewIds]);

  // 最大化切换
  const handleMaximize = useCallback((panelId: string | null) => {
    setMaximizedPanel(panelId);
  }, [setMaximizedPanel]);

  // 活跃视图数量
  const activeCount = useMemo(() => {
    return activeViewIds.filter(id => panels.some(p => p.id === id)).length;
  }, [activeViewIds, panels]);

  // 空状态
  if (panels.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">双击左侧日志文件开始监控</p>
          <p className="text-sm">支持同时监控多个日志文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <LayoutToolbar
        currentLayout={currentLayout}
        onLayoutChange={handleLayoutChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalPanels={panels.length}
        activeCount={activeCount}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧状态列表 */}
        <div className="w-56 flex-shrink-0 border-r border-gray-700 bg-[#1e1e1e] flex flex-col">
          <div className="px-3 py-2 border-b border-gray-700 bg-[#252525]">
            <span className="text-xs text-gray-400 font-medium">已打开的日志</span>
          </div>
          <LogStatusList
            panels={filteredPanels}
            activeViewIds={activeViewIds}
            lastLogLines={lastLogLines}
            onToggleView={handleToggleView}
            onRemove={handleRemovePanel}
          />
        </div>

        {/* 右侧分屏视图 */}
        <div className="flex-1 min-w-0 h-full">
          <SplitViewGrid
            panels={panels}
            activeViewIds={activeViewIds}
            layout={currentLayout}
            maximizedPanelId={maximizedPanelId}
            onMaximize={handleMaximize}
            onRemoveFromView={handleRemoveFromView}
            onReorder={handleReorder}
            onTerminalReady={onTerminalReady}
          />
        </div>
      </div>
    </div>
  );
});

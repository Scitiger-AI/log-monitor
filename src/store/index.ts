import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
  isLocal: boolean;
  createdAt: string;
}

export interface LogFile {
  id: string;
  serverId: string;
  groupId: string | null;  // 所属分组，null 表示未分组
  name: string;
  path: string;
  tailLines: number;
  createdAt: string;
}

export interface LogGroup {
  id: string;
  serverId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface LogPanel {
  id: string;
  logFileId: string;
  logFile: LogFile;
  server: Server;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
}

// 面板顺序存储结构：按服务器ID分组存储面板ID顺序
interface PanelOrder {
  [serverId: string]: string[]; // panel IDs in order
}

interface AppState {
  servers: Server[];
  logFiles: LogFile[];
  logGroups: LogGroup[];  // 日志分组
  panels: LogPanel[];
  panelOrder: PanelOrder; // 面板顺序
  activeGroupId: { [serverId: string]: string | null }; // 每个服务器当前激活的分组

  setServers: (servers: Server[]) => void;
  setLogFiles: (logFiles: LogFile[]) => void;
  setLogGroups: (groups: LogGroup[]) => void;

  addPanel: (panel: LogPanel) => void;
  removePanel: (id: string) => void;
  updatePanelStatus: (id: string, status: LogPanel['status'], errorMessage?: string) => void;
  reorderPanels: (serverId: string, panelIds: string[]) => void; // 重新排序面板

  // 分组相关方法
  setActiveGroupId: (serverId: string, groupId: string | null) => void;
  addLogGroup: (group: LogGroup) => void;
  updateLogGroup: (id: string, updates: Partial<LogGroup>) => void;
  removeLogGroup: (id: string) => void;

  fetchServers: () => Promise<void>;
  fetchLogFiles: () => Promise<void>;
  fetchLogGroups: () => Promise<void>;
}

// 分离持久化状态
interface PersistedState {
  panelOrder: PanelOrder;
  activeGroupId: { [serverId: string]: string | null };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      servers: [],
      logFiles: [],
      logGroups: [],
      panels: [],
      panelOrder: {},
      activeGroupId: {},

      setServers: (servers) => set({ servers }),
      setLogFiles: (logFiles) => set({ logFiles }),
      setLogGroups: (groups) => set({ logGroups: groups }),

      addPanel: (panel) => {
        const { panels, panelOrder } = get();
        if (!panels.find(p => p.logFileId === panel.logFileId)) {
          const serverId = panel.server.id;
          const currentOrder = panelOrder[serverId] || [];
          set({
            panels: [...panels, panel],
            panelOrder: {
              ...panelOrder,
              [serverId]: [...currentOrder, panel.id],
            },
          });
        }
      },

      removePanel: (id) => {
        const { panels, panelOrder } = get();
        const panel = panels.find(p => p.id === id);
        if (panel) {
          const serverId = panel.server.id;
          const currentOrder = panelOrder[serverId] || [];
          const newOrder = currentOrder.filter(pid => pid !== id);
          const newPanelOrder = { ...panelOrder };
          if (newOrder.length === 0) {
            delete newPanelOrder[serverId];
          } else {
            newPanelOrder[serverId] = newOrder;
          }
          set({
            panels: panels.filter(p => p.id !== id),
            panelOrder: newPanelOrder,
          });
        }
      },

      updatePanelStatus: (logFileId, status, errorMessage) => {
        set({
          panels: get().panels.map(p =>
            p.logFileId === logFileId ? { ...p, status, errorMessage } : p
          ),
        });
      },

      reorderPanels: (serverId, panelIds) => {
        const { panelOrder } = get();
        set({
          panelOrder: {
            ...panelOrder,
            [serverId]: panelIds,
          },
        });
      },

      // 分组相关方法
      setActiveGroupId: (serverId, groupId) => {
        const { activeGroupId } = get();
        set({
          activeGroupId: {
            ...activeGroupId,
            [serverId]: groupId,
          },
        });
      },

      addLogGroup: (group) => {
        set({ logGroups: [...get().logGroups, group] });
      },

      updateLogGroup: (id, updates) => {
        set({
          logGroups: get().logGroups.map(g =>
            g.id === id ? { ...g, ...updates } : g
          ),
        });
      },

      removeLogGroup: (id) => {
        const { logGroups, activeGroupId } = get();
        // 清理 activeGroupId 中对该分组的引用
        const newActiveGroupId = { ...activeGroupId };
        for (const serverId in newActiveGroupId) {
          if (newActiveGroupId[serverId] === id) {
            newActiveGroupId[serverId] = null;
          }
        }
        set({
          logGroups: logGroups.filter(g => g.id !== id),
          activeGroupId: newActiveGroupId,
        });
      },

      fetchServers: async () => {
        try {
          const res = await fetch('/api/servers');
          const data = await res.json();
          if (data.success) {
            set({ servers: data.data });
          }
        } catch {
          // Failed to fetch servers
        }
      },

      fetchLogFiles: async () => {
        try {
          const res = await fetch('/api/log-files');
          const data = await res.json();
          if (data.success) {
            set({ logFiles: data.data });
          }
        } catch {
          // Failed to fetch log files
        }
      },

      fetchLogGroups: async () => {
        try {
          const res = await fetch('/api/log-groups');
          const data = await res.json();
          if (data.success) {
            set({ logGroups: data.data });
          }
        } catch {
          // Failed to fetch log groups
        }
      },
    }),
    {
      name: 'log-monitor-storage',
      partialize: (state): PersistedState => ({
        panelOrder: state.panelOrder,
        activeGroupId: state.activeGroupId,
      }),
    }
  )
);

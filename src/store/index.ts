import { create } from 'zustand';

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
  name: string;
  path: string;
  tailLines: number;
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

interface AppState {
  servers: Server[];
  logFiles: LogFile[];
  panels: LogPanel[];

  setServers: (servers: Server[]) => void;
  setLogFiles: (logFiles: LogFile[]) => void;

  addPanel: (panel: LogPanel) => void;
  removePanel: (id: string) => void;
  updatePanelStatus: (id: string, status: LogPanel['status'], errorMessage?: string) => void;

  fetchServers: () => Promise<void>;
  fetchLogFiles: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  servers: [],
  logFiles: [],
  panels: [],

  setServers: (servers) => set({ servers }),
  setLogFiles: (logFiles) => set({ logFiles }),

  addPanel: (panel) => {
    const { panels } = get();
    if (!panels.find(p => p.logFileId === panel.logFileId)) {
      set({ panels: [...panels, panel] });
    }
  },

  removePanel: (id) => {
    set({ panels: get().panels.filter(p => p.id !== id) });
  },

  updatePanelStatus: (logFileId, status, errorMessage) => {
    set({
      panels: get().panels.map(p =>
        p.logFileId === logFileId ? { ...p, status, errorMessage } : p
      ),
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
}));

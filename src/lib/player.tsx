import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PlayerItem = {
  youtubeId: string;
  title?: string;
  teacher?: string;
  channelName?: string;
  durationSec?: number;
  [key: string]: unknown;
};

type PlayerContextValue = {
  current: PlayerItem | null;
  isOpen: boolean;
  play: (item: PlayerItem) => void;
  pause: () => void;
  clear: () => void;
};

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<PlayerItem | null>(null);

  const play = useCallback((item: PlayerItem) => {
    setCurrent(item);
  }, []);

  const pause = useCallback(() => {
    setCurrent((prev) => (prev ? { ...prev } : null));
  }, []);

  const clear = useCallback(() => {
    setCurrent(null);
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      current,
      isOpen: Boolean(current),
      play,
      pause,
      clear,
    }),
    [clear, current, play, pause],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }

  return context;
}

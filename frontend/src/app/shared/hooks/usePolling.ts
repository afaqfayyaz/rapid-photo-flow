import { useEffect, useRef } from 'react';

export const usePolling = (callback: () => void, interval: number = 2000) => {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      savedCallback.current?.();
    };

    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval]);
};


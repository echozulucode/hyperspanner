import { useCallback } from 'react';
import { soundManager } from '../utils/sounds';
import type { SoundName } from '../utils/sounds';

export interface UseSoundReturn {
  play: (soundName: SoundName, onEnd?: () => void) => void;
  setEnabled: (enabled: boolean) => void;
  isEnabled: () => boolean;
}

export const useSound = (): UseSoundReturn => {
  const play = useCallback((soundName: SoundName, onEnd?: () => void) => {
    soundManager.play(soundName, onEnd);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    soundManager.setEnabled(enabled);
  }, []);

  const isEnabled = useCallback(() => soundManager.isEnabled(), []);

  return { play, setEnabled, isEnabled };
};

/**
 * LCARS Sound Effect System.
 * Sounds are off by default; settings toggle re-enables them.
 */

import beep1Src from '../assets/sounds/beep1.mp3';
import beep2Src from '../assets/sounds/beep2.mp3';
import beep3Src from '../assets/sounds/beep3.mp3';
import beep4Src from '../assets/sounds/beep4.mp3';

export type SoundName = 'beep1' | 'beep2' | 'beep3' | 'beep4';

class SoundManager {
  private sounds: Map<SoundName, HTMLAudioElement> = new Map();
  private enabled = false; // off by default per plan-002 §"Sound"

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    const soundFiles: Record<SoundName, string> = {
      beep1: beep1Src,
      beep2: beep2Src,
      beep3: beep3Src,
      beep4: beep4Src,
    };

    Object.entries(soundFiles).forEach(([name, src]) => {
      const audio = new Audio();
      audio.src = src;
      audio.preload = 'auto';
      this.sounds.set(name as SoundName, audio);
    });
  }

  play(soundName: SoundName, onEnd?: () => void): void {
    if (!this.enabled) {
      onEnd?.();
      return;
    }

    const sound = this.sounds.get(soundName);
    if (!sound) {
      onEnd?.();
      return;
    }

    sound.currentTime = 0;
    if (onEnd) {
      sound.onended = onEnd;
    }
    sound.play().catch((error) => {
      console.warn('Failed to play sound:', error);
      onEnd?.();
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const soundManager = new SoundManager();

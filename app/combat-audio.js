"use strict";

(function () {
  const cues = Object.freeze({
    "combat.parry-success": { file: "audio/parry-success.wav", volume: 0.7, voices: 4 },
    "combat.blade-clash": { file: "audio/blade-clash.wav", volume: 0.5, voices: 3 },
    "combat.attack-start": { file: "audio/attack-start.wav", volume: 0.45, voices: 2 }
  });

  class CombatSamples {
    constructor() {
      this.pools = new Map();
      this.active = new Map();
      Object.entries(cues).forEach(([id, cue]) => {
        const pool = Array.from({ length: cue.voices }, () => {
          // Media elements support file:// as well as HTTP, without fetch/CORS.
          const voice = new Audio(new URL(cue.file, document.baseURI).href);
          voice.preload = "auto";
          voice.volume = cue.volume;
          voice.addEventListener("ended", () => this.active.delete(voice));
          voice.addEventListener("error", () => this.active.delete(voice));
          voice.load();
          return voice;
        });
        this.pools.set(id, pool);
      });
    }

    play(id) {
      const pool = this.pools.get(id);
      if (!pool) return;
      const voice = pool.find(item => !this.active.has(item)) || pool[0];
      // Reuse the oldest voice only when polyphony is exhausted.
      pool.splice(pool.indexOf(voice), 1);
      pool.push(voice);
      voice.pause();
      voice.currentTime = 0;
      const token = {};
      this.active.set(voice, token);
      const playing = voice.play();
      if (playing && playing.catch) playing.catch(() => {
        if (this.active.get(voice) === token) this.active.delete(voice);
      });
    }

    stop() {
      this.pools.forEach(pool => pool.forEach(voice => {
        voice.pause();
        voice.currentTime = 0;
      }));
      this.active.clear();
    }
  }

  window.BladeTraceCombatSamples = CombatSamples;
  window.BladeTraceAudioCues = cues;
}());

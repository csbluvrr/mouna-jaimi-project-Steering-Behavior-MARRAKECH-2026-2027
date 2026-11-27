/**
 * Gestionnaire audio de Moo's Funfair :
 * - Effets sonores (.wav) du pack assets/audio/
 * - Synthétiseur musical Web Audio API multi-pistes (mélodie + basse + accords + percussions douces)
 *   offrant une boucle musicale originale et adaptée à l'ambiance de chaque lieu :
 *   1) title     : Valse boîte à musique chaleureuse (3/4, C Maj)
 *   2) hub       : Promenade pastorale Sprout Lands (4/4, G Maj)
 *   3) derby     : Galop festif de course de lapins (4/4, D Maj)
 *   4) snake     : Aventure rétro Pokémon Route / Jardin (4/4, F Maj)
 *   5) ducklings : Prairie kawaii Pompompurin (4/4, C Maj)
 *   6) fox       : Quête héroïque du Temple Hyrule (4/4, D Min -> F Maj)
 */
class SoundManager {
  constructor(assetBase) {
    this.assetBase = assetBase;
    this.muted = false;
    this.sfxVolume = 0.55;
    this.musicVolume = 0.24;
    this.sfxCache = {};

    // Hooks optionnels pour fichiers externes (.mp3/.ogg) — sinon le synthétiseur Web Audio prend le relais !
    this.musicTracks = {
      title: null,
      hub: null,
      derby: null,
      snake: null,
      ducklings: null,
      fox: null
    };

    this.currentMusic = null;
    this.currentMusicKey = null;

    // État du moteur musical Web Audio API (lookahead scheduler zéro-jitter)
    this.ctx = null;
    this.masterGain = null;
    this.noiseBuf = null;
    this._timer = null;
    this._stepIdx = 0;
    this._nextNoteTime = 0;
    this._activeSong = null;

    // Débloquer automatiquement l'AudioContext dès la première interaction utilisateur
    this._unlockHandler = () => this.unlockAudio();
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this._unlockHandler, { passive: true });
      window.addEventListener('keydown', this._unlockHandler, { passive: true });
    }

    this.songs = SoundManager.buildSongs();
  }

  /** Convertit une note MIDI (ex: 60 = C4) en fréquence Hz. */
  static midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  /** Définit les 6 compositions musicales (mélodie, basse, accords, tempo, timbres). */
  static buildSongs() {
    const _ = null;
    return {
      // 1. ÉCRAN TITRE : Valse boîte à musique douce (3/4, 24 temps de croche)
      title: {
        bpm: 112,
        stepBeats: 0.5,
        leadWave: 'sine',
        leadCut: 2600,
        bassWave: 'triangle',
        chordWave: 'sine',
        perc: false,
        lead: [
          72, _, 76, 79, _, 76,   74, _, 77, 81, _, 77,
          76, _, 79, 84, _, 79,   74, _, 72, 71, _, _,
          72, _, 76, 79, _, 81,   79, _, 76, 74, _, 72,
          74, _, 76, 79, _, 74,   72, _, _,  _,  _, _
        ],
        bass: [
          48, _, 60, _, 60, _,    53, _, 65, _, 65, _,
          48, _, 60, _, 60, _,    55, _, 62, _, 62, _,
          57, _, 64, _, 64, _,    53, _, 65, _, 65, _,
          55, _, 62, _, 59, _,    48, _, 60, _, _,  _
        ],
        chords: [
          [60, 64, 67], _, _, _, _, _,   [65, 69, 72], _, _, _, _, _,
          [60, 64, 67], _, _, _, _, _,   [62, 67, 71], _, _, _, _, _,
          [60, 64, 69], _, _, _, _, _,   [65, 69, 72], _, _, _, _, _,
          [62, 67, 71], _, _, _, _, _,   [60, 64, 67], _, _, _, _, _
        ]
      },

      // 2. HUB FUNFAIR : Promenade ensoleillée Sprout Lands (G Majeur, 118 BPM)
      hub: {
        bpm: 118,
        stepBeats: 0.5,
        leadWave: 'triangle',
        leadCut: 2400,
        bassWave: 'triangle',
        chordWave: 'sine',
        perc: 'soft',
        lead: [
          71, _, 74, 79, _, 76, 74, _,   71, _, 72, 74, _, _, _, _,
          76, _, 79, 81, _, 79, 76, _,   74, _, 71, 69, _, _, _, _,
          71, _, 74, 79, _, 83, 81, 79,  76, _, 74, 72, _, 71, 69, _,
          71, 74, 76, _, 74, _, 71, _,   67, _, _,  _,  _, _,  _,  _
        ],
        bass: [
          55, _, 62, _, 55, _, 62, _,    52, _, 59, _, 52, _, 59, _,
          48, _, 55, _, 48, _, 55, _,    50, _, 57, _, 50, _, 57, _,
          55, _, 62, _, 55, _, 59, _,    48, _, 55, _, 57, _, 52, _,
          50, _, 57, _, 50, _, 54, _,    55, _, 62, _, 55, _, _,  _
        ],
        chords: [
          [59, 62, 67], _, _, _, [59, 62, 67], _, _, _,
          [59, 64, 67], _, _, _, [59, 64, 67], _, _, _,
          [60, 64, 67], _, _, _, [60, 64, 67], _, _, _,
          [62, 66, 69], _, _, _, [62, 66, 69], _, _, _,
          [59, 62, 67], _, _, _, [59, 62, 67], _, _, _,
          [60, 64, 67], _, _, _, [60, 64, 69], _, _, _,
          [62, 66, 69], _, _, _, [62, 66, 69], _, _, _,
          [59, 62, 67], _, _, _, _, _, _, _
        ]
      },

      // 3. BUNNY DERBY : Galop festif & entraînant de course (D Majeur, 146 BPM)
      derby: {
        bpm: 146,
        stepBeats: 0.5,
        leadWave: 'square',
        leadCut: 1650,
        bassWave: 'triangle',
        chordWave: 'triangle',
        perc: 'race',
        lead: [
          74, _, 78, 81, _, 81, 78, 74,  79, _, 83, 81, _, 78, _, _,
          76, _, 79, 81, _, 79, 76, 73,  74, _, 78, 81, _, _, _, _,
          86, _, 83, 81, _, 78, 79, 81,  83, _, 81, 79, _, 78, 76, _,
          74, 76, 78, 81, _, 76, 78, 73, 74, _, 86, _,  _, _, _, _
        ],
        bass: [
          50, 62, 50, 62, 57, 62, 50, 62,  55, 67, 55, 67, 50, 62, 57, _,
          57, 64, 57, 64, 52, 64, 57, 61,  50, 62, 54, 62, 57, 62, 50, _,
          50, 62, 54, 62, 57, 62, 50, 62,  55, 67, 59, 67, 57, 64, 52, _,
          50, 62, 54, 62, 57, 64, 57, 61,  50, 62, 50, _,  _, _, _, _
        ],
        chords: [
          [62, 66, 69], _, _, _, [62, 66, 69], _, _, _,
          [62, 67, 71], _, _, _, [62, 66, 69], _, _, _,
          [61, 64, 69], _, _, _, [61, 64, 69], _, _, _,
          [62, 66, 69], _, _, _, [62, 66, 69], _, _, _,
          [62, 66, 69], _, _, _, [62, 66, 69], _, _, _,
          [62, 67, 71], _, _, _, [61, 64, 69], _, _, _,
          [62, 66, 69], _, _, _, [61, 64, 69], _, _, _,
          [62, 66, 69], _, _, _, _, _, _, _
        ]
      },

      // 4. POKÉMOO FEAST!! : Aventure Pokémon rétro enjouée (F Majeur, 134 BPM)
      snake: {
        bpm: 134,
        stepBeats: 0.5,
        leadWave: 'square',
        leadCut: 1800,
        bassWave: 'triangle',
        chordWave: 'triangle',
        perc: 'chip',
        lead: [
          77, 79, 81, _, 81, 79, 77, 74,  72, _, 77, _, 79, _, _, _,
          81, 82, 84, _, 82, 81, 79, 77,  79, _, 76, _, 72, _, _, _,
          77, 79, 81, 84, _, 82, 81, 79,  77, _, 74, 77, _, 79, 81, _,
          82, _, 81, 79, 77, _, 76, 79,   77, _, _, _,  _, _, _, _
        ],
        bass: [
          53, _, 60, _, 53, _, 60, _,     57, _, 64, _, 55, _, 62, _,
          58, _, 65, _, 58, _, 65, _,     60, _, 67, _, 60, 58, 57, 55,
          53, _, 60, _, 57, _, 64, _,     58, _, 65, _, 53, _, 60, _,
          55, _, 62, _, 60, _, 64, _,     53, _, 60, _, 53, _, _, _
        ],
        chords: [
          [65, 69, 72], _, [65, 69, 72], _, _, _, _, _,
          [64, 69, 72], _, _, _, [62, 67, 70], _, _, _,
          [65, 70, 74], _, [65, 70, 74], _, _, _, _, _,
          [64, 67, 72], _, _, _, [64, 67, 72], _, _, _,
          [65, 69, 72], _, _, _, [64, 69, 72], _, _, _,
          [65, 70, 74], _, _, _, [65, 69, 72], _, _, _,
          [62, 67, 70], _, _, _, [64, 67, 72], _, _, _,
          [65, 69, 72], _, _, _, _, _, _, _
        ]
      },

      // 5. CATCH THE PURINS! : Prairie kawaii & sautillante (C Majeur, 124 BPM)
      ducklings: {
        bpm: 124,
        stepBeats: 0.5,
        leadWave: 'triangle',
        leadCut: 2800,
        bassWave: 'sine',
        chordWave: 'sine',
        perc: 'soft',
        lead: [
          76, _, 79, _, 84, _, 79, 76,   77, _, 81, _, 79, _, _, _,
          74, _, 77, _, 83, _, 79, 74,   76, _, 79, _, 72, _, _, _,
          76, 79, 84, _, 83, _, 81, 79,  77, 81, 84, _, 81, _, 77, _,
          79, _, 83, _, 81, _, 79, 74,   72, _, 76, _, 72, _, _, _
        ],
        bass: [
          48, _, 55, _, 48, _, 55, _,    53, _, 60, _, 48, _, 55, _,
          50, _, 55, _, 55, _, 59, _,    48, _, 55, _, 48, _, 55, _,
          48, _, 55, _, 57, _, 64, _,    53, _, 60, _, 53, _, 60, _,
          55, _, 62, _, 55, _, 59, _,    48, _, 55, _, 48, _, _, _
        ],
        chords: [
          [60, 64, 67], _, _, _, [60, 64, 67], _, _, _,
          [60, 65, 69], _, _, _, [60, 64, 67], _, _, _,
          [62, 65, 67], _, _, _, [59, 62, 67], _, _, _,
          [60, 64, 67], _, _, _, [60, 64, 67], _, _, _,
          [60, 64, 67], _, _, _, [60, 64, 69], _, _, _,
          [60, 65, 69], _, _, _, [60, 65, 69], _, _, _,
          [59, 62, 67], _, _, _, [59, 62, 67], _, _, _,
          [60, 64, 67], _, _, _, _, _, _, _
        ]
      },

      // 6. LEGEND OF MOO : Quête héroïque du Temple Hyrule (D Mineur -> F Majeur, 140 BPM)
      fox: {
        bpm: 140,
        stepBeats: 0.5,
        leadWave: 'square',
        leadCut: 1550,
        bassWave: 'triangle',
        chordWave: 'triangle',
        perc: 'boss',
        lead: [
          74, _, 69, _, 74, _, 76, 77,   79, _, 77, _, 76, _, 72, _,
          74, _, 69, _, 74, 76, 77, 81,  79, _, _,  _, 76, _, _,  _,
          81, _, 79, 77, 76, _, 74, 76,  77, _, 74, _, 72, _, 69, _,
          70, _, 74, 77, 76, _, 73, 76,  74, _, 81, _, 74, _, _,  _
        ],
        bass: [
          50, 50, 57, _, 50, 50, 57, _,   48, 48, 55, _, 48, 48, 55, _,
          46, 46, 53, _, 46, 46, 53, _,   45, 45, 52, _, 45, 48, 52, 55,
          53, 53, 60, _, 48, 48, 55, _,   50, 50, 57, _, 48, 48, 55, _,
          46, 46, 53, _, 45, 45, 52, _,   50, 50, 57, _, 50, _, _, _
        ],
        chords: [
          [62, 65, 69], _, _, _, [62, 65, 69], _, _, _,
          [60, 64, 67], _, _, _, [60, 64, 67], _, _, _,
          [58, 62, 65], _, _, _, [58, 62, 65], _, _, _,
          [57, 61, 64], _, _, _, [57, 61, 64], _, _, _,
          [60, 65, 69], _, _, _, [60, 64, 67], _, _, _,
          [62, 65, 69], _, _, _, [60, 64, 67], _, _, _,
          [58, 62, 65], _, _, _, [57, 61, 64], _, _, _,
          [62, 65, 69], _, _, _, _, _, _, _
        ]
      }
    };
  }

  /** Initialise ou réveille le contexte Web Audio après un geste utilisateur. */
  ensureContext() {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) {
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.musicVolume;
      this.masterGain.connect(this.ctx.destination);

      // Tampon de bruit blanc court pour charleston / caisse claire rétro douce
      const len = Math.floor(this.ctx.sampleRate * 0.08);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlockAudio() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.currentMusicKey && !this.muted && !this._timer && !this.currentMusic) {
      this.startSynthLoop(this.currentMusicKey);
    }
    if (this.currentMusic && !this.muted && this.currentMusic.paused) {
      this.currentMusic.play().catch(() => {});
    }
  }

  /** Joue une note synthétisée chaude (avec filtre passe-bas + enveloppe ADSR douce). */
  scheduleTone(midi, time, dur, wave, vol, cutoff = 2200) {
    if (!this.ctx || !this.masterGain || midi == null) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(SoundManager.midiToFreq(midi), time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);
    filter.Q.value = 0.7;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.014);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.55), time + dur * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  /** Percussion douce (charleston / petite caisse rétro) pour donner du rythme sans agresser. */
  schedulePerc(kind, time, vol = 0.06) {
    if (!this.ctx || !this.masterGain || !this.noiseBuf) return;
    if (kind === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(125, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);
      gain.gain.setValueAtTime(vol * 2.2, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.11);
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = kind === 'snare' ? 'bandpass' : 'highpass';
    filter.frequency.value = kind === 'snare' ? 1800 : 5200;
    const gain = this.ctx.createGain();
    const dur = kind === 'snare' ? 0.07 : 0.035;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(time);
    src.stop(time + dur + 0.01);
  }

  /** Planifie les notes d'un pas de la partition active. */
  scheduleStep(song, idx, time, stepSec) {
    const len = song.lead.length;
    const i = idx % len;

    // 1. Mélodie principale
    const mNote = song.lead[i];
    if (mNote != null) {
      let hold = 1;
      if (song.lead[(i + 1) % len] == null) hold = 1.65;
      const vol = song.leadWave === 'square' ? 0.14 : 0.24;
      this.scheduleTone(mNote, time, stepSec * hold, song.leadWave, vol, song.leadCut || 2200);
    }

    // 2. Basse rebondissante
    const bNote = song.bass[i % song.bass.length];
    if (bNote != null) {
      this.scheduleTone(bNote, time, stepSec * 1.15, song.bassWave || 'triangle', 0.20, 950);
    }

    // 3. Accords doux en arrière-plan
    const chord = song.chords && song.chords[i % song.chords.length];
    if (Array.isArray(chord)) {
      for (let c = 0; c < chord.length; c++) {
        this.scheduleTone(chord[c], time, stepSec * 3.1, song.chordWave || 'sine', 0.065, 1600);
      }
    }

    // 4. Percussions légères selon le style de la scène
    if (song.perc === 'soft') {
      if (i % 8 === 0) this.schedulePerc('kick', time, 0.045);
      else if (i % 4 === 2) this.schedulePerc('hat', time, 0.025);
    } else if (song.perc === 'race' || song.perc === 'chip') {
      if (i % 4 === 0) this.schedulePerc('kick', time, 0.07);
      else if (i % 4 === 2) this.schedulePerc('snare', time, 0.055);
      else this.schedulePerc('hat', time, 0.028);
    } else if (song.perc === 'boss') {
      if (i % 8 === 0 || i % 8 === 3) this.schedulePerc('kick', time, 0.085);
      if (i % 8 === 4) this.schedulePerc('snare', time, 0.065);
      if (i % 2 === 1) this.schedulePerc('hat', time, 0.025);
    }
  }

  startSynthLoop(sceneKey) {
    const song = this.songs[sceneKey] || this.songs.hub;
    if (!song) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.stopSynthLoop();
    this._activeSong = song;
    this._stepIdx = 0;
    this._nextNoteTime = ctx.currentTime + 0.06;

    // Fondu d'entrée doux
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.musicVolume, ctx.currentTime + 0.35);
    }

    const stepSec = (60 / song.bpm) * (song.stepBeats || 0.5);
    this._timer = setInterval(() => {
      if (!this.ctx || !this._activeSong || this.muted) return;
      if (this.ctx.state !== 'running') return;
      const horizon = this.ctx.currentTime + 0.14;
      while (this._nextNoteTime < horizon) {
        this.scheduleStep(this._activeSong, this._stepIdx, this._nextNoteTime, stepSec);
        this._nextNoteTime += stepSec;
        this._stepIdx++;
      }
    }, 55);
  }

  stopSynthLoop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._activeSong = null;
  }

  /** Joue un effet sonore court depuis audio/<name>.wav. */
  playSfx(name, volumeScale = 1.0) {
    if (this.muted) return;
    try {
      const path = this.assetBase + 'audio/' + name + '.wav';
      const audio = new Audio(path);
      audio.volume = Math.min(1, Math.max(0, this.sfxVolume * volumeScale));
      audio.play().catch(() => {});
    } catch (e) {
      // Ignorer silencieusement si l'autoplay n'est pas encore débloqué
    }
  }

  /**
   * Lance la musique d'ambiance d'une scène (title, hub, derby, snake, ducklings, fox).
   * Utilise un fichier audio si défini dans musicTracks, sinon le synthétiseur Web Audio intégré.
   */
  playMusic(sceneKey) {
    if (this.currentMusicKey === sceneKey && (this._timer || this.currentMusic)) return;
    this.stopMusic();
    this.currentMusicKey = sceneKey;
    if (this.muted) return;

    const trackPath = this.musicTracks[sceneKey];
    if (trackPath) {
      try {
        const audio = new Audio(trackPath);
        audio.loop = true;
        audio.volume = this.musicVolume;
        audio.play().catch(() => {});
        this.currentMusic = audio;
      } catch (e) {}
      return;
    }

    this.startSynthLoop(sceneKey);
  }

  stopMusic() {
    this.stopSynthLoop();
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
    this.currentMusicKey = null;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.musicVolume, this.ctx.currentTime, 0.04);
    }
    if (this.muted) {
      if (this.currentMusic) this.currentMusic.pause();
    } else {
      if (this.currentMusic) {
        this.currentMusic.play().catch(() => {});
      } else if (this.currentMusicKey && !this._timer) {
        this.startSynthLoop(this.currentMusicKey);
      } else if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }
    return this.muted;
  }
}

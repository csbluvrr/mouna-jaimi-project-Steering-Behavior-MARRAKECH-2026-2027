/**
 * Gestionnaire audio simple (effets sonores du pack + hooks pour boucles musicales).
 * Utilise HTMLAudioElement natif pour éviter tout souci de compatibilité navigateur.
 */
class SoundManager {
  constructor(assetBase) {
    this.assetBase = assetBase;
    this.muted = false;
    this.sfxVolume = 0.55;
    this.musicVolume = 0.35;
    this.sfxCache = {};

    // Hooks prévus pour les boucles musicales à ajouter plus tard (1 hub + 1 par jeu)
    this.musicTracks = {
      hub: null,
      derby: null,
      snake: null,
      ducklings: null,
      fox: null
    };
    this.currentMusic = null;
    this.currentMusicKey = null;
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
   * Hook pour lancer la musique d'une scène (hub, derby, snake, ducklings, fox).
   * Sans fichier renseigné dans musicTracks, la fonction ne fait rien proprement.
   */
  playMusic(sceneKey) {
    if (this.currentMusicKey === sceneKey) return;
    this.stopMusic();
    this.currentMusicKey = sceneKey;
    const trackPath = this.musicTracks[sceneKey];
    if (!trackPath || this.muted) return;
    try {
      const audio = new Audio(trackPath);
      audio.loop = true;
      audio.volume = this.musicVolume;
      audio.play().catch(() => {});
      this.currentMusic = audio;
    } catch (e) {}
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
    this.currentMusicKey = null;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.currentMusic) {
      this.currentMusic.pause();
    } else if (!this.muted && this.currentMusic) {
      this.currentMusic.play().catch(() => {});
    }
    return this.muted;
  }
}

/**
 * Gestionnaire de sauvegarde locale (localStorage).
 * Toujours protégé par try/catch pour éviter tout blocage en navigation privée
 * ou environnement restreint.
 */
class SaveManager {
  constructor(storageKey = 'moos_funfair_save_v1') {
    this.storageKey = storageKey;
    this.data = this.defaultState();
    this.load();
  }

  defaultState() {
    return {
      tickets: 0,
      stars: {
        derby: 0,
        snake: 0,
        ducklings: 0,
        fox: 0
      },
      stamps: {
        derby: false,
        snake: false,
        ducklings: false,
        fox: false
      },
      visitedBooths: {},
      unlockedCosmetics: [],
      equippedCosmetic: null,
      savedBrains: []
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = Object.assign(this.defaultState(), parsed);
        this.data.stars = Object.assign(this.defaultState().stars, parsed.stars || {});
        this.data.stamps = Object.assign(this.defaultState().stamps, parsed.stamps || {});
        this.data.visitedBooths = parsed.visitedBooths || {};
      }
    } catch (err) {
      console.warn('Impossible de lire localStorage, utilisation des valeurs par défaut :', err);
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (err) {
      console.warn('Impossible de sauvegarder dans localStorage :', err);
    }
  }

  addTickets(amount) {
    this.data.tickets = Math.max(0, (this.data.tickets || 0) + amount);
    this.save();
  }

  /**
   * Enregistre la première visite à pied d'un stand (+2 tickets bonus
   * pour récompenser l'exploration du parc en plus du panneau d'affiches).
   */
  claimFirstVisitBonus(boothId) {
    if (!this.data.visitedBooths[boothId]) {
      this.data.visitedBooths[boothId] = true;
      this.addTickets(2);
      return true;
    }
    return false;
  }

  recordGameResult(gameId, starsEarned, ticketsEarned) {
    if (starsEarned > (this.data.stars[gameId] || 0)) {
      this.data.stars[gameId] = starsEarned;
    }
    if (starsEarned > 0) {
      this.data.stamps[gameId] = true;
    }
    this.addTickets(ticketsEarned);
  }
}

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
      skyMood: 'day', // 'day' | 'sunset'
      unlockedCosmetics: ['hoodie:default'],
      equippedOutfit: {
        hoodie: 'default',
        head: null,
        face: null,
        neck: null,
        back: null
      },
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
        this.data.equippedOutfit = Object.assign(
          this.defaultState().equippedOutfit,
          parsed.equippedOutfit || {}
        );
        if (!Array.isArray(this.data.unlockedCosmetics)) {
          this.data.unlockedCosmetics = ['hoodie:default'];
        } else if (!this.data.unlockedCosmetics.includes('hoodie:default')) {
          this.data.unlockedCosmetics.push('hoodie:default');
        }
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

  /** Vérifie si un cosmétique (clé "slot:id") est déjà débloqué. */
  isCosmeticOwned(slot, id) {
    if (slot === 'hoodie' && id === 'default') return true;
    const key = slot + ':' + id;
    return Array.isArray(this.data.unlockedCosmetics) && this.data.unlockedCosmetics.includes(key);
  }

  /** Achète un cosmétique avec les tickets gagnés dans la fête foraine. */
  buyCosmetic(slot, id, price) {
    if (this.isCosmeticOwned(slot, id)) return true;
    if ((this.data.tickets || 0) < price) return false;
    this.data.tickets -= price;
    this.data.unlockedCosmetics.push(slot + ':' + id);
    this.data.equippedOutfit[slot] = id;
    this.save();
    return true;
  }

  /**
   * Équipe ou retire un cosmétique (1 seul objet par emplacement :
   * cliquer sur l'objet déjà porté le retire, sauf pour le hoodie qui revient au jaune par défaut).
   */
  toggleEquipCosmetic(slot, id) {
    if (!this.isCosmeticOwned(slot, id)) return false;
    if (this.data.equippedOutfit[slot] === id) {
      this.data.equippedOutfit[slot] = slot === 'hoodie' ? 'default' : null;
    } else {
      this.data.equippedOutfit[slot] = id;
    }
    this.save();
    return true;
  }
}

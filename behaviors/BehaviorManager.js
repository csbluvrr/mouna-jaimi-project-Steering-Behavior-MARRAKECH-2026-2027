/**
 * Gestionnaire de comportements de steering (BehaviorManager).
 * Inspiré directement du cours (transparents 52 et 60) :
 * Chaque Vehicle possède un BehaviorManager qui combine plusieurs forces
 * pondérées (ex: arrive + avoid + boundaries) et permet de les activer,
 * désactiver ou ajuster dynamiquement.
 */
class BehaviorManager {
  // Liste statique répertoriant les noms de comportements connus (cf. cours)
  static availableBehaviors = [
    'seek',
    'flee',
    'arrive',
    'pursue',
    'evade',
    'wander',
    'avoid',
    'follow',
    'align',
    'cohesion',
    'separation',
    'boundaries'
  ];

  constructor(vehicle) {
    this.vehicle = vehicle;
    // Map : nom -> { name, fn, weight, active, lastForce }
    this.behaviors = new Map();
  }

  /**
   * Ajoute (ou remplace) un comportement nommé avec un poids donné.
   * @param {string} name - Identifiant du comportement (ex: 'arrive', 'avoid')
   * @param {Function} fn - Fonction retournant un p5.Vector de steering
   * @param {number} weight - Poids multiplicatif de la force
   * @param {boolean} active - Actif dès l'ajout ou non
   */
  add(name, fn, weight = 1, active = true) {
    this.behaviors.set(name, {
      name,
      fn,
      weight,
      active,
      lastForce: createVector(0, 0)
    });
  }

  /** Supprime un comportement de la liste. */
  remove(name) {
    this.behaviors.delete(name);
  }

  /** Active un comportement existant. */
  activate(name) {
    const b = this.behaviors.get(name);
    if (b) b.active = true;
  }

  /** Désactive un comportement sans le supprimer. */
  deactivate(name) {
    const b = this.behaviors.get(name);
    if (b) {
      b.active = false;
      b.lastForce.set(0, 0);
    }
  }

  /** Modifie dynamiquement le poids (l'importance) d'un comportement. */
  changeWeight(name, weight) {
    const b = this.behaviors.get(name);
    if (b) b.weight = weight;
  }

  /** Retourne la configuration d'un comportement par son nom. */
  getBehavior(name) {
    return this.behaviors.get(name) || null;
  }

  /**
   * Calcule la somme pondérée de toutes les forces des comportements actifs.
   * C'est cette force résultante qui est ensuite appliquée au Vehicle.
   */
  getSteeringForce() {
    const total = createVector(0, 0);
    for (const b of this.behaviors.values()) {
      if (!b.active || b.weight === 0) {
        b.lastForce.set(0, 0);
        continue;
      }
      const force = b.fn(this.vehicle);
      if (force) {
        force.mult(b.weight);
        b.lastForce.set(force.x, force.y);
        total.add(force);
      }
    }
    return total;
  }

  /** Exporte la configuration actuelle (poids + état actif) pour sauvegarde. */
  toJSON() {
    const data = {};
    for (const [name, b] of this.behaviors.entries()) {
      data[name] = { weight: b.weight, active: b.active };
    }
    return data;
  }

  /** Restaure les poids et états actifs depuis un objet sauvegardé. */
  fromJSON(data) {
    if (!data) return;
    for (const [name, cfg] of Object.entries(data)) {
      const b = this.behaviors.get(name);
      if (b) {
        if (typeof cfg.weight === 'number') b.weight = cfg.weight;
        if (typeof cfg.active === 'boolean') b.active = cfg.active;
      }
    }
  }
}

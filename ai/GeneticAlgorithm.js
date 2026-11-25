/**
 * Algorithme génétique pour Bunny Derby.
 * Reprise fidèle de 9-VoitureSuitCircuit genetic algo/ga.js du cours :
 * - calculateFitness : normalise la fitness de chaque lapin
 * - pickOne : sélection par roulette proportionnelle à la fitness
 * - élitisme : conserve le meilleur cerveau intact + crossover + mutation
 */
class GeneticAlgorithm {
  /**
   * Crée la génération suivante à partir des lapins terminés/morts.
   * @param {Array<DerbyBunny>} savedBunnies
   * @param {number} popSize
   * @param {number} mutationRate
   * @param {Function} createBunnyFn - fabrique un DerbyBunny(brain, colourIdx)
   */
  static nextGeneration(savedBunnies, popSize, mutationRate, createBunnyFn) {
    if (!savedBunnies || savedBunnies.length === 0) return [];

    // 1. Calcul & normalisation des scores de fitness (cf. ga.js du cours)
    let sum = 0;
    let bestBunny = savedBunnies[0];
    for (const b of savedBunnies) {
      b.computeFitness();
      if (b.rawFitness > bestBunny.rawFitness) bestBunny = b;
      sum += b.rawFitness;
    }
    if (sum <= 0) sum = 1;
    for (const b of savedBunnies) {
      b.fitness = b.rawFitness / sum;
    }

    // 2. Construction de la nouvelle population
    const nextPop = [];

    // Élitisme : garder 1 copie exacte du champion de la génération précédente
    if (bestBunny && bestBunny.brain) {
      nextPop.push(createBunnyFn(bestBunny.brain.copy(), 0));
    }

    // Remplir le reste via sélection roulette + crossover + mutation
    while (nextPop.length < popSize) {
      const parentA = GeneticAlgorithm.pickOne(savedBunnies);
      const parentB = GeneticAlgorithm.pickOne(savedBunnies);
      let childBrain;
      if (parentA !== parentB && random() < 0.5) {
        childBrain = parentA.brain.crossover(parentB.brain);
      } else {
        childBrain = parentA.brain.copy();
      }
      childBrain.mutate(mutationRate);
      nextPop.push(createBunnyFn(childBrain, nextPop.length));
    }

    // 3. Libération mémoire TensorFlow.js de l'ancienne génération
    for (const b of savedBunnies) {
      b.dispose();
    }

    return nextPop;
  }

  /** Algorithme de la roulette (identique à pickOne() dans ga.js du cours). */
  static pickOne(list) {
    let index = 0;
    let r = random(1);
    while (r > 0 && index < list.length) {
      r -= list[index].fitness;
      index++;
    }
    index = Math.max(0, Math.min(list.length - 1, index - 1));
    return list[index];
  }
}

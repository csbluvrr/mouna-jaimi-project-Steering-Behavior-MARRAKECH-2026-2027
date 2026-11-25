/**
 * Réseau de neurones TensorFlow.js pour la neuro-évolution (Bunny Derby).
 * Reprise fidèle de 9-VoitureSuitCircuit genetic algo/nn.js du cours,
 * enrichie pour supporter les curseurs exigés (slides 53 & 56) :
 * - nombre de neurones en entrée (rayons + vitesse)
 * - nombre de couches cachées et neurones par couche
 * - fonction d'activation ('sigmoid' ou 'relu')
 * - sérialisation / désérialisation complète des poids (localStorage & JSON)
 */
class NeuralNetwork {
  constructor(inputNodes, hiddenNodes, outputNodes, options = {}) {
    this.input_nodes = inputNodes;
    this.hidden_nodes = hiddenNodes;
    this.output_nodes = outputNodes;
    this.hidden_layers = Math.max(1, options.hiddenLayers || 1);
    this.activation = options.activation || 'sigmoid';

    if (options.existingModel) {
      this.model = options.existingModel;
    } else {
      this.model = this.createModel();
    }
  }

  /** Construit le modèle tf.sequential avec la topologie choisie. */
  createModel() {
    const model = tf.sequential();

    // Première couche cachée reliée aux capteurs d'entrée
    model.add(tf.layers.dense({
      units: this.hidden_nodes,
      inputShape: [this.input_nodes],
      activation: this.activation
    }));

    // Couches cachées supplémentaires (si hidden_layers > 1)
    for (let i = 1; i < this.hidden_layers; i++) {
      model.add(tf.layers.dense({
        units: this.hidden_nodes,
        activation: this.activation
      }));
    }

    // Couche de sortie en sigmoïde (valeurs propres dans [0, 1] : direction + vitesse)
    model.add(tf.layers.dense({
      units: this.output_nodes,
      activation: 'sigmoid'
    }));

    return model;
  }

  /** Prédit les sorties à partir d'un tableau d'entrées normalisées. */
  predict(inputs) {
    return tf.tidy(() => {
      const xs = tf.tensor2d([inputs]);
      const ys = this.model.predict(xs);
      return Array.from(ys.dataSync());
    });
  }

  /** Clone exactement le réseau et ses poids (tf.tidy évite les fuites mémoire). */
  copy() {
    return tf.tidy(() => {
      const modelCopy = this.createModel();
      const weights = this.model.getWeights();
      const copies = weights.map((w) => w.clone());
      modelCopy.setWeights(copies);
      return new NeuralNetwork(this.input_nodes, this.hidden_nodes, this.output_nodes, {
        hiddenLayers: this.hidden_layers,
        activation: this.activation,
        existingModel: modelCopy
      });
    });
  }

  /**
   * Mutation gaussienne sur les poids (identique à nn.js du cours).
   * Chaque poids a une probabilité `rate` d'être légèrement perturbé.
   */
  mutate(rate) {
    tf.tidy(() => {
      const weights = this.model.getWeights();
      const mutatedWeights = [];
      for (let i = 0; i < weights.length; i++) {
        const shape = weights[i].shape;
        const values = weights[i].dataSync().slice();
        for (let j = 0; j < values.length; j++) {
          if (random(1) < rate) {
            values[j] += randomGaussian() * 0.45;
          }
        }
        mutatedWeights.push(tf.tensor(values, shape));
      }
      this.model.setWeights(mutatedWeights);
    });
  }

  /** Croisement simple (crossover) entre deux réseaux de même topologie. */
  crossover(partner) {
    return tf.tidy(() => {
      const child = this.copy();
      const wA = this.model.getWeights();
      const wB = partner.model.getWeights();
      const childW = [];

      for (let i = 0; i < wA.length; i++) {
        const valsA = wA[i].dataSync();
        const valsB = wB[i].dataSync();
        const mixed = new Float32Array(valsA.length);
        const split = Math.floor(random(valsA.length));
        for (let j = 0; j < valsA.length; j++) {
          mixed[j] = j < split ? valsA[j] : valsB[j];
        }
        childW.push(tf.tensor(mixed, wA[i].shape));
      }
      child.model.setWeights(childW);
      return child;
    });
  }

  /** Libère la mémoire GPU/CPU de TensorFlow.js. */
  dispose() {
    if (this.model) {
      this.model.dispose();
    }
  }

  /** Sérialise la topologie et tous les poids en objet JSON sauvegardable. */
  serialize() {
    const weights = this.model.getWeights().map((t) => ({
      shape: t.shape,
      values: Array.from(t.dataSync())
    }));
    return {
      input_nodes: this.input_nodes,
      hidden_nodes: this.hidden_nodes,
      output_nodes: this.output_nodes,
      hidden_layers: this.hidden_layers,
      activation: this.activation,
      weights
    };
  }

  /** Reconstruit un NeuralNetwork depuis un objet JSON sauvegardé. */
  static deserialize(data) {
    const nn = new NeuralNetwork(data.input_nodes, data.hidden_nodes, data.output_nodes, {
      hiddenLayers: data.hidden_layers || 1,
      activation: data.activation || 'sigmoid'
    });
    tf.tidy(() => {
      const tensors = data.weights.map((w) => tf.tensor(w.values, w.shape));
      nn.model.setWeights(tensors);
    });
    return nn;
  }
}

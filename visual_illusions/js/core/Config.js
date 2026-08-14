
export class Store {
  #state;
  #listeners;

  constructor(initialState) {
    this.#state = { ...initialState };
    this.#listeners = new Map();
  }

  getState(key) {
    return this.#state[key];
  }

  getAll() {
    return { ...this.#state };
  }

  setState(key, value) {
    if (this.#state[key] !== value) {
      this.#state[key] = value;
      this.#notify(key, value);
    }
  }

  subscribe(key, callback) {
    if (!this.#listeners.has(key)) {
      this.#listeners.set(key, new Set());
    }
    this.#listeners.get(key).add(callback);

    
    return () => {
      this.#listeners.get(key).delete(callback);
    };
  }

  #notify(key, value) {
    if (this.#listeners.has(key)) {
      for (const callback of this.#listeners.get(key)) {
        callback(value);
      }
    }
  }
}


export const Config = new Store({
  threshold: 15,
  speedMultiplier: 2.0,
  showDvs: false,
  showBioFilter: false,
  displayScale: 1.0,
  width: 500,
  height: 500
});

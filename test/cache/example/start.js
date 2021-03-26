({
  privateField: 100,

  async method() {
    if (application.worker.id === 'W1') {
      console.debug('Start example plugin');
      this.parent.cache.set({ key: 'keyName', val: this.privateField });
      const res = lib.example.cache.get({ key: 'keyName' });
      console.debug({ res, cache: this.parent.cache.values });
    }
  },
});

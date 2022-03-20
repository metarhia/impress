async () => {
  if (application.worker.id === 'W1') {
    console.debug('Start example plugin');
    this.parent.cache.set({ key: 'keyName', val: 'value' });
    const res = lib.example.cache.get({ key: 'keyName' });
    console.debug({ res, cache: this.parent.cache.values });
  }
};

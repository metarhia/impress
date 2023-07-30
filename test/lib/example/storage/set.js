({
  values: new Map(),

  method({ key, val }) {
    console.log({ key, val });
    if (val) {
      return this.values.set(key, val);
    }
    const res = this.values.get(key);
    console.log({ return: { res } });
    return res;
  },
});

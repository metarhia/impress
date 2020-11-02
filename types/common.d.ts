interface Dictionary<T> {
  [key: string]: T;
}

interface Cert {
  key: Buffer;
  cert: Buffer;
}

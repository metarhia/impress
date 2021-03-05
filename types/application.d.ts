interface Cert {
  key: Buffer;
  cert: Buffer;
}

interface Application {
  initialization: boolean;
  finalization: boolean;
  api: Dictionary<any>;
  signatures: Dictionary<any>;
  static: Map<string, Buffer>;
  resources: Map<string, Buffer>;
  root: string;
  path: string;
  apiPath: string;
  libPath: string;
  domainPath: string;
  staticPath: string;
  resourcesPath: string;
  starts: Array<Function>;
  Application: Function;
  Error: Function;
  cert: Cert;
  config: Config;
  logger: Logger;
  console: NodeJS.ConsoleConstructor;
  auth: Auth;
  sandbod: Dictionary<any>;
  server: Server;
}

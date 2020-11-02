interface Application {
  initialization: boolean;
  finalization: boolean;
  api: Dictionary<unknown>;
  signatures: Dictionary<unknown>;
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
  Application: Function,
  Error: Function,
  cert: Cert;
  config: Config;
  logger: Logger;
  console: Console;
  auth: Auth;
  sandbod: Dictionary<unknown>;
  server: Server;
}

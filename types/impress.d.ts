interface MetarhiaApplication {
  worker: Dictionary<any>;
  server: Dictionary<any>;
  auth: Auth;
  resources: Map<string, Buffer>;
  introspect: () => Promise<any>;
}

interface Context {
  client: Client;
  [key: string]: any;
}

declare var application: MetarhiaApplication;
declare var node: Dictionary<any>;
declare var npm: Dictionary<any>;
declare var api: Dictionary<any>;
declare var lib: Dictionary<any>;
declare var domain: Dictionary<any>;
declare var config: Dictionary<any>;
declare var metarhia: Dictionary<any>;
declare var context: Dictionary<any>;

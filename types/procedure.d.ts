import { Application } from './impress';

type GroupAccess = { group: string };
type UserAccess = { login: string };
type Access = 'public' | 'session' | 'logged' | GroupAccess | UserAccess;
type QueueParameters = { concurrency: number; size: number; timeout: number };
type Serializer = 'json' | 'v8';
type Protocols = 'http' | 'https' | 'ws' | 'wss';
type AsyncFuction = (...args: Array<any>) => Promise<any>;
type Example = {
  parameters: Dictionary<any>;
  returns: Dictionary<any>;
};

interface Procedure {
  caption?: string;
  description?: string;
  access?: Access;
  parameters?: Schema;
  validate?: Function;
  timeout?: number;
  queue?: QueueParameters;
  sirializer?: Serializer;
  protocols?: Array<Protocols>;
  deprecated?: boolean;
  method: AsyncFuction;
  returns?: Schema;
  assert?: Function;
  script?: Function;
  examples?: Array<Example>;
  application?: Application;
}

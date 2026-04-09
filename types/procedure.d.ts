import { Schema } from 'metaschema';
import { Semaphore } from 'metautil';

import { Application } from './core';

export type GroupAccess = { group: string };
export type UserAccess = { login: string };
export type Access = 'public' | 'session' | 'logged' | GroupAccess | UserAccess;
export type QueueParameters = {
  concurrency: number;
  size: number;
  timeout: number;
};
export type Serializer = 'json' | 'v8';
export type Protocols = 'http' | 'https' | 'ws' | 'wss';
export type AsyncFunction = (...args: Array<any>) => Promise<any>;
export type Example = {
  parameters: object;
  returns: object;
};

export interface Procedure {
  exports: object;
  script: Function;
  methodName: string;
  application: Application;
  method?: AsyncFunction;
  parameters?: Schema;
  returns?: Schema;
  errors?: Record<string, string>;
  semaphore?: Semaphore;
  caption?: string;
  description?: string;
  access?: Access;
  validate?: Function;
  timeout?: number;
  queue?: QueueParameters;
  serializer?: Serializer;
  protocols?: Array<Protocols>;
  deprecated?: boolean;
  assert?: Function;
  examples?: Array<Example>;
  invoke(context: object, args?: object): Promise<unknown>;
  enter(): Promise<void>;
  leave(): void;
}

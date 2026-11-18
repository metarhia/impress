export interface LogConfig {
  keepDays: number;
  writeInterval: number;
  writeBuffer: number;
  toFile: Array<string>;
  toStdout: Array<string>;
  json?: boolean;
}

export interface ScaleConfig {
  cloud: string;
  server: string;
  instance: 'standalone' | 'controller' | 'server';
  token: string;
  gc: number;
}

export type HttpProtocol = 'http/1.1' | 'h2';

export type Transport = 'tcp' | 'udp';

export interface ServerGroup {
  host?: string;
  ports: Array<number | Array<number>>;
  transports?: Array<Transport>;
  protocols: Array<HttpProtocol>;
  tls?: boolean;
  domains?: Array<string>;
  application?: boolean;
  balance?: string;
  redirect?: string;
  nagle?: boolean;
  timeouts?: NetworkConfig['timeouts'];
  queue?: NetworkConfig['queue'];
  cors?: {
    origin?: string;
  };
}

export interface ServerConfig {
  [name: string]: ServerGroup;
}

export interface NetworkConfig {
  nagle: boolean;
  timeouts: {
    bind: number;
    request: number;
  };
  queue: {
    concurrency: number;
    size: number;
    timeout: number;
  };
}

export interface LifecycleConfig {
  start: number;
  stop: number;
  watch: number;
  test: number;
}

export interface SchedulerConfig {
  concurrency?: number;
  size?: number;
  timeout?: number;
}

export interface WorkersConfig {
  pool: number;
  wait: number;
  timeout: number;
}

export interface CacheConfig {
  size: string;
  maxFileSize: string;
  avoid?: Array<string>;
}

export interface SessionsConfig {
  sid: string;
  characters: string;
  length: number;
  secret: string;
  regenerate: number;
  expire: number;
  persistent: boolean;
  limits: {
    ip: number;
    user: number;
  };
}

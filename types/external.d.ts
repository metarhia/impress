interface Dictionary<T> {
  [key: string]: T;
}

interface Stub extends Dictionary<any> {}

interface Schema extends Stub {}
interface Logger extends Stub {}
interface Server extends Stub {}
interface Config extends Stub {}
interface Client extends Stub {}
interface Database extends Stub {}

// Self-contained: this function's source is emitted into the virtual runtime module.
export const createServerEnv = (target: Record<string, unknown>, prefixes: string[]) => {
  const isPrivate = (key: string | symbol): key is string =>
    typeof key === "string" &&
    !Object.hasOwn(target, key) &&
    !prefixes.some((prefix) => key.startsWith(prefix));
  const hasPrivate = (key: string | symbol): key is string =>
    isPrivate(key) && Object.hasOwn(globalThis.process.env, key);

  return new Proxy(target, {
    get(object, key, receiver) {
      return hasPrivate(key) ? globalThis.process.env[key] : Reflect.get(object, key, receiver);
    },
    getOwnPropertyDescriptor(object, key) {
      return Reflect.getOwnPropertyDescriptor(
        hasPrivate(key) ? globalThis.process.env : object,
        key,
      );
    },
    has(object, key) {
      return Reflect.has(object, key) || hasPrivate(key);
    },
    ownKeys(object) {
      return [...Reflect.ownKeys(object), ...Object.keys(globalThis.process.env).filter(isPrivate)];
    },
  });
};

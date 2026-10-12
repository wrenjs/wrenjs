"use server";

/**
 * Server Actions — functions marked with "use server" run on the server
 * but can be called from Client Components.
 *
 * The framework:
 *  1. Registers these functions with the RSC plugin at build time
 *  2. The browser entry POSTs to them via callServer()
 *  3. The RSC entry decodes the call and executes the function
 */

let count = 0;

export async function getServerCount() {
  return count;
}

export async function getServerTime() {
  return new Date().toISOString();
}

export async function incrementCounter() {
  count++;
  return count;
}

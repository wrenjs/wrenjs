import { cwd } from "node:process";

export const getWorkspaceRoot = () => {
  return cwd();
};

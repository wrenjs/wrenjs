export const cn = (...classes: (false | null | string | undefined)[]) => {
  return classes.reduce((a, curr) => (curr ? `${a} ${curr}` : a), "") || "";
};

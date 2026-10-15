export const cn = (...classes: (false | null | string | undefined)[]) => {
  return classes.join(" ");
};

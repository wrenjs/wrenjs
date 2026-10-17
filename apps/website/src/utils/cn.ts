export const cn = (...classes: (false | null | string | undefined)[]) => {
  return classes.filter(Boolean).join(" ");
};

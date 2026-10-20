export default function ParamPage({ param }: { param: string }) {
  return param;
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const;
};

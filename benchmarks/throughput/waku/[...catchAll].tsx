export default function ParamPage({ catchAll }: { catchAll: string }) {
  return catchAll;
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const;
};

export default function WrenLinkPrerenderedPage() {
  return (
    <div>
      <span>
        Wren Link Prerendered Page <code>/wren-link/prerendered</code>
      </span>
    </div>
  );
}

export const config = {
  prerender: true,
};

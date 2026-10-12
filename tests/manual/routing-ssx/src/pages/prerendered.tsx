export default function PrerenderedPage() {
  return (
    <div>
      <span>
        Prerendered Page <code>/prerendered</code>
      </span>
    </div>
  );
}

export const config = {
  prerender: true,
};

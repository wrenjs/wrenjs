import styles from "./__layout.module.css";
export default function DocsLayout({ children }: { children: JSX.Children }) {
  return <div class={styles.markdown}>{children}</div>;
}

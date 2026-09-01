import { PromptsContainer } from '../../features/prompts/containers/PromptsContainer';
import { usePromptsEditor } from '../../features/prompts/containers/usePromptsEditor';
import { Link } from 'react-router-dom';
import styles from './PromptsView.module.css';

export function PromptsView() {
  const editor = usePromptsEditor();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>System prompts</h1>
        <nav className={styles.nav}>
          <Link className={styles.navLink} to="/">
            Back to chat
          </Link>
        </nav>
      </header>
      <main className={styles.main}>
        <PromptsContainer editor={editor} />
      </main>
    </div>
  );
}

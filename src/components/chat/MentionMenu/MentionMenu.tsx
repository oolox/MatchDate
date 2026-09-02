import styles from './MentionMenu.module.css';

export interface MentionMenuItem {
  id: string;
  label: string;
}

export interface MentionMenuProps {
  items: MentionMenuItem[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (id: string) => void;
}

export function MentionMenu({
  items,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: MentionMenuProps) {
  return (
    <ul className={styles.menu} role="listbox" aria-label="Attach file" id="txt-attach-listbox">
      {items.map((item, index) => (
        <li key={item.id} role="none">
          <button
            type="button"
            role="option"
            id={`txt-attach-option-${item.id}`}
            className={index === activeIndex ? `${styles.option} ${styles.active}` : styles.option}
            aria-selected={index === activeIndex}
            onMouseEnter={() => onActiveIndexChange(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(item.id);
            }}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

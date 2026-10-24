import { Button } from '../../components/ui/Button';
import { SubHeader } from '../../components/ui/SubHeader';
import { SubHeaderNameField } from '../../components/ui/SubHeaderNameField';
import type { CharacterIdentity } from '../../types/character';
import { CharacterIdentityToggle } from './CharacterIdentityToggle';
import styles from './CharacterSubHeader.module.css';

export interface CharacterSubHeaderProps {
  name: string;
  identity: CharacterIdentity;
  isBusy: boolean;
  canSave: boolean;
  onNameChange: (value: string) => void;
  onClearName: () => void;
  onIdentityChange: (identity: CharacterIdentity) => void;
  onSave: () => void;
  onNew: () => void;
}

export function CharacterSubHeader({
  name,
  identity,
  isBusy,
  canSave,
  onNameChange,
  onClearName,
  onIdentityChange,
  onSave,
  onNew,
}: CharacterSubHeaderProps) {
  return (
    <SubHeader
      navLabel="Character actions"
      nav={
        <>
          <Button variant="tab" disabled={!canSave} onClick={onSave}>
            SAVE
          </Button>
          <Button variant="tab" disabled={isBusy} onClick={onNew}>
            NEW
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <SubHeaderNameField
          value={name}
          disabled={isBusy}
          placeholder="Character name"
          ariaLabel="Character name"
          clearLabel="Clear character name"
          onChange={onNameChange}
          onClear={onClearName}
        />
        <CharacterIdentityToggle
          value={identity}
          disabled={isBusy}
          onChange={onIdentityChange}
        />
      </div>
    </SubHeader>
  );
}

import { Button } from '../../components/ui/Button';
import { SubHeader } from '../../components/ui/SubHeader';
import { SubHeaderNameField } from '../../components/ui/SubHeaderNameField';

export interface CharacterSubHeaderProps {
  name: string;
  isBusy: boolean;
  canSave: boolean;
  onNameChange: (value: string) => void;
  onClearName: () => void;
  onSave: () => void;
  onNew: () => void;
}

export function CharacterSubHeader({
  name,
  isBusy,
  canSave,
  onNameChange,
  onClearName,
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
      <SubHeaderNameField
        value={name}
        disabled={isBusy}
        placeholder="Character name"
        ariaLabel="Character name"
        clearLabel="Clear character name"
        onChange={onNameChange}
        onClear={onClearName}
      />
    </SubHeader>
  );
}

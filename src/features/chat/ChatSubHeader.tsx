import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { SubHeader } from '../../components/ui/SubHeader';
import { SubHeaderNameField } from '../../components/ui/SubHeaderNameField';

export interface ChatSubHeaderProps {
  title: string;
  isBusy?: boolean;
  onNew: () => void;
  onSaveName: (name: string) => void;
}

export function ChatSubHeader({
  title,
  isBusy = false,
  onNew,
  onSaveName,
}: ChatSubHeaderProps) {
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isBusy) {
      return;
    }
    onSaveName(draft);
  };

  return (
    <SubHeader
      navLabel="Chat actions"
      nav={
        <Button variant="tab" disabled={isBusy} onClick={onNew}>
          NEW
        </Button>
      }
    >
      <form onSubmit={handleSubmit}>
        <SubHeaderNameField
          value={draft}
          disabled={isBusy}
          placeholder="New chat"
          ariaLabel="Chat name"
          clearLabel="Clear chat name"
          onChange={setDraft}
          onClear={() => setDraft('')}
        />
      </form>
    </SubHeader>
  );
}

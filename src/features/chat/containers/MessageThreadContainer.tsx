import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { selectActiveMessages } from '../../../store/slices/threadSlice';
import {
  selectIsPinnedToBottom,
  selectIsStreaming,
  setPinnedToBottom,
} from '../../../store/slices/chatUiSlice';
import { MessageList } from '../../../components/message/MessageList/MessageList';
import { MessageThread } from '../../../components/message/MessageThread/MessageThread';
import type { ThreadId } from '../../../types/chat';
import { MessageComposerContainer } from './MessageComposerContainer';

export interface MessageThreadContainerProps {
  threadId: ThreadId;
}

export function MessageThreadContainer({ threadId }: MessageThreadContainerProps) {
  const dispatch = useAppDispatch();
  const messages = useAppSelector(selectActiveMessages);
  const isPinnedToBottom = useAppSelector(selectIsPinnedToBottom);
  const isStreaming = useAppSelector(selectIsStreaming);

  return (
    <MessageThread
      messages={
        <MessageList
          messages={messages}
          isPinnedToBottom={isPinnedToBottom}
          isStreaming={isStreaming}
          onPinnedToBottomChange={(pinned) => dispatch(setPinnedToBottom(pinned))}
        />
      }
      composer={<MessageComposerContainer threadId={threadId} />}
    />
  );
}

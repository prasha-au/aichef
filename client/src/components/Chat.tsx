import { useRef, useEffect } from 'react';
import { useAiChat, useAiChatState } from '../ai-chat';
import './Chat.scss';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';

function AiChatMessage(props: any) {
  const navigate = useNavigate();
  useEffect(() => {
    const data = props.data;
    if (data && data.type === 'redirect') {
      navigate(data.path);
    }
  }, [props.data]);
  return (
    <div className="d-flex mb-2">
      <div className="bg-primary text-white rounded p-3 flex-grow-0">
        <Markdown>{props.text}</Markdown>
      </div>
    </div>
  );
}

export default function Chat(props: { additionalContext?: Record<string, unknown>}) {
  const [history, isLoading, _chatState, submitChatMessage, , retryLastMessage] = useAiChat();
  const [requestedRedirect, setRequestedRedirect] = useAiChatState('requestedRedirect');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (requestedRedirect) {
      navigate(requestedRedirect);
      setRequestedRedirect('');
    }
  }, [requestedRedirect]);
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history, isLoading]);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value.trim();
    if (value) {
      inputRef.current!.value = '';
      await submitChatMessage(value, props.additionalContext);
    }
  };
  return (
    <div className="chat container py-4">
      <div className="history mb-3" ref={historyRef}>
        {history.map((msg, i) => {
          if (msg.role === 'user') {
            return <div key={i} className="d-flex justify-content-end mb-2">
              <div className="bg-secondary text-white rounded p-3 flex-grow-0" style={{maxWidth:'75%'}}>{msg.text}</div>
            </div>;
          } else if (msg.role === 'ai') {
            return <AiChatMessage key={i} {...msg} />
          } else if (msg.role === 'error') {
            return <div key={i} className="d-flex justify-content-end mb-2">
              <div className="bg-danger text-white rounded p-3 flex-grow-0" style={{maxWidth:'75%'}}>
                {msg.text}
                <button className="btn btn-link text-white btn-sm ms-2" onClick={() => retryLastMessage()}>Retry</button>
              </div>
            </div>;
          }
        })}
        {isLoading && (
          <div className="d-flex mb-2">
            <div className="bg-light border rounded p-3 ms-2 flex-grow-1 opacity-50">Loading...</div>
          </div>
        )}
      </div>
      <form className="form row g-2" onSubmit={onSubmit}>
        <div className="col">
          <input className="input form-control form-control-lg" placeholder="Type your message..." autoFocus ref={inputRef} />
        </div>
        <div className="col-auto">
          <button className="send btn btn-primary btn-lg px-4" type="submit" disabled={isLoading}>→</button>
        </div>
      </form>
    </div>
  );
}

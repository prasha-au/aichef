import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.scss';
import { useAiChat } from '../ai-chat';

function LandingPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [, isLoading,, submitChatMessage, resetSession] = useAiChat();
  useEffect(() => {
    resetSession();
  }, []);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value.trim();
    if (value) {
      submitChatMessage(value);
      navigate('/chat', { state: { input: value } });
    }
  };
  return (
    <>
      <div className="background-div" />
      <main className="landing">
        <h1 className="main-title text-center mb-5 text-white display-1">AI Chef</h1>
        <form className="chat-form row g-2 justify-content-center" onSubmit={onSubmit}>
          <div className="col">
            <input className="chat-input form-control form-control-lg" placeholder="Ask for a recipe or cooking help..." autoFocus ref={inputRef} />
          </div>
          <div className="col-auto">
            <button className="chat-send btn btn-primary btn-lg px-4" type="submit" disabled={isLoading}>→</button>
          </div>
        </form>
      </main>
    </>
  );
}

export default LandingPage;

import './ChatView.scss';
import Chat from '../components/Chat';

export default function ChatView() {
  return (
    <>
      <div className="background-div" />
      <main className="chatview">
        <div className="container">
          <Chat />
        </div>
      </main>
    </>
  );
}

import React, { useState } from 'react';
import ChatWindow from './components/Chat/ChatWindow';

function App() {
  const [isOpen, setIsOpen] = useState(true);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="app-container">
      {/* 
        For a real deployment, this button might be the "trigger" 
        floating at the bottom right.
      */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '12px 24px',
            background: '#0078D4',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 'bold'
          }}
        >
          AIに質問
        </button>
      )}

      {isOpen && <ChatWindow onClose={toggleChat} />}
    </div>
  );
}

export default App;

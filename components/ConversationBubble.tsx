
import React from 'react';

interface ConversationBubbleProps {
  text: string;
  author: 'user' | 'model';
}

const ConversationBubble: React.FC<ConversationBubbleProps> = ({ text, author }) => {
  const isUser = author === 'user';

  const bubbleClasses = isUser 
    ? 'bg-cyan-600 rounded-br-none self-end' 
    : 'bg-slate-700 rounded-bl-none self-start';

  const containerClasses = isUser ? 'justify-end' : 'justify-start';

  if (!text.trim()) return null;

  return (
    <div className={`flex ${containerClasses}`}>
      <div className={`max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl ${bubbleClasses}`}>
        <p className="text-white whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
};

export default ConversationBubble;

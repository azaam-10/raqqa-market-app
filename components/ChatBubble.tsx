import React from 'react';

const AiAvatarIcon = () => (
    <div className="w-7 h-7 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-zinc-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
            <path d="M6 18h12"/>
            <path d="M12 22V18"/>
            <path d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
            <path d="M12 14v4"/>
            <path d="M20 12h-4"/>
            <path d="M4 12h4"/>
            <path d="m19 8-2 2"/>
            <path d="m22 5-2 2"/>
        </svg>
    </div>
);

interface ChatBubbleProps {
  author: 'user' | 'model';
  content: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ author, content }) => {
  const isUser = author === 'user';

  const bubbleClasses = isUser 
    ? 'bg-cyan-600 text-white rounded-br-none self-end' 
    : 'bg-gray-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 rounded-bl-none self-start';

  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  const layoutClasses = isUser ? 'flex-row-reverse' : 'flex-row';
  
  // Don't render empty bubbles from the model (e.g., during loading state),
  // but DO render the avatar.
  if (!isUser && !content) {
      return (
        <div className={`flex w-full ${containerClasses}`}>
            <div className={`flex items-end gap-2 max-w-xl ${layoutClasses}`}>
                <div className="flex-shrink-0">
                    <AiAvatarIcon />
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className={`flex w-full ${containerClasses}`}>
        <div className={`flex items-end gap-2 max-w-xl ${layoutClasses}`}>
            <div className="flex-shrink-0">
                {!isUser && <AiAvatarIcon />}
            </div>
            <div className={`rounded-2xl px-4 py-3 ${bubbleClasses}`}>
                <p className="whitespace-pre-wrap">{content}</p>
            </div>
        </div>
    </div>
  );
};

export default ChatBubble;
import React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea: React.FC<TextareaProps> = (props) => {
  return (
    <textarea
      {...props}
      className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl placeholder-zinc-500 text-gray-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition duration-200 resize-none"
    />
  );
};

export default Textarea;
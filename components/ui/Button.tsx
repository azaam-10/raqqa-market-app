import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'google';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, loading = false, variant = 'primary', className = '', ...props }) => {
  const baseClasses = "w-full flex items-center justify-center font-bold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: "bg-gradient-to-r from-teal-400 to-lime-400 text-zinc-900 hover:opacity-90 hover:shadow-lg hover:shadow-teal-500/20 focus:ring-teal-400",
    secondary: "bg-zinc-700 text-zinc-200 hover:bg-zinc-600 focus:ring-zinc-500",
    google: "bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 focus:ring-zinc-500"
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
};

export default Button;
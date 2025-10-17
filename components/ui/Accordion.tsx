import React, { useState } from 'react';

const ChevronDownIcon = ({ rotation }: { rotation: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300" style={{ transform: `rotate(${rotation}deg)` }}>
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

interface AccordionProps {
    title: string;
    children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-200 dark:border-zinc-800 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-right p-4 focus:outline-none focus:bg-gray-100 dark:focus:bg-zinc-800/50"
                aria-expanded={isOpen}
            >
                <span className="font-semibold text-gray-800 dark:text-zinc-100">{title}</span>
                <ChevronDownIcon rotation={isOpen ? 180 : 0} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                <div className="p-4 pt-0 text-gray-600 dark:text-zinc-300 whitespace-pre-wrap">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Accordion;
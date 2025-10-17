import React, { useEffect, useRef } from 'react';

interface MessageActionMenuProps {
    isOpen: boolean;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    onDeleteForMe: () => void;
    onDeleteForEveryone?: () => void;
}

const MessageActionMenu: React.FC<MessageActionMenuProps> = ({ isOpen, anchorEl, onClose, onDeleteForMe, onDeleteForEveryone }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside as any);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside as any);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();
    const isTopHalf = rect.top > window.innerHeight / 2;
    
    // Position menu above or below the element based on screen position
    const style: React.CSSProperties = {
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        minWidth: '150px'
    };
    if(isTopHalf) {
        style.bottom = `${window.innerHeight - rect.top - window.scrollY}px`;
    } else {
        style.top = `${rect.bottom + window.scrollY}px`;
    }

    return (
        <div
            ref={menuRef}
            style={style}
            className="absolute z-20 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg py-1"
        >
            <button
                onClick={onDeleteForMe}
                className="block w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
                الحذف عندي
            </button>
            {onDeleteForEveryone && (
                 <button
                    onClick={onDeleteForEveryone}
                    className="block w-full text-right px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                    الحذف عند الجميع
                </button>
            )}
        </div>
    );
};

export default MessageActionMenu;

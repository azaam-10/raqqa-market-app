import React, { useState, useRef } from 'react';

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-gray-400 dark:text-zinc-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

interface MultiImageInputProps {
    onFilesSelect: (files: File[]) => void;
}

const MultiImageInput: React.FC<MultiImageInputProps> = ({ onFilesSelect }) => {
    const [previews, setPreviews] = useState<string[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length === 0) return;

        const newFiles = [...files, ...selectedFiles];
        setFiles(newFiles);
        onFilesSelect(newFiles);

        const newPreviews: string[] = [];
        selectedFiles.forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                newPreviews.push(reader.result as string);
                if (newPreviews.length === selectedFiles.length) {
                    setPreviews(prev => [...prev, ...newPreviews]);
                }
            };
            reader.readAsDataURL(file);
        });
        
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveImage = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);
        setFiles(newFiles);
        setPreviews(newPreviews);
        onFilesSelect(newFiles);
    };

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {previews.map((src, index) => (
                <div key={index} className="relative aspect-square w-full rounded-lg overflow-hidden group">
                    <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Remove image"
                    >
                        <CloseIcon />
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square w-full bg-gray-100 dark:bg-zinc-800/50 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 transition-colors"
            >
                <UploadIcon />
                <span className="text-xs text-gray-500 dark:text-zinc-400 mt-1">إضافة صور</span>
            </button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                multiple
            />
        </div>
    );
};

export default MultiImageInput;

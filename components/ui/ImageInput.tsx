import React, { useState, useRef } from 'react';

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-gray-400 dark:text-zinc-400 mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);

interface ImageInputProps {
    onFileSelect: (file: File | null) => void;
}

const ImageInput: React.FC<ImageInputProps> = ({ onFileSelect }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileSelect(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            onFileSelect(null);
            setPreview(null);
        }
    };

    const handleContainerClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the file input
        onFileSelect(null);
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">صورة المنتج</label>
            <div
                onClick={handleContainerClick}
                className="relative aspect-video w-full bg-gray-100 dark:bg-zinc-800/50 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-teal-500 transition-colors"
            >
                {preview ? (
                    <>
                        <img src={preview} alt="Product preview" className="w-full h-full object-contain rounded-lg" />
                        <button 
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500"
                          aria-label="Remove image"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </>
                ) : (
                    <div className="text-center">
                        <UploadIcon />
                        <p className="text-sm text-gray-500 dark:text-zinc-400">انقر هنا لرفع صورة</p>
                    </div>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    required
                />
            </div>
        </div>
    );
};

export default ImageInput;

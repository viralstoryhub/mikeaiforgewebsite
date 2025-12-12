import { useState } from 'react';

// Helper to convert ArrayBuffer to Base64
const bufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

interface ProcessedFile {
    base64Data: string | null;
    mimeType: string;
    error: string | null;
}

export const useAudioProcessor = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const processFile = (file: File): Promise<ProcessedFile> => {
        return new Promise((resolve) => {
            setError(null);
            setIsLoading(true);

            setLoadingMessage('Reading file...');
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);

            reader.onload = async (event) => {
                if (!event.target?.result) {
                    const err = "Failed to read file.";
                    setError(err);
                    setIsLoading(false);
                    resolve({ base64Data: null, mimeType: file.type, error: err });
                    return;
                }

                const arrayBuffer = event.target.result as ArrayBuffer;
                const mimeType = file.type;

                // Use a temporary AudioContext for validation
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                
                setLoadingMessage('Decoding and validating audio...');
                try {
                     await audioContext.decodeAudioData(arrayBuffer.slice(0)); // Use slice to create a copy
                     const base64Data = bufferToBase64(arrayBuffer);
                     setIsLoading(false);
                     resolve({ base64Data, mimeType, error: null });
                } catch(decodeError){
                    console.error("Could not decode audio data:", decodeError);
                    const err = "The uploaded file is not a supported audio or video format. Please try a different file (e.g., MP3, MP4, WAV).";
                    setError(err);
                    setIsLoading(false);
                    resolve({ base64Data: null, mimeType, error: err });
                } finally {
                    audioContext.close();
                }
            };

            reader.onerror = () => {
                const err = "An error occurred while reading the file.";
                setError(err);
                setIsLoading(false);
                resolve({ base64Data: null, mimeType: file.type, error: err });
            };
        });
    };
    
    return { processFile, isLoading, loadingMessage, error };
};


import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { startChatSession, sendMessageToChatStream, persistChatHistory, clearChatHistory, generateTitlesAndHooks, generateThumbnailPrompts, geminiState, attemptAutoInitialize, initializeWithApiKey } from '../services/geminiService';
import { ChatIcon, TrashIcon, UserIcon, SendIcon, LockIcon } from '../components/icons/UtilityIcons';
import { WandIcon } from '../components/icons/ExtraIcons';
import { useAuth } from '../contexts/AuthContext';
import type { FunctionCall, Part } from '@google/genai';

const examplePrompts = [
    "Generate 5 titles for a video about React server components.",
    "Give me some thumbnail prompt ideas for a video with a 'dramatic' tone about AI.",
    "Can you explain the difference between Gemini and Claude?",
    "Summarize the tool 'Make.com' for me."
];

const ChatPage: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { currentUser } = useAuth()!;

    const [isConfigured, setIsConfigured] = useState(geminiState.isInitialized);
    const [isCheckingKey, setIsCheckingKey] = useState(true);
    const [configError, setConfigError] = useState('');
    const [apiKeyInput, setApiKeyInput] = useState('');

    const initializeChat = async () => {
        if (!currentUser || !isConfigured) return;

        setIsLoading(true);
        setError(null);
        try {
            const history = await startChatSession(currentUser.id);
            const formattedHistory: ChatMessage[] = history.map(h => ({
                role: h.role as 'user' | 'model',
                text: h.parts.map(p => p.text).join('')
            }));
            setMessages(formattedHistory);
        } catch (e: any) {
            setError(e.message || "Failed to start chat session.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const checkInitialization = async () => {
            await attemptAutoInitialize();
            setIsConfigured(geminiState.isInitialized);
            setConfigError(geminiState.error);
            setIsCheckingKey(false);
            if (geminiState.isInitialized) {
                initializeChat();
            }
        };
        checkInitialization();
    }, [currentUser]); // Re-check if user changes

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        setTimeout(scrollToBottom, 100);
    }, [messages]);

    const handleConfigureSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCheckingKey(true);
        setConfigError('');
        const success = await initializeWithApiKey(apiKeyInput);
        if (success) {
            setIsConfigured(true);
            await initializeChat();
        } else {
            setIsConfigured(false);
            setConfigError(geminiState.error);
        }
        setIsCheckingKey(false);
    };

    const handleSendMessage = async (e: React.FormEvent, messageText?: string) => {
        e.preventDefault();
        const textToSend = messageText || input;

        if (!textToSend.trim() || isLoading || !currentUser) return;

        const userMessage: ChatMessage = { role: 'user', text: textToSend, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            let modelResponseText = "";
            let functionCalls: FunctionCall[] = [];
            const streamResult = await sendMessageToChatStream(currentUser.id, textToSend);

            const modelMessageForStream: ChatMessage = { role: 'model', text: '', timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, modelMessageForStream]);
            
            for await (const chunk of streamResult) {
                const chunkText = chunk.text;
                if(chunkText) {
                    modelResponseText += chunkText;
                    setMessages(currentMessages => {
                        const newMessages = [...currentMessages];
                        newMessages[newMessages.length - 1].text = modelResponseText;
                        return newMessages;
                    });
                }
                if (chunk.functionCalls) {
                    functionCalls.push(...chunk.functionCalls);
                }
            }
            await persistChatHistory(currentUser.id);

            if (functionCalls.length > 0) {
                const toolCallDisplayMessage: ChatMessage = { role: 'model', text: `Using tool: \`${functionCalls[0].name}\`...`, timestamp: new Date().toISOString() };
                setMessages(prev => [...prev, toolCallDisplayMessage]);

                const functionResponses: Part[] = [];
                for (const funcCall of functionCalls) {
                    let functionResult: any;
                    try {
                        if (funcCall.name === 'generateTitlesAndHooks') {
                            functionResult = await generateTitlesAndHooks(funcCall.args.topic as string, funcCall.args.audience as string);
                        } else if (funcCall.name === 'generateThumbnailPrompts') {
                            functionResult = await generateThumbnailPrompts(funcCall.args.videoTopic as string, funcCall.args.tone as string);
                        } else { throw new Error(`Unknown tool called: ${funcCall.name}`); }
                        
                        functionResponses.push({ functionResponse: { name: funcCall.name, response: { result: functionResult } } });
                    } catch(toolError: any) {
                         functionResponses.push({ functionResponse: { name: funcCall.name, response: { error: toolError.message } } });
                    }
                }
                
                const secondStreamResult = await sendMessageToChatStream(currentUser.id, functionResponses);
                let finalModelResponseText = '';
                const finalModelMessage: ChatMessage = { role: 'model', text: '', timestamp: new Date().toISOString() };
                setMessages(prev => [...prev, finalModelMessage]);

                for await (const chunk of secondStreamResult) {
                     const chunkText = chunk.text;
                     if (chunkText) {
                        finalModelResponseText += chunkText;
                        setMessages(currentMessages => {
                            const newMessages = [...currentMessages];
                            newMessages[newMessages.length - 1].text = finalModelResponseText;
                            return newMessages;
                        });
                    }
                }
                await persistChatHistory(currentUser.id);
            }
        } catch (error: any) {
            const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() };
            setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.role === 'model' && lastMessage.text === '') {
                    return [...prev.slice(0, -1), errorMessage];
                }
                return [...prev, errorMessage];
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = async () => {
        if (!currentUser) return;
        if (window.confirm('Are you sure you want to clear the chat history? This action cannot be undone.')) {
            try {
                await clearChatHistory(currentUser.id);
                setMessages([]);
            } catch (e: any) {
                setError(e.message);
            }
        }
    };
    
    const handleExamplePromptClick = (prompt: string) => {
        setInput(prompt);
    };
    
    const ApiKeySetupForm = () => (
        <div className="flex-grow p-4 flex flex-col items-center justify-center text-center">
            <LockIcon className="w-12 h-12 text-gray-500 mb-4" />
            <h2 className="text-xl font-bold text-light-primary">Configure AI Assistant</h2>
            <p className="max-w-md mt-2 text-sm text-light-secondary">
                Please enter your Google Gemini API key to enable chat. Your key is stored only in your browser's local storage and is never sent to our servers.
            </p>
            <form onSubmit={handleConfigureSubmit} className="mt-6 w-full max-w-sm space-y-3">
                <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full px-4 py-2 bg-dark-primary border border-border-dark rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary text-light-primary"
                    aria-label="API Key Input"
                />
                {configError && <p className="text-red-500 text-sm">{configError}</p>}
                <button
                    type="submit"
                    disabled={isCheckingKey}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-600"
                >
                    {isCheckingKey ? 'Verifying...' : 'Save and Continue'}
                </button>
            </form>
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="mt-4 text-sm text-brand-primary hover:underline">
                Get a Gemini API key from Google AI Studio &rarr;
            </a>
        </div>
    );

    return (
        <div className="flex flex-col h-[75vh] max-w-3xl mx-auto bg-dark-secondary rounded-lg border border-border-dark shadow-lg animate-fade-in-up">
            <div className="p-4 border-b border-border-dark flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <ChatIcon className="w-8 h-8 text-brand-primary" />
                    <div>
                        <h1 className="text-xl font-bold text-light-primary">AI Assistant</h1>
                        <p className="text-sm text-light-secondary">Now with tool-using capabilities!</p>
                    </div>
                </div>
                {messages.length > 0 && isConfigured && (
                    <button onClick={handleClearChat} className="p-2 rounded-full text-gray-400 hover:bg-dark-primary hover:text-red-500" title="Clear chat history">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
            
            {isCheckingKey ? (
                <div className="flex-grow flex items-center justify-center">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                </div>
            ) : !isConfigured ? (
                 <ApiKeySetupForm />
            ) : (
                <>
                    <div className="flex-grow p-4 overflow-y-auto space-y-6">
                        {error && (
                            <div className="p-3 bg-red-900/40 text-red-300 rounded-md text-sm">
                                <p className="font-bold">Chat Error</p>
                                <p>{error}</p>
                            </div>
                        )}
                        {!isLoading && messages.length === 0 && !error && (
                            <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
                                <ChatIcon className="w-16 h-16 text-gray-600 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-300">Welcome to the Forge AI</h2>
                                <p className="mb-6">Ask me to do things for you. Here are some examples:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                                    {examplePrompts.map((prompt, i) => (
                                        <button key={i} onClick={() => handleExamplePromptClick(prompt)} className="p-3 bg-dark-primary border border-border-dark rounded-lg text-sm text-left text-light-secondary hover:bg-gray-700 transition-colors">
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {messages.map((msg, index) => {
                            const isUser = msg.role === 'user';
                            const isToolMessage = msg.role === 'model' && msg.text.startsWith('Using tool:');
                            const avatar = isUser ? (currentUser?.profilePictureUrl ? (<img src={currentUser.profilePictureUrl} alt="Your avatar" className="w-8 h-8 rounded-full object-cover" />) : (<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center"><UserIcon className="w-5 h-5 text-blue-200" /></div>)) : (<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center"><ChatIcon className="w-5 h-5 text-brand-primary" /></div>);

                            if (msg.role === 'model' && msg.text === '' && isLoading) {
                                return (<div key={index} className="flex items-end gap-3 animate-fade-in-up justify-start">{avatar}<div className="max-w-xs px-4 py-3 shadow-md bg-gray-700 rounded-r-2xl rounded-tl-2xl"><div className="flex items-center space-x-2"><div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast"></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast" style={{animationDelay: '0.2s'}}></div><div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast" style={{animationDelay: '0.4s'}}></div></div></div></div>);
                            }
                            if (msg.role === 'model' && msg.text === '') return null;
                            return (<div key={index} className={`flex items-end gap-3 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
                                {!isUser && avatar}
                                <div className={`flex flex-col max-w-xs md:max-w-md lg:max-w-lg ${isUser ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-center px-4 py-3 shadow-md ${isUser ? 'bg-brand-primary text-white rounded-l-2xl rounded-tr-2xl' : isToolMessage ? 'bg-purple-900/50 text-purple-200 rounded-r-2xl rounded-tl-2xl' : 'bg-gray-700 text-gray-200 rounded-r-2xl rounded-tl-2xl'}`}>
                                        {isToolMessage && <WandIcon className="w-4 h-4 mr-2 flex-shrink-0" />}
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                    {msg.timestamp && (<p className="text-xs text-gray-500 mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>)}
                                </div>
                                {isUser && avatar}
                            </div>);
                        })}
                        {isLoading && messages.length === 0 && (<div className="text-center text-gray-400"><p>Loading chat history...</p></div>)}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-border-dark">
                        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me to generate titles for..." className="flex-grow px-4 py-2 bg-dark-primary border border-border-dark rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary text-light-primary" disabled={isLoading} aria-label="Chat input" />
                            <button type="submit" className="bg-brand-primary text-white p-2.5 rounded-full hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" disabled={isLoading || !input.trim()} aria-label="Send message">
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChatPage;

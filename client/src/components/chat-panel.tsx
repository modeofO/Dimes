'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
    sender: 'user' | 'agent';
    text: string;
}

interface ChatPanelProps {
    messages: Message[];
    onSendMessage: (message: string) => void;
    onClose?: () => void;
}

export function ChatPanel({ messages, onSendMessage, onClose }: ChatPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-3 py-2 border-b border-zinc-700 bg-zinc-800 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">CAD Agent</h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700"
                    >
                        &times;
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                    <div className="text-zinc-600 text-center text-xs py-4">
                        Ask the CAD agent to build geometry...
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={index}
                            className={`p-2 rounded-lg max-w-[85%] ${
                                message.sender === 'user'
                                    ? 'bg-blue-600 text-white ml-auto'
                                    : 'bg-zinc-700 text-zinc-200 mr-auto'
                            }`}
                        >
                            <div className="text-xs whitespace-pre-wrap">
                                {message.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-700 flex-shrink-0">
                <div className="flex space-x-1.5">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Talk to the agent..."
                        className="flex-1 px-2.5 py-1.5 border border-zinc-600/50 rounded-md text-xs text-zinc-200 bg-zinc-700/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim()}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}

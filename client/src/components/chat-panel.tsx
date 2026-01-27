'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
    sender: 'user' | 'agent';
    text: string;
}

interface ChatPanelProps {
    messages: Message[];
    onSendMessage: (message: string) => void;
}

export function ChatPanel({ messages, onSendMessage }: ChatPanelProps) {
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
            <div className="p-3 border-b border-zinc-700 bg-zinc-800">
                <h3 className="font-semibold text-zinc-200">CAD Agent</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                    <div className="text-zinc-500 text-center text-sm">
                        Start a conversation with the CAD agent...
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
                            <div className="text-sm whitespace-pre-wrap">
                                {message.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-700">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Talk to the agent..."
                        className="flex-1 px-3 py-2 border border-zinc-600 rounded-md text-sm text-zinc-200 bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-zinc-600 disabled:text-zinc-400 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
} 
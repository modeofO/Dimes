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
            <div
                className="px-3 py-2 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: '1px solid #2A2D3A', backgroundColor: '#1A1D27' }}
            >
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6A6D7A' }}>Builder</h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="transition-colors text-sm leading-none w-5 h-5 flex items-center justify-center rounded"
                        style={{ color: '#5A5D6A' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#C8BDA0'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#5A5D6A'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                        &times;
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                    <div className="text-center text-xs py-4" style={{ color: '#5A5D6A' }}>
                        Ask the builder to create geometry...
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={index}
                            className={`p-2 rounded-lg max-w-[85%] ${
                                message.sender === 'user'
                                    ? 'ml-auto'
                                    : 'mr-auto'
                            }`}
                            style={message.sender === 'user'
                                ? { backgroundColor: 'rgba(212, 160, 23, 0.2)', color: '#E8DCC8' }
                                : { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#C8BDA0' }
                            }
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
            <form onSubmit={handleSubmit} className="p-2 flex-shrink-0" style={{ borderTop: '1px solid #2A2D3A' }}>
                <div className="flex space-x-1.5">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Talk to the builder..."
                        className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid #2A2D3A',
                            color: '#E8DCC8',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim()}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:cursor-not-allowed"
                        style={{
                            backgroundColor: inputValue.trim() ? 'rgba(212, 160, 23, 0.3)' : '#1A1D27',
                            color: inputValue.trim() ? '#D4A017' : '#5A5D6A',
                            border: '1px solid #2A2D3A',
                        }}
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}

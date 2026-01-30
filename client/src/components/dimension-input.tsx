'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DimensionInputProps {
    value: number;
    position: { x: number; y: number };
    onSubmit: (newValue: number) => void;
    onCancel: () => void;
}

export function DimensionInput({ value, position, onSubmit, onCancel }: DimensionInputProps) {
    const [inputValue, setInputValue] = useState(value.toFixed(2));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const parsed = parseFloat(inputValue);
            if (!isNaN(parsed) && parsed > 0) {
                onSubmit(parsed);
            }
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const handleBlur = () => {
        onCancel();
    };

    return (
        <div
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)',
                zIndex: 1000
            }}
        >
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                style={{
                    width: '80px',
                    padding: '4px 8px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    backgroundColor: '#1a2a3a',
                    color: '#fff',
                    border: '2px solid #4A9EFF',
                    borderRadius: '4px',
                    outline: 'none'
                }}
            />
        </div>
    );
}

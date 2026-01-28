'use client';

import React, { useEffect, useState } from 'react';

interface WelcomeOverlayProps {
    onDismiss: () => void;
}

const STORAGE_KEY = 'dimes-welcome-dismissed';

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem(STORAGE_KEY);
        if (!dismissed) {
            setVisible(true);
        }
    }, []);

    const dismiss = () => {
        setVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
        onDismiss();
    };

    // Listen for any key or mouse press to dismiss
    useEffect(() => {
        if (!visible) return;

        const handleKey = (e: KeyboardEvent) => {
            // Don't dismiss on modifier-only keys
            if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
            dismiss();
        };

        const handleClick = () => dismiss();

        window.addEventListener('keydown', handleKey);
        window.addEventListener('mousedown', handleClick);
        return () => {
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('mousedown', handleClick);
        };
    }, [visible]);

    if (!visible) return null;

    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-6 select-none">
                {/* Main CTA */}
                <div className="text-[#E8DCC8] text-lg tracking-wide">
                    Press{' '}
                    <kbd className="inline-block px-2.5 py-1 rounded-md bg-[#1A1D27] border border-[#2A2D3A] text-amber-400 font-mono text-base mx-1">
                        N
                    </kbd>{' '}
                    to start a new sketch
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 justify-center">
                    <div className="w-8 h-px bg-[#2A2D3A]" />
                    <span className="text-[#5A5D6A] text-xs">or</span>
                    <div className="w-8 h-px bg-[#2A2D3A]" />
                </div>

                {/* Sketch + Tool hints */}
                <div className="flex items-center gap-6 justify-center">
                    <HintKey letter="N" label="new sketch" />
                    <HintKey letter="S" label="sketch menu" />
                    <HintKey letter="Space" label="all commands" />
                </div>

                {/* Drawing tool hints */}
                <div className="flex items-center gap-6 justify-center mt-2">
                    <HintKey letter="L" label="line" />
                    <HintKey letter="C" label="circle" />
                    <HintKey letter="R" label="rect" />
                    <HintKey letter="A" label="arc" />
                    <HintKey letter="P" label="poly" />
                </div>

                {/* Navigation hints */}
                <div className="flex items-center gap-6 justify-center mt-2">
                    <HintKey letter="Tab" label="scene tree" />
                    <HintKey letter="1-3" label="views" />
                    <HintKey letter="Esc" label="back" />
                </div>
            </div>
        </div>
    );
}

function HintKey({ letter, label }: { letter: string; label: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <kbd className="text-amber-400 font-mono text-sm font-medium">{letter}</kbd>
            <span className="text-[#6A6D7A] text-xs">{label}</span>
        </div>
    );
}

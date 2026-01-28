'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DrawingTool } from '@/lib/cad/controls/cad-controls';

interface BottomHudProps {
    currentTool: DrawingTool;
    isConnected: boolean;
    onBuilderClick: () => void;
    isChatOpen: boolean;
    unreadMessages: number;
}

const TOOL_LABELS: Record<DrawingTool, string> = {
    select: 'SELECT',
    line: 'LINE',
    circle: 'CIRCLE',
    rectangle: 'RECT',
    arc: 'ARC',
    polygon: 'POLYGON',
    fillet: 'FILLET',
    chamfer: 'CHAMFER',
    trim: 'TRIM',
    extend: 'EXTEND',
    mirror: 'MIRROR',
    offset: 'OFFSET',
    copy: 'COPY',
    move: 'MOVE',
};

const KEY_HINTS = [
    { key: 'V', label: 'select' },
    { key: 'L', label: 'line' },
    { key: 'C', label: 'circle' },
    { key: 'R', label: 'rect' },
    { key: 'A', label: 'arc' },
    { key: 'P', label: 'poly' },
];

export function BottomHud({ currentTool, isConnected, onBuilderClick, isChatOpen, unreadMessages }: BottomHudProps) {
    const [hintsOpacity, setHintsOpacity] = useState(0.3);
    const [isHoveringBottom, setIsHoveringBottom] = useState(false);
    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fade hints after 30s of inactivity
    const resetInactivityTimer = useCallback(() => {
        setHintsOpacity(0.3);
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        inactivityTimerRef.current = setTimeout(() => {
            if (!isHoveringBottom) {
                setHintsOpacity(0.08);
            }
        }, 30000);
    }, [isHoveringBottom]);

    useEffect(() => {
        const handleActivity = () => resetInactivityTimer();
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);

        resetInactivityTimer();

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, [resetInactivityTimer]);

    // Pulse hints when hovering bottom edge
    useEffect(() => {
        if (isHoveringBottom) {
            setHintsOpacity(0.8);
        } else {
            setHintsOpacity(0.3);
        }
    }, [isHoveringBottom]);

    return (
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
            {/* Bottom edge hover zone */}
            <div
                className="absolute bottom-0 left-0 right-0 h-16 pointer-events-auto"
                onMouseEnter={() => setIsHoveringBottom(true)}
                onMouseLeave={() => setIsHoveringBottom(false)}
            />

            <div className="flex items-end justify-between px-4 pb-3">
                {/* Left: Connection + Tool Pill */}
                <div className="flex flex-col gap-1.5 pointer-events-auto">
                    {/* Connection indicator */}
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-[10px] text-[#5A5D6A] uppercase tracking-wider font-medium select-none">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>

                    {/* Tool pill */}
                    <div className="px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider select-none"
                        style={{
                            backgroundColor: '#1A1D27',
                            border: '1px solid #2A2D3A',
                            color: '#D4A017',
                        }}
                    >
                        {TOOL_LABELS[currentTool]}
                    </div>
                </div>

                {/* Center: Key hints */}
                <div
                    className="flex items-center gap-4 select-none transition-opacity duration-500"
                    style={{ opacity: hintsOpacity }}
                >
                    {KEY_HINTS.map(hint => (
                        <div key={hint.key} className="flex items-center gap-1">
                            <span className="text-amber-400/80 font-mono text-xs font-medium">{hint.key}</span>
                            <span className="text-[#6A6D7A] text-[10px]">{hint.label}</span>
                        </div>
                    ))}
                </div>

                {/* Right: Builder button */}
                {!isChatOpen && (
                    <button
                        onClick={onBuilderClick}
                        className="pointer-events-auto px-3 py-1.5 rounded-md text-xs font-medium shadow-lg shadow-black/30 transition-colors border select-none"
                        style={{
                            backgroundColor: '#1A1D27',
                            borderColor: '#2A2D3A',
                            color: '#C8BDA0',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#22252F';
                            e.currentTarget.style.color = '#E8DCC8';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1A1D27';
                            e.currentTarget.style.color = '#C8BDA0';
                        }}
                    >
                        Builder
                        {unreadMessages > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-amber-500 text-[#12141C] text-[10px] font-bold rounded-full">
                                {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

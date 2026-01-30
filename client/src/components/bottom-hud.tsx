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

// Tool-specific accent colors for visual feedback
const TOOL_COLORS: Record<DrawingTool, string> = {
    select: '#D4A017',
    line: '#4A9EFF',
    circle: '#FF6B6B',
    rectangle: '#50C878',
    arc: '#9B59B6',
    polygon: '#E67E22',
    fillet: '#1ABC9C',
    chamfer: '#1ABC9C',
    trim: '#E74C3C',
    extend: '#3498DB',
    mirror: '#9B59B6',
    offset: '#F39C12',
    copy: '#95A5A6',
    move: '#95A5A6',
    dimension: '#4A9EFF', // blue - matches dimension color
};

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
    dimension: 'DIMENSION',
};

const KEY_HINTS = [
    { key: 'N', label: 'new sketch' },
    { key: 'L', label: 'line' },
    { key: 'C', label: 'circle' },
    { key: 'R', label: 'rect' },
    { key: 'Shift+D', label: 'dimension' },
    { key: 'E', label: 'extrude' },
    { key: 'Space', label: 'commands' },
];

// All keyboard shortcuts for help modal
const ALL_SHORTCUTS = [
    { category: 'Sketch', items: [
        { key: 'N', label: 'New sketch (XZ plane)' },
        { key: 'S', label: 'Sketch menu' },
    ]},
    { category: 'Drawing Tools', items: [
        { key: 'V', label: 'Select' },
        { key: 'L', label: 'Line' },
        { key: 'C', label: 'Circle' },
        { key: 'R', label: 'Rectangle' },
        { key: 'A', label: 'Arc' },
        { key: 'P', label: 'Polygon' },
        { key: 'Shift+D', label: 'Dimension' },
    ]},
    { category: 'Modification', items: [
        { key: 'F', label: 'Fillet' },
        { key: 'H', label: 'Chamfer' },
        { key: 'T', label: 'Trim' },
        { key: 'W', label: 'Extend' },
        { key: 'M', label: 'Mirror' },
        { key: 'O', label: 'Offset' },
        { key: 'D', label: 'Copy (Duplicate)' },
        { key: 'G', label: 'Move' },
    ]},
    { category: '3D Operations', items: [
        { key: 'E', label: 'Extrude' },
        { key: 'X', label: 'Delete' },
    ]},
    { category: 'Views', items: [
        { key: '1', label: 'Front view' },
        { key: '2', label: 'Top view' },
        { key: '3', label: 'Right view' },
        { key: '0', label: 'Isometric view' },
    ]},
    { category: 'Navigation', items: [
        { key: 'Space', label: 'Command palette' },
        { key: 'Tab', label: 'Scene tree' },
        { key: 'Esc', label: 'Cancel / Deselect' },
    ]},
];

export function BottomHud({ currentTool, isConnected, onBuilderClick, isChatOpen, unreadMessages }: BottomHudProps) {
    const [hintsOpacity, setHintsOpacity] = useState(0.5);
    const [isHoveringBottom, setIsHoveringBottom] = useState(false);
    const [showConnection, setShowConnection] = useState(true);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-hide connection status after 3 seconds when connected
    useEffect(() => {
        if (connectionTimerRef.current) {
            clearTimeout(connectionTimerRef.current);
        }
        if (isConnected) {
            setShowConnection(true);
            connectionTimerRef.current = setTimeout(() => {
                setShowConnection(false);
            }, 3000);
        } else {
            setShowConnection(true); // Always show when disconnected
        }
        return () => {
            if (connectionTimerRef.current) {
                clearTimeout(connectionTimerRef.current);
            }
        };
    }, [isConnected]);

    // Fade hints after 30s of inactivity
    const resetInactivityTimer = useCallback(() => {
        setHintsOpacity(0.5);
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        inactivityTimerRef.current = setTimeout(() => {
            if (!isHoveringBottom) {
                setHintsOpacity(0.15);
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
            setHintsOpacity(1);
        } else {
            setHintsOpacity(0.5);
        }
    }, [isHoveringBottom]);

    // Close help modal on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showHelpModal) {
                setShowHelpModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showHelpModal]);

    return (
        <>
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
                        {/* Connection indicator - auto-hides when connected */}
                        <div
                            className={`flex items-center gap-1.5 transition-opacity duration-300 ${showConnection ? 'opacity-100' : 'opacity-0'}`}
                            onMouseEnter={() => setShowConnection(true)}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                            <span className="text-[10px] text-[#6A6D7A] uppercase tracking-wider font-medium select-none">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>

                        {/* Tool pill with colored left border */}
                        <div className="px-3 py-1.5 rounded-md text-sm font-semibold tracking-wider select-none"
                            style={{
                                backgroundColor: '#1A1D27',
                                border: '1px solid #2A2D3A',
                                borderLeft: `3px solid ${TOOL_COLORS[currentTool]}`,
                                color: TOOL_COLORS[currentTool],
                            }}
                        >
                            {TOOL_LABELS[currentTool]}
                        </div>
                    </div>

                    {/* Center: Key hints - improved contrast */}
                    <div
                        className="flex items-center gap-5 select-none transition-opacity duration-500"
                        style={{ opacity: hintsOpacity }}
                    >
                        {KEY_HINTS.map(hint => (
                            <div key={hint.key} className="flex items-center gap-1.5">
                                <span className="text-[#E8B520] font-mono text-xs font-semibold">{hint.key}</span>
                                <span className="text-[#B8BBCA] text-xs">{hint.label}</span>
                            </div>
                        ))}
                        {/* Help button */}
                        <button
                            onClick={() => setShowHelpModal(true)}
                            className="pointer-events-auto w-5 h-5 rounded flex items-center justify-center text-xs font-medium transition-colors"
                            style={{
                                backgroundColor: 'rgba(212, 160, 23, 0.15)',
                                color: '#D4A017',
                                border: '1px solid rgba(212, 160, 23, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(212, 160, 23, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(212, 160, 23, 0.15)';
                            }}
                        >
                            ?
                        </button>
                    </div>

                    {/* Right: Builder button */}
                    {!isChatOpen && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onBuilderClick();
                            }}
                            className="pointer-events-auto px-3 py-1.5 rounded-md text-xs font-medium shadow-lg shadow-black/30 transition-all duration-150 border select-none cursor-pointer relative z-20"
                            style={{
                                backgroundColor: '#1A1D27',
                                borderColor: '#D4A017',
                                color: '#E8DCC8',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#2A2D3A';
                                e.currentTarget.style.borderColor = '#E8B520';
                                e.currentTarget.style.color = '#FFFFFF';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#1A1D27';
                                e.currentTarget.style.borderColor = '#D4A017';
                                e.currentTarget.style.color = '#E8DCC8';
                                e.currentTarget.style.transform = 'translateY(0)';
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

            {/* Help Modal */}
            {showHelpModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setShowHelpModal(false)}
                >
                    <div className="absolute inset-0 bg-black/50" />
                    <div
                        className="relative max-w-lg w-full mx-4 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
                        style={{ backgroundColor: '#1A1D27', border: '1px solid #2A2D3A' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2D3A]">
                            <h2 className="text-sm font-semibold text-[#E8DCC8]">Keyboard Shortcuts</h2>
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="w-6 h-6 flex items-center justify-center rounded text-[#6A6D7A] hover:text-[#E8DCC8] hover:bg-white/5 transition-colors"
                            >
                                &times;
                            </button>
                        </div>
                        {/* Content */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                {ALL_SHORTCUTS.map(section => (
                                    <div key={section.category}>
                                        <h3 className="text-[10px] uppercase tracking-wider text-[#6A6D7A] font-medium mb-2">
                                            {section.category}
                                        </h3>
                                        <div className="space-y-1">
                                            {section.items.map(item => (
                                                <div key={item.key} className="flex items-center gap-2">
                                                    <kbd className="min-w-[24px] px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-center"
                                                        style={{
                                                            backgroundColor: 'rgba(212, 160, 23, 0.15)',
                                                            color: '#E8B520',
                                                            border: '1px solid rgba(212, 160, 23, 0.3)'
                                                        }}
                                                    >
                                                        {item.key}
                                                    </kbd>
                                                    <span className="text-xs text-[#B8BBCA]">{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-[#2A2D3A] text-center">
                            <span className="text-[10px] text-[#5A5D6A]">Press Esc to close</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

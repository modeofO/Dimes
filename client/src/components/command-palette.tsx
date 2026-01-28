'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DrawingTool } from '@/lib/cad/controls/cad-controls';
import { Unit } from '@/lib/utils/units';

interface CommandItem {
    id: string;
    label: string;
    shortcut?: string;
    icon?: string;
    category: 'tool' | 'operation' | 'view' | 'setting';
    action: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onSetDrawingTool: (tool: DrawingTool) => void;
    onExtrude: (distance: number) => void;
    onCreatePlane: (type: 'XZ' | 'XY' | 'YZ') => void;
    onCreateSketch: (planeId: string) => void;
    onSetView: (view: 'front' | 'top' | 'right' | 'isometric') => void;
    onSetUnit: (unit: Unit) => void;
    onSendAIMessage: (message: string) => void;
    currentTool: DrawingTool;
    currentUnit: Unit;
    availablePlanes: Array<{ plane_id: string; plane_type: string }>;
    availableSketches: Array<{ sketch_id: string; plane_id: string }>;
    onSetActiveSketch: (sketchId: string) => void;
    onDeleteSelected: () => void;
}

export function CommandPalette({
    isOpen,
    onClose,
    onSetDrawingTool,
    onExtrude,
    onCreatePlane,
    onCreateSketch,
    onSetView,
    onSetUnit,
    onSendAIMessage,
    currentTool,
    currentUnit,
    availablePlanes,
    availableSketches,
    onSetActiveSketch,
    onDeleteSelected,
}: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentCommands, setRecentCommands] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('dimes-recent-commands');
            return stored ? JSON.parse(stored) : [];
        }
        return [];
    });
    const [extrudeInputMode, setExtrudeInputMode] = useState(false);
    const [extrudeValue, setExtrudeValue] = useState('10');
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Focus input when palette opens
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setExtrudeInputMode(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const trackRecent = useCallback((commandId: string) => {
        setRecentCommands(prev => {
            const updated = [commandId, ...prev.filter(c => c !== commandId)].slice(0, 3);
            localStorage.setItem('dimes-recent-commands', JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Build command list
    const allCommands: CommandItem[] = [
        // Tools - Creation
        { id: 'select', label: 'Select', shortcut: 'V', icon: '↖', category: 'tool', action: () => onSetDrawingTool('select') },
        { id: 'line', label: 'Line', shortcut: 'L', icon: '╱', category: 'tool', action: () => onSetDrawingTool('line') },
        { id: 'circle', label: 'Circle', shortcut: 'C', icon: '○', category: 'tool', action: () => onSetDrawingTool('circle') },
        { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: '▭', category: 'tool', action: () => onSetDrawingTool('rectangle') },
        { id: 'arc', label: 'Arc', shortcut: 'A', icon: '⌒', category: 'tool', action: () => onSetDrawingTool('arc') },
        { id: 'polygon', label: 'Polygon', shortcut: 'P', icon: '⬡', category: 'tool', action: () => onSetDrawingTool('polygon') },
        // Tools - Modification
        { id: 'fillet', label: 'Fillet', shortcut: 'F', icon: '⤷', category: 'tool', action: () => onSetDrawingTool('fillet') },
        { id: 'chamfer', label: 'Chamfer', shortcut: 'H', icon: '⟋', category: 'tool', action: () => onSetDrawingTool('chamfer') },
        { id: 'trim', label: 'Trim', shortcut: 'T', icon: '✂', category: 'tool', action: () => onSetDrawingTool('trim') },
        { id: 'extend', label: 'Extend', icon: '⟶', category: 'tool', action: () => onSetDrawingTool('extend') },
        { id: 'mirror', label: 'Mirror', icon: '⇆', category: 'tool', action: () => onSetDrawingTool('mirror') },
        { id: 'offset', label: 'Offset', icon: '⇉', category: 'tool', action: () => onSetDrawingTool('offset') },
        { id: 'copy', label: 'Copy', icon: '⎘', category: 'tool', action: () => onSetDrawingTool('copy') },
        { id: 'move', label: 'Move', icon: '✥', category: 'tool', action: () => onSetDrawingTool('move') },
        // 3D Operations
        { id: 'extrude', label: 'Extrude', shortcut: 'E', icon: '⬆', category: 'operation', action: () => setExtrudeInputMode(true) },
        { id: 'delete', label: 'Delete selected', shortcut: 'X', icon: '✕', category: 'operation', action: () => onDeleteSelected() },
        // Planes
        { id: 'plane-xz', label: 'Create XZ Plane (Top)', icon: '⊞', category: 'operation', action: () => onCreatePlane('XZ') },
        { id: 'plane-xy', label: 'Create XY Plane (Front)', icon: '⊞', category: 'operation', action: () => onCreatePlane('XY') },
        { id: 'plane-yz', label: 'Create YZ Plane (Right)', icon: '⊞', category: 'operation', action: () => onCreatePlane('YZ') },
        // Sketches on available planes
        ...availablePlanes.map(plane => ({
            id: `sketch-on-${plane.plane_id}`,
            label: `Create Sketch on ${plane.plane_type} Plane`,
            icon: '✎',
            category: 'operation' as const,
            action: () => onCreateSketch(plane.plane_id),
        })),
        // Activate existing sketches
        ...availableSketches.map((sketch, i) => ({
            id: `activate-sketch-${sketch.sketch_id}`,
            label: `Edit Sketch ${i + 1}`,
            icon: '✏',
            category: 'operation' as const,
            action: () => onSetActiveSketch(sketch.sketch_id),
        })),
        // Views
        { id: 'view-front', label: 'Front View', shortcut: '1', icon: '⊡', category: 'view', action: () => onSetView('front') },
        { id: 'view-top', label: 'Top View', shortcut: '2', icon: '⊡', category: 'view', action: () => onSetView('top') },
        { id: 'view-right', label: 'Right View', shortcut: '3', icon: '⊡', category: 'view', action: () => onSetView('right') },
        { id: 'view-iso', label: 'Isometric View', shortcut: '0', icon: '⊡', category: 'view', action: () => onSetView('isometric') },
        // Settings
        { id: 'unit-mm', label: 'Set Unit: Millimeters', icon: '📏', category: 'setting', action: () => onSetUnit('mm') },
        { id: 'unit-cm', label: 'Set Unit: Centimeters', icon: '📏', category: 'setting', action: () => onSetUnit('cm') },
        { id: 'unit-m', label: 'Set Unit: Meters', icon: '📏', category: 'setting', action: () => onSetUnit('m') },
        { id: 'unit-in', label: 'Set Unit: Inches', icon: '📏', category: 'setting', action: () => onSetUnit('in') },
    ];

    // Filter commands based on query
    const filteredCommands = query.trim()
        ? allCommands.filter(cmd =>
            cmd.label.toLowerCase().includes(query.toLowerCase()) ||
            cmd.id.toLowerCase().includes(query.toLowerCase()) ||
            (cmd.shortcut && cmd.shortcut.toLowerCase() === query.toLowerCase())
        )
        : [];

    // Build display list: recent when empty, filtered when typing
    const displayCommands = query.trim()
        ? filteredCommands
        : allCommands.filter(cmd => recentCommands.includes(cmd.id)).slice(0, 3);

    const isAIQuery = query.trim().length > 0 && filteredCommands.length === 0;

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selected = listRef.current.children[selectedIndex] as HTMLElement;
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    const executeCommand = useCallback((cmd: CommandItem) => {
        trackRecent(cmd.id);
        cmd.action();
        if (cmd.id !== 'extrude') {
            onClose();
        }
    }, [trackRecent, onClose]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
            return;
        }

        if (extrudeInputMode) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const dist = parseFloat(extrudeValue);
                if (!isNaN(dist) && dist > 0) {
                    onExtrude(dist);
                    setExtrudeInputMode(false);
                    onClose();
                }
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, displayCommands.length - 1));
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (displayCommands.length > 0 && selectedIndex < displayCommands.length) {
                executeCommand(displayCommands[selectedIndex]);
            } else if (isAIQuery) {
                onSendAIMessage(query.trim());
                onClose();
            }
            return;
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            {/* Palette */}
            <div
                className="relative w-[480px] max-h-[60vh] flex flex-col rounded-xl shadow-2xl shadow-black/60 border border-[#2A2D3A] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                style={{ backgroundColor: '#1A1D27' }}
            >
                {/* Input */}
                <div className="p-3 border-b border-[#2A2D3A]">
                    {extrudeInputMode ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[#D4C5A0] text-sm">Extrude distance:</span>
                            <input
                                ref={inputRef}
                                type="number"
                                value={extrudeValue}
                                onChange={(e) => setExtrudeValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="flex-1 bg-transparent text-[#E8DCC8] text-sm outline-none placeholder-[#5A5D6A] caret-amber-400"
                                autoFocus
                            />
                            <span className="text-[#5A5D6A] text-xs">{currentUnit}</span>
                        </div>
                    ) : (
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a command, ask AI anything, or press ? for help..."
                            className="w-full bg-transparent text-[#E8DCC8] text-sm outline-none placeholder-[#5A5D6A] caret-amber-400"
                            style={{ caretColor: '#D4A017' }}
                            autoFocus
                        />
                    )}
                </div>

                {/* Results */}
                <div ref={listRef} className="overflow-y-auto max-h-[40vh]">
                    {/* Recent header when no query */}
                    {!query.trim() && displayCommands.length > 0 && (
                        <div className="px-3 pt-2 pb-1">
                            <span className="text-[10px] text-[#5A5D6A] uppercase tracking-wider font-medium">Recent</span>
                        </div>
                    )}

                    {displayCommands.map((cmd, index) => (
                        <div
                            key={cmd.id}
                            className={`px-3 py-2 flex items-center gap-3 cursor-pointer transition-colors ${
                                index === selectedIndex
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'text-[#C8BDA0] hover:bg-[#22252F]'
                            }`}
                            onClick={() => executeCommand(cmd)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            {cmd.icon && (
                                <span className="w-5 text-center text-sm opacity-60">{cmd.icon}</span>
                            )}
                            <span className="flex-1 text-sm">{cmd.label}</span>
                            {cmd.shortcut && (
                                <span className="text-xs text-[#5A5D6A] font-mono">{cmd.shortcut}</span>
                            )}
                        </div>
                    ))}

                    {/* AI query hint */}
                    {isAIQuery && (
                        <div className="px-3 py-3 border-t border-[#2A2D3A]">
                            <div className="flex items-center gap-2 text-sm text-[#8A8D9A]">
                                <span className="text-amber-400/60">AI</span>
                                <span>Press Enter to ask: &ldquo;{query.trim()}&rdquo;</span>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!query.trim() && displayCommands.length === 0 && (
                        <div className="px-3 py-4 text-center text-[#5A5D6A] text-xs">
                            Start typing to search commands or ask AI
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

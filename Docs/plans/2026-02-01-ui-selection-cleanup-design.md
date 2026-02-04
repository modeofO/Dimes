# UI Selection Cleanup Design

## Overview

Three UI improvements to the Quito CAD application:
1. Easier line selection in sketches
2. Scene tree reflects selected elements
3. Visibility toggles for planes and sketches

## 1. Line Selection Improvement

**Problem:** Hard to click sketch lines because hit-test area is too small.

**Solution:** Double the hit-test ribbon width.

**File:** `client/src/lib/cad/renderer/visualization-manager.ts`

**Change:**
- `HALF_WIDTH` constant: `0.4` → `0.8` (total width: 0.8 → 1.6 world units)

## 2. Scene Tree Selection Sync

**Problem:** Clicking elements in 3D view doesn't highlight them in the scene tree.

**Root Cause:** UIManager's `onSelection` doesn't pass `sketchId`, causing ID mismatch.

**Files:**
- `client/src/components/ui-manager.tsx`

**Changes:**

### UIManagerProps interface
```typescript
onSelection: (id: string | null, type: string | null, sketchId?: string | null) => void;
```

### Tree click handlers
Pass `sketch.sketch_id` when clicking elements:
```typescript
onClick={() => handleItemClick(child.id, 'element', sketch.sketch_id)}
```

### handleItemClick function
```typescript
const handleItemClick = (id: string, type: string, sketchId?: string) => {
    onSelection(id, type, sketchId ?? null);
};
```

## 3. Visibility Toggles

**Feature:** Eye icon to show/hide planes and sketches independently.

**Files:**
- `client/src/components/ui-manager.tsx`
- `client/src/components/cad-application.tsx`
- `client/src/lib/cad/renderer/visualization-manager.ts`
- `client/src/lib/cad/renderer/cad-renderer.ts`

### Data Model

Add `visible` property to existing interfaces:
```typescript
interface CreatedPlane {
    plane_id: string;
    plane_type: string;
    origin: [number, number, number];
    visible: boolean;  // NEW
}

interface CreatedSketch {
    sketch_id: string;
    plane_id: string;
    elements: SketchElementInfo[];
    visible: boolean;  // NEW
}
```

### VisualizationManager

Add methods:
```typescript
public setPlaneVisibility(planeId: string, visible: boolean): void {
    const group = this.planeMeshes.get(planeId);
    if (group) group.visible = visible;
}

public setSketchVisibility(sketchId: string, visible: boolean): void {
    const group = this.sketchMeshes.get(sketchId);
    if (group) group.visible = visible;

    // Also hide/show all elements in this sketch
    this.elementMeshes.forEach((elemGroup, key) => {
        if (key.startsWith(`element-${sketchId}-`)) {
            elemGroup.visible = visible;
        }
    });
}
```

### CADRenderer

Add public methods delegating to VisualizationManager:
```typescript
public setPlaneVisibility(planeId: string, visible: boolean): void
public setSketchVisibility(sketchId: string, visible: boolean): void
```

### CADApplication

Add toggle callbacks:
```typescript
const togglePlaneVisibility = useCallback((planeId: string) => {
    setCreatedPlanes(prev => prev.map(p =>
        p.plane_id === planeId ? { ...p, visible: !p.visible } : p
    ));
    if (rendererRef.current) {
        const plane = createdPlanes.find(p => p.plane_id === planeId);
        rendererRef.current.setPlaneVisibility(planeId, !plane?.visible);
    }
}, [createdPlanes]);

const toggleSketchVisibility = useCallback((sketchId: string) => {
    setCreatedSketches(prev => prev.map(s =>
        s.sketch_id === sketchId ? { ...s, visible: !s.visible } : s
    ));
    if (rendererRef.current) {
        const sketch = createdSketches.find(s => s.sketch_id === sketchId);
        rendererRef.current.setSketchVisibility(sketchId, !sketch?.visible);
    }
}, [createdSketches]);
```

### UIManager

Add props:
```typescript
interface UIManagerProps {
    // ... existing
    onTogglePlaneVisibility: (planeId: string) => void;
    onToggleSketchVisibility: (sketchId: string) => void;
}
```

Add eye icon button next to plane/sketch names:
```tsx
<button
    onClick={(e) => {
        e.stopPropagation();
        onTogglePlaneVisibility(plane.plane_id);
    }}
    className="ml-auto text-xs hover:bg-white/10 rounded p-0.5"
>
    {plane.visible !== false ? '👁' : '👁‍🗨'}
</button>
```

Style hidden items with `opacity-50`.

## Implementation Order

1. Line selection (simplest - one constant change)
2. Scene tree selection sync (interface + handler updates)
3. Visibility toggles (most changes, but isolated)

## Testing

- Draw various sketch elements, verify easier clicking
- Click elements in 3D view, verify tree highlights them
- Click elements in tree, verify 3D highlights them
- Toggle plane visibility, verify plane hides but sketches remain
- Toggle sketch visibility, verify sketch and its elements hide

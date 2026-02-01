# Constraint System Phase 2: Dimension Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate DimensionManager with the constraint system so dimensions become length constraints internally.

**Approach:** Constraint-First - all dimension value changes go through the backend constraint solver.

---

## Task 1: Add constraint_id to LinearDimension Type

**Files:**
- Modify: `shared/types/geometry.ts`

**Step 1: Update LinearDimension interface**

Find the `LinearDimension` interface and add the constraint_id field:

```typescript
export interface LinearDimension {
    id: string;
    type: 'linear';
    element_id: string;
    sketch_id: string;
    value: number;
    offset: number;
    offset_direction: 1 | -1;
    constraint_id?: string;  // Link to backend constraint
}
```

**Step 2: Commit**

```bash
git add shared/types/geometry.ts
git commit -m "feat(constraints): add constraint_id to LinearDimension type"
```

---

## Task 2: Add Constraint API Methods to CAD Client

**Files:**
- Modify: `client/src/lib/cad/api/cad-client.ts`

**Step 1: Add createConstraint method**

Add after existing methods:

```typescript
async createConstraint(
    sketchId: string,
    type: string,
    elementIds: string[],
    value?: number
): Promise<{ constraint: any; updated_elements: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/v1/constraints`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': this.sessionId,
        },
        body: JSON.stringify({
            session_id: this.sessionId,
            sketch_id: sketchId,
            type,
            element_ids: elementIds,
            value,
        }),
    });

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Failed to create constraint');
    }
    return result.data;
}
```

**Step 2: Add updateConstraint method**

```typescript
async updateConstraint(
    constraintId: string,
    sketchId: string,
    value: number
): Promise<{ constraint: any; updated_elements: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/v1/constraints/${constraintId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': this.sessionId,
        },
        body: JSON.stringify({
            session_id: this.sessionId,
            sketch_id: sketchId,
            value,
        }),
    });

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Failed to update constraint');
    }
    return result.data;
}
```

**Step 3: Add deleteConstraint method**

```typescript
async deleteConstraint(
    constraintId: string,
    sketchId?: string
): Promise<boolean> {
    const params = new URLSearchParams({
        session_id: this.sessionId,
    });
    if (sketchId) {
        params.append('sketch_id', sketchId);
    }

    const response = await fetch(
        `${this.baseUrl}/api/v1/constraints/${constraintId}?${params}`,
        {
            method: 'DELETE',
            headers: {
                'X-Session-ID': this.sessionId,
            },
        }
    );

    const result = await response.json();
    return result.success;
}
```

**Step 4: Commit**

```bash
git add client/src/lib/cad/api/cad-client.ts
git commit -m "feat(constraints): add constraint API methods to CAD client"
```

---

## Task 3: Update DimensionManager Callbacks Interface

**Files:**
- Modify: `client/src/lib/cad/dimensions/dimension-manager.ts`

**Step 1: Update DimensionManagerCallbacks interface**

Replace the existing callbacks interface with async versions and add constraint callbacks:

```typescript
interface DimensionManagerCallbacks {
    onDimensionCreated?: (dimension: LinearDimension) => void;
    onDimensionUpdated?: (dimension: LinearDimension) => void;
    onDimensionDeleted?: (dimensionId: string) => void;
    // Constraint integration callbacks
    onConstraintCreate?: (
        sketchId: string,
        elementId: string,
        value: number
    ) => Promise<{ constraint_id: string; updated_elements: any[] }>;
    onConstraintUpdate?: (
        constraintId: string,
        sketchId: string,
        value: number
    ) => Promise<{ updated_elements: any[] }>;
    onConstraintDelete?: (constraintId: string) => Promise<boolean>;
    // Keep for backwards compatibility during transition
    onLineResizeRequested?: (
        sketchId: string,
        elementId: string,
        newX1: number,
        newY1: number,
        newX2: number,
        newY2: number
    ) => void;
}
```

**Step 2: Commit**

```bash
git add client/src/lib/cad/dimensions/dimension-manager.ts
git commit -m "feat(constraints): update DimensionManager callbacks for constraint integration"
```

---

## Task 4: Update createDimension to Create Constraint

**Files:**
- Modify: `client/src/lib/cad/dimensions/dimension-manager.ts`

**Step 1: Make createDimension async and create constraint**

Update the `createDimension` method signature and implementation:

```typescript
async createDimension(
    elementId: string,
    sketchId: string,
    offset: number = 15,
    offsetDirection: 1 | -1 = 1
): Promise<LinearDimension | null> {
    const elementData = this.elementData.get(elementId);
    if (!elementData) {
        console.warn(`No element data for ${elementId}`);
        return null;
    }

    // Calculate current length
    const dx = elementData.x2 - elementData.x1;
    const dy = elementData.y2 - elementData.y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Generate dimension ID
    const dimensionId = `dim_${++this.idCounter}_${Date.now()}`;

    // Create constraint in backend if callback available
    let constraintId: string | undefined;
    if (this.callbacks.onConstraintCreate) {
        try {
            const result = await this.callbacks.onConstraintCreate(sketchId, elementId, length);
            constraintId = result.constraint_id;
        } catch (error) {
            console.error('Failed to create constraint:', error);
            // Continue without constraint - dimension still works locally
        }
    }

    const dimension: LinearDimension = {
        id: dimensionId,
        type: 'linear',
        element_id: elementId,
        sketch_id: sketchId,
        value: length,
        offset,
        offset_direction: offsetDirection,
        constraint_id: constraintId,
    };

    this.dimensions.set(dimensionId, dimension);
    this.renderDimension(dimension);

    if (this.callbacks.onDimensionCreated) {
        this.callbacks.onDimensionCreated(dimension);
    }

    return dimension;
}
```

**Step 2: Commit**

```bash
git add client/src/lib/cad/dimensions/dimension-manager.ts
git commit -m "feat(constraints): createDimension now creates backend constraint"
```

---

## Task 5: Update updateDimensionValue to Use Constraint Solver

**Files:**
- Modify: `client/src/lib/cad/dimensions/dimension-manager.ts`

**Step 1: Make updateDimensionValue async and use solver**

Replace the `updateDimensionValue` method:

```typescript
async updateDimensionValue(dimensionId: string, newValue: number): Promise<boolean> {
    const dimension = this.dimensions.get(dimensionId);
    if (!dimension) {
        console.warn(`Dimension ${dimensionId} not found`);
        return false;
    }

    const elementData = this.elementData.get(dimension.element_id);
    if (!elementData) {
        console.warn(`Element data not found for ${dimension.element_id}`);
        return false;
    }

    // If we have a constraint, update via solver
    if (dimension.constraint_id && this.callbacks.onConstraintUpdate) {
        try {
            const result = await this.callbacks.onConstraintUpdate(
                dimension.constraint_id,
                dimension.sketch_id,
                newValue
            );

            // Apply updated geometry from solver
            if (result.updated_elements && result.updated_elements.length > 0) {
                for (const elem of result.updated_elements) {
                    if (elem.element_id === dimension.element_id) {
                        // Update local element data
                        const params = elem.parameters_2d;
                        if (params) {
                            this.elementData.set(dimension.element_id, {
                                x1: params.x1 ?? elementData.x1,
                                y1: params.y1 ?? elementData.y1,
                                x2: params.x2 ?? elementData.x2,
                                y2: params.y2 ?? elementData.y2,
                                sketchId: dimension.sketch_id,
                            });
                        }
                    }
                }
            }

            // Update dimension value
            dimension.value = newValue;
            this.renderDimension(dimension);

            if (this.callbacks.onDimensionUpdated) {
                this.callbacks.onDimensionUpdated(dimension);
            }

            return true;
        } catch (error) {
            console.error('Constraint update failed:', error);
            return false;
        }
    }

    // Fallback: local calculation (legacy behavior)
    const dx = elementData.x2 - elementData.x1;
    const dy = elementData.y2 - elementData.y1;
    const currentLength = Math.sqrt(dx * dx + dy * dy);

    if (currentLength < 0.0001) {
        console.warn('Line has zero length');
        return false;
    }

    const scale = newValue / currentLength;
    const midX = (elementData.x1 + elementData.x2) / 2;
    const midY = (elementData.y1 + elementData.y2) / 2;
    const halfDx = (dx * scale) / 2;
    const halfDy = (dy * scale) / 2;

    const newX1 = midX - halfDx;
    const newY1 = midY - halfDy;
    const newX2 = midX + halfDx;
    const newY2 = midY + halfDy;

    this.elementData.set(dimension.element_id, {
        x1: newX1,
        y1: newY1,
        x2: newX2,
        y2: newY2,
        sketchId: dimension.sketch_id,
    });

    dimension.value = newValue;
    this.renderDimension(dimension);

    if (this.callbacks.onLineResizeRequested) {
        this.callbacks.onLineResizeRequested(
            dimension.sketch_id,
            dimension.element_id,
            newX1,
            newY1,
            newX2,
            newY2
        );
    }

    if (this.callbacks.onDimensionUpdated) {
        this.callbacks.onDimensionUpdated(dimension);
    }

    return true;
}
```

**Step 2: Commit**

```bash
git add client/src/lib/cad/dimensions/dimension-manager.ts
git commit -m "feat(constraints): updateDimensionValue uses constraint solver"
```

---

## Task 6: Update deleteDimension to Delete Constraint

**Files:**
- Modify: `client/src/lib/cad/dimensions/dimension-manager.ts`

**Step 1: Make deleteDimension async and delete constraint**

Update the `deleteDimension` method:

```typescript
async deleteDimension(dimensionId: string): Promise<boolean> {
    const dimension = this.dimensions.get(dimensionId);
    if (!dimension) {
        return false;
    }

    // Delete constraint in backend if exists
    if (dimension.constraint_id && this.callbacks.onConstraintDelete) {
        try {
            await this.callbacks.onConstraintDelete(dimension.constraint_id);
        } catch (error) {
            console.error('Failed to delete constraint:', error);
            // Continue with local deletion anyway
        }
    }

    // Remove from renderer
    this.renderer.removeDimension(dimensionId);

    // Remove from storage
    this.dimensions.delete(dimensionId);

    if (this.callbacks.onDimensionDeleted) {
        this.callbacks.onDimensionDeleted(dimensionId);
    }

    return true;
}
```

**Step 2: Commit**

```bash
git add client/src/lib/cad/dimensions/dimension-manager.ts
git commit -m "feat(constraints): deleteDimension deletes backend constraint"
```

---

## Task 7: Update CADApplication Callbacks

**Files:**
- Modify: `client/src/components/cad-application.tsx`

**Step 1: Find and update the dimensionManager.setCallbacks call**

Find the `dimensionManager.setCallbacks` call and update it to include constraint callbacks:

```typescript
dimensionManager.setCallbacks({
    onConstraintCreate: async (sketchId, elementId, value) => {
        if (!clientRef.current) throw new Error('No client');
        const result = await clientRef.current.createConstraint(
            sketchId,
            'length',
            [elementId],
            value
        );
        return {
            constraint_id: result.constraint.id,
            updated_elements: result.updated_elements,
        };
    },
    onConstraintUpdate: async (constraintId, sketchId, value) => {
        if (!clientRef.current) throw new Error('No client');
        const result = await clientRef.current.updateConstraint(
            constraintId,
            sketchId,
            value
        );
        return { updated_elements: result.updated_elements };
    },
    onConstraintDelete: async (constraintId) => {
        if (!clientRef.current) return false;
        return await clientRef.current.deleteConstraint(constraintId);
    },
    // Keep legacy callback for fallback
    onLineResizeRequested: async (sketchId, elementId, newX1, newY1, newX2, newY2) => {
        if (!clientRef.current) return;
        try {
            await clientRef.current.updateLineEndpoints(sketchId, elementId, newX1, newY1, newX2, newY2);
            updateStatus('Line resized via dimension', 'success');
        } catch (error) {
            console.error('Failed to resize line:', error);
            updateStatus('Failed to resize line', 'error');
        }
    }
});
```

**Step 2: Update handleDimensionValueSubmit to be async-aware**

Find `handleDimensionValueSubmit` and ensure it handles async properly:

```typescript
const handleDimensionValueSubmit = async (value: number) => {
    if (!selectedDimensionId || !rendererRef.current) return;

    const dimensionManager = rendererRef.current.getDimensionManager();
    const success = await dimensionManager.updateDimensionValue(selectedDimensionId, value);

    if (success) {
        updateStatus(`Dimension updated to ${value.toFixed(2)} mm`, 'success');
    } else {
        updateStatus('Failed to update dimension', 'error');
    }

    setIsEditingDimension(false);
    setSelectedDimensionId(null);
};
```

**Step 3: Commit**

```bash
git add client/src/components/cad-application.tsx
git commit -m "feat(constraints): wire up constraint callbacks in CADApplication"
```

---

## Task 8: Update CADRenderer createDimensionForLine

**Files:**
- Modify: `client/src/lib/cad/renderer/cad-renderer.ts`

**Step 1: Make createDimensionForLine async**

Find and update the method signature and implementation:

```typescript
async createDimensionForLine(
    sketchId: string,
    elementId: string,
    offset: number = 15
): Promise<string | null> {
    const dimension = await this.dimensionManager.createDimension(
        elementId,
        sketchId,
        offset
    );
    return dimension?.id ?? null;
}
```

**Step 2: Update any callers to handle async**

Check `cad-application.tsx` for calls to `createDimensionForLine` and add `await`.

**Step 3: Commit**

```bash
git add client/src/lib/cad/renderer/cad-renderer.ts client/src/components/cad-application.tsx
git commit -m "feat(constraints): make createDimensionForLine async"
```

---

## Summary

After completing all 8 tasks, Phase 2 provides:

1. **Type extension** - `LinearDimension` includes `constraint_id`
2. **API methods** - CAD client can create/update/delete constraints
3. **Async dimension ops** - create/update/delete are now async
4. **Constraint integration** - dimension changes go through solver
5. **Backwards compatibility** - legacy `onLineResizeRequested` still works

The system now:
- Creates a length constraint when a dimension is created
- Updates geometry via solver when dimension value changes
- Deletes constraint when dimension is deleted
- Falls back to local calculation if constraint API unavailable

**Next Phase:** Frontend constraint UI (H/V inference, icons, confirmation flow)

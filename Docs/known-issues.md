# Dimes CAD - Known Issues & Deferred Work

## Status Legend

- **Deferred** - User explicitly said to handle later
- **Known Bug** - Identified but not yet fixed
- **Needs Investigation** - Root cause not yet determined
- **Architecture** - Structural issue requiring design decisions
- **Fixed** - Issue has been resolved

---

## 1. Fillet, Chamfer, Delete ~~Not Working~~ ✅ FIXED

**Status:** Fixed

### Fillet/Chamfer ✅

Fillet and chamfer now work with a draw-to-select UX:
1. User selects fillet/chamfer tool (F/H key) - cursor changes to 'cell'
2. User draws a line across two sketch lines to select them
3. Inline input appears for radius/distance (no more ugly `window.prompt()`)
4. Backend creates the fillet arc or chamfer line with correct geometry

**Fixes applied:**
- Draw-to-select UX using 2D line-line intersection detection
- Inline input UI (same pattern as extrude)
- Fixed geometry calculation using angle bisector approach for fillet center
- Fixed arc visualization to take shorter path (was going 270° instead of 90° on some corners)

### Delete ✅

Delete now works for sketch elements:
- Press X or Delete key to delete selected element
- Full stack implementation: Frontend → API Server → Python Backend
- Handles composite shapes (deletes parent and all child lines)
- Scene cleanup and state management

**Files:** `cad-application.tsx`, `cad-client.ts`, `api-server/src/routes/cad.js`, `serverpy/app/src/geometry_engine.py`, `serverpy/app/src/api_server.py`

---

## 2. Undo/Redo Not Implemented

**Status:** Known Bug
**Location:** `cad-application.tsx:777-787`

Currently shows "Undo/Redo (not yet implemented)" status message when Ctrl+Z / Ctrl+Shift+Z is pressed.

Implementation would require:
- Command history stack
- Backend support for reversing operations
- Scene state snapshots or incremental undo

---

## 3. API Server WebSocket Inconsistency: `data` vs `payload` Key ✅ FIXED

**Status:** Fixed

All WebSocket messages now consistently use the `payload` key for data:
- Boolean operations in `cad.js` updated to use `payload` instead of `data`
- Client `cad-application.tsx` updated to expect `payload` for `geometry_update` messages

**Files:** `api-server/src/routes/cad.js`, `client/src/components/cad-application.tsx`

---

## 4. element_id Optional in API Validation but Required by Backend ✅ FIXED

**Status:** Fixed

The extrude endpoint's `element_id` validation is now required (not optional) to match the backend's requirement. The backend needs `element_id` to find the correct face for extrusion.

**Files:** `api-server/src/routes/cad.js`

---

## 5. Missing Response Validation for mesh_data/visualization_data ✅ FIXED

**Status:** Fixed

The boolean operations handler now has the same fallback logic as extrude:
- Checks for `visualization_data` first
- Falls back to `mesh_data`
- Logs if neither is available

**Files:** `api-server/src/routes/cad.js`

---

## 6. Sketch-on-Face: Normal-to-Plane Mapping Approximation

**Status:** Known Bug
**Location:** `cad-application.tsx:506-517`

When clicking a face of extruded geometry, the face normal is mapped to the closest standard plane type (XZ/XY/YZ). This is an approximation that works for axis-aligned faces but fails for:
- Angled faces (e.g., chamfered edges, draft angles)
- Curved surfaces (face normal varies across the surface)
- Rotated geometry

The current mapping:
```
|normal.y| >= others -> XZ plane
|normal.z| >= others -> XY plane
|normal.x| >= others -> YZ plane
```

For a proper implementation, the backend would need to support arbitrary sketch planes defined by any normal vector, not just the three standard orientations.

---

## 7. Trim, Extend, Mirror, Offset, Copy, Move Tools

**Status:** Deferred (partially)

These tools have backend endpoints and client API methods, but the frontend interactive flow for most of them just shows "Please select elements first for {tool} operations" (`cad-application.tsx:325`).

| Tool | Backend | Client API | Frontend UX |
|------|---------|------------|-------------|
| Trim (line-to-line) | Yes | Yes | Not interactive |
| Trim (line-to-geometry) | Yes | Yes | Not interactive |
| Extend (line-to-line) | Yes | Yes | Not interactive |
| Extend (line-to-geometry) | Yes | Yes | Not interactive |
| Mirror | Yes | Yes | Not interactive |
| Offset | Yes | Yes | Not interactive |
| Copy | Yes | Yes | Not interactive |
| Move | Yes | Yes | Not interactive |

These need proper two-step selection UIs similar to the fillet/chamfer flow.

---

## 8. Export Functionality Not Exposed in UI

**Status:** Known Bug

The backend supports exporting to STEP, STL, OBJ, and IGES formats (`api-server/src/routes/cad.js:1069-1093`, `cad-client.ts:exportModel`), but there's no UI to trigger an export. Should be added to the command palette.

---

## 9. Boolean Operations Not Exposed in UI

**Status:** Known Bug

The backend supports union, cut, and intersect boolean operations between shapes (`api-server/src/routes/cad.js:981-1013`), but there's no UI flow for selecting two shapes and applying a boolean operation.

---

## 10. Linear/Mirror Array Not Exposed in UI

**Status:** Known Bug

Backend supports creating linear arrays (copy elements in a pattern) and mirror arrays, but no UI flow exists for these operations.

---

## 11. Model ID Collision Risk ✅ FIXED

**Status:** Fixed

Model IDs are now generated with both timestamp and counter: `model-${Date.now()}-${++modelIdCounter}`. This prevents collisions even when geometry updates arrive within the same millisecond.

**Files:** `client/src/components/cad-application.tsx`

---

## 12. Agent WebSocket Message Handling

**Status:** Partially Fixed

The `data` vs `payload` inconsistency has been fixed (see #3). Agent message handling now consistently uses:
- `message.data.content` for `agent_message` type (chat responses)
- `message.payload` for `geometry_update` and `visualization_data`

The data flow through the agent path still needs end-to-end testing.

---

## 13. No Constraint System

**Status:** Architecture

The CAD application currently has no parametric constraint system (coincident, perpendicular, parallel, tangent, equal, horizontal, vertical, fixed). All geometry is placed by absolute coordinates with snap points only.

A constraint solver would be a major architectural addition.

---

## 14. Session Persistence

**Status:** Architecture

Sessions are in-memory only (Python `SessionManager` uses a dict). Closing the browser or restarting the server loses all work. No save/load functionality exists.

---

## 15. Hover Highlight Cleanup on Tool Switch ✅ FIXED

**Status:** Fixed

`setDrawingTool()` now calls `clearHoverHighlight()` and resets cursor to inherit.

**Files:** `client/src/lib/cad/renderer/cad-renderer.ts`

---

## 16. UX Improvements ✅ IMPLEMENTED

These features were added to improve the user experience:

### Drawing Tool Cursors ✅
- **Crosshair** cursor for drawing tools (line, rectangle, circle, arc, polygon)
- **Cell** cursor for modification tools (fillet, chamfer, trim)
- **Pointer** cursor when hovering over selectable objects in select mode
- **Default** cursor for select tool

### Escape-to-Select Behavior ✅
- Pressing Escape in sketch mode now returns to select tool first (instead of immediately exiting sketch)
- Press Escape again to exit the sketch
- This allows quickly switching between drawing and selecting without leaving sketch mode

### Box/Drag Selection ✅
- **Shift+drag** to create a selection rectangle
- Works anywhere (even on plane/sketch)
- Amber-colored selection box during drag
- Composite shapes (rectangles, polygons) are grouped - selecting any part selects the whole shape
- Highlight shows around entire composite shape, not just individual lines

**Note:** Currently selects only one object at a time (first in selection box). True multi-selection would require state architecture changes.

---

## Priority Order (Suggested)

1. ~~**Fillet/Chamfer** - Core CAD workflow, backend exists~~ ✅ DONE
2. ~~**Delete** - Basic operation, blocking iterative design~~ ✅ DONE
3. **Sketch-on-Face normal mapping** - Limits 3D modeling capability
4. **Trim/Extend** - Important for sketch cleanup
5. **Export** - Users need to get their work out
6. **Undo/Redo** - Expected in any design tool
7. **Mirror/Offset/Copy/Move** - Productivity features
8. **Boolean operations** - Advanced 3D modeling
9. **Linear/Mirror arrays** - Pattern creation
10. **Constraint system** - Parametric modeling
11. **Session persistence** - Save/load

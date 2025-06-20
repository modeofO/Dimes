# Current Issues With the System

1. **Fillet Arc's 2D**:
   - Unsure whether agent is placing fillet arcs incorrectly or the backend is misinterpreting the geometry data, but the fillet's don't connect to the parent 2D shape, also causing extrusion to fail.

2. **Manual Tools**:
   - Not all tools are available for manual creation.

3. **Plane Creation Design**:
   - Planes need a different design to differentiate from the standard grid

4. **Agent Creates a New Plane For Every New Geometry Piece**:
   - If the New piece doesn't change height from the previous piece (i.e. make a cylinder on xz plane and want to make a new cylinder at same y-axis height, then continue on current plane and sketch) then a new plane and sketch shouldn't be created.


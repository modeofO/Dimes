# CAD Engine Client - Next.js Application

This is the Next.js frontend client for the CAD Engine application, converted from the original Vite-based implementation. It provides a modern React-based user interface for 3D CAD modeling with real-time visualization.

## Features

- **Modern React Architecture**: Built with Next.js 15, React 19, and TypeScript
- **3D Visualization**: Three.js-powered CAD renderer with interactive controls
- **Sketch-Based Modeling**: Create planes, sketches, and extrude features
- **Real-time Updates**: WebSocket integration for live geometry updates
- **AI Agent Integration**: Chat interface for CAD assistant functionality
- **Responsive UI**: Tailwind CSS-powered interface with three-panel layout

## Project Structure

```
client/
├── src/
│   ├── app/                    # Next.js App Router
│   │   └── page.tsx            # Main application page
│   ├── components/             # React components
│   │   ├── cad-application.tsx # Main CAD application component
│   │   ├── controls-panel.tsx  # CAD controls and operations
│   │   ├── chat-panel.tsx      # Agent chat interface
│   │   ├── ui-manager.tsx      # Scene tree manager
│   │   └── status-bar.tsx      # Status display
│   └── lib/cad/                # CAD engine library
│       ├── agent/              # Agent management
│       ├── api/                # CAD client API
│       ├── controls/           # 3D viewport controls
│       ├── mesh/               # Mesh management
│       ├── renderer/           # Three.js rendering
│       └── types/              # TypeScript definitions
├── public/                     # Static assets
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Running CAD API server (on port 3000)
- Running smart agent server (on port 3000/ws)

### Installation

1. Install dependencies:
```bash
bun install
```

2. Start the development server:
```bash
bun dev
```

3. Open [http://localhost:3001](http://localhost:3001) in your browser

### Production Build

```bash
bun build
bun start
```

## Application Layout

The application features a three-panel layout:

### Left Panel - CAD Controls
- **Sketch Plane Creation**: Create XY, XZ, or YZ planes
- **Sketch Management**: Create sketches on planes
- **Element Tools**: Add lines and circles to sketches
- **Extrude Operations**: Convert 2D sketches to 3D features
- **Utilities**: Clear all objects, view controls

### Center Panel - 3D Viewport
- **Interactive 3D View**: Three.js-powered CAD visualization
- **Mouse Controls**: 
  - Left drag: Rotate view
  - Right drag: Pan view
  - Scroll: Zoom
- **Keyboard Shortcuts**:
  - Ctrl+1: Front view
  - Ctrl+2: Top view
  - Ctrl+3: Right view
  - Ctrl+0: Isometric view

### Right Panel - Scene & Chat
- **Scene Tree**: Hierarchical view of all CAD objects
- **Object Selection**: Click to select planes, sketches, elements
- **AI Chat**: Real-time conversation with CAD assistant

## CAD Workflow

1. **Create a Sketch Plane**
   - Select plane type (XY, XZ, or YZ)
   - Set origin coordinates
   - Click "Create Plane"

2. **Create a Sketch**
   - Select an existing plane
   - Click "Create Sketch"

3. **Add Sketch Elements**
   - Select a sketch
   - Choose element type (line or circle)
   - Enter parameters
   - Click "Add [Element]"

4. **Extrude Features**
   - Select a sketch or element in the scene tree
   - Set extrude distance
   - Click "Extrude Feature"

## API Integration

The client communicates with the CAD backend through:

- **REST API**: HTTP requests for CAD operations
- **WebSocket**: Real-time updates and agent communication
- **Session Management**: Unique session IDs for multi-user support

### Server Endpoints

- `http://localhost:3000/api/v1/*` - CAD REST API
- `ws://localhost:3000/ws` - WebSocket for real-time updates
- `http://localhost:3000/api/v1/health` - Health check endpoint

## Dependencies

### Core Dependencies
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **Three.js**: 3D graphics and CAD visualization
- **TypeScript**: Type safety and development experience
- **Tailwind CSS**: Utility-first styling

### CAD-Specific
- **uuid**: Session and object ID generation
- **@types/three**: TypeScript definitions for Three.js

## Development

### Code Organization

The codebase is organized into logical modules:

- **Components**: React UI components using hooks and modern patterns
- **CAD Library**: Core CAD functionality ported from original implementation
- **Types**: Shared TypeScript interfaces and type definitions
- **API Client**: HTTP and WebSocket communication layer

### State Management

- **React Hooks**: useState, useEffect, useCallback for local state
- **Props Drilling**: Simple parent-child communication
- **Event Callbacks**: Custom event handling for CAD operations

### Error Handling

- **Try-catch blocks**: Async operation error handling
- **Status updates**: User-friendly error messages
- **Graceful degradation**: Fallback behaviors for offline mode

## Troubleshooting

### Common Issues

1. **Server Connection Errors**
   - Ensure CAD API server is running on port 3000
   - Check network connectivity
   - Verify CORS settings

2. **3D Viewport Issues**
   - Check browser WebGL support
   - Update graphics drivers
   - Try different browsers

3. **Build Errors**
   - Clear node_modules and reinstall
   - Check TypeScript compilation
   - Verify all dependencies are installed

### Development Tips

- Use browser dev tools for debugging
- Check console for error messages
- Monitor network tab for API calls
- Use React DevTools for component inspection

## Migration Notes

This application was migrated from a Vite-based vanilla TypeScript implementation to Next.js with React. Key changes include:

- **Component Architecture**: Converted class-based managers to React hooks
- **State Management**: Moved from global variables to React state
- **Event Handling**: Replaced DOM manipulation with React event handlers
- **Styling**: Converted custom CSS to Tailwind utility classes
- **Build System**: Replaced Vite with Next.js build pipeline

## Contributing

1. Follow TypeScript strict mode guidelines
2. Use React functional components with hooks
3. Maintain consistent styling with Tailwind
4. Add proper error handling for all async operations
5. Update this README for significant changes

## License

[License information would go here]

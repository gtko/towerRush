# Tower Rush - Modular Structure

This directory contains the refactored, modular version of the Tower Rush game code.

## Directory Structure

```
src/
├── entities/           # Game entities and objects
│   ├── Building.js     # Building class with evolution and combat logic
│   └── UnitGroup.js    # Unit groups with formations and animations
├── core/               # Core game logic
│   └── Game.js         # Main game class with canvas, AI, and multiplayer
├── multiplayer/        # Multiplayer functionality
│   └── MultiplayerManager.js  # P2P networking and lobby management
├── constants/          # Game constants and configuration
└── utils/              # Utility functions and helpers
```

## Class Overview

### Building.js
- Manages building state, unit production, and visual evolution
- Handles sprite loading for different building types (house1/house2/house3/tower/castle)
- Implements unit production logic and building progression
- Contains siege detection and defensive mechanics

### UnitGroup.js
- Represents moving armies with animated sprites
- Handles pathfinding, formation management, and combat resolution
- Manages sprite animations for different unit types and factions
- Complex combat system with dice mechanics and visual effects

### Game.js
- Main game loop and state management
- Handles canvas rendering, input processing, and UI updates
- Manages AI logic and game over conditions
- Integrates multiplayer functionality

### MultiplayerManager.js
- WebRTC peer-to-peer networking using PeerJS
- Lobby system with chat and player management
- Game state synchronization between players
- Connection management and error handling

## Benefits of This Structure

1. **Maintainability**: Each class has a single responsibility
2. **Readability**: Smaller files are easier to navigate and understand
3. **Reusability**: Components can be modified independently
4. **Testing**: Easier to test individual components
5. **Collaboration**: Multiple developers can work on different parts

## Loading Order

The files must be loaded in this specific order in index.html:

1. Building.js (no dependencies)
2. UnitGroup.js (depends on Building)
3. MultiplayerManager.js (depends on Game reference)
4. Game.js (depends on all above classes)

## Original Files

The original `game.js` and `multiplayer.js` files can be safely removed after confirming the refactored version works correctly.
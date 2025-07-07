# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tower Rush is a browser-based real-time strategy game written in vanilla JavaScript. Players control buildings that produce units and engage in tactical battles across a medieval fantasy map.

## Development Setup

This is a pure client-side web application with no build process required:

- **Run locally**: Open `index.html` in any modern browser
- **No package manager**: Uses vanilla JavaScript, HTML, and CSS
- **No build tools**: Direct file editing and browser refresh for testing

## Architecture

### Core Classes

**Building** (`game.js:1-184`)
- Manages building state, unit production, and visual evolution
- Handles sprite loading for different building types (house1/house2/house3/tower/castle)
- Implements unit production logic and building progression

**UnitGroup** (`game.js:186-411`)
- Represents moving armies with animated sprites
- Handles pathfinding, formation management, and combat resolution
- Manages sprite animations for different unit types and factions

**Game** (`game.js:413-823`)
- Main game loop and state management
- Handles canvas rendering, input processing, and UI updates
- Manages AI logic and game over conditions

### Game Mechanics

- **Building Evolution**: Buildings upgrade based on unit count (house1→house2→house3→tower→castle)
- **Unit Production**: Each building produces 1 unit/second (castles produce 2/second)
- **Combat System**: Includes 20% defensive bonus for defending buildings
- **Faction Colors**: Player (blue), Enemy (red), Neutral (yellow)

### Asset System

All game assets are located in `assets/` directory:
- **Buildings**: Faction-specific building sprites in `assets/Buildings/`
- **Units**: Animated troop sprites in `assets/Factions/Knights/Troops/`
- **Decorations**: Environment sprites (trees, rocks, bushes) in `assets/Decorations/`
- **Terrain**: Ground textures and water effects in `assets/Terrain/`

### Canvas Management

- **Dynamic Sizing**: Canvas adapts to window size with minimum 1200x750 resolution
- **Sprite Animation**: Frame-based animation system for units and decorations
- **Responsive Design**: Handles window resizing and maintains aspect ratios

## Key Features

- **Multi-select Buildings**: Click to select/deselect player buildings
- **Percentage-based Attacks**: Use mouse wheel to adjust unit deployment (10%-100%)
- **Real-time Combat**: Units move and fight automatically after deployment
- **Visual Feedback**: Selected buildings highlighted with golden borders
- **Progressive Building Types**: Buildings evolve visually as they gain more units

## File Structure

- `index.html`: Main game interface and UI layout
- `game.js`: All game logic and class definitions
- `style.css`: Complete styling including responsive design
- `assets/`: All game sprites and visual assets organized by type
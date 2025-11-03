# 🦖 Dino Runner - Ultimate Edition

An enhanced, offline Chrome Dinosaur game built with HTML5 Canvas, CSS, and JavaScript. Features a vibrant design, smooth animations, and responsive controls for both desktop and mobile devices.

## 🎮 Features

### Game Mechanics
- **Dynamic Dinosaur**: Larger, refined character with smooth running, jumping, and crouching animations
- **Multiple Obstacles**: Cacti (single and groups), flying birds that require jumping to avoid
- **Progressive Difficulty**: Speed increases over time for added challenge
- **Score System**: Real-time scoring with persistent high score (localStorage)

### Visual Design
- **Visible Running Track**: 45px thick brown/tan track surface with gold borders and lane markings
- **Vibrant Graphics**: Colorful dinosaur with gradients, refined cacti with rounded shapes
- **Day/Night Cycle**: Dynamic sky gradients that transition between day and night
- **Particle Effects**: Beautiful particle effects on jumps and collisions
- **Fullscreen Support**: Responsive design that fits any screen size

### Controls
- **Keyboard**:
  - `SPACE` or `↑` - Jump
  - `↓` - Crouch
- **Mobile/Touch**:
  - **Swipe Up** - Jump
  - **Swipe Down** - Crouch
  - **Tap** - Jump
- **Mouse**: Click to jump

### Technical Features
- Fullscreen responsive canvas that adapts to any device
- Touch and swipe gesture detection for mobile
- Proper collision detection for all obstacle types
- Smooth 60fps game loop using requestAnimationFrame
- Local storage for high score persistence

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/rsashank55-alt/Sashanks-dino-runner.git
```

2. Open `index.html` in your web browser

3. That's it! The game works completely offline - no server required.

## 📁 File Structure

```
Dino Runner/
├── index.html    # Main HTML structure
├── style.css     # Styling and UI design
├── game.js       # Core game logic and mechanics
└── README.md     # This file
```

## 🎯 How to Play

1. Click "START GAME" or press Space/Arrow Up
2. Jump over cacti by pressing Space/Arrow Up (or swiping up on mobile)
3. Crouch under birds by pressing Arrow Down (or swiping down on mobile)
4. Survive as long as possible - speed increases over time!
5. Try to beat your high score!

## 🛠️ Technologies Used

- **HTML5 Canvas** - Game rendering
- **CSS3** - Modern UI styling with gradients and animations
- **Vanilla JavaScript** - Game logic and mechanics
- **LocalStorage API** - High score persistence

## 🌟 Features in Detail

### Track System
- Clearly visible 45px thick running track
- Gold border lines marking the running surface
- Moving lane dividers for visual interest
- Distance markers every 300px

### Obstacle System
- **Cacti**: Ground-based obstacles of varying heights (85-105px)
- **Birds**: Flying obstacles at 100-180px above ground
- Smart spacing system ensures obstacles aren't too close together (minimum 350px)

### Dinosaur Character
- Size: 85x110 pixels
- Smooth animations: running legs, tail sway, body bounce, blinking eyes
- Jump trail effects when jumping
- Particle effects on landing

## 📱 Mobile Support

The game is fully optimized for mobile devices:
- Touch and swipe controls
- Responsive canvas sizing
- Orientation change handling
- Fullscreen support

## 🎨 Customization

All game parameters can be adjusted in `game.js`:
- `config.groundY` - Track position
- `config.gameSpeed` - Initial speed
- `config.jumpStrength` - Jump height
- `config.obstacleSpawnRate` - Obstacle frequency

## 📄 License

This project is open source and available for personal use.

## 🙏 Credits

Inspired by the classic Chrome Dinosaur game, enhanced with modern web technologies and improved gameplay mechanics.

---

**Enjoy playing! 🎮**


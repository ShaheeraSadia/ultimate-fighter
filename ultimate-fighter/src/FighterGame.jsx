import React, { useState, useEffect, useRef } from 'react';
import { Sword, Zap, Shield, Heart } from 'lucide-react';

const FighterGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [winner, setWinner] = useState(null);
  const animationRef = useRef(null);
  
  const gameRef = useRef({
    player1: {
      x: 100, y: 0, width: 60, height: 90,
      health: 100, maxHealth: 100,
      velocityX: 0, velocityY: 0,
      speed: 6, jumpPower: -15,
      grounded: false, facing: 1,
      state: 'idle', // idle, running, jumping, attacking, special, blocking, hit
      attackFrame: 0, specialCharge: 100, maxSpecial: 100,
      blocking: false, invincible: 0,
      combo: 0, lastHitTime: 0
    },
    player2: {
      x: 700, y: 0, width: 60, height: 90,
      health: 100, maxHealth: 100,
      velocityX: 0, velocityY: 0,
      speed: 6, jumpPower: -15,
      grounded: false, facing: -1,
      state: 'idle',
      attackFrame: 0, specialCharge: 100, maxSpecial: 100,
      blocking: false, invincible: 0,
      combo: 0, lastHitTime: 0
    },
    keys: {},
    gravity: 0.8,
    groundLevel: 400,
    particles: [],
    hitEffects: [],
    time: 0
  });

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const game = gameRef.current;

    const handleKeyDown = (e) => {
      game.keys[e.key.toLowerCase()] = true;
      e.preventDefault();
    };

    const handleKeyUp = (e) => {
      game.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const createParticle = (x, y, color) => {
      for (let i = 0; i < 8; i++) {
        game.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 30,
          color
        });
      }
    };

    const createHitEffect = (x, y, damage) => {
      game.hitEffects.push({
        x, y, damage,
        life: 30,
        vy: -2
      });
    };

    const updatePlayer = (player, controls, opponent) => {
      if (player.invincible > 0) player.invincible--;

      // Blocking
      if (game.keys[controls.block] && player.grounded) {
        player.blocking = true;
        player.state = 'blocking';
        player.velocityX *= 0.5;
      } else {
        player.blocking = false;
      }

      // Movement
      if (player.state === 'idle' || player.state === 'running' || player.state === 'jumping') {
        if (game.keys[controls.left] && !player.blocking) {
          player.velocityX = -player.speed;
          player.facing = -1;
          if (player.grounded) player.state = 'running';
        } else if (game.keys[controls.right] && !player.blocking) {
          player.velocityX = player.speed;
          player.facing = 1;
          if (player.grounded) player.state = 'running';
        } else {
          player.velocityX *= 0.85;
          if (player.grounded && Math.abs(player.velocityX) < 0.5) {
            player.state = 'idle';
            player.velocityX = 0;
          }
        }
      }

      // Jump
      if (game.keys[controls.jump] && player.grounded && !player.blocking) {
        player.velocityY = player.jumpPower;
        player.grounded = false;
        player.state = 'jumping';
      }

      // Basic Attack
      if (game.keys[controls.attack] && player.attackFrame === 0 && !player.blocking) {
        player.state = 'attacking';
        player.attackFrame = 20;
      }

      // Special Attack
      if (game.keys[controls.special] && player.specialCharge >= 30 && !player.blocking) {
        player.state = 'special';
        player.attackFrame = 30;
        player.specialCharge -= 30;
        player.invincible = 10;
      }

      // Attack frame countdown
      if (player.attackFrame > 0) {
        player.attackFrame--;
        if (player.attackFrame === 0) {
          if (player.grounded) {
            player.state = 'idle';
          } else {
            player.state = 'jumping';
          }
        }
      }

      // Gravity and position
      player.velocityY += game.gravity;
      player.x += player.velocityX;
      player.y += player.velocityY;

      // Ground collision
      if (player.y >= game.groundLevel) {
        player.y = game.groundLevel;
        player.velocityY = 0;
        player.grounded = true;
        if (player.state === 'jumping') player.state = 'idle';
      } else {
        player.grounded = false;
      }

      // Boundaries
      player.x = Math.max(10, Math.min(canvas.width - player.width - 10, player.x));

      // Recharge special
      if (player.specialCharge < player.maxSpecial) {
        player.specialCharge += 0.2;
      }

      // Combo timeout
      if (game.time - player.lastHitTime > 120) {
        player.combo = 0;
      }
    };

    const checkHit = (attacker, defender) => {
      if (attacker.attackFrame === 0 || defender.invincible > 0) return false;

      let damage = 0;
      let range = 80;
      let hitFrame = 10;

      if (attacker.state === 'attacking') {
        damage = 8;
        hitFrame = 15;
      } else if (attacker.state === 'special') {
        damage = 20;
        range = 120;
        hitFrame = 20;
      }

      if (attacker.attackFrame < hitFrame || attacker.attackFrame > hitFrame + 5) return false;

      const attackBox = {
        x: attacker.facing > 0 ? attacker.x + attacker.width : attacker.x - range,
        y: attacker.y,
        width: range,
        height: attacker.height
      };

      const hit = attackBox.x < defender.x + defender.width &&
                  attackBox.x + attackBox.width > defender.x &&
                  attackBox.y < defender.y + defender.height &&
                  attackBox.y + attackBox.height > defender.y;

      if (hit) {
        if (defender.blocking && 
            ((defender.facing > 0 && attacker.x < defender.x) ||
             (defender.facing < 0 && attacker.x > defender.x))) {
          damage *= 0.3;
          createParticle(defender.x + defender.width/2, defender.y + defender.height/2, '#4a90e2');
        } else {
          defender.health -= damage;
          defender.velocityX = attacker.facing * 8;
          defender.velocityY = -5;
          defender.state = 'hit';
          defender.invincible = 20;
          attacker.combo++;
          attacker.lastHitTime = game.time;
          
          createParticle(defender.x + defender.width/2, defender.y + defender.height/2, '#ff4444');
          createHitEffect(defender.x + defender.width/2, defender.y + 20, Math.floor(damage));
        }
        return true;
      }
      return false;
    };

    const drawPlayer = (player, color, name) => {
      ctx.save();
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(player.x + player.width/2, game.groundLevel + 90, player.width/2, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Invincibility flash
      if (player.invincible > 0 && player.invincible % 4 < 2) {
        ctx.globalAlpha = 0.5;
      }

      // Body glow for special
      if (player.state === 'special') {
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
      }

      // Body
      ctx.fillStyle = color;
      ctx.fillRect(player.x, player.y, player.width, player.height);

      // Belt
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(player.x, player.y + player.height * 0.6, player.width, 8);

      // Head
      ctx.fillStyle = '#ffdbac';
      ctx.beginPath();
      ctx.arc(player.x + player.width/2, player.y - 15, 20, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#000';
      const eyeOffset = player.facing * 5;
      ctx.fillRect(player.x + player.width/2 + eyeOffset - 6, player.y - 18, 4, 4);
      ctx.fillRect(player.x + player.width/2 + eyeOffset + 4, player.y - 18, 4, 4);

      // Attack effects
      if (player.state === 'attacking' && player.attackFrame > 10) {
        ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
        const attackX = player.facing > 0 ? player.x + player.width : player.x - 80;
        ctx.fillRect(attackX, player.y + 20, 80, 40);
      }

      if (player.state === 'special' && player.attackFrame > 15) {
        ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
        const specialX = player.facing > 0 ? player.x + player.width : player.x - 120;
        ctx.fillRect(specialX, player.y, 120, player.height);
        
        // Energy waves
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = `rgba(100, 200, 255, ${0.5 - i * 0.15})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(player.x + player.width/2, player.y + player.height/2, 40 + i * 20 + (30 - player.attackFrame) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Block effect
      if (player.blocking) {
        ctx.strokeStyle = 'rgba(70, 130, 180, 0.7)';
        ctx.lineWidth = 4;
        ctx.strokeRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
      }

      // Combo text
      if (player.combo > 1) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`${player.combo}x COMBO!`, player.x - 20, player.y - 40);
      }

      ctx.restore();
    };

    const drawUI = () => {
      // Player 1 health bar
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(20, 20, 320, 60);
      
      ctx.fillStyle = '#333';
      ctx.fillRect(30, 30, 300, 20);
      const hp1Width = (game.player1.health / game.player1.maxHealth) * 300;
      ctx.fillStyle = game.player1.health > 30 ? '#00ff00' : '#ff0000';
      ctx.fillRect(30, 30, hp1Width, 20);
      
      ctx.fillStyle = '#444';
      ctx.fillRect(30, 55, 300, 15);
      const sp1Width = (game.player1.specialCharge / game.player1.maxSpecial) * 300;
      ctx.fillStyle = '#00bfff';
      ctx.fillRect(30, 55, sp1Width, 15);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('P1', 30, 45);
      ctx.font = '12px Arial';
      ctx.fillText('SPECIAL', 270, 67);

      // Player 2 health bar
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(460, 20, 320, 60);
      
      ctx.fillStyle = '#333';
      ctx.fillRect(470, 30, 300, 20);
      const hp2Width = (game.player2.health / game.player2.maxHealth) * 300;
      ctx.fillStyle = game.player2.health > 30 ? '#00ff00' : '#ff0000';
      ctx.fillRect(770 - hp2Width, 30, hp2Width, 20);
      
      ctx.fillStyle = '#444';
      ctx.fillRect(470, 55, 300, 15);
      const sp2Width = (game.player2.specialCharge / game.player2.maxSpecial) * 300;
      ctx.fillStyle = '#00bfff';
      ctx.fillRect(770 - sp2Width, 55, sp2Width, 15);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('P2', 740, 45);
      ctx.font = '12px Arial';
      ctx.fillText('SPECIAL', 480, 67);

      // Round timer (optional decoration)
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(360, 20, 80, 40);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FIGHT', 400, 47);
      ctx.textAlign = 'left';
    };

    const updateParticles = () => {
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life--;
        
        if (p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / 30;
          ctx.fillRect(p.x, p.y, 4, 4);
          ctx.globalAlpha = 1;
          return true;
        }
        return false;
      });

      game.hitEffects = game.hitEffects.filter(e => {
        e.y += e.vy;
        e.life--;
        
        if (e.life > 0) {
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.font = 'bold 24px Arial';
          ctx.globalAlpha = e.life / 30;
          ctx.strokeText(`-${e.damage}`, e.x, e.y);
          ctx.fillText(`-${e.damage}`, e.x, e.y);
          ctx.globalAlpha = 1;
          return true;
        }
        return false;
      });
    };

    const gameLoop = () => {
      game.time++;

      // Clear with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0f0c29');
      gradient.addColorStop(0.5, '#302b63');
      gradient.addColorStop(1, '#24243e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, game.groundLevel + 90, canvas.width, canvas.height);
      
      // Ground line
      ctx.strokeStyle = '#4a90e2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, game.groundLevel + 90);
      ctx.lineTo(canvas.width, game.groundLevel + 90);
      ctx.stroke();

      updatePlayer(game.player1, {
        left: 'a', right: 'd', jump: 'w', 
        attack: 's', special: 'q', block: 'e'
      }, game.player2);

      updatePlayer(game.player2, {
        left: 'arrowleft', right: 'arrowright', jump: 'arrowup',
        attack: 'arrowdown', special: 'shift', block: 'enter'
      }, game.player1);

      checkHit(game.player1, game.player2);
      checkHit(game.player2, game.player1);

      drawPlayer(game.player1, '#3498db', 'P1');
      drawPlayer(game.player2, '#e74c3c', 'P2');

      updateParticles();
      drawUI();

      if (game.player1.health <= 0) {
        setWinner('Player 2');
        setGameState('gameOver');
        return;
      }
      if (game.player2.health <= 0) {
        setWinner('Player 1');
        setGameState('gameOver');
        return;
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState]);

  const startGame = () => {
    const game = gameRef.current;
    game.player1 = {
      x: 100, y: 0, width: 60, height: 90,
      health: 100, maxHealth: 100,
      velocityX: 0, velocityY: 0,
      speed: 6, jumpPower: -15,
      grounded: false, facing: 1,
      state: 'idle',
      attackFrame: 0, specialCharge: 100, maxSpecial: 100,
      blocking: false, invincible: 0,
      combo: 0, lastHitTime: 0
    };
    game.player2 = {
      x: 700, y: 0, width: 60, height: 90,
      health: 100, maxHealth: 100,
      velocityX: 0, velocityY: 0,
      speed: 6, jumpPower: -15,
      grounded: false, facing: -1,
      state: 'idle',
      attackFrame: 0, specialCharge: 100, maxSpecial: 100,
      blocking: false, invincible: 0,
      combo: 0, lastHitTime: 0
    };
    game.keys = {};
    game.particles = [];
    game.hitEffects = [];
    game.time = 0;
    setGameState('playing');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-400 mb-6">
        ULTIMATE FIGHTER
      </h1>
      
      {gameState === 'menu' && (
        <div className="text-center">
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-6 px-12 rounded-xl text-2xl mb-6 transform hover:scale-105 transition-all shadow-2xl"
          >
            START BATTLE
          </button>
          
          <div className="grid grid-cols-2 gap-6 max-w-4xl">
            <div className="bg-gray-800 bg-opacity-80 p-6 rounded-lg backdrop-blur">
              <h2 className="text-2xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                <Sword size={24} /> Player 1 (Blue)
              </h2>
              <div className="text-white text-left space-y-2">
                <p><kbd className="bg-gray-700 px-2 py-1 rounded">W</kbd> Jump</p>
                <p><kbd className="bg-gray-700 px-2 py-1 rounded">A</kbd> / <kbd className="bg-gray-700 px-2 py-1 rounded">D</kbd> Move</p>
                <p><kbd className="bg-gray-700 px-2 py-1 rounded">S</kbd> Attack</p>
                <p><kbd className="bg-gray-700 px-2 py-1 rounded">Q</kbd> <Zap size={16} className="inline" /> Special Attack</p>
                <p><kbd className="bg-gray-700 px-2 py-1 rounded">E</kbd> <Shield size={16} className="inline" /> Block</p>
              </div>
            </div>

            <div className="bg-gray-800 bg-opacity-80 p-6 rounded-lg backdrop-blur">
              <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center gap-2">
                <Sword size={24} /> Player 2 (Red)
              </h2>
              <div className="text-white text-left space-y-2">
                <p><kbd className="bg-gray-700 px-2 py-1 rounded">↑</kbd> Jump</p>
                <p><kbd className="bg-gray-700 px-2 py-1 rounded">←</kbd> / <kbd className="bg-gray-700 px-2 py-1 rounded">→</kbd> Move</p>
                <p><kbd className="bg-gray-700 px-2 py-1 rounded">↓</kbd> Attack</p>
                <p><kbd className="bg-gray-700 px-2 py-1 rounded">Shift</kbd> <Zap size={16} className="inline" /> Special Attack</p>
                <p><kbd className="bg-gray-700 px-2 py-1 rounded">Enter</kbd> <Shield size={16} className="inline" /> Block</p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-yellow-900 bg-opacity-50 p-4 rounded-lg max-w-2xl">
            <p className="text-yellow-200 font-semibold">
              💡 Chain attacks for combos! Block to reduce damage! Use special moves wisely!
            </p>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="border-4 border-purple-500 rounded-lg shadow-2xl"
        />
      )}

      {gameState === 'gameOver' && (
        <div className="text-center">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-bold text-5xl py-8 px-16 rounded-2xl mb-6 shadow-2xl animate-pulse">
            {winner} WINS!
          </div>
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-6 px-12 rounded-xl text-2xl transform hover:scale-105 transition-all shadow-2xl"
          >
            REMATCH
          </button>
        </div>
      )}
    </div>
  );
};

export default FighterGame;
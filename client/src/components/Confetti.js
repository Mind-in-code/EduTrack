import React, { useEffect, useState } from 'react';

const COLORS = ['#3B82F6', '#22C55E', '#F97316', '#EF4444', '#A855F7', '#FBBF24', '#EC4899', '#06B6D4'];

function randomBetween(a, b) {
  return Math.random() * (b - a) + a;
}

export default function Confetti({ active, big = false, onDone }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) return;
    const count = big ? 80 : 35;
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: randomBetween(10, 90),
      y: randomBetween(-10, 10),
      size: randomBetween(big ? 6 : 4, big ? 12 : 8),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: randomBetween(0, 360),
      dx: randomBetween(-3, 3),
      dy: randomBetween(2, big ? 6 : 4),
      dr: randomBetween(-10, 10),
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      delay: randomBetween(0, big ? 400 : 200),
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      if (onDone) onDone();
    }, big ? 3000 : 1800);

    return () => clearTimeout(timer);
  }, [active, big, onDone]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.shape === 'rect' ? p.size * 0.6 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${randomBetween(1, big ? 2.5 : 1.5)}s ease-out ${p.delay}ms forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
          100% { opacity: 0; transform: translateY(${big ? '100vh' : '60vh'}) rotate(${randomBetween(300, 720)}deg) scale(0.3); }
        }
      `}</style>
    </div>
  );
}

export function UnitCompleteModal({ unitName, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 mx-6 text-center shadow-2xl animate-bounce-in max-w-sm w-full">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Unit Complete!</h2>
        <p className="text-gray-500 mb-6">You've finished all lessons in <span className="font-semibold text-gray-700">{unitName}</span></p>
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
        >
          Continue Learning
        </button>
      </div>
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}

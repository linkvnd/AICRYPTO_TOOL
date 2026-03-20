import { useEffect, useState } from 'react';

const PETALS = ['🌸', '✨', '🍃', '💮'];

export default function FallingFlowers() {
  const [flowers, setFlowers] = useState<Array<{id: number, left: string, duration: string, delay: string, size: string, opacity: number, char: string, sway: string, rotation: string}>>([]);

  useEffect(() => {
    const newFlowers = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      duration: `${Math.random() * 8 + 10}s`, // Slower for smoothness
      delay: `${Math.random() * 15}s`,
      size: `${Math.random() * 15 + 10}px`,
      opacity: Math.random() * 0.3 + 0.1,
      char: PETALS[Math.floor(Math.random() * PETALS.length)],
      sway: `${Math.random() * 100 - 50}px`,
      rotation: `${Math.random() * 720 - 360}deg`
    }));
    setFlowers(newFlowers);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {flowers.map(f => (
        <div 
          key={f.id} 
          className="flower-petal" 
          style={{ 
            left: f.left, 
            animationDuration: f.duration, 
            animationDelay: f.delay, 
            fontSize: f.size, 
            opacity: f.opacity,
            '--sway': f.sway,
            '--rotation': f.rotation
          } as React.CSSProperties}
        >
          {f.char}
        </div>
      ))}
    </div>
  );
}

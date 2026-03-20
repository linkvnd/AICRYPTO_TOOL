import { useState, useRef, useEffect } from 'react';
import { Music, Pause, Play, SkipForward, SkipBack } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [audioUrl, setAudioUrl] = useState("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'music'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().url) {
        setAudioUrl(docSnap.data().url);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error('Playback error:', err));
      }
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-3">
      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-64"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate dark:text-white">Music Player</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Now Playing</p>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-6">
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button 
                onClick={togglePlay}
                className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                animate={{ width: isPlaying ? '100%' : '0%' }}
                transition={{ duration: 180, ease: "linear" }}
                className="h-full bg-amber-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowPlayer(!showPlayer)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all relative overflow-hidden group",
          isPlaying 
            ? "bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 text-white" 
            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
        )}
      >
        <Music className={cn("w-6 h-6 z-10", isPlaying && "animate-bounce")} />
        {isPlaying && (
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-yellow-600/20"
          />
        )}
      </motion.button>

      <audio 
        ref={audioRef} 
        src={audioUrl} 
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}

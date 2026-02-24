import React from 'react';
import { DiceSkin } from '../types';

interface DiceProps {
  value: number;
  isRolling: boolean;
  skin?: DiceSkin;
}

const Dice: React.FC<DiceProps> = ({ value, isRolling, skin = 'classic' }) => {
  // Dot positions for each face
  const renderDots = (val: number) => {
    const dots = [];
    // Positions are grid based 1-9
    /*
      1 . 3
      4 5 6
      7 . 9
    */
    const dotMap: Record<number, number[]> = {
      1: [5],
      2: [1, 9],
      3: [1, 5, 9],
      4: [1, 3, 7, 9],
      5: [1, 3, 5, 7, 9],
      6: [1, 3, 4, 6, 7, 9]
    };

    const positions = dotMap[val] || [];

    // Skin Configuration
    const dotBase = "w-2.5 h-2.5 transition-colors duration-300";
    const dotStyles: Record<string, string> = {
        classic: "bg-black rounded-full",
        neon: "bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]",
        gold: "bg-amber-900 rounded-full shadow-inner",
        cyber: "bg-emerald-500 rounded-none shadow-[0_0_5px_rgba(16,185,129,0.8)]"
    };

    const currentDotStyle = dotStyles[skin] || dotStyles.classic;
    
    // Create a 3x3 grid
    for(let i=1; i<=9; i++) {
        if (positions.includes(i)) {
             dots.push(<div key={i} className={`${dotBase} ${currentDotStyle}`} />);
        } else {
             dots.push(<div key={i} className={`${dotBase}`} />); // Spacer
        }
    }
    return dots;
  };

  const containerBase = "w-24 h-24 rounded-xl flex flex-wrap content-between justify-between p-3 gap-1 transition-all duration-300 border-2";
  const containerStyles: Record<string, string> = {
      classic: "bg-white border-gray-300 shadow-[0_0_20px_rgba(255,255,255,0.2)]",
      neon: "bg-slate-900 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]",
      gold: "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.4)]",
      cyber: "bg-slate-950 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-[linear-gradient(45deg,#000000_25%,#1a202c_25%,#1a202c_50%,#000000_50%,#000000_75%,#1a202c_75%,#1a202c_100%)] bg-[length:10px_10px]"
  };
  
  const currentContainerStyle = containerStyles[skin] || containerStyles.classic;

  return (
    <div className={`${containerBase} ${currentContainerStyle} ${isRolling ? 'animate-roll' : ''}`}>
        {renderDots(value)}
    </div>
  );
};

export default Dice;
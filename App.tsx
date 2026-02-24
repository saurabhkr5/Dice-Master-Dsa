import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Crown, User, Trophy, Activity, Hash, Layers, ArrowRight, TrendingUp, BarChart3, History } from 'lucide-react';
import { Player, GamePhase, RollResult, DiceSkin, PlayerStats, RoundSnapshot } from './types';
import { TurnQueue, MaxHeap } from './utils/dsa';
import Dice from './components/Dice';

const App: React.FC = () => {
  // --- State Management ---
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LANDING);
  
  // Setup Inputs
  const [playerInputName, setPlayerInputName] = useState('');
  const [setupPlayers, setSetupPlayers] = useState<Player[]>([]);
  const [totalRounds, setTotalRounds] = useState<number>(5);
  const [selectedSkin, setSelectedSkin] = useState<DiceSkin>('classic');

  // Game State
  const [currentRound, setCurrentRound] = useState(1);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  
  // DSA Structures stored in Refs
  const turnQueueRef = useRef<TurnQueue<Player>>(new TurnQueue());
  const scoreMapRef = useRef<Map<string, number>>(new Map());
  
  // New DSA: Player Stats Hash Map & History Array
  const playerStatsRef = useRef<Map<string, PlayerStats>>(new Map());
  const [roundHistory, setRoundHistory] = useState<RoundSnapshot[]>([]);
  
  // UI State for Reactivity
  const [scoreMapState, setScoreMapState] = useState<Map<string, number>>(new Map());
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  
  // Rolling Mechanics
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [turnLog, setTurnLog] = useState<string[]>([]);
  const [turnCountInRound, setTurnCountInRound] = useState(0);

  // --- Helper Functions ---

  const generateColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500'];
    return colors[index % colors.length];
  };

  const addPlayer = () => {
    if (!playerInputName.trim()) return;
    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      name: playerInputName.trim(),
      score: 0,
      avatarColor: generateColor(setupPlayers.length),
    };
    setSetupPlayers([...setupPlayers, newPlayer]);
    setPlayerInputName('');
  };

  const startGame = () => {
    if (setupPlayers.length < 2) return;

    // Initialize DSA Structures
    const queue = new TurnQueue(setupPlayers);
    turnQueueRef.current = queue;

    const map = new Map<string, number>();
    const statsMap = new Map<string, PlayerStats>();

    setupPlayers.forEach(p => {
        map.set(p.id, 0);
        statsMap.set(p.id, { totalRolls: 0, highestTurnScore: 0, cumulativeScore: 0 });
    });

    scoreMapRef.current = map;
    playerStatsRef.current = statsMap;
    setScoreMapState(new Map(map));
    
    // Reset History
    setRoundHistory([]);

    setCurrentRound(1);
    setTurnCountInRound(0);
    setTurnLog([]);
    setLastRoll(null);

    // Dequeue first player
    const firstPlayer = turnQueueRef.current.dequeue();
    setActivePlayer(firstPlayer || null);

    setPhase(GamePhase.PLAYING);
  };

  const handleRoll = useCallback(() => {
    if (isRolling || !activePlayer) return;

    setIsRolling(true);
    setLastRoll(null); 

    // Simulate animation time
    setTimeout(() => {
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const isDouble = die1 === die2;
      const bonus = isDouble ? 5 : 0;
      const total = die1 + die2 + bonus;

      const result: RollResult = { die1, die2, total, isDouble, bonus };
      setLastRoll(result);
      setIsRolling(false);

      processTurnResult(result);
    }, 1000); 
  }, [isRolling, activePlayer]);

  const processTurnResult = (result: RollResult) => {
    if (!activePlayer) return;

    // 1. Update Score in Map
    const currentScore = scoreMapRef.current.get(activePlayer.id) || 0;
    const newScore = currentScore + result.total;
    scoreMapRef.current.set(activePlayer.id, newScore);
    setScoreMapState(new Map(scoreMapRef.current)); 

    // 2. Update Statistics (Hash Map)
    const stats = playerStatsRef.current.get(activePlayer.id);
    if (stats) {
        stats.totalRolls += 1;
        stats.cumulativeScore += result.total;
        if (result.total > stats.highestTurnScore) {
            stats.highestTurnScore = result.total;
        }
        playerStatsRef.current.set(activePlayer.id, stats);
    }

    // 3. Update Active Player Object
    const updatedPlayer = { ...activePlayer, score: newScore };

    // 4. Log
    const logMsg = `${activePlayer.name} rolled ${result.die1} & ${result.die2}. ${result.isDouble ? 'DOUBLE! (+5) ' : ''}Total: ${result.total}`;
    setTurnLog(prev => [logMsg, ...prev].slice(0, 5));

    // 5. Enqueue Player back
    turnQueueRef.current.enqueue(updatedPlayer);

    setTimeout(() => {
       advanceTurn();
    }, 2000);
  };

  const advanceTurn = () => {
    const nextTurnCount = turnCountInRound + 1;
    const totalPlayers = setupPlayers.length;

    // Check if Round is Complete (Everyone has rolled once)
    if (nextTurnCount >= totalPlayers) {
      // 1. Snapshot Leaderboard for History
      snapshotRoundHistory();

      if (currentRound >= totalRounds) {
        endGame();
      } else {
        setCurrentRound(prev => prev + 1);
        setTurnCountInRound(0);
        const next = turnQueueRef.current.dequeue();
        setActivePlayer(next || null);
        setLastRoll(null);
      }
    } else {
      setTurnCountInRound(nextTurnCount);
      const next = turnQueueRef.current.dequeue();
      setActivePlayer(next || null);
      setLastRoll(null);
    }
  };

  const snapshotRoundHistory = () => {
    // Generate Current Ranking using Max Heap
    const currentPlayers: Player[] = setupPlayers.map(p => ({
        ...p,
        score: scoreMapRef.current.get(p.id) || 0
    }));
    const heap = MaxHeap.fromArray(currentPlayers);
    const roundRanking = heap.toSortedArray();

    setRoundHistory(prev => [
        ...prev, 
        { round: currentRound, leaderboard: roundRanking }
    ]);
  };

  const endGame = () => {
    const finalPlayers: Player[] = setupPlayers.map(p => ({
        ...p,
        score: scoreMapRef.current.get(p.id) || 0
    }));

    const heap = MaxHeap.fromArray(finalPlayers);
    const sorted = heap.toSortedArray();
    
    setLeaderboard(sorted);
    setPhase(GamePhase.GAME_OVER);
  };

  const resetGame = () => {
    setSetupPlayers([]);
    setPlayerInputName('');
    setPhase(GamePhase.SETUP);
  };

  // --- Render Functions ---

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center min-h-screen w-full text-center p-4 animate-[fadeIn_0.8s_ease-out] relative overflow-hidden">
        {/* Decorative BG */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl mb-6 rotate-12 hover:rotate-0 transition-transform duration-500">
                <Layers className="w-12 h-12 text-white" />
            </div>
        </div>

        <h1 className="relative z-10 text-6xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-cyan-200 mb-6 tracking-tighter drop-shadow-sm">
            DSA DICE<br/>MASTER
        </h1>
        
        <p className="relative z-10 text-xl text-slate-400 max-w-lg mb-12 leading-relaxed font-light">
            A high-fidelity multiplayer experience powered by <span className="text-indigo-400 font-semibold">Queues</span>, <span className="text-purple-400 font-semibold">Hash Maps</span>, and <span className="text-cyan-400 font-semibold">Max-Heaps</span>.
        </p>

        <button 
            onClick={() => setPhase(GamePhase.SETUP)}
            className="relative z-10 group px-10 py-5 bg-white text-slate-900 font-bold text-lg rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-3 overflow-hidden"
        >
            <span className="relative z-20">ENTER ARENA</span>
            <ArrowRight className="w-5 h-5 relative z-20 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 to-cyan-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
        </button>

        <div className="absolute bottom-8 text-xs text-slate-600 font-mono">
            v1.0.0 • React • Tailwind • TypeScript
        </div>
    </div>
  );

  const renderSetup = () => (
    <div className="max-w-md mx-auto w-full glass-panel rounded-2xl p-8 shadow-2xl animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Game Setup</h2>
        <p className="text-slate-400 text-sm">Configure your session</p>
      </div>

      <div className="space-y-8">
        {/* Rounds Config */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Number of Rounds</label>
          <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={totalRounds} 
              onChange={(e) => setTotalRounds(Number(e.target.value))}
              className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xl font-mono font-bold text-white w-8 text-center">{totalRounds}</span>
          </div>
        </div>

        {/* Dice Skin Selector */}
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Select Dice Style</label>
            <div className="grid grid-cols-4 gap-3">
                {(['classic', 'neon', 'gold', 'cyber'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setSelectedSkin(s)}
                        className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                            selectedSkin === s 
                            ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-105' 
                            : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
                        }`}
                    >
                        {/* Mini Skin Preview */}
                        <div className={`w-8 h-8 rounded border shadow-sm ${
                            s === 'classic' ? 'bg-white border-gray-300' :
                            s === 'neon' ? 'bg-slate-900 border-cyan-500' :
                            s === 'gold' ? 'bg-gradient-to-br from-amber-200 to-amber-600 border-amber-100' :
                            'bg-slate-950 border-emerald-500 bg-[length:4px_4px] bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_50%,#000_50%,#000_75%,transparent_75%,transparent)]'
                        }`}></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">{s}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Player Add */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Add Players (Min 2)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={playerInputName}
              onChange={(e) => setPlayerInputName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="Enter player name"
              className="flex-1 bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none transition-all"
            />
            <button 
              onClick={addPlayer}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 transition-colors font-medium text-sm"
            >
              Add
            </button>
          </div>
        </div>

        {setupPlayers.length > 0 && (
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Roster</h3>
            <div className="flex flex-wrap gap-2">
              {setupPlayers.map((p) => (
                <div key={p.id} className="flex items-center gap-2 bg-slate-700/50 px-3 py-1.5 rounded-full border border-slate-600 animate-[fadeIn_0.3s_ease-out]">
                  <div className={`w-2 h-2 rounded-full ${p.avatarColor}`} />
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={startGame}
          disabled={setupPlayers.length < 2}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
            setupPlayers.length < 2 
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-indigo-500/25'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          Start Game
        </button>
      </div>
    </div>
  );

  const renderPlaying = () => (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 animate-[fadeIn_0.5s_ease-out]">
      {/* Left Column: Live Scoreboard */}
      <div className="lg:col-span-1 glass-panel rounded-2xl p-6 h-fit order-2 lg:order-1">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-4">
          <Hash className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold">Live Scores</h2>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {setupPlayers.map((p) => {
             const score = scoreMapState.get(p.id) || 0;
             const isActive = activePlayer?.id === p.id;
             return (
               <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl transition-all ${isActive ? 'bg-indigo-500/20 border border-indigo-500/50 shadow-inner' : 'bg-slate-800/40 border border-transparent'}`}>
                 <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.avatarColor}`}>
                     {p.name.charAt(0)}
                   </div>
                   <div className="flex flex-col">
                     <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>{p.name}</span>
                     {isActive && <span className="text-[10px] text-indigo-300 animate-pulse">Rolling...</span>}
                   </div>
                 </div>
                 <span className="font-mono font-bold text-lg">{score}</span>
               </div>
             );
          })}
        </div>
        
        {/* Turn Log */}
        <div className="mt-8">
            <div className="flex items-center gap-2 mb-2 text-slate-400">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Activity Log</span>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 h-32 overflow-y-auto font-mono text-xs space-y-2 border border-slate-800">
                {turnLog.map((log, idx) => (
                    <div key={idx} className="border-l-2 border-slate-700 pl-2 text-slate-400 animate-[fadeIn_0.3s_ease-out]">
                        {log}
                    </div>
                ))}
                {turnLog.length === 0 && <span className="text-slate-600 italic">Game started...</span>}
            </div>
        </div>
      </div>

      {/* Center Column: The Arena */}
      <div className="lg:col-span-2 glass-panel rounded-2xl p-8 flex flex-col items-center justify-between min-h-[500px] relative overflow-hidden order-1 lg:order-2">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900/0 to-transparent pointer-events-none" />

        {/* Header Info */}
        <div className="w-full flex justify-between items-center z-10 mb-8">
            <div className="px-4 py-1.5 rounded-full bg-slate-800/60 border border-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-300">Round {currentRound} / {totalRounds}</span>
            </div>
            <div className="text-xs text-slate-500 font-mono">Queue Size: {turnQueueRef.current.size()}</div>
        </div>

        {/* Active Player Focus */}
        <div className="flex flex-col items-center z-10 w-full">
             {activePlayer && (
                 <>
                    <div className="relative mb-8 group">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold shadow-[0_0_30px_rgba(0,0,0,0.5)] border-4 border-slate-800 ${activePlayer.avatarColor} relative z-10`}>
                            {activePlayer.name.charAt(0)}
                        </div>
                        {/* Glow effect */}
                        <div className={`absolute inset-0 rounded-full ${activePlayer.avatarColor} blur-xl opacity-40 group-hover:opacity-60 transition-opacity`} />
                        
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-600 whitespace-nowrap z-20 shadow-lg">
                            <span className="text-sm font-bold text-white">{activePlayer.name}</span>
                        </div>
                    </div>
                    
                    <div className="h-20 flex items-center justify-center w-full">
                        {!lastRoll && !isRolling && (
                             <span className="text-slate-400 animate-pulse font-light text-lg">It's your turn! Roll the dice.</span>
                        )}
                        {lastRoll && !isRolling && (
                            <div className="flex flex-col items-center animate-[popIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]">
                                <span className={`text-5xl font-black tracking-tighter ${lastRoll.isDouble ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'text-white drop-shadow-lg'}`}>
                                    +{lastRoll.total}
                                </span>
                                {lastRoll.isDouble && <span className="text-xs font-bold text-yellow-500 tracking-[0.2em] uppercase mt-2 animate-bounce">Double Bonus!</span>}
                            </div>
                        )}
                    </div>
                 </>
             )}
        </div>

        {/* Dice & Controls */}
        <div className="flex flex-col items-center gap-12 z-10 mt-auto w-full">
            <div className="flex gap-8 perspective-1000">
                <Dice value={lastRoll?.die1 || 1} isRolling={isRolling} skin={selectedSkin} />
                <Dice value={lastRoll?.die2 || 1} isRolling={isRolling} skin={selectedSkin} />
            </div>

            <button 
                onClick={handleRoll} 
                disabled={isRolling || !activePlayer || !!lastRoll}
                className={`w-full max-w-sm py-4 rounded-xl font-black text-xl tracking-wide uppercase transition-all transform duration-200
                    ${isRolling || !!lastRoll
                        ? 'bg-slate-800 text-slate-600 cursor-default scale-95 opacity-80' 
                        : 'bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:scale-105 hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] active:scale-95'
                    }`}
            >
                {isRolling ? 'Rolling...' : !!lastRoll ? 'Next Player...' : 'ROLL DICE'}
            </button>
        </div>
      </div>
    </div>
  );

  const renderGameOver = () => (
    <div className="max-w-5xl mx-auto w-full animate-[slideUp_0.6s_ease-out]">
        <div className="text-center mb-10">
            <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg">Game Over</h1>
            <p className="text-slate-400">Final Results</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Leaderboard */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                     <Trophy className="w-5 h-5 text-yellow-500" />
                     <h3 className="text-xl font-bold text-white">Final Leaderboard (Max-Heap)</h3>
                </div>
                
                <div className="glass-panel rounded-3xl overflow-hidden border-2 border-indigo-500/30 shadow-2xl relative">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
                     
                     <div className="relative z-10">
                         {leaderboard.map((player, index) => {
                             const isWinner = index === 0;
                             const stats = playerStatsRef.current.get(player.id);
                             const avg = stats && stats.totalRolls > 0 ? (stats.cumulativeScore / stats.totalRolls).toFixed(1) : "0";

                             return (
                                 <div 
                                    key={player.id} 
                                    className={`flex flex-col md:flex-row items-center justify-between p-6 border-b border-slate-700/50 last:border-0 
                                        ${isWinner ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20' : 'hover:bg-slate-800/30'}`}
                                 >
                                     <div className="flex items-center gap-6 w-full md:w-auto mb-4 md:mb-0">
                                         <div className={`w-12 h-12 flex items-center justify-center font-black text-xl rounded-full 
                                            ${isWinner ? 'bg-yellow-400 text-yellow-900 shadow-lg scale-110' : 'bg-slate-700 text-slate-400'}`}>
                                             {isWinner ? <Crown className="w-6 h-6" /> : `#${index + 1}`}
                                         </div>
                                         
                                         <div className="flex items-center gap-4">
                                             <div className={`w-14 h-14 rounded-full ${player.avatarColor} flex items-center justify-center text-xl font-bold border-2 border-slate-600 shadow-md`}>
                                                 {player.name.charAt(0)}
                                             </div>
                                             <div>
                                                 <h3 className={`text-xl font-bold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                                                     {player.name}
                                                 </h3>
                                                 {isWinner && <span className="text-xs text-yellow-500 font-bold uppercase tracking-wider">Champion</span>}
                                             </div>
                                         </div>
                                     </div>
                                     
                                     {/* Extended Stats (Hash Map) */}
                                     <div className="flex gap-6 text-center">
                                         <div>
                                             <span className="block text-xs text-slate-500 uppercase tracking-wide">Avg Score</span>
                                             <span className="font-mono font-bold text-slate-300">{avg}</span>
                                         </div>
                                         <div>
                                             <span className="block text-xs text-slate-500 uppercase tracking-wide">Best Roll</span>
                                             <span className="font-mono font-bold text-emerald-400">{stats?.highestTurnScore || 0}</span>
                                         </div>
                                         <div className="text-right min-w-[80px] pl-4 border-l border-slate-700/50">
                                             <span className="block text-3xl font-mono font-bold text-white">{player.score}</span>
                                             <span className="text-xs text-slate-500 uppercase">Total</span>
                                         </div>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                </div>
            </div>

            {/* Right Column: Round History */}
            <div className="lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                     <History className="w-5 h-5 text-indigo-400" />
                     <h3 className="text-xl font-bold text-white">Round History</h3>
                </div>

                <div className="glass-panel rounded-2xl p-4 space-y-3 h-full max-h-[600px] overflow-y-auto custom-scrollbar">
                    {roundHistory.map((snapshot) => {
                        const leader = snapshot.leaderboard[0];
                        return (
                            <div key={snapshot.round} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 flex flex-col gap-2">
                                <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Round {snapshot.round}</span>
                                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full ${leader.avatarColor} text-[10px] flex items-center justify-center font-bold`}>
                                            {leader.name.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium text-white">{leader.name}</span>
                                    </div>
                                    <span className="text-xs font-mono text-yellow-400 font-bold">#1</span>
                                </div>
                            </div>
                        )
                    })}
                    {roundHistory.length === 0 && (
                        <div className="text-center text-slate-500 text-sm py-4">No history recorded</div>
                    )}
                </div>
            </div>
        </div>

        <div className="mt-12 text-center pb-8">
            <button 
                onClick={resetGame}
                className="group flex items-center justify-center gap-2 mx-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-full font-bold transition-all border border-slate-600 hover:border-slate-400"
            >
                <RotateCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
                Play Again
            </button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
        {phase === GamePhase.LANDING && renderLanding()}
        {phase === GamePhase.SETUP && renderSetup()}
        {phase === GamePhase.PLAYING && renderPlaying()}
        {phase === GamePhase.GAME_OVER && renderGameOver()}
    </div>
  );
};

export default App;
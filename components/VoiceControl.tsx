import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { TeamId, Team, Player } from '../types';
import { MicrophoneIcon } from './icons';

// Add SpeechRecognition types to window
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceControlProps {
    teamA: Team;
    teamB: Team;
    isMatchActionEnabled: boolean;
    onGiveCard: (teamId: TeamId, playerId: number, cardType: 'yellow' | 'red') => void;
    onAddGoal: (teamId: TeamId, playerId: number) => void;
    onTeamStatChange: (teamId: TeamId, stat: 'cornersFor', action: 'add' | 'remove') => void;
}

const VoiceControl: React.FC<VoiceControlProps> = (props) => {
    const { teamA, teamB, isMatchActionEnabled } = props;
    const [isListening, setIsListening] = useState(false);
    const [feedback, setFeedback] = useState('');
    const recognitionRef = useRef<any>(null);
    const timeoutRef = useRef<number | null>(null);
    
    // Use a ref to hold the latest props to avoid stale closures in useEffect
    const propsRef = useRef(props);
    useEffect(() => {
        propsRef.current = props;
    });

    const allPlayers = useMemo(() => {
        const players: (Player & { teamId: TeamId })[] = [];
        if (teamA) {
            teamA.starters.forEach(p => players.push({ ...p, teamId: 'a' }));
            teamA.subs.forEach(p => players.push({ ...p, teamId: 'a' }));
        }
        if (teamB) {
            teamB.starters.forEach(p => players.push({ ...p, teamId: 'b' }));
            teamB.subs.forEach(p => players.push({ ...p, teamId: 'b' }));
        }
        return players;
    }, [teamA, teamB]);
    const allPlayersRef = useRef(allPlayers);
    allPlayersRef.current = allPlayers;

    useEffect(() => {
        const showFeedback = (message: string, duration: number = 3000) => {
            setFeedback(message);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = window.setTimeout(() => setFeedback(''), duration);
        };

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showFeedback('Reconocimiento de voz no soportado en este navegador.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => {
            setIsListening(true);
            setFeedback('Escuchando...');
        };

        recognition.onend = () => {
            setIsListening(false);
            setFeedback(current => (current === 'Escuchando...' ? '' : current));
        };
        
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            showFeedback(`Error: ${event.error}`);
        };

        const findBestPlayerMatch = (nameOrNumber: string): (Player & { teamId: TeamId }) | null => {
            const num = parseInt(nameOrNumber, 10);
            if (!isNaN(num)) {
                return allPlayersRef.current.find(p => p.number === num) || null;
            }
            
            const lowerCaseName = nameOrNumber.toLowerCase();
            let bestMatch: (Player & { teamId: TeamId }) | null = null;
            let highestScore = 0;
    
            allPlayersRef.current.forEach(player => {
                const playerNameLower = player.name.toLowerCase();
                if (playerNameLower.includes(lowerCaseName)) {
                    const score = lowerCaseName.length / playerNameLower.length;
                    if (score > highestScore) {
                        highestScore = score;
                        bestMatch = player;
                    }
                }
            });
            
            return bestMatch;
        };
        
        const handleCommand = (command: string) => {
            const { onAddGoal, onGiveCard, onTeamStatChange, teamA: currentTeamA, teamB: currentTeamB } = propsRef.current;
            showFeedback(`Comando recibido: "${command}"`);
    
            // Gol
            let match = command.match(/gol (?:del|de la|para el|para la) (?:número |dorsal )?(\w+)/);
            if (match) {
                const playerInfo = findBestPlayerMatch(match[1]);
                if (playerInfo) {
                    onAddGoal(playerInfo.teamId, playerInfo.id);
                    showFeedback(`Gol anotado para ${playerInfo.name}.`);
                    return;
                }
            }
            
            // Tarjeta amarilla
            match = command.match(/(?:tarjeta )?amarilla para (?:el|la) (?:número |dorsal )?(\w+)/);
            if (match) {
                const playerInfo = findBestPlayerMatch(match[1]);
                if (playerInfo) {
                    onGiveCard(playerInfo.teamId, playerInfo.id, 'yellow');
                    showFeedback(`Tarjeta amarilla para ${playerInfo.name}.`);
                    return;
                }
            }
    
            // Tarjeta roja
            match = command.match(/(?:tarjeta )?roja para (?:el|la) (?:número |dorsal )?(\w+)/);
            if (match) {
                const playerInfo = findBestPlayerMatch(match[1]);
                if (playerInfo) {
                    onGiveCard(playerInfo.teamId, playerInfo.id, 'red');
                    showFeedback(`Tarjeta roja para ${playerInfo.name}.`);
                    return;
                }
            }
            
            // Corner
            match = command.match(/córner (?:para|a favor de) (.+)/);
            if (match && currentTeamA && currentTeamB) {
                const teamName = match[1].toLowerCase();
                if(currentTeamA.name.toLowerCase().includes(teamName)) {
                    onTeamStatChange('a', 'cornersFor', 'add');
                    showFeedback(`Córner para ${currentTeamA.name}.`);
                    return;
                }
                if(currentTeamB.name.toLowerCase().includes(teamName)) {
                    onTeamStatChange('b', 'cornersFor', 'add');
                    showFeedback(`Córner para ${currentTeamB.name}.`);
                    return;
                }
            }
    
            showFeedback(`Comando no reconocido: "${command}"`, 4000);
        };
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            handleCommand(transcript);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            if(timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const toggleListening = () => {
        if (!propsRef.current.isMatchActionEnabled) {
            setFeedback('Las acciones de partido están deshabilitadas.');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = window.setTimeout(() => setFeedback(''), 3000);
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    };
    
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
             {feedback && (
                <div className="absolute bottom-full right-0 mb-2 w-max max-w-xs bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg transition-opacity duration-300">
                    {feedback}
                </div>
            )}
            <button
                onClick={toggleListening}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                    isListening ? 'bg-red-600 animate-pulse' : 'bg-cyan-600 hover:bg-cyan-500'
                }`}
                disabled={!isMatchActionEnabled}
                title={isListening ? 'Detener reconocimiento' : 'Activar control por voz'}
            >
                <MicrophoneIcon className="w-8 h-8 text-white" />
            </button>
        </div>
    );
};

export default VoiceControl;
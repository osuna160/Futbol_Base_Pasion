import type { MatchDetails, StarterSetup, SubSetup, UnavailableSetup, TeamSetup, RosterPlayer } from './types';

export const FORMATIONS: { [key: string]: { pos: { x: number; y: number }; name: string; abbr: string }[] } = {
  '4-3-3': [
    { pos: { x: 8, y: 50 }, name: 'Portera', abbr: 'POR' },
    { pos: { x: 28, y: 80 }, name: 'Lateral Derecha', abbr: 'LD' },
    { pos: { x: 25, y: 40 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 25, y: 60 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 28, y: 20 }, name: 'Lateral Izquierda', abbr: 'LI' },
    { pos: { x: 48, y: 75 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 45, y: 50 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 48, y: 25 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 65, y: 80 }, name: 'Extremo Derecho', abbr: 'ED' },
    { pos: { x: 68, y: 50 }, name: 'Delantera Centro', abbr: 'DC' },
    { pos: { x: 65, y: 20 }, name: 'Extremo Izquierdo', abbr: 'EI' },
  ],
  '4-4-2': [
    { pos: { x: 8, y: 50 }, name: 'Portera', abbr: 'POR' },
    { pos: { x: 28, y: 82 }, name: 'Lateral Derecha', abbr: 'LD' },
    { pos: { x: 25, y: 40 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 25, y: 60 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 28, y: 18 }, name: 'Lateral Izquierda', abbr: 'LI' },
    { pos: { x: 48, y: 82 }, name: 'Interior Derecho', abbr: 'ID' },
    { pos: { x: 45, y: 40 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 45, y: 60 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 48, y: 18 }, name: 'Interior Izquierdo', abbr: 'II' },
    { pos: { x: 68, y: 65 }, name: 'Delantera', abbr: 'DEL' },
    { pos: { x: 68, y: 35 }, name: 'Delantera', abbr: 'DEL' },
  ],
    '4-2-3-1': [
    { pos: { x: 8, y: 50 }, name: 'Portera', abbr: 'POR' },
    { pos: { x: 30, y: 80 }, name: 'Lateral Derecha', abbr: 'LD' },
    { pos: { x: 28, y: 40 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 28, y: 60 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 30, y: 20 }, name: 'Lateral Izquierda', abbr: 'LI' },
    { pos: { x: 45, y: 65 }, name: 'Mediocentro Defensivo', abbr: 'MCD' },
    { pos: { x: 45, y: 35 }, name: 'Mediocentro Defensivo', abbr: 'MCD' },
    { pos: { x: 65, y: 80 }, name: 'Mediocentro Ofensivo D', abbr: 'MCO' },
    { pos: { x: 62, y: 50 }, name: 'Mediocentro Ofensivo C', abbr: 'MCO' },
    { pos: { x: 65, y: 20 }, name: 'Mediocentro Ofensivo I', abbr: 'MCO' },
    { pos: { x: 80, y: 50 }, name: 'Delantera Centro', abbr: 'DC' },
  ],
  '3-4-3': [
    { pos: { x: 8, y: 50 }, name: 'Portera', abbr: 'POR' },
    { pos: { x: 25, y: 75 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 22, y: 50 }, name: 'Líbero', abbr: 'LIB' },
    { pos: { x: 25, y: 25 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 48, y: 82 }, name: 'Interior Derecho', abbr: 'ID' },
    { pos: { x: 45, y: 40 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 45, y: 60 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 48, y: 18 }, name: 'Interior Izquierdo', abbr: 'II' },
    { pos: { x: 72, y: 80 }, name: 'Extremo Derecho', abbr: 'ED' },
    { pos: { x: 75, y: 50 }, name: 'Delantera Centro', abbr: 'DC' },
    { pos: { x: 72, y: 20 }, name: 'Extremo Izquierdo', abbr: 'EI' },
  ],
  '4-1-4-1': [
    { pos: { x: 8, y: 50 }, name: 'Portera', abbr: 'POR' },
    { pos: { x: 30, y: 80 }, name: 'Lateral Derecha', abbr: 'LD' },
    { pos: { x: 28, y: 40 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 28, y: 60 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 30, y: 20 }, name: 'Lateral Izquierda', abbr: 'LI' },
    { pos: { x: 42, y: 50 }, name: 'Mediocentro Defensivo', abbr: 'MCD' },
    { pos: { x: 58, y: 80 }, name: 'Interior Derecho', abbr: 'ID' },
    { pos: { x: 55, y: 40 }, name: 'Mediocentro Ofensivo', abbr: 'MCO' },
    { pos: { x: 55, y: 60 }, name: 'Mediocentro Ofensivo', abbr: 'MCO' },
    { pos: { x: 58, y: 20 }, name: 'Interior Izquierdo', abbr: 'II' },
    { pos: { x: 75, y: 50 }, name: 'Delantera Centro', abbr: 'DC' },
  ],
  '4-5-1': [
    { pos: { x: 8, y: 50 }, name: 'Portera', abbr: 'POR' },
    { pos: { x: 28, y: 82 }, name: 'Lateral Derecha', abbr: 'LD' },
    { pos: { x: 25, y: 40 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 25, y: 60 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 28, y: 18 }, name: 'Lateral Izquierda', abbr: 'LI' },
    { pos: { x: 48, y: 85 }, name: 'Interior Derecho', abbr: 'ID' },
    { pos: { x: 45, y: 65 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 42, y: 50 }, name: 'Mediocentro Defensivo', abbr: 'MCD' },
    { pos: { x: 45, y: 35 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 48, y: 15 }, name: 'Interior Izquierdo', abbr: 'II' },
    { pos: { x: 72, y: 50 }, name: 'Delantera Centro', abbr: 'DC' },
  ],
  '3-5-2': [
    { pos: { x: 8, y: 50 }, name: 'Portera', abbr: 'POR' },
    { pos: { x: 25, y: 75 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 22, y: 50 }, name: 'Líbero', abbr: 'LIB' },
    { pos: { x: 25, y: 25 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 48, y: 85 }, name: 'Carrilera Derecha', abbr: 'CAD' },
    { pos: { x: 45, y: 65 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 42, y: 50 }, name: 'Mediocentro Ofensivo', abbr: 'MCO' },
    { pos: { x: 45, y: 35 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 48, y: 15 }, name: 'Carrilera Izquierda', abbr: 'CAI' },
    { pos: { x: 68, y: 65 }, name: 'Delantera', abbr: 'DEL' },
    { pos: { x: 68, y: 35 }, name: 'Delantera', abbr: 'DEL' },
  ],
  '5-3-2': [
    { pos: { x: 8, y: 50 }, name: 'Portera', abbr: 'POR' },
    { pos: { x: 28, y: 85 }, name: 'Carrilera Derecha', abbr: 'CAD' },
    { pos: { x: 25, y: 65 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 22, y: 50 }, name: 'Líbero', abbr: 'LIB' },
    { pos: { x: 25, y: 35 }, name: 'Defensa Central', abbr: 'DFC' },
    { pos: { x: 28, y: 15 }, name: 'Carrilera Izquierda', abbr: 'CAI' },
    { pos: { x: 48, y: 75 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 45, y: 50 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 48, y: 25 }, name: 'Mediocentro', abbr: 'MC' },
    { pos: { x: 68, y: 65 }, name: 'Delantera', abbr: 'DEL' },
    { pos: { x: 68, y: 35 }, name: 'Delantera', abbr: 'DEL' },
  ],
};

export const getFormationData = (formation: string): { pos: { x: number; y: number }; name: string; abbr: string }[] => {
    return FORMATIONS[formation] || FORMATIONS['4-3-3'];
};

// --- SETUP PHASE ---
export const MY_TEAM_NAME = "Sant Gabriel C.E. FCA";

export const getInitialTeamSetup = (): TeamSetup => {
    const formation = '4-3-3';
    const formationData = getFormationData(formation);

    const starters: StarterSetup[] = formationData.map((posInfo, index) => ({
        positionName: posInfo.name,
        positionAbbr: posInfo.abbr,
        playerName: '',
        playerNumber: 0,
        playerId: null,
        position: posInfo.pos,
    }));

    const subNumbers = [13, 12, 14, 15, 16, 17, 18];
    const subs: SubSetup[] = subNumbers.map((num, index) => ({
        id: Date.now() + index,
        playerName: '',
        playerNumber: num,
    }));

    return {
        formation,
        starters,
        subs,
        unavailable: [],
    };
};

export const getInitialMyTeamSetup = (roster: RosterPlayer[] = []): TeamSetup => {
    const formation = '4-3-3';
    const formationData = getFormationData(formation);

    const starters: StarterSetup[] = formationData.map((posInfo) => ({
        positionName: posInfo.name,
        positionAbbr: posInfo.abbr,
        playerName: '',
        playerNumber: 0,
        playerId: null,
        position: posInfo.pos,
    }));
    
    // Available players for sub list
    const availableRoster = roster.filter(p => p.availability?.status !== 'No Disponible');

    // Use the roster to populate the subs list
    const subs: SubSetup[] = availableRoster.map(player => ({
        id: player.id,
        playerName: player.name,
        playerNumber: player.number,
    }));

    return {
        formation,
        starters,
        subs,
        unavailable: [],
    };
};


export const getInitialMatchDetails = (): MatchDetails => ({
  opponentName: "Equipo Rival",
  myTeamLocation: 'home',
  stadiumName: "",
  matchTime: "",
  refereeName: "",
  matchType: 'Liga',
  jornada: undefined,
  tournamentStage: undefined,
  myTeamLogo: undefined,
  opponentLogo: undefined,
});
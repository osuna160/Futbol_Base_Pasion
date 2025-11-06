import React, { useRef, useState, useEffect } from 'react';
import type { Team, Player, StatEvent, SubstitutionEvent, MatchDetails, GoalEvent, TeamSettings } from '../types';
import StatsChart from './StatsChart';
import { calculateMinutesPlayed } from './report-utils';
import { SparklesIcon, ClipboardListIcon, SpinnerIcon } from './icons';
import { GoogleGenAI } from '@google/genai';

// Make jsPDF and html2canvas available
declare const jspdf: any;
declare const html2canvas: any;
// Make SheetJS (xlsx) available from CDN
declare const XLSX: any;


interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamA: Team;
  teamB: Team;
  matchDetails: MatchDetails;
  halfDurationMinutes: number;
  substitutionLog: SubstitutionEvent[];
  initialStartersA: Player[];
  initialStartersB: Player[];
  teamSettings: TeamSettings;
}

const formatStatEvents = (events: StatEvent[] | GoalEvent[] | undefined, showMinutes = true): string => {
    if (!events || events.length === 0) return '-';
    if (!showMinutes) return String(events.length);
    const minutes = events.map(e => e.minute).join("', ");
    return `${events.length} (${minutes}')`;
};

const PlayerStatsTable: React.FC<{ players: Player[], title: string, initialStarters: Player[], substitutionLog: SubstitutionEvent[], halfDurationMinutes: number }> = ({ players, title, initialStarters, substitutionLog, halfDurationMinutes }) => (
    <div>
        <h4 className="text-lg font-bold mt-4 mb-2 text-gray-800">{title}</h4>
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300 text-sm">
                <thead className="bg-gray-200">
                    <tr>
                        <th className="p-2 border-b text-left">#</th>
                        <th className="p-2 border-b text-left">Nombre</th>
                        <th className="p-2 border-b text-center" title="Minutos Jugados">MJ</th>
                        <th className="p-2 border-b text-center" title="Goles (minutos)">G</th>
                        <th className="p-2 border-b text-center" title="Penaltis Fallados (minutos)">PF</th>
                        <th className="p-2 border-b text-center" title="Fueras de Juego">FJ</th>
                        <th className="p-2 border-b text-center" title="Paradas">P</th>
                        <th className="p-2 border-b text-center" title="Goles Encajados">GE</th>
                        <th className="p-2 border-b text-center" title="Tarjetas Amarillas (minutos)">TA</th>
                        <th className="p-2 border-b text-center" title="Tarjeta Roja (minuto)">TR</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700">
                    {players.map(p => {
                      const isStarter = initialStarters.some(s => s.id === p.id);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                            <td className="p-2 border-b font-semibold">{p.number}</td>
                            <td className="p-2 border-b">{p.name}</td>
                            <td className="p-2 border-b text-center">{calculateMinutesPlayed(p, substitutionLog, halfDurationMinutes, isStarter)}</td>
                            <td className="p-2 border-b text-center">{formatStatEvents(p.goals)}</td>
                            <td className="p-2 border-b text-center">{formatStatEvents(p.penaltiesMissed)}</td>
                            <td className="p-2 border-b text-center">{p.offsidesCommitted.length > 0 ? p.offsidesCommitted.length : '-'}</td>
                            <td className="p-2 border-b text-center">{p.isGoalkeeper && p.saves.length > 0 ? p.saves.length : '-'}</td>
                            <td className="p-2 border-b text-center">{p.isGoalkeeper && p.goalsConceded.length > 0 ? p.goalsConceded.length : '-'}</td>
                            <td className="p-2 border-b text-center">{formatStatEvents(p.yellowCards)}</td>
                            <td className="p-2 border-b text-center">{p.redCard ? `1 (${p.redCard.minute}')` : '-'}</td>
                        </tr>
                      )}
                    )}
                </tbody>
            </table>
        </div>
    </div>
);


const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, teamA, teamB, matchDetails, halfDurationMinutes, substitutionLog, initialStartersA, initialStartersB, teamSettings }) => {
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dependenciesLoaded, setDependenciesLoaded] = useState(true);
  
  // AI Chronicle State
  const [isGeneratingIa, setIsGeneratingIa] = useState(false);
  const [iaSummary, setIaSummary] = useState('');
  const [iaError, setIaError] = useState('');

  // AI Training Suggestions State
  const [isGeneratingTraining, setIsGeneratingTraining] = useState(false);
  const [trainingSuggestions, setTrainingSuggestions] = useState('');
  const [trainingError, setTrainingError] = useState('');

  useEffect(() => {
    if (isOpen) {
        if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined' || typeof XLSX === 'undefined') {
            setDependenciesLoaded(false);
        } else {
            setDependenciesLoaded(true);
        }
        // Reset IA state when modal opens
        setIaSummary('');
        setIaError('');
        setTrainingSuggestions('');
        setTrainingError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getTeamSummary = (team: Team) => {
    const allPlayers = [...team.starters, ...team.subs];
    return {
      name: team.name,
      goals: team.score,
      corners: team.cornersFor.length,
      foulsCommitted: team.foulsCommitted.length,
      offsides: allPlayers.reduce((sum, p) => sum + p.offsidesCommitted.length, 0),
      yellowCards: allPlayers.reduce((sum, p) => sum + p.yellowCards.length, 0),
      redCards: allPlayers.reduce((sum, p) => sum + (p.redCard ? 1 : 0), 0),
    };
  };

  const teamAStats = getTeamSummary(teamA);
  const teamBStats = getTeamSummary(teamB);
  
  const generatePdf = async (action: 'save' | 'print') => {
    if (!reportContentRef.current || !dependenciesLoaded) return;
    setIsGenerating(true);
    
    const modalBody = reportContentRef.current.parentElement;
    const originalMaxHeight = modalBody ? modalBody.style.maxHeight : '';
    if(modalBody) modalBody.style.maxHeight = 'none';

    try {
        const canvas = await html2canvas(reportContentRef.current, { scale: 2 });
        if(modalBody) modalBody.style.maxHeight = originalMaxHeight;

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        const finalImgWidth = pdfWidth;
        const finalImgHeight = pdfWidth / ratio;
        
        let heightLeft = finalImgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, finalImgWidth, finalImgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = heightLeft - finalImgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, finalImgWidth, finalImgHeight);
            heightLeft -= pdfHeight;
        }

        if (action === 'save') {
            pdf.save(`informe-partido-${teamA.name}-vs-${teamB.name}.pdf`);
        } else {
            pdf.autoPrint();
            window.open(pdf.output('bloburl'), '_blank');
        }
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Hubo un error al generar el PDF.");
        if(modalBody) modalBody.style.maxHeight = originalMaxHeight;
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateExcelReport = () => {
      if (!dependenciesLoaded) return;
      const wb = XLSX.utils.book_new();
      const fileName = `Informe_${teamA.name}_vs_${teamB.name}.xlsx`;
      
      const createTeamSheet = (team: Team, initialStarters: Player[]) => {
        const headers = ["#", "Nombre", "Pos.", "MJ", "G", "PF", "TA", "TR", "PC", "FJ", "P", "GE"];
        const allPlayers = [...team.starters, ...team.subs].sort((a,b) => a.number - b.number);
        const playerRows = allPlayers.map(p => {
          const isStarter = initialStarters.some(s => s.id === p.id);
          return [ 
            p.number, p.name, p.positionAbbr, calculateMinutesPlayed(p, substitutionLog, halfDurationMinutes, isStarter), 
            p.goals.length, p.penaltiesMissed.length, p.yellowCards.length, p.redCard ? 1 : 0,
            p.penaltiesCommitted.length, p.offsidesCommitted.length, 
            p.isGoalkeeper ? p.saves.length : '-', 
            p.isGoalkeeper ? p.goalsConceded.length : '-', 
          ];
        });
        return XLSX.utils.aoa_to_sheet([headers, ...playerRows]);
      };
      
      XLSX.utils.book_append_sheet(wb, createTeamSheet(teamA, initialStartersA), teamA.name.substring(0, 31));
      XLSX.utils.book_append_sheet(wb, createTeamSheet(teamB, initialStartersB), teamB.name.substring(0, 31));
      XLSX.writeFile(wb, fileName);
  };

    const formatMatchDataForPrompt = () => {
        const getTeamEvents = (team: Team) => {
            const allPlayers = [...team.starters, ...team.subs];
            const goals = allPlayers.flatMap(p => p.goals.map(g => `- Gol de ${p.name} (#${p.number}) en el minuto ${g.minute}.`)).join('\n');
            const cards = allPlayers.flatMap(p => [
                ...p.yellowCards.map(yc => `- Tarjeta amarilla para ${p.name} (#${p.number}) en el minuto ${yc.minute}.`),
                ...(p.redCard ? [`- Tarjeta roja para ${p.name} (#${p.number}) en el minuto ${p.redCard.minute}.`] : [])
            ]).join('\n');
            return { goals, cards };
        };

        const teamAEvents = getTeamEvents(teamA);
        const teamBEvents = getTeamEvents(teamB);

        const subs = substitutionLog.map(s => {
            const teamName = s.teamId === 'a' ? teamA.name : teamB.name;
            return `- Sustitución en ${teamName} (min ${s.minute}): entra ${s.playerIn.name} (#${s.playerIn.number}) por ${s.playerOut.name} (#${s.playerOut.number}).`;
        }).join('\n');

        return `
            DATOS DEL PARTIDO:
            - Equipos: ${teamA.name} vs ${teamB.name}
            - Resultado Final: ${teamA.name} ${teamA.score} - ${teamB.score} ${teamB.name}
            - Competición: ${matchDetails.matchType} ${matchDetails.jornada ? `Jornada ${matchDetails.jornada}` : ''}
            - Fecha: ${new Date(matchDetails.matchTime).toLocaleString('es-ES')}

            EVENTOS CLAVE:
            Goles de ${teamA.name}:
            ${teamAEvents.goals || "Ninguno"}

            Goles de ${teamB.name}:
            ${teamBEvents.goals || "Ninguno"}

            Tarjetas:
            ${teamAEvents.cards || teamBEvents.cards ? [teamAEvents.cards, teamBEvents.cards].filter(Boolean).join('\n') : "Ninguna"}

            Sustituciones:
            ${subs || "Ninguna"}
        `;
    };

    const handleGenerateIaReport = async () => {
        setIsGeneratingIa(true);
        setIaSummary('');
        setIaError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const promptData = formatMatchDataForPrompt();
            const fullPrompt = `
                Actúa como un periodista deportivo especializado en fútbol femenino. 
                Tu tarea es escribir una crónica de partido concisa y emocionante, como si fuera para un periódico local o una web de noticias deportivas.
                Basándote en los siguientes datos, redacta una crónica del partido. Destaca los momentos clave, las jugadoras decisivas y el resultado final. Adopta un tono profesional pero atractivo.
                La crónica debe tener entre 150 y 250 palabras. No incluyas un titular, solo el cuerpo de la noticia en formato de párrafos de texto.

                ${promptData}
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
            });
            
            setIaSummary(response.text);

        } catch (error) {
            console.error("Error generating AI summary:", error);
            setIaError("No se pudo generar la crónica. Revisa la conexión o inténtalo más tarde.");
        } finally {
            setIsGeneratingIa(false);
        }
    };
    
    const copyToClipboard = (textToCopy: string) => {
        if(textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                alert('Texto copiado al portapapeles.');
            }, (err) => {
                console.error('Could not copy text: ', err);
                alert('No se pudo copiar el texto.');
            });
        }
    };

    const handleGenerateTrainingSuggestions = async () => {
        setIsGeneratingTraining(true);
        setTrainingSuggestions('');
        setTrainingError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const myTeamStats = matchDetails.myTeamLocation === 'home' ? teamAStats : teamBStats;
            const opponentStats = matchDetails.myTeamLocation === 'home' ? teamBStats : teamAStats;
            
            const prompt = `
                Actúa como un analista y entrenador de fútbol profesional. Analiza las siguientes estadísticas de un partido de mi equipo y del rival, y proporciona entre 3 y 5 objetivos claros y accionables para la próxima sesión de entrenamiento.
                Basa tus sugerencias únicamente en los datos proporcionados. Justifica cada sugerencia con una estadística concreta.

                ESTADÍSTICAS MI EQUIPO (${myTeamStats.name}):
                - Goles: ${myTeamStats.goals}
                - Córners a favor: ${myTeamStats.corners}
                - Faltas cometidas: ${myTeamStats.foulsCommitted}
                - Tarjetas amarillas: ${myTeamStats.yellowCards}
                - Tarjetas rojas: ${myTeamStats.redCards}

                ESTADÍSTICAS EQUIPO RIVAL (${opponentStats.name}):
                - Goles: ${opponentStats.goals}

                Formato de respuesta:
                - **[Objetivo 1]:** [Justificación basada en datos].
                - **[Objetivo 2]:** [Justificación basada en datos].
                ...
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setTrainingSuggestions(response.text);
        } catch (error) {
            console.error("Error generating training suggestions:", error);
            setTrainingError("No se pudieron generar las sugerencias. Inténtalo de nuevo.");
        } finally {
            setIsGeneratingTraining(false);
        }
    };

  const matchDate = matchDetails.matchTime ? new Date(matchDetails.matchTime) : new Date();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-5xl h-[90vh] flex flex-col shadow-xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-wrap gap-2">
            <h2 className="text-xl font-bold text-white">Informe del Partido</h2>
            <div className="flex gap-2 flex-wrap">
                 <button onClick={handleGenerateIaReport} disabled={isGeneratingIa} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-wait inline-flex items-center gap-2">
                    {isGeneratingIa ? <><SpinnerIcon /> Generando...</> : <><SparklesIcon /> Crónica con IA</>}
                 </button>
                 <button onClick={handleGenerateTrainingSuggestions} disabled={isGeneratingTraining} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-wait inline-flex items-center gap-2">
                    {isGeneratingTraining ? <><SpinnerIcon /> Analizando...</> : <><ClipboardListIcon /> Sugerencias</>}
                 </button>
                 <button onClick={handleGenerateExcelReport} disabled={isGenerating || !dependenciesLoaded} className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-wait inline-flex items-center gap-2" title={!dependenciesLoaded ? "Se necesita conexión a internet" : ""}>
                    {isGenerating ? <><SpinnerIcon /> Generando...</> : 'Guardar Excel'}
                 </button>
                <button onClick={() => generatePdf('save')} disabled={isGenerating || !dependenciesLoaded} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-wait inline-flex items-center gap-2" title={!dependenciesLoaded ? "Se necesita conexión a internet" : ""}>
                    {isGenerating ? <><SpinnerIcon /> Generando...</> : 'Guardar PDF'}
                </button>
                <button onClick={() => generatePdf('print')} disabled={isGenerating || !dependenciesLoaded} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-wait inline-flex items-center gap-2" title={!dependenciesLoaded ? "Se necesita conexión a internet" : ""}>
                    {isGenerating ? <><SpinnerIcon /> Generando...</> : 'Imprimir'}
                </button>
                <button onClick={onClose} disabled={isGenerating} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
            </div>
             {!dependenciesLoaded && <p className="w-full text-center text-yellow-400 text-sm mt-2">Funcionalidad de informes desactivada. Se requiere conexión a internet.</p>}
        </div>

        <div className="overflow-y-auto p-2 bg-gray-300 flex-grow">
            <div ref={reportContentRef} id="print-area" className="bg-white p-6 rounded-md shadow-inner text-gray-900 mx-auto">
                <div className="text-center border-b pb-4 mb-4 border-gray-300">
                    <h1 className="text-2xl font-bold">Informe del Partido de Fútbol</h1>
                    <p className="text-sm text-gray-600">{new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeStyle: 'short' }).format(matchDate)}</p>
                    <p className="text-sm text-gray-600">Estadio: {matchDetails.stadiumName}</p>
                    {matchDetails.refereeName && <p className="text-sm text-gray-600">Árbitro/a: {matchDetails.refereeName}</p>}
                </div>

                <div className="flex justify-around items-center my-6">
                    <div className="flex flex-col items-center gap-2 text-center w-1/3"><span className="text-2xl font-bold" style={{color: matchDetails.myTeamLocation === 'home' ? teamSettings.primaryColor : '#db2777'}}>{teamA.name}</span></div>
                    <span className="text-4xl font-extrabold bg-gray-800 text-white px-4 py-2 rounded-lg mx-4">{`${teamA.score} - ${teamB.score}`}</span>
                    <div className="flex flex-col items-center gap-2 text-center w-1/3"><span className="text-2xl font-bold" style={{color: matchDetails.myTeamLocation === 'away' ? teamSettings.primaryColor : '#db2777'}}>{teamB.name}</span></div>
                </div>
                
                {(isGeneratingIa || iaSummary || iaError) && (
                    <div className="my-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-xl font-bold mb-4 text-center text-purple-700">Crónica del Partido (IA)</h3>
                        {isGeneratingIa && <div className="text-center text-gray-600">Generando crónica, por favor espera...</div>}
                        {iaError && <div className="text-center text-red-600 bg-red-100 p-3 rounded">{iaError}</div>}
                        {iaSummary && (
                            <div>
                                <p className="text-gray-800 whitespace-pre-wrap text-justify">{iaSummary}</p>
                                <div className="text-right mt-2">
                                    <button onClick={() => copyToClipboard(iaSummary)} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded">
                                        Copiar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {(isGeneratingTraining || trainingSuggestions || trainingError) && (
                    <div className="my-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-xl font-bold mb-4 text-center text-orange-700">Sugerencias para el Entrenamiento (IA)</h3>
                        {isGeneratingTraining && <div className="text-center text-gray-600">Analizando estadísticas...</div>}
                        {trainingError && <div className="text-center text-red-600 bg-red-100 p-3 rounded">{trainingError}</div>}
                        {trainingSuggestions && (
                             <div>
                                <div className="text-gray-800 whitespace-pre-wrap">{
                                    trainingSuggestions.split('\n').map((line, index) => {
                                        if (line.startsWith('- **')) {
                                            return <p key={index} className="mb-2">{line.replace(/- \*\*/g, '<strong>').replace(/\*\*:/g, ':</strong>')}</p>;
                                        }
                                        return <span key={index}>{line}<br/></span>
                                    })
                                }</div>
                                <div className="text-right mt-2">
                                    <button onClick={() => copyToClipboard(trainingSuggestions)} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded">
                                        Copiar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}


                <div className="my-6">
                    <h3 className="text-xl font-bold mb-2 text-center">Resumen Estadístico</h3>
                    <table className="w-full max-w-lg mx-auto text-center bg-white border">
                        <thead className="bg-gray-200 font-bold">
                            <tr>
                                <th className="p-2 border">{teamA.name}</th>
                                <th className="p-2 border">Estadística</th>
                                <th className="p-2 border">{teamB.name}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td className="p-2 border">{teamAStats.goals}</td><td className="p-2 border font-semibold">Goles</td><td className="p-2 border">{teamBStats.goals}</td></tr>
                            <tr><td className="p-2 border">{teamAStats.corners}</td><td className="p-2 border font-semibold">Córners</td><td className="p-2 border">{teamBStats.corners}</td></tr>
                            <tr><td className="p-2 border">{teamAStats.foulsCommitted}</td><td className="p-2 border font-semibold">Faltas</td><td className="p-2 border">{teamBStats.foulsCommitted}</td></tr>
                            <tr><td className="p-2 border">{teamAStats.yellowCards}</td><td className="p-2 border font-semibold">Tarjetas Amarillas</td><td className="p-2 border">{teamBStats.yellowCards}</td></tr>
                            <tr><td className="p-2 border">{teamAStats.redCards}</td><td className="p-2 border font-semibold">Tarjetas Rojas</td><td className="p-2 border">{teamBStats.redCards}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="my-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-xl font-bold mb-4 text-center">Comparativa Gráfica</h3>
                    <div className="h-80 relative">
                        <StatsChart 
                            teamAStats={teamAStats} 
                            teamBStats={teamBStats} 
                            myTeamName={matchDetails.myTeamLocation === 'home' ? teamA.name : teamB.name}
                            primaryColor={teamSettings.primaryColor}
                        />
                    </div>
                </div>
                
                <div className="my-6"><PlayerStatsTable players={[...teamA.starters, ...teamA.subs].sort((a, b) => a.number - b.number)} title={`Estadísticas Completas - ${teamA.name}`} initialStarters={initialStartersA} substitutionLog={substitutionLog} halfDurationMinutes={halfDurationMinutes} /></div>
                <div className="my-6"><PlayerStatsTable players={[...teamB.starters, ...teamB.subs].sort((a, b) => a.number - b.number)} title={`Estadísticas Completas - ${teamB.name}`} initialStarters={initialStartersB} substitutionLog={substitutionLog} halfDurationMinutes={halfDurationMinutes}/></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
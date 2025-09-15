


import React, { useRef, useState } from 'react';
import type { Team, Player, StatEvent, SubstitutionEvent, MatchDetails, GoalEvent } from '../types';
import StatsChart from './StatsChart';

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
}

const formatStatEvents = (events: StatEvent[] | GoalEvent[] | undefined, showMinutes = true): string => {
    if (!events || events.length === 0) return '-';
    if (!showMinutes) return String(events.length);
    const minutes = events.map(e => e.minute).join("', ");
    return `${events.length} (${minutes}')`;
};

const calculateMinutesPlayed = (player: Player, substitutionLog: SubstitutionEvent[], halfDurationMinutes: number, isStarter: boolean): number => {
    const matchEndTime = halfDurationMinutes * 2;
    const playerEvents: { minute: number; type: 'IN' | 'OUT' }[] = [];

    if (isStarter) {
        playerEvents.push({ minute: 0, type: 'IN' });
    }

    substitutionLog.forEach(sub => {
        if (sub.playerIn.id === player.id) {
            playerEvents.push({ minute: sub.minute, type: 'IN' });
        }
        if (sub.playerOut.id === player.id) {
            playerEvents.push({ minute: sub.minute, type: 'OUT' });
        }
    });

    playerEvents.sort((a, b) => a.minute - b.minute);
    
    let totalMinutes = 0;
    let lastInTime: number | null = null;

    playerEvents.forEach(event => {
        if (event.type === 'IN') {
            lastInTime = event.minute;
        } else if (event.type === 'OUT' && lastInTime !== null) {
            totalMinutes += event.minute - lastInTime;
            lastInTime = null;
        }
    });

    if (lastInTime !== null) {
        totalMinutes += matchEndTime - lastInTime;
    }

    return totalMinutes;
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


const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, teamA, teamB, matchDetails, halfDurationMinutes, substitutionLog, initialStartersA, initialStartersB }) => {
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const getTeamSummary = (team: Team) => {
    const allPlayers = [...team.starters, ...team.subs];
    return {
      name: team.name,
      goals: team.score,
      corners: team.cornersFor.length,
      foulsCommitted: allPlayers.reduce((sum, p) => sum + p.foulsCommitted.length, 0),
      offsides: allPlayers.reduce((sum, p) => sum + p.offsidesCommitted.length, 0),
      yellowCards: allPlayers.reduce((sum, p) => sum + p.yellowCards.length, 0),
      redCards: allPlayers.reduce((sum, p) => sum + (p.redCard ? 1 : 0), 0),
    };
  };

  const teamAStats = getTeamSummary(teamA);
  const teamBStats = getTeamSummary(teamB);
  
  const generatePdf = async (action: 'save' | 'print') => {
    if (!reportContentRef.current) return;
    setIsGenerating(true);

    const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    let cursorY = margin;

    const textCenter = (text: string, y: number, size?: number) => {
        if(size) pdf.setFontSize(size);
        const textWidth = pdf.getStringUnitWidth(text) * pdf.getFontSize() / pdf.internal.scaleFactor;
        const x = (pageWidth - textWidth) / 2;
        pdf.text(text, x, y);
    };

    // --- HEADER ---
    pdf.setFont('helvetica', 'bold');
    textCenter('Informe del Partido de Fútbol', cursorY, 18);
    cursorY += 25;

    const matchDate = matchDetails.matchTime ? new Date(matchDetails.matchTime) : new Date();
    pdf.setFont('helvetica', 'normal');
    textCenter(new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeStyle: 'short' }).format(matchDate), cursorY, 10);
    cursorY += 15;
    textCenter(`Estadio: ${matchDetails.stadiumName}`, cursorY, 10);
    cursorY += 15;
    if (matchDetails.refereeName) {
        textCenter(`Árbitro/a: ${matchDetails.refereeName}`, cursorY, 10);
        cursorY += 15;
    }
    cursorY += 10;

    // --- SCORE ---
    pdf.setFont('helvetica', 'bold');
    textCenter(`${teamA.name} ${teamA.score} - ${teamB.score} ${teamB.name}`, cursorY, 16);
    cursorY += 30;

    // --- STATS CHART ---
    const chartCanvas = reportContentRef.current?.querySelector('canvas');
    if (chartCanvas) {
        try {
            const canvas = await html2canvas(chartCanvas, { scale: 2, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = canvas.height * imgWidth / canvas.width;
            if (cursorY + imgHeight > pageHeight - margin) {
                pdf.addPage();
                cursorY = margin;
            }
            pdf.addImage(imgData, 'PNG', margin, cursorY, imgWidth, imgHeight);
            cursorY += imgHeight + 30;
        } catch (error) {
            console.error("Error generating chart canvas:", error);
        }
    }

    // --- PLAYER STATS TABLES HELPER ---
    const drawPlayerTable = (team: Team, initialStarters: Player[], startY: number) => {
        let y = startY;
        const checkPageBreak = (neededHeight: number) => {
            if (y + neededHeight > pageHeight - margin) {
                pdf.addPage();
                y = margin;
                return true;
            }
            return false;
        };

        if (checkPageBreak(40)) y += 20;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Estadísticas Completas - ${team.name}`, margin, y);
        y += 20;

        const headers = ["#", "Nombre", "MJ", "G", "PF", "FJ", "P", "GE", "TA", "TR"];
        const colWidths = [30, 150, 30, 60, 30, 30, 30, 30, 60, 60];
        const allPlayers = [...team.starters, ...team.subs].sort((a, b) => a.number - b.number);
        const tableData = allPlayers.map(p => {
            const isStarter = initialStarters.some(s => s.id === p.id);
            return [
                p.number.toString(), p.name, calculateMinutesPlayed(p, substitutionLog, halfDurationMinutes, isStarter).toString(),
                formatStatEvents(p.goals), formatStatEvents(p.penaltiesMissed, false),
                p.offsidesCommitted.length > 0 ? p.offsidesCommitted.length.toString() : '-',
                p.isGoalkeeper && p.saves.length > 0 ? p.saves.length.toString() : '-',
                p.isGoalkeeper && p.goalsConceded.length > 0 ? p.goalsConceded.length.toString() : '-',
                formatStatEvents(p.yellowCards), p.redCard ? `1 (${p.redCard.minute}')` : '-',
            ];
        });

        const rowHeight = 20;
        const headerBgColor = '#E5E7EB';
        
        const drawHeader = (currentY: number) => {
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.setFillColor(headerBgColor);
            pdf.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
            let x = margin + 5;
            headers.forEach((header, i) => {
                pdf.text(header, x, currentY + 14);
                x += colWidths[i];
            });
            return currentY + rowHeight;
        };
        
        y = drawHeader(y);

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setDrawColor('#B0B0B0');

        tableData.forEach(row => {
            if (checkPageBreak(rowHeight)) {
                y = drawHeader(y);
            }
            let x = margin + 5;
            let currentX = margin;

            row.forEach((cell, i) => {
                const textLines = pdf.splitTextToSize(cell, colWidths[i] - 10);
                pdf.text(textLines, x, y + 14 - (textLines.length > 1 ? 2 : 0));
                currentX += colWidths[i];
                x = currentX + 5;
            });
            y += rowHeight;
        });

        return y;
    };
    
    cursorY = drawPlayerTable(teamA, initialStartersA, cursorY);
    cursorY += 30;
    cursorY = drawPlayerTable(teamB, initialStartersB, cursorY);

    // --- FINALIZE ---
    setIsGenerating(false);
    if (action === 'save') {
        pdf.save(`informe-partido-${teamA.name}-vs-${teamB.name}.pdf`);
    } else {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
    }
  };

  const handleGenerateExcelReport = () => {
      const wb = XLSX.utils.book_new();
      const fileName = `Informe_${teamA.name}_vs_${teamB.name}.xlsx`;
      
      const createTeamSheet = (team: Team, initialStarters: Player[]) => {
        const headers = ["#", "Nombre", "Pos.", "MJ", "G", "PF", "TA", "TR", "FC", "PC", "FJ", "P", "GE"];
        const allPlayers = [...team.starters, ...team.subs].sort((a,b) => a.number - b.number);
        const playerRows = allPlayers.map(p => {
          const isStarter = initialStarters.some(s => s.id === p.id);
          return [ 
            p.number, p.name, p.positionAbbr, calculateMinutesPlayed(p, substitutionLog, halfDurationMinutes, isStarter), 
            p.goals.length, p.penaltiesMissed.length, p.yellowCards.length, p.redCard ? 1 : 0, 
            p.foulsCommitted.length, p.penaltiesCommitted.length, p.offsidesCommitted.length, 
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
  
  const matchDate = matchDetails.matchTime ? new Date(matchDetails.matchTime) : new Date();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-5xl h-[90vh] flex flex-col shadow-xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Informe del Partido</h2>
            <div className="flex gap-4 flex-wrap">
                 <button onClick={handleGenerateExcelReport} disabled={isGenerating} className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-wait">
                    {isGenerating ? 'Generando...' : 'Guardar como Excel'}
                </button>
                <button onClick={() => generatePdf('save')} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-wait">
                    {isGenerating ? 'Generando...' : 'Guardar como PDF'}
                </button>
                <button onClick={() => generatePdf('print')} disabled={isGenerating} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-wait">
                    {isGenerating ? 'Generando...' : 'Imprimir'}
                </button>
                <button onClick={onClose} disabled={isGenerating} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
            </div>
        </div>

        <div className="overflow-y-auto p-2 bg-gray-300 flex-grow">
            <div ref={reportContentRef} className="bg-white p-6 rounded-md shadow-inner text-gray-900 mx-auto">
                <div className="text-center border-b pb-4 mb-4 border-gray-300">
                    <h1 className="text-2xl font-bold">Informe del Partido de Fútbol</h1>
                    <p className="text-sm text-gray-600">{new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeStyle: 'short' }).format(matchDate)}</p>
                    <p className="text-sm text-gray-600">Estadio: {matchDetails.stadiumName}</p>
                    {matchDetails.refereeName && <p className="text-sm text-gray-600">Árbitro/a: {matchDetails.refereeName}</p>}
                </div>

                <div className="flex justify-around items-center my-6">
                    <div className="flex flex-col items-center gap-2 text-center w-1/3">
                        {teamA.logo && <img src={teamA.logo} alt={`${teamA.name} logo`} className="w-24 h-24 object-contain" />}
                        <span className="text-2xl font-bold text-blue-600">{teamA.name}</span>
                    </div>
                    <span className="text-4xl font-extrabold bg-gray-800 text-white px-4 py-2 rounded-lg mx-4">{`${teamA.score} - ${teamB.score}`}</span>
                    <div className="flex flex-col items-center gap-2 text-center w-1/3">
                        {teamB.logo && <img src={teamB.logo} alt={`${teamB.name} logo`} className="w-24 h-24 object-contain" />}
                        <span className="text-2xl font-bold text-pink-600">{teamB.name}</span>
                    </div>
                </div>

                <div className="my-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-xl font-bold mb-4 text-center">Resumen de Estadísticas</h3>
                    <div className="h-80 relative">
                        <StatsChart teamAStats={teamAStats} teamBStats={teamBStats} />
                    </div>
                </div>
                
                <div className="my-6">
                     <PlayerStatsTable players={[...teamA.starters, ...teamA.subs].sort((a, b) => a.number - b.number)} title={`Estadísticas Completas - ${teamA.name}`} initialStarters={initialStartersA} substitutionLog={substitutionLog} halfDurationMinutes={halfDurationMinutes} />
                </div>

                 <div className="my-6">
                     <PlayerStatsTable players={[...teamB.starters, ...teamB.subs].sort((a, b) => a.number - b.number)} title={`Estadísticas Completas - ${teamB.name}`} initialStarters={initialStartersB} substitutionLog={substitutionLog} halfDurationMinutes={halfDurationMinutes}/>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-300 text-center">
                    <h3 className="text-lg font-bold">Alineaciones Finales</h3>
                    <p><span className="font-semibold">{teamA.name}:</span> {teamA.formation}</p>
                    <p><span className="font-semibold">{teamB.name}:</span> {teamB.formation}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;

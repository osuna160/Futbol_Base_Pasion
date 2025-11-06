import React, { useEffect, useRef } from 'react';

// Make sure Chart.js is available in the global scope (from CDN)
declare const Chart: any;

interface StatsChartProps {
  teamAStats: any;
  teamBStats: any;
  myTeamName: string;
  primaryColor: string;
}

const StatsChart: React.FC<StatsChartProps> = ({ teamAStats, teamBStats, myTeamName, primaryColor }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        // Destroy previous chart instance if it exists
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        const isTeamAMyTeam = teamAStats.name === myTeamName;
        const myTeamColor = primaryColor;
        const opponentColor = 'rgba(156, 163, 175, 0.7)'; // gray-400

        const labels = ['Goles', 'Córners', 'Faltas Cometidas', 'Fueras de Juego', 'Tarjetas Amarillas', 'Tarjetas Rojas'];
        const data = {
          labels: labels,
          datasets: [
            {
              label: teamAStats.name,
              data: [
                teamAStats.goals,
                teamAStats.corners,
                teamAStats.foulsCommitted,
                teamAStats.offsides,
                teamAStats.yellowCards,
                teamAStats.redCards,
              ],
              backgroundColor: isTeamAMyTeam ? myTeamColor : opponentColor,
              borderColor: isTeamAMyTeam ? myTeamColor : opponentColor,
              borderWidth: 1,
            },
            {
              label: teamBStats.name,
              data: [
                teamBStats.goals,
                teamBStats.corners,
                teamBStats.foulsCommitted,
                teamBStats.offsides,
                teamBStats.yellowCards,
                teamBStats.redCards,
              ],
              backgroundColor: !isTeamAMyTeam ? myTeamColor : opponentColor,
              borderColor: !isTeamAMyTeam ? myTeamColor : opponentColor,
              borderWidth: 1,
            },
          ],
        };

        chartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: data,
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                beginAtZero: true,
                ticks: {
                  color: '#111827', // text-gray-900
                   stepSize: 1,
                },
                grid: {
                    color: '#e5e7eb' // gray-200
                }
              },
              y: {
                ticks: {
                  color: '#111827', // text-gray-900
                  font: {
                      weight: 'bold',
                  }
                },
                grid: {
                    display: false
                }
              }
            },
            plugins: {
              legend: {
                position: 'top',
                labels: {
                    color: '#111827' // text-gray-900
                }
              },
              title: {
                display: true,
                text: 'Comparativa de Estadísticas del Equipo',
                color: '#111827', // text-gray-900
                font: {
                    size: 16,
                    weight: 'bold'
                }
              },
            },
          },
        });
      }
    }
    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [teamAStats, teamBStats, myTeamName, primaryColor]);

  return <canvas ref={chartRef}></canvas>;
};

export default StatsChart;
import type { Player, SubstitutionEvent } from '../types';

export const calculateMinutesPlayed = (player: Player, substitutionLog: SubstitutionEvent[], halfDurationMinutes: number, isStarter: boolean): number => {
    if (!player) return 0;
    
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
    
    // Add red card as an OUT event if it exists
    if (player.redCard) {
        playerEvents.push({ minute: player.redCard.minute, type: 'OUT' });
    }

    playerEvents.sort((a, b) => a.minute - b.minute);
    
    // Deduplicate events at the same minute, prioritizing OUT
    const uniqueEvents: { minute: number; type: 'IN' | 'OUT' }[] = [];
    let lastMinute = -1;
    for (let i = playerEvents.length - 1; i >= 0; i--) {
        const event = playerEvents[i];
        if (event.minute !== lastMinute) {
            uniqueEvents.unshift(event);
            lastMinute = event.minute;
        }
    }
    
    let totalMinutes = 0;
    let lastInTime: number | null = null;

    uniqueEvents.forEach(event => {
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

    return Math.min(totalMinutes, matchEndTime);
};
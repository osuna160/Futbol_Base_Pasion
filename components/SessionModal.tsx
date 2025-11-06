import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import type { TrainingSession, RosterPlayer, AttendanceStatus, ExercisePart } from '../types';
import { ATTENDANCE_STATUSES } from '../types';
import { TrashIcon } from './icons';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  sessions: TrainingSession[];
  onSave: (date: Date, sessions: TrainingSession[]) => void;
  roster: RosterPlayer[];
}

const parseTime = (timeStr: string): [number, number] => {
    if (!timeStr || !timeStr.includes(':')) return [0, 0];
    return timeStr.split(':').map(Number) as [number, number];
};

const calculateDurationInMinutes = (start: string, end: string): number => {
    const [startH, startM] = parseTime(start);
    const [endH, endM] = parseTime(end);
    const startDate = new Date(0, 0, 0, startH, startM);
    let endDate = new Date(0, 0, 0, endH, endM);
    if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
    }
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60);
};

const ExerciseInput: React.FC<{ label: string; value: ExercisePart; onChange: (value: ExercisePart) => void }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <div className="flex flex-col sm:flex-row gap-2">
            <textarea
                placeholder="Detalles del ejercicio..."
                value={value.text}
                onChange={e => onChange({ ...value, text: e.target.value })}
                className="bg-gray-700 p-2 rounded w-full h-24 sm:h-auto"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
                <input
                    type="number"
                    value={value.duration}
                    onChange={e => onChange({ ...value, duration: parseInt(e.target.value) || 0 })}
                    className="bg-gray-700 p-2 rounded w-20 text-center"
                    min="0"
                />
                <span className="text-gray-400">min</span>
            </div>
        </div>
    </div>
);


const SessionModal: React.FC<SessionModalProps> = ({ isOpen, onClose, date, sessions, onSave, roster }) => {
  const [localSessions, setLocalSessions] = useState<TrainingSession[]>([]);
  const [editingSession, setEditingSession] = useState<Partial<TrainingSession> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  useEffect(() => {
    setLocalSessions(JSON.parse(JSON.stringify(sessions)));
  }, [sessions, isOpen]);

  const handleSave = () => {
    onSave(date, localSessions);
  };

  const handleAddOrUpdateSession = () => {
    if (!editingSession || !editingSession.objective || editingSession.objective.trim() === '') {
      setFormError('El objetivo principal es obligatorio.');
      return;
    }
    setFormError(null);

    if (editingSession.id) { // Update
      setLocalSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, ...editingSession } as TrainingSession : s));
    } else { // Add
      const newSession: TrainingSession = {
        id: Date.now(),
        startTime: '18:00',
        endTime: '19:30',
        objective: '',
        warmup: { text: '', duration: 0 },
        mainPart: { text: '', duration: 0 },
        finalPart: { text: '', duration: 0 },
        coolDown: { text: '', duration: 0 },
        notes: '',
        attendance: {},
        ...editingSession,
      };
      setLocalSessions(prev => [...prev, newSession]);
    }
    setEditingSession(null);
  };
  
  const handleRemoveSession = (id: number) => {
    setLocalSessions(prev => prev.filter(s => s.id !== id));
  };

  const startNewSession = () => {
    const initialAttendance: { [playerId: number]: AttendanceStatus } = {};
    roster.forEach(player => {
        initialAttendance[player.id] = ATTENDANCE_STATUSES.PRESENT;
    });
    
    setFormError(null);
    setEditingSession({ 
      objective: '', 
      startTime: '18:00', 
      endTime: '19:30',
      warmup: { text: '', duration: 15 },
      mainPart: { text: '', duration: 50 },
      finalPart: { text: '', duration: 15 },
      coolDown: { text: '', duration: 10 },
      notes: '',
      attendance: initialAttendance
    });
  };
  
  const startEditing = (session: TrainingSession) => {
    const sessionCopy: Partial<TrainingSession> = JSON.parse(JSON.stringify(session));
    if (!sessionCopy.finalPart) {
      sessionCopy.finalPart = { text: '', duration: 0 };
    }

    let finalAttendance: { [playerId: number]: AttendanceStatus } = {};
    roster.forEach(player => { finalAttendance[player.id] = ATTENDANCE_STATUSES.PRESENT; });
    if (sessionCopy.attendance) {
        finalAttendance = { ...finalAttendance, ...sessionCopy.attendance };
    }
    
    sessionCopy.attendance = finalAttendance;
    setFormError(null);
    setEditingSession(sessionCopy);
  };

  const handleAttendanceChange = (playerId: number, status: AttendanceStatus) => {
    setEditingSession(prev => {
        if (!prev) return null;
        const newAttendance = { ...(prev.attendance || {}) };
        newAttendance[playerId] = status;
        return { ...prev, attendance: newAttendance };
    });
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditingSession(prev => prev ? { ...prev, photoDataUrl: reader.result as string } : null);
        };
        reader.readAsDataURL(file);
    }
  };

  const totalSessionDuration = useMemo(() => {
    if (!editingSession || !editingSession.startTime || !editingSession.endTime) return 0;
    return calculateDurationInMinutes(editingSession.startTime, editingSession.endTime);
  }, [editingSession?.startTime, editingSession?.endTime]);

  const totalExerciseDuration = useMemo(() => {
    if (!editingSession) return 0;
    return (editingSession.warmup?.duration || 0) +
           (editingSession.mainPart?.duration || 0) +
           (editingSession.finalPart?.duration || 0) +
           (editingSession.coolDown?.duration || 0);
  }, [editingSession]);

  const presentCount = useMemo(() => {
    if (!editingSession || !editingSession.attendance) return 0;
    return Object.values(editingSession.attendance).filter(status => status === ATTENDANCE_STATUSES.PRESENT).length;
  }, [editingSession]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl shadow-xl flex flex-col h-auto max-h-[95vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold">Sesiones para {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 -mr-4">
          {editingSession ? (
            <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
              <h3 className="font-bold text-lg text-cyan-400 mb-2">{editingSession.id ? 'Editar Sesión' : 'Nueva Sesión'}</h3>
              <div className="space-y-3 p-3 bg-gray-700/50 rounded-lg">
                  <input type="text" placeholder="Objetivo Principal" value={editingSession.objective} onChange={e => setEditingSession(s => s ? {...s, objective: e.target.value} : null)} className="bg-gray-600 p-2 rounded w-full font-semibold" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                      <div className="flex items-center gap-2"><label className="text-gray-400">Inicio:</label><input type="time" value={editingSession.startTime} onChange={e => setEditingSession(s => s ? {...s, startTime: e.target.value} : null)} className="bg-gray-600 p-2 rounded w-full" /></div>
                      <div className="flex items-center gap-2"><label className="text-gray-400">Fin:</label><input type="time" value={editingSession.endTime} onChange={e => setEditingSession(s => s ? {...s, endTime: e.target.value} : null)} className="bg-gray-600 p-2 rounded w-full" /></div>
                      <div className="text-center sm:text-left"><span className="font-semibold text-white">{totalSessionDuration}</span><span className="text-gray-400"> min de sesión</span></div>
                  </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="space-y-4">
                    <h4 className="font-bold text-lg text-cyan-400 mb-2">Plan de la Sesión</h4>
                    <ExerciseInput label="Calentamiento" value={editingSession.warmup!} onChange={val => setEditingSession(s => s ? {...s, warmup: val} : null)} />
                    <ExerciseInput label="Parte Principal" value={editingSession.mainPart!} onChange={val => setEditingSession(s => s ? {...s, mainPart: val} : null)} />
                    <ExerciseInput label="Parte Final" value={editingSession.finalPart!} onChange={val => setEditingSession(s => s ? {...s, finalPart: val} : null)} />
                    <ExerciseInput label="Vuelta a la Calma" value={editingSession.coolDown!} onChange={val => setEditingSession(s => s ? {...s, coolDown: val} : null)} />
                    <div className={`p-2 rounded-lg text-center font-semibold ${totalExerciseDuration > totalSessionDuration ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>Tiempo de ejercicios: {totalExerciseDuration} min / {totalSessionDuration} min</div>
                    <textarea placeholder="Notas Adicionales" value={editingSession.notes} onChange={e => setEditingSession(s => s ? {...s, notes: e.target.value} : null)} className="bg-gray-700 p-2 rounded w-full h-20" />
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Foto de la libreta</label>
                        {editingSession.photoDataUrl ? (<div className="relative group"><img src={editingSession.photoDataUrl} alt="Sesión" className="w-full max-h-60 object-contain rounded-lg" /><button onClick={() => setEditingSession(s => s ? { ...s, photoDataUrl: undefined } : null)} className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon /></button></div>) : (<input type="file" accept="image/*" onChange={handleFileUpload} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"/>)}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-lg text-cyan-400 mb-2">Asistencia ({presentCount} / {roster.length})</h4>
                    <div className="bg-gray-700 p-2 rounded-md max-h-[40vh] overflow-y-auto">
                        {roster.sort((a,b) => a.number - b.number).map(player => (
                            <div key={player.id} className="flex justify-between items-center p-1.5 hover:bg-gray-600/50 rounded">
                                <span className="truncate">({player.number}) {player.name}</span>
                                <select value={editingSession.attendance?.[player.id] || ATTENDANCE_STATUSES.PRESENT} onChange={(e) => handleAttendanceChange(player.id, e.target.value as AttendanceStatus)} className="bg-gray-800 text-white rounded p-1 text-sm border-0 focus:ring-2 focus:ring-cyan-500">
                                    {Object.values(ATTENDANCE_STATUSES).map(status => (<option key={status} value={status}>{status}</option>))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
              <div className="flex justify-end items-center gap-3 pt-3 mt-4 border-t border-gray-700">
                {formError && <p className="text-red-400 text-sm mr-auto">{formError}</p>}
                <button onClick={() => setEditingSession(null)} className="bg-gray-600 hover:bg-gray-500 font-semibold py-2 px-4 rounded">Cancelar</button>
                <button onClick={handleAddOrUpdateSession} disabled={!editingSession?.objective?.trim()} className="bg-green-600 hover:bg-green-700 font-semibold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed">Guardar Sesión</button>
              </div>
            </div>
          ) : (
            <div>
              {localSessions.length === 0 ? (<p className="text-gray-400 text-center py-8">No hay sesiones programadas para este día.</p>) : (<div className="space-y-3">
                  {localSessions.map(session => (<div key={session.id} className="bg-gray-700 p-3 rounded-lg"><div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-lg text-cyan-300">{session.objective}</p>
                          <p className="text-sm text-gray-400">{session.startTime} - {session.endTime} ({calculateDurationInMinutes(session.startTime, session.endTime)} min)</p>
                        </div>
                        <div className="flex gap-2"><button onClick={() => startEditing(session)} className="text-gray-300 hover:text-white text-sm font-semibold">EDITAR</button><button onClick={() => handleRemoveSession(session.id)} className="text-red-400 hover:text-red-300"><TrashIcon /></button></div>
                      </div></div>))}
                </div>)}
              <button onClick={startNewSession} className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700 font-semibold py-2 rounded-lg">+ Añadir Nueva Sesión</button>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 mt-6 pt-4 border-t border-gray-700 flex justify-end">
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded">Guardar y Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default SessionModal;
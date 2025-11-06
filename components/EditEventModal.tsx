import React, { useState, useEffect } from 'react';
import type { MatchEvent } from '../types';

interface EditEventModalProps {
    event: MatchEvent | null;
    onClose: () => void;
    onSave: (eventId: string, newMinute: number) => void;
}

const EditEventModal: React.FC<EditEventModalProps> = ({ event, onClose, onSave }) => {
    const [minute, setMinute] = useState(0);

    useEffect(() => {
        if (event) {
            setMinute(event.minute);
        }
    }, [event]);

    if (!event) return null;

    const handleSave = () => {
        onSave(event.id, minute);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl">
                <h2 className="text-xl font-bold mb-4">Editar Evento</h2>
                <p className="text-gray-300 mb-2"><strong>Tipo:</strong> {event.type}</p>
                <p className="text-gray-300 mb-4"><strong>Detalle:</strong> {event.detail}</p>
                <div className="flex items-center gap-4">
                    <label htmlFor="edit-minute" className="font-semibold">Minuto:</label>
                    <input
                        id="edit-minute"
                        type="number"
                        value={minute}
                        onChange={(e) => setMinute(parseInt(e.target.value, 10) || 0)}
                        className="bg-gray-700 text-white w-24 text-center rounded-md p-2"
                        min="0"
                        max="120"
                    />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 font-bold py-2 px-4 rounded">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 font-bold py-2 px-4 rounded">
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditEventModal;
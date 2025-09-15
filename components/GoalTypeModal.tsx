import React from 'react';
import type { GoalType } from '../types';
import { GOAL_TYPES } from '../types';

interface GoalTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (goalType: GoalType) => void;
}

const GoalTypeModal: React.FC<GoalTypeModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  const handleSelect = (goalType: GoalType) => {
    onConfirm(goalType);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Seleccionar Tipo de Gol</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(GOAL_TYPES).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleSelect(key as GoalType)}
              className="bg-gray-700 hover:bg-cyan-600 text-white font-semibold py-3 px-2 rounded-lg transition-colors duration-200"
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GoalTypeModal;
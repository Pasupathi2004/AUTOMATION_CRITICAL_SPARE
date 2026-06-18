import React from 'react';
import { Building2, Package } from 'lucide-react';
import { PLANTS, Plant } from '../constants/plants';

interface PlantSelectionProps {
  onSelect: (plant: Plant) => void;
}

const PlantSelection: React.FC<PlantSelectionProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E8B57] to-[#228B22] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="bg-[#2E8B57] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Package className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Inventory Manager</h1>
            <p className="text-gray-600 mt-2">Select your plant to continue</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLANTS.map((plant) => (
              <button
                key={plant.id}
                type="button"
                onClick={() => onSelect(plant.id)}
                className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-[#2E8B57] hover:bg-green-50 transition-all group"
              >
                <Building2
                  size={40}
                  className="text-gray-400 group-hover:text-[#2E8B57] mb-3 transition-colors"
                />
                <span className="text-xl font-semibold text-gray-800">{plant.label}</span>
                <span className="text-sm text-gray-500 mt-1">Inventory system</span>
              </button>
            ))}
          </div>

          <div className="mt-8 text-center text-sm text-gray-600">
            <p>TD CONNEX AUTOMATION</p>
            <p className="mt-1">Version 1.0.0 • {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlantSelection;

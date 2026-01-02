'use client';
import { useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';

const CreateTeacher = () => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    workHours: '',
    breakHours: '',
    isCoordinator: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const translations = {
    title: language === 'es' ? 'Crear Nuevo Profesor' : 'Create New Teacher',
    firstName: language === 'es' ? 'Nombre' : 'First Name',
    lastName: language === 'es' ? 'Apellido' : 'Last Name',
    workHours: language === 'es' ? 'Horas de Trabajo' : 'Work Hours',
    breakHours: language === 'es' ? 'Horas de Descanso' : 'Break Hours',
    isCoordinator: language === 'es' ? 'Es Coordinador' : 'Is Coordinator',
    submit: language === 'es' ? 'Crear Profesor' : 'Create Teacher',
  };

  return (
    <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
      <h1 className={`text-3xl font-bold mb-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        {translations.title}
      </h1>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className={`p-6 rounded-lg shadow-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label className="block mb-2 font-medium">{translations.firstName}</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`w-full p-2 rounded border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-gray-50 border-gray-300'
                }`}
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block mb-2 font-medium">{translations.lastName}</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`w-full p-2 rounded border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-gray-50 border-gray-300'
                }`}
                required
              />
            </div>

            {/* Work Hours */}
            <div>
              <label className="block mb-2 font-medium">{translations.workHours}</label>
              <input
                type="number"
                name="workHours"
                value={formData.workHours}
                onChange={handleChange}
                className={`w-full p-2 rounded border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-gray-50 border-gray-300'
                }`}
                required
                min="0"
                max="24"
              />
            </div>

            {/* Break Hours */}
            <div>
              <label className="block mb-2 font-medium">{translations.breakHours}</label>
              <input
                type="number"
                name="breakHours"
                value={formData.breakHours}
                onChange={handleChange}
                className={`w-full p-2 rounded border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-gray-50 border-gray-300'
                }`}
                required
                min="0"
                max="24"
              />
            </div>
          </div>

          {/* Is Coordinator Switch */}
          <div className="mt-6">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  name="isCoordinator"
                  checked={formData.isCoordinator}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                } ${formData.isCoordinator ? 'bg-blue-600' : ''}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${
                  formData.isCoordinator ? 'translate-x-4' : ''
                }`}></div>
              </div>
              <span className="ml-3 font-medium">{translations.isCoordinator}</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`mt-8 w-full py-3 px-4 rounded-lg font-medium text-white
              ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}
              transition-colors duration-200`}
          >
            {translations.submit}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTeacher; 
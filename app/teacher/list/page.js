'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { fetchWithAuth } from '@/app/utils/api';
import Loading from '@/app/components/Loading';

const TeacherList = () => {
  const { theme } = useTheme();
  const { language, translations: langTranslations } = useLanguage();
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch teachers data
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth('/teachers');
        setTeachers(data || []);
      } catch (err) {
        console.error('Error fetching teachers:', err);
        setError(err.message || 'Failed to fetch teachers data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  const translations = {
    title: language === 'es' ? 'Lista de Profesores' : 'Teacher List',
    schedule: language === 'es' ? 'Horario' : 'Schedule',
    examRecords: language === 'es' ? 'Registros de Exámenes' : 'Exam Records',
    student: language === 'es' ? 'Estudiante' : 'Student',
    exam: language === 'es' ? 'Examen' : 'Exam',
    result: language === 'es' ? 'Resultado' : 'Result',
    coordinator: language === 'es' ? 'Coordinador' : 'Coordinator',
    workHours: language === 'es' ? 'Horas de Trabajo' : 'Work Hours',
    breakHours: language === 'es' ? 'Horas de Descanso' : 'Break Hours',
    viewDetails: language === 'es' ? 'Ver Detalles' : 'View Details',
    hideDetails: language === 'es' ? 'Ocultar Detalles' : 'Hide Details',
    passed: language === 'es' ? 'Aprobado' : 'Passed',
    failed: language === 'es' ? 'Reprobado' : 'Failed',
    noTeachersFound: language === 'es' ? 'No se encontraron profesores' : 'No teachers found',
    errorLoading: language === 'es' ? 'Error al cargar los datos' : 'Error loading data',
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} flex justify-center items-center`}>
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} flex justify-center items-center`}>
        <div className="text-center">
          <p className="text-xl text-red-500 mb-4">{translations.errorLoading}</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!teachers.length) {
    return (
      <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} flex justify-center items-center`}>
        <p className="text-xl">{translations.noTeachersFound}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
      <h1 className={`text-3xl font-bold mb-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        {translations.title}
      </h1>

      <div className="grid grid-cols-1 gap-6">
        {teachers.map(teacher => (
          <div
            key={teacher.id}
            className={`p-6 rounded-lg shadow-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">
                  {teacher.firstName} {teacher.lastName}
                  {teacher.isCoordinator && (
                    <span className="ml-2 px-2 py-1 text-sm rounded-full bg-blue-500 text-white">
                      {translations.coordinator}
                    </span>
                  )}
                </h2>
                <p className="mt-2 text-sm">
                  {translations.workHours}: {teacher.workHours || 'N/A'} | {translations.breakHours}: {teacher.breakHours || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedTeacher(selectedTeacher?.id === teacher.id ? null : teacher)}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  theme === 'dark' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {selectedTeacher?.id === teacher.id ? translations.hideDetails : translations.viewDetails}
              </button>
            </div>

            {selectedTeacher?.id === teacher.id && (
              <div className="mt-6">
                <p className="text-center text-gray-500">
                  {language === 'es' 
                    ? 'Detalles completos disponibles en la API' 
                    : 'Full details available from the API'
                  }
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherList; 
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';

const TeacherPage = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();

  const menuItems = [
    {
      title: language === 'es' ? 'Crear Profesor' : 'Create Teacher',
      path: '/teacher/create',
      icon: '👨‍🏫'
    },
    {
      title: language === 'es' ? 'Lista de Profesores' : 'Teacher List',
      path: '/teacher/list',
      icon: '📋'
    }
  ];

  return (
    <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
      <h1 className={`text-3xl font-bold mb-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
        {language === 'es' ? 'Gestión de Profesores' : 'Teacher Management'}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menuItems.map((item, index) => (
          <div
            key={index}
            onClick={() => router.push(item.path)}
            className={`
              p-6 rounded-lg shadow-lg cursor-pointer
              transform transition-transform hover:scale-105
              ${theme === 'dark' 
                ? 'bg-gray-800 hover:bg-gray-700' 
                : 'bg-white hover:bg-gray-50'}
            `}
          >
            <div className="flex items-center space-x-4">
              <span className="text-4xl">{item.icon}</span>
              <h2 className="text-xl font-semibold">{item.title}</h2>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherPage; 
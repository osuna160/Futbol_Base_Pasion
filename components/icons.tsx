import React from 'react';

export const CardIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
  </svg>
);

export const SubstituteIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5zm-7-14a.5.5 0 0 1 .5.5v11.793l-3.146-3.147a.5.5 0 0 1-.708.708l-4 4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0L4 13.293V1.5a.5.5 0 0 1 .5-.5z"/>
  </svg>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

export const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

export const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
    </svg>
);

export const ArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
    </svg>
);

export const BallIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={`w-6 h-6 ${className}`}>
    <path fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM164.6 135.4l56.8 56.8c4.2-1.8 8.8-2.9 13.5-3.4l-57.8-57.8c-5.8-5.8-15.3-5.8-21.1 0l-1.4 1.4c-5.8 5.8-5.8 15.3 0 21.1zm21.1 88.5l-56.8-56.8c1.8-4.2 2.9-8.8 3.4-13.5l57.8 57.8c5.8 5.8 5.8 15.3 0 21.1l-1.4 1.4c-5.8 5.8-15.3 5.8-21.1 0zM224 336l-57.8 57.8c5.8 5.8 15.3 5.8 21.1 0l1.4-1.4c5.8-5.8 5.8-15.3 0-21.1l-56.8-56.8c-4.2 1.8-8.8 2.9-13.5 3.4l57.8 57.8c4.6 4.6 11.2 6.4 17.5 5.7zM240 256c-4.4 0-8.8.5-13.1 1.4l-102-102c-5.8-5.8-15.3-5.8-21.1 0l-1.4 1.4c-5.8 5.8-5.8 15.3 0 21.1l102 102c-1 4.3-1.4 8.7-1.4 13.1c0 4.4.5 8.8 1.4 13.1l-102 102c-5.8 5.8-5.8 15.3 0 21.1l1.4 1.4c5.8 5.8 15.3 5.8 21.1 0l102-102c4.3 1 8.7 1.4 13.1 1.4c4.4 0 8.8-.5 13.1-1.4l102 102c5.8 5.8 15.3 5.8 21.1 0l1.4-1.4c5.8-5.8 5.8-15.3 0-21.1l-102-102c1-4.3 1.4-8.7 1.4-13.1c0-4.4-.5-8.8-1.4-13.1l102-102c5.8-5.8 5.8-15.3 0-21.1l-1.4-1.4c-5.8-5.8-15.3-5.8-21.1 0l-102 102c-4.3-1-8.7-1.4-13.1-1.4zM405.4 164.6l-56.8-56.8c-5.8-5.8-15.3-5.8-21.1 0l-1.4 1.4c-5.8 5.8-5.8-15.3 0 21.1l56.8 56.8c4.2-1.8 8.8-2.9 13.5-3.4l-57.8-57.8c5.8 5.8 15.3 5.8 21.1 0l1.4-1.4c5.8-5.9 5.8-15.4 0-21.2zM288 336l57.8 57.8c-5.8 5.8-15.3 5.8-21.1 0l-1.4-1.4c-5.8-5.8-5.8-15.3 0-21.1l56.8-56.8c4.2 1.8 8.8 2.9 13.5 3.4l-57.8 57.8c-4.6 4.6-11.2 6.4-17.5 5.7zm31.4-96.6l56.8 56.8c-1.8 4.2-2.9 8.8-3.4 13.5l-57.8-57.8c-5.8-5.8-5.8-15.3 0-21.1l1.4-1.4c5.8-5.8 15.3-5.8 21.1 0z"/>
  </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

export const MinusCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 4.5a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const PlusCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 4.5a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const FootballFieldSVG: React.FC = () => (
    <svg width="100%" height="100%" viewBox="0 0 105 68" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
      <rect x="0" y="0" width="105" height="68" fill="none" stroke="black" strokeWidth="0.5" />
      <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="black" strokeWidth="0.5" />
      <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="black" strokeWidth="0.5" />
      <circle cx="52.5" cy="34" r="0.5" fill="black" />
      <rect x="0" y="13.84" width="16.5" height="40.32" fill="none" stroke="black" strokeWidth="0.5" />
      <rect x="0" y="24.84" width="5.5" height="18.32" fill="none" stroke="black" strokeWidth="0.5" />
      <circle cx="11" cy="34" r="0.5" fill="black" />
      <path d="M 16.5,24.84 A 9.15,9.15 0 0,1 16.5,43.16" fill="none" stroke="black" strokeWidth="0.5" />
      <rect x="88.5" y="13.84" width="16.5" height="40.32" fill="none" stroke="black" strokeWidth="0.5" />
      <rect x="99.5" y="24.84" width="5.5" height="18.32" fill="none" stroke="black" strokeWidth="0.5" />
      <circle cx="94" cy="34" r="0.5" fill="black" />
      <path d="M 88.5,24.84 A 9.15,9.15 0 0,0 88.5,43.16" fill="none" stroke="black" strokeWidth="0.5" />
    </svg>
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

export const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

export const HeartPulseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M12 12h.01" />
    </svg>
);

export const AcademicCapIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v6m-6-3.837V14a6 6 0 016-6v-2m-6 2v-2a6 6 0 016-6v2" />
    </svg>
);

export const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
);

export const QuestionMarkCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
);

export const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M12 12.75h.008v.008H12v-.008Zm0 3h.008v.008H12v-.008Zm.008-3h.008v.008H12.008v-.008Zm.008 3h.008v.008H12.008v-.008Zm-3.008-3h.008v.008H9v-.008Zm-3.008 3h.008v.008H6v-.008Zm-3.008-3h.008v.008H3v-.008Zm6 3h.008v.008H9v-.008Zm6-3h.008v.008h-.008v-.008Zm-6 3h.008v.008h-.008v-.008Z" />
    </svg>
);

export const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6.375c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0110.5 10.5z" />
    </svg>
);
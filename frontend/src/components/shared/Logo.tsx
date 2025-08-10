import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-8 w-8 text-indigo-400" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"/>
        <path d="m13 12-2 5h4l-2 5"/>
        <path d="M9 12a3 3 0 0 0 6 0c0-1.7-3-3-3-3s-3 1.3-3 3Z"/>
    </svg>
);

export default Logo;

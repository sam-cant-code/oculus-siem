import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div className={`bg-siem-panel border border-siem-border rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
};
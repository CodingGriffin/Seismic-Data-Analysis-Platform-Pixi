import React from 'react';

interface SectionHeaderProps {
  title: string;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actions,
  className = '',
  children,
}) => {
  return (
    <div
      className={`d-flex justify-content-between align-items-center p-2 border-bottom ${className}`}
      style={{ height: "42px" }}
    >
      <h6 className="mb-0">{title}</h6>
      {children}
      {actions && <div className="d-flex align-items-center">{actions}</div>}
    </div>
  );
};

export default SectionHeader;
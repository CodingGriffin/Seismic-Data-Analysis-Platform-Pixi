"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  maxVisiblePages?: number;
  showEllipsis?: boolean;
  prevLabel?: React.ReactNode;
  nextLabel?: React.ReactNode;
  boundaryCount?: number;
  siblingCount?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  size = "md",
  className = "",
  maxVisiblePages = 7,
  showEllipsis = true,
  prevLabel = <span aria-hidden="true">&laquo;</span>,
  nextLabel = <span aria-hidden="true">&raquo;</span>,
  boundaryCount = 1,
  siblingCount = 1,
}) => {
  const handlePrevious = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      onPageChange(currentPage + 1);
    }
  };

  const renderPaginationItems = () => {
    // Don't render pagination if only one page
    if (totalPages <= 1) return null;
    
    const items = [];
    
    // For very few pages, show all page numbers
    if (totalPages <= maxVisiblePages) {
      for (let i = 0; i < totalPages; i++) {
        items.push(
          <li className={currentPage === i ? "page-item active" : "page-item"} key={`page-${i}`}>
            <button className="page-link" onClick={() => onPageChange(i)}>
              {i + 1}
            </button>
          </li>
        );
      }
      return items;
    }
    
    // For many pages, use smart pagination with ellipsis
    
    // Always show first boundary pages
    for (let i = 0; i < boundaryCount; i++) {
      if (i < totalPages) {
        items.push(
          <li className={currentPage === i ? "page-item active" : "page-item"} key={`page-${i}`}>
            <button className="page-link" onClick={() => onPageChange(i)}>
              {i + 1}
            </button>
          </li>
        );
      }
    }
    
    // Calculate where to show ellipsis and which middle pages to show
    const startPage = Math.max(boundaryCount, currentPage - siblingCount);
    const endPage = Math.min(totalPages - boundaryCount - 1, currentPage + siblingCount);
    
    // Add left ellipsis if needed
    if (showEllipsis && startPage > boundaryCount) {
      items.push(
        <li className="page-item disabled" key="ellipsis-left">
          <span className="page-link">...</span>
        </li>
      );
    }
    
    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      if (i >= boundaryCount && i < totalPages - boundaryCount) {
        items.push(
          <li className={currentPage === i ? "page-item active" : "page-item"} key={`page-${i}`}>
            <button className="page-link" onClick={() => onPageChange(i)}>
              {i + 1}
            </button>
          </li>
        );
      }
    }
    
    // Add right ellipsis if needed
    if (showEllipsis && endPage < totalPages - boundaryCount - 1) {
      items.push(
        <li className="page-item disabled" key="ellipsis-right">
          <span className="page-link">...</span>
        </li>
      );
    }
    
    // Always show last boundary pages
    for (let i = Math.max(boundaryCount, totalPages - boundaryCount); i < totalPages; i++) {
      items.push(
        <li className={currentPage === i ? "page-item active" : "page-item"} key={`page-${i}`}>
          <button className="page-link" onClick={() => onPageChange(i)}>
            {i + 1}
          </button>
        </li>
      );
    }
    
    return items;
  };

  const sizeClass = size === "sm" ? "pagination-sm" : size === "lg" ? "pagination-lg" : "";

  return (
    <nav aria-label="Pagination" className={className}>
      <ul className={`pagination ${sizeClass}`}>
        <li className={currentPage === 0 ? "page-item disabled" : "page-item"}>
          <button 
            className="page-link" 
            onClick={handlePrevious} 
            aria-label="Previous"
            disabled={currentPage === 0}
          >
            {prevLabel}
          </button>
        </li>
        
        {renderPaginationItems()}
        
        <li className={currentPage >= totalPages - 1 ? "page-item disabled" : "page-item"}>
          <button 
            className="page-link" 
            onClick={handleNext} 
            aria-label="Next"
            disabled={currentPage >= totalPages - 1}
          >
            {nextLabel}
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;

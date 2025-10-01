import React from 'react';
import { useNavigate } from 'react-router-dom';

const Breadcrumb = ({ farmId, items = [] }) => {
  const navigate = useNavigate();

  // Default breadcrumb structure for farm pages
  const defaultItems = [
    {
      label: 'Farm Management',
      onClick: () => navigate(farmId ? `/farm/${farmId}/dashboard` : '/dashboard'),
      isClickable: true
    }
  ];

  // Combine default items with provided items
  const allItems = [...defaultItems, ...items];

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
      {/* Home icon */}
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>

      {allItems.map((item, index) => (
        <React.Fragment key={index}>
          {item.isClickable ? (
            <button
              onClick={item.onClick}
              className="hover:text-green-600 transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ) : (
            <span className={item.isActive ? "text-green-600 font-medium" : ""}>
              {item.label}
            </span>
          )}

          {/* Arrow separator - don't show after last item */}
          {index < allItems.length - 1 && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
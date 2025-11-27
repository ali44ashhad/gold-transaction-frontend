import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  onClear,
}) => {
  const handleChange = (event) => {
    onChange?.(event.target.value);
  };

  const handleClear = () => {
    onChange?.('');
    onClear?.();
  };

  return (
    <div
      className={cn(
        'relative flex items-center rounded-lg border border-slate-200 bg-white pl-3 pr-2 py-2 shadow-sm',
        className
      )}
      title={placeholder}
    >
      <Search className="w-4 h-4 text-slate-400 mr-2" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        title={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;


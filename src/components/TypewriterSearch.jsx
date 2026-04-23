import React from 'react';
import { Search } from 'lucide-react';

const TypewriterSearch = ({ onSearchClick }) => (
  <button
    type="button"
    className="w-full bg-black/30 px-4 py-3 text-left backdrop-blur-sm"
    onClick={onSearchClick}
    aria-label="Open search"
  >
    <span className="relative flex h-12 w-full items-center border border-white px-4">
      <Search className="mr-3 h-5 w-5 text-white" />
      <span className="text-base font-light text-white sm:text-lg">
        Search by party, office, college, or date wear
      </span>
    </span>
  </button>
);

export default TypewriterSearch;

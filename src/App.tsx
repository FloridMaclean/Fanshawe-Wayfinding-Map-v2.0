import React from 'react';
import { MappedinMap } from './components/Map/MappedinMap';
import { SearchPanel } from './components/UI/SearchPanel';
import { Footer } from './components/UI/Footer';

export const App: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Map view container */}
      <main className="relative flex-1 w-full h-full overflow-hidden flex flex-col">
        <SearchPanel />
        <MappedinMap />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;

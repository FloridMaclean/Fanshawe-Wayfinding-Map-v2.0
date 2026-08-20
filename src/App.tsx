import React from 'react';
import { MappedinMap } from './components/Map/MappedinMap';
import { SearchPanel } from './components/UI/SearchPanel';
import { Footer } from './components/UI/Footer';
import { QRCodeModal } from './components/UI/QRCodeModal';

export const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-50">
      {/* Map view container taking full viewport */}
      <main className="relative w-full h-full overflow-hidden">
        <MappedinMap />
        <SearchPanel />
      </main>

      {/* Footer */}
      <Footer />

      {/* Global QR Code Centered Overlay Modal */}
      <QRCodeModal />
    </div>
  );
};

export default App;


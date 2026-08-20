import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useMapStore } from '../../store/useMapStore';
import { ClearIcon } from './Icons';

export const QRCodeModal: React.FC = () => {
  const { qrModalUrl, closeQrModal } = useMapStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeQrModal();
      }
    };
    if (qrModalUrl) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [qrModalUrl, closeQrModal]);

  if (!qrModalUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={closeQrModal}
    >
      {/* Modal Card */}
      <div
        className="relative bg-white rounded-[28px] p-8 sm:p-9 max-w-xs sm:max-w-[340px] w-full shadow-2xl flex flex-col items-center justify-center text-center border border-gray-100/90 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeQrModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition cursor-pointer"
          title="Close QR code"
          aria-label="Close QR code"
        >
          <ClearIcon className="w-4 h-4" />
        </button>

        {/* QR Code Container */}
        <div className="p-2 bg-white rounded-2xl flex items-center justify-center mt-2">
          <QRCodeSVG
            value={qrModalUrl}
            size={200}
            level="H"
            includeMargin={false}
            imageSettings={{
              src: 'https://www.fanshawec.ca/themes/custom/de_theme/logo.png',
              x: undefined,
              y: undefined,
              height: 32,
              width: 32,
              excavate: true,
            }}
          />
        </div>

        {/* Caption */}
        <p className="text-sm font-normal text-gray-600 mt-6 text-center leading-relaxed">
          Scan to explore the map on your phone
        </p>
      </div>
    </div>
  );
};

export default QRCodeModal;

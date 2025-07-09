import React from 'react';
import { useContext } from 'react';

// Create the context
const AquilaContext = React.createContext();

// Custom hook to use the context
export const useAquila = () => {
  const context = useContext(AquilaContext);
  if (!context) {
    throw new Error('useAquila must be used within an AquilaProvider');
  }
  return context;
};

export default AquilaContext;
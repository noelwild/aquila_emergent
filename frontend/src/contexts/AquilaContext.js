import React, { createContext, useContext } from 'react';

// Create the context
const AquilaContext = createContext();

// Custom hook to use the context
export const useAquila = () => {
  const context = useContext(AquilaContext);
  if (!context) {
    throw new Error('useAquila must be used within an AquilaProvider');
  }
  return context;
};

export default AquilaContext;
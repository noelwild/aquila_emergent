import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PublishModal from '../PublishModal';
import AquilaContext from '../../contexts/AquilaContext';

const renderWithContext = (ui, contextValue) => {
  return render(
    <AquilaContext.Provider value={contextValue}>{ui}</AquilaContext.Provider>
  );
};

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ message: 'ok', package: '/tmp/test.zip' }),
});

test('calls backend when publishing', async () => {
  renderWithContext(
    <PublishModal onClose={() => {}} pmCode="PM1" />,
    { dataModules: [], icns: [] }
  );
  const buttons = screen.getAllByText(/Publish Package/i);
  fireEvent.click(buttons[buttons.length - 1]);
  expect(fetch).toHaveBeenCalled();
});

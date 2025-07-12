import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DataModuleViewer from '../DataModuleViewer';
import AquilaContext from '../../contexts/AquilaContext';

const renderWithContext = (ui, contextValue) => {
  return render(
    <AquilaContext.Provider value={contextValue}>{ui}</AquilaContext.Provider>
  );
};

const sampleModule = {
  dmc: 'DMC-TEST-0001',
  title: 'Test Module',
  dm_type: 'GEN',
  info_variant: '00',
  content: 'Hello',
  html_content: '',
  updated_at: new Date().toISOString(),
  validation_status: 'green',
  ste_score: 0.9,
};

test('shows placeholder when no module selected', () => {
  renderWithContext(<DataModuleViewer dataModule={null} variant="verbatim" />, {
    updateDataModule: jest.fn(),
  });
  expect(screen.getByText(/No data module selected/i)).toBeInTheDocument();
});

test('allows editing and saving content', async () => {
  const updateMock = jest.fn().mockResolvedValue({});
  renderWithContext(
    <DataModuleViewer dataModule={{ ...sampleModule }} variant="verbatim" />,
    { updateDataModule: updateMock }
  );
  fireEvent.click(screen.getByText(/Edit/i));
  fireEvent.change(screen.getByPlaceholderText(/Enter data module content/i), {
    target: { value: 'Updated' },
  });
  fireEvent.click(screen.getByText('Save'));
  expect(updateMock).toHaveBeenCalledWith(sampleModule.dmc, expect.any(Object));
});

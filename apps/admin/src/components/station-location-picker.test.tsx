import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  placesAutocomplete: vi.fn(),
  placeDetails: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: apiMock,
  ApiError: class ApiError extends Error {},
}));
vi.mock('../lib/demo-mode', () => ({ DEMO_OFFLINE: false }));

import { StationLocationPicker } from './station-location-picker';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function renderPicker(onPick = vi.fn()) {
  render(createElement(StationLocationPicker, { lat: '', lng: '', onPick }));
  return { onPick, input: screen.getByLabelText('Tìm vị trí theo địa chỉ') };
}

test('does not call the backend for fewer than 3 characters', async () => {
  const { input } = renderPicker();
  fireEvent.change(input, { target: { value: '22' } });
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(apiMock.placesAutocomplete).not.toHaveBeenCalled();
});

test('searches once after the admin stops typing for 300 ms, then picks the coordinates', async () => {
  apiMock.placesAutocomplete.mockResolvedValue([
    { place_id: 'place-1', text: '22 Hàng Bạc, Hoàn Kiếm, Hà Nội', main_text: '22 Hàng Bạc', secondary_text: 'Hoàn Kiếm, Hà Nội' },
  ]);
  apiMock.placeDetails.mockResolvedValue({ place_id: 'place-1', address: '22 Hàng Bạc', lat: 21.0341, lng: 105.8522 });
  const { input, onPick } = renderPicker();

  fireEvent.change(input, { target: { value: '22 H' } });
  fireEvent.change(input, { target: { value: '22 Hàng' } });
  await act(async () => { vi.advanceTimersByTime(299); });
  expect(apiMock.placesAutocomplete).not.toHaveBeenCalled();
  await act(async () => { vi.advanceTimersByTime(1); });
  expect(apiMock.placesAutocomplete).toHaveBeenCalledTimes(1);
  const [query, sessionToken] = apiMock.placesAutocomplete.mock.calls[0];
  expect(query).toBe('22 Hàng');
  vi.useRealTimers();

  fireEvent.click(await screen.findByRole('button', { name: /22 Hàng Bạc/ }));
  await waitFor(() => expect(onPick).toHaveBeenCalledWith({ lat: 21.0341, lng: 105.8522 }));
  expect(apiMock.placeDetails).toHaveBeenCalledWith('place-1', sessionToken);
});

test('shows the backend message so the admin knows to type coordinates by hand', async () => {
  apiMock.placesAutocomplete.mockRejectedValue(new Error('Chưa tìm được địa chỉ lúc này. Hãy nhập vĩ độ, kinh độ bằng tay.'));
  const { input } = renderPicker();
  fireEvent.change(input, { target: { value: '22 Hàng Bạc' } });
  await act(async () => { vi.advanceTimersByTime(300); });
  vi.useRealTimers();
  expect(await screen.findByRole('alert')).toHaveTextContent('nhập vĩ độ, kinh độ bằng tay');
});

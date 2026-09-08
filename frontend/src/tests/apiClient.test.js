import { describe, it, expect, vi } from 'vitest';
import api from '../api/client';

describe('api client', () => {
  it('sends GET with auth header when token present', async () => {
    localStorage.setItem('token', 'tok123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: [] }),
    });
    global.fetch = fetchMock;

    await api.get('/expenses');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/expenses');
    expect(opts.headers.Authorization).toBe('Bearer tok123');
    localStorage.removeItem('token');
  });

  it('throws normalized error message', async () => {
    localStorage.removeItem('token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: { message: 'Invalid or expired token' } }),
    });
    global.fetch = fetchMock;

    await expect(api.get('/expenses')).rejects.toThrow('Invalid or expired token');
  });

  it('posts JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { id: 1 } }),
    });
    global.fetch = fetchMock;

    await api.post('/expenses', { amount: 5 });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(JSON.stringify({ amount: 5 }));
  });
});

import { AiEstimatorService } from '../../src/modules/ai-estimator/services/ai-estimator.service';
import { env } from '../../src/config/env';
import { ServiceUnavailableError } from '../../src/shared/errors/app-error';

describe('AiEstimatorService Unit Tests', () => {
  let service: AiEstimatorService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new AiEstimatorService();
    (env as any).FOOD_ANALYZER_ENABLED = true;
    (env as any).GEMINI_API_KEY = 'test-secret-api-key-12345';
    (env as any).GEMINI_MODEL = 'gemini-2.5-flash-lite';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('1 & 2: should send request with x-goog-api-key header and NOT append key to URL query params', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    estimates: [
                      {
                        foodItem: 'Rice',
                        quantity: 5,
                        unit: 'KG',
                        reasoning: 'Estimated for 50 people.',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    global.fetch = mockFetch;

    const result = await service.estimateQuantity({
      peopleCount: 50,
      foodItems: ['Rice'],
    });

    expect(result.estimates).toHaveLength(1);
    expect(result.estimates[0].foodItem).toBe('Rice');
    expect(result.estimates[0].quantity).toBe(5);
    expect(result.estimates[0].unit).toBe('KG');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    // Security Check: Key must NOT be in URL
    expect(url).not.toContain('test-secret-api-key-12345');
    expect(url).not.toContain('?key=');
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');

    // Security Check: Key MUST be in headers
    expect(options.headers['x-goog-api-key']).toBe('test-secret-api-key-12345');
    expect(options.headers['Content-Type']).toBe('application/json');

    // Schema Check: Structured response schema must be present
    const payload = JSON.parse(options.body);
    expect(payload.generationConfig.responseMimeType).toBe('application/json');
    expect(payload.generationConfig.responseSchema).toBeDefined();
  });

  it('4: should throw ServiceUnavailableError when FOOD_ANALYZER_ENABLED is false', async () => {
    (env as any).FOOD_ANALYZER_ENABLED = false;

    await expect(
      service.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] })
    ).rejects.toThrow(ServiceUnavailableError);
  });

  it('5: should throw ServiceUnavailableError when GEMINI_API_KEY is missing', async () => {
    (env as any).GEMINI_API_KEY = undefined;

    await expect(
      service.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] })
    ).rejects.toThrow(ServiceUnavailableError);
  });

  it('6 & 8: should handle Gemini HTTP 429/500 errors gracefully with AI_SERVICE_UNAVAILABLE', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
    });

    await expect(
      service.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] })
    ).rejects.toThrow('AI quantity estimation is temporarily unavailable. Please enter quantities manually.');
  });

  it('7: should handle request timeout via AbortController', async () => {
    (service as any).timeoutMs = 50;
    global.fetch = jest.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    const promise = service.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] });

    await expect(promise).rejects.toThrow(ServiceUnavailableError);
  });

  it('8: should reject malformed JSON or invalid Zod output', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"estimates": [{"foodItem": "Rice", "quantity": -5, "unit": "INVALID"}]}' }],
            },
          },
        ],
      }),
    });

    await expect(
      service.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] })
    ).rejects.toThrow(ServiceUnavailableError);
  });

  it('9: should never leak GEMINI_API_KEY in thrown error message or properties', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network connection error to API'));

    try {
      await service.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] });
      fail('Expected estimateQuantity to throw');
    } catch (err: any) {
      expect(err.message).not.toContain('test-secret-api-key-12345');
      expect(JSON.stringify(err)).not.toContain('test-secret-api-key-12345');
    }
  });
});

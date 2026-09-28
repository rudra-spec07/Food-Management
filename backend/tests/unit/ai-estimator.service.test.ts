import { AiEstimatorService } from '../../src/modules/ai-estimator/services/ai-estimator.service';
import { LocalFoodEstimatorService } from '../../src/modules/ai-estimator/services/local-food-estimator.service';
import { env } from '../../src/config/env';
import { ServiceUnavailableError } from '../../src/shared/errors/app-error';

describe('AiEstimatorService Unit Tests', () => {
  let service: AiEstimatorService;
  let localEstimator: LocalFoodEstimatorService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    localEstimator = new LocalFoodEstimatorService();
    (env as any).FOOD_ANALYZER_ENABLED = true;
    (env as any).GEMINI_API_KEY = 'test-secret-api-key-12345';
    (env as any).GEMINI_MODEL = 'gemini-2.5-flash-lite';
    service = new AiEstimatorService(localEstimator);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('1. Gemini success returns Gemini estimate with source GEMINI', async () => {
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
    expect(result.source).toBe('GEMINI');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    // Security Check: Key must NOT be in URL
    expect(url).not.toContain('test-secret-api-key-12345');
    expect(url).not.toContain('?key=');
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`);

    // Security Check: Key MUST be in headers
    expect(options.headers['x-goog-api-key']).toBe('test-secret-api-key-12345');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('2. Gemini 503 returns local fallback', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const result = await service.estimateQuantity({
      peopleCount: 50,
      foodItems: ['Rice'],
    });

    expect(result.source).toBe('LOCAL_FALLBACK');
    expect(result.estimates[0].quantity).toBe(10);
    expect(result.estimates[0].unit).toBe('KG');
  });

  it('3. Gemini 500 returns local fallback', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await service.estimateQuantity({
      peopleCount: 50,
      foodItems: ['Rice'],
    });

    expect(result.source).toBe('LOCAL_FALLBACK');
    expect(result.estimates[0].quantity).toBe(10);
  });

  it('4. Gemini timeout returns local fallback', async () => {
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

    const result = await service.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] });
    expect(result.source).toBe('LOCAL_FALLBACK');
    expect(result.estimates[0].quantity).toBe(10);
  });

  it('5. Gemini network failure returns local fallback', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const result = await service.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] });
    expect(result.source).toBe('LOCAL_FALLBACK');
    expect(result.estimates[0].quantity).toBe(10);
  });

  it('6. Missing Gemini API key returns local fallback', async () => {
    (env as any).GEMINI_API_KEY = undefined;

    const result = await service.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] });
    expect(result.source).toBe('LOCAL_FALLBACK');
    expect(result.estimates[0].quantity).toBe(10);
  });

  it('7. 50 people + Rice -> 10 KG', () => {
    const result = localEstimator.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] });
    expect(result.estimates[0]).toEqual({
      foodItem: 'Rice',
      quantity: 10,
      unit: 'KG',
      reasoning: expect.stringContaining('0.20 KG per person'),
    });
    expect(result.source).toBe('LOCAL_FALLBACK');
  });

  it('8. 50 people + Dal -> 5 KG', () => {
    const result = localEstimator.estimateQuantity({ peopleCount: 50, foodItems: ['Dal'] });
    expect(result.estimates[0]).toEqual({
      foodItem: 'Dal',
      quantity: 5,
      unit: 'KG',
      reasoning: expect.stringContaining('0.10 KG per person'),
    });
  });

  it('9. 50 people + Vegetable Curry -> 7.5 KG', () => {
    const result = localEstimator.estimateQuantity({ peopleCount: 50, foodItems: ['Vegetable Curry'] });
    expect(result.estimates[0]).toEqual({
      foodItem: 'Vegetable Curry',
      quantity: 7.5,
      unit: 'KG',
      reasoning: expect.stringContaining('0.15 KG per person'),
    });
  });

  it('10. 50 people + Roti -> 150 ITEMS', () => {
    const result = localEstimator.estimateQuantity({ peopleCount: 50, foodItems: ['Roti'] });
    expect(result.estimates[0]).toEqual({
      foodItem: 'Roti',
      quantity: 150,
      unit: 'ITEMS',
      reasoning: expect.stringContaining('3 ITEMS per person'),
    });
  });

  it('11. Unknown food item -> 50 PORTIONS', () => {
    const result = localEstimator.estimateQuantity({ peopleCount: 50, foodItems: ['Mystery Dish'] });
    expect(result.estimates[0]).toEqual({
      foodItem: 'Mystery Dish',
      quantity: 50,
      unit: 'PORTIONS',
      reasoning: expect.stringContaining('1 PORTION per person'),
    });
  });

  it('12. Throws ServiceUnavailableError when FOOD_ANALYZER_ENABLED is false', async () => {
    (env as any).FOOD_ANALYZER_ENABLED = false;

    await expect(
      service.estimateQuantity({ peopleCount: 50, foodItems: ['Rice'] })
    ).rejects.toThrow(ServiceUnavailableError);
  });
});

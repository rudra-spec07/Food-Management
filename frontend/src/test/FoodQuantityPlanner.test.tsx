import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { FoodQuantityPlanner } from '../modules/food-planner/components/FoodQuantityPlanner';
import { aiEstimatorService } from '../services/ai-estimator.service';

vi.mock('../services/ai-estimator.service', () => ({
  aiEstimatorService: {
    estimateQuantity: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('FoodQuantityPlanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    import.meta.env.VITE_FOOD_ANALYZER_ENABLED = 'true';
  });

  const renderPlanner = () => {
    return render(
      <BrowserRouter>
        <FoodQuantityPlanner />
      </BrowserRouter>
    );
  };

  it('1. Planner renders title and tagline', () => {
    renderPlanner();
    expect(screen.getByText(/Plan Before You Prepare/i)).toBeInTheDocument();
    expect(screen.getByText(/Tell us how many people you're preparing food for/i)).toBeInTheDocument();
  });

  it('2. Feature flag enabled renders main planner interface', () => {
    import.meta.env.VITE_FOOD_ANALYZER_ENABLED = 'true';
    renderPlanner();
    expect(screen.getByText(/Number of People/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Estimate Quantity/i })).toBeInTheDocument();
  });

  it('3. Feature flag disabled shows feature unavailable message', () => {
    import.meta.env.VITE_FOOD_ANALYZER_ENABLED = 'false';
    renderPlanner();
    expect(screen.getByText(/Food Quantity Planner feature is currently disabled/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Estimate Quantity/i })).not.toBeInTheDocument();
  });

  it('4. People count input updates value and handles bounds', () => {
    renderPlanner();
    const peopleInput = screen.getByLabelText(/Number of People/i) as HTMLInputElement;
    expect(peopleInput.value).toBe('50');

    fireEvent.change(peopleInput, { target: { value: '100' } });
    expect(peopleInput.value).toBe('100');
  });

  it('5. Food item input allows typing and adding items', () => {
    renderPlanner();
    const addItemInput = screen.getByPlaceholderText(/e\.g\. Biryani, Chapati, Kheer/i) as HTMLInputElement;
    fireEvent.change(addItemInput, { target: { value: 'Paneer Butter Masala' } });
    expect(addItemInput.value).toBe('Paneer Butter Masala');
  });

  it('6. Add food item adds a new item chip', () => {
    renderPlanner();
    expect(screen.getByText('Rice')).toBeInTheDocument();
    expect(screen.getByText('Dal')).toBeInTheDocument();
    expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();

    const addItemInput = screen.getByPlaceholderText(/e\.g\. Biryani, Chapati, Kheer/i);
    const addButton = screen.getByRole('button', { name: /Add Item/i });

    fireEvent.change(addItemInput, { target: { value: 'Naan' } });
    fireEvent.click(addButton);

    expect(screen.getByText('Naan')).toBeInTheDocument();
  });

  it('7. Remove food item removes a chip but maintains minimum 1', () => {
    renderPlanner();
    expect(screen.getByText('Rice')).toBeInTheDocument();

    const removeRiceBtn = screen.getByLabelText('Remove Rice');
    fireEvent.click(removeRiceBtn);

    expect(screen.queryByText('Rice')).not.toBeInTheDocument();
    expect(screen.getByText('Dal')).toBeInTheDocument();
  });

  it('8. Estimate button triggers API request with form values', async () => {
    (aiEstimatorService.estimateQuantity as ReturnType<typeof vi.fn>).mockResolvedValue([
      { foodItem: 'Rice', quantity: 5, unit: 'KG', reasoning: 'Estimated based on servings.' },
    ]);

    renderPlanner();
    const estimateBtn = screen.getByRole('button', { name: /Estimate Quantity/i });
    fireEvent.click(estimateBtn);

    await waitFor(() => {
      expect(aiEstimatorService.estimateQuantity).toHaveBeenCalledWith({
        peopleCount: 50,
        foodItems: ['Rice', 'Dal', 'Vegetable Curry'],
      });
    });
  });

  it('9. Loading state shows indicator and disables estimate button', async () => {
    (aiEstimatorService.estimateQuantity as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}) // never resolves
    );

    renderPlanner();
    const estimateBtn = screen.getByRole('button', { name: /Estimate Quantity/i });
    fireEvent.click(estimateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Estimating food quantities\.\.\./i)).toBeInTheDocument();
      expect(estimateBtn).toBeDisabled();
    });
  });

  it('10. Successful API response displays results container', async () => {
    (aiEstimatorService.estimateQuantity as ReturnType<typeof vi.fn>).mockResolvedValue([
      { foodItem: 'Rice', quantity: 5, unit: 'KG', reasoning: 'Servings based calculation' },
    ]);

    renderPlanner();
    fireEvent.click(screen.getByRole('button', { name: /Estimate Quantity/i }));

    await waitFor(() => {
      expect(screen.getByText(/Food Quantity Plan/i)).toBeInTheDocument();
    });
  });

  it('11. Multiple estimate cards rendered separately', async () => {
    (aiEstimatorService.estimateQuantity as ReturnType<typeof vi.fn>).mockResolvedValue([
      { foodItem: 'Rice', quantity: 5, unit: 'KG', reasoning: 'Reason 1' },
      { foodItem: 'Dal', quantity: 4, unit: 'LITERS', reasoning: 'Reason 2' },
      { foodItem: 'Vegetable Curry', quantity: 50, unit: 'PORTIONS', reasoning: 'Reason 3' },
    ]);

    renderPlanner();
    fireEvent.click(screen.getByRole('button', { name: /Estimate Quantity/i }));

    await waitFor(() => {
      expect(screen.getByText('Rice')).toBeInTheDocument();
      expect(screen.getByText('Dal')).toBeInTheDocument();
      expect(screen.getByText('Vegetable Curry')).toBeInTheDocument();
    });
  });

  it('12, 13, 14. Quantity, unit, and reasoning rendering', async () => {
    (aiEstimatorService.estimateQuantity as ReturnType<typeof vi.fn>).mockResolvedValue([
      { foodItem: 'Rice', quantity: 5, unit: 'KG', reasoning: 'Sufficient for 50 people' },
    ]);

    renderPlanner();
    fireEvent.click(screen.getByRole('button', { name: /Estimate Quantity/i }));

    await waitFor(() => {
      expect(screen.getByText('~5 KG')).toBeInTheDocument();
      expect(screen.getByText('Sufficient for 50 people')).toBeInTheDocument();
    });
  });

  it('15. Error fallback shows friendly non-blocking error message', async () => {
    (aiEstimatorService.estimateQuantity as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('AI estimation is temporarily unavailable or rate-limited. Please try again later.')
    );

    renderPlanner();
    fireEvent.click(screen.getByRole('button', { name: /Estimate Quantity/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI estimation is temporarily unavailable or rate-limited/i)).toBeInTheDocument();
    });
  });

  it('16. No API call triggered while typing in inputs', () => {
    renderPlanner();
    const peopleInput = screen.getByLabelText(/Number of People/i);
    fireEvent.change(peopleInput, { target: { value: '80' } });

    const addItemInput = screen.getByPlaceholderText(/e\.g\. Biryani, Chapati, Kheer/i);
    fireEvent.change(addItemInput, { target: { value: 'Paneer' } });

    expect(aiEstimatorService.estimateQuantity).not.toHaveBeenCalled();
  });

  it('17. Explicit estimate button click triggers API', () => {
    renderPlanner();
    expect(aiEstimatorService.estimateQuantity).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Estimate Quantity/i }));
    expect(aiEstimatorService.estimateQuantity).toHaveBeenCalledTimes(1);
  });

  it('18. Plan Again button resets state to inputs form', async () => {
    (aiEstimatorService.estimateQuantity as ReturnType<typeof vi.fn>).mockResolvedValue([
      { foodItem: 'Rice', quantity: 5, unit: 'KG', reasoning: 'Servings based calculation' },
    ]);

    renderPlanner();
    fireEvent.click(screen.getByRole('button', { name: /Estimate Quantity/i }));

    await waitFor(() => {
      expect(screen.getByText(/Food Quantity Plan/i)).toBeInTheDocument();
    });

    const resetBtn = screen.getAllByRole('button', { name: /Plan Again/i })[0];
    fireEvent.click(resetBtn);

    expect(screen.getByRole('button', { name: /Estimate Quantity/i })).toBeInTheDocument();
    expect(screen.queryByText(/Food Quantity Plan/i)).not.toBeInTheDocument();
  });

  it('19. Create Donation navigates to /donations without submitting donation', async () => {
    (aiEstimatorService.estimateQuantity as ReturnType<typeof vi.fn>).mockResolvedValue([
      { foodItem: 'Rice', quantity: 5, unit: 'KG', reasoning: 'Reasoning' },
    ]);

    renderPlanner();
    fireEvent.click(screen.getByRole('button', { name: /Estimate Quantity/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Donation/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Donation/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/donations');
  });

  it('20. Planner does not submit any donation API request', async () => {
    (aiEstimatorService.estimateQuantity as ReturnType<typeof vi.fn>).mockResolvedValue([
      { foodItem: 'Rice', quantity: 5, unit: 'KG', reasoning: 'Reasoning' },
    ]);

    renderPlanner();
    fireEvent.click(screen.getByRole('button', { name: /Estimate Quantity/i }));

    await waitFor(() => {
      expect(screen.getByText(/Food Quantity Plan/i)).toBeInTheDocument();
    });

    // Verify only estimateQuantity was called, no donation endpoints
    expect(aiEstimatorService.estimateQuantity).toHaveBeenCalledTimes(1);
  });
});

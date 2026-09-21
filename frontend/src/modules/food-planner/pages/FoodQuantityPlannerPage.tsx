import React from 'react';
import { FoodQuantityPlanner } from '../components/FoodQuantityPlanner';

export const FoodQuantityPlannerPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <FoodQuantityPlanner />
    </div>
  );
};

export default FoodQuantityPlannerPage;

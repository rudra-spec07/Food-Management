import { DonationQuantityUnit } from '@prisma/client';
import { AiEstimateItemDto, AiEstimateRequestDto, AiEstimateResponseDto } from '../dto/ai-estimator.dto';

export class LocalFoodEstimatorService {
  public estimateQuantity(dto: AiEstimateRequestDto): AiEstimateResponseDto {
    const { peopleCount, foodItems } = dto;

    const estimates: AiEstimateItemDto[] = foodItems.map((item) => {
      const normalized = item.trim().toLowerCase();
      let quantity = 1;
      let unit: DonationQuantityUnit = DonationQuantityUnit.PORTIONS;
      let rateDesc = '1 PORTION per person';

      if (normalized.includes('rice')) {
        // Rice: 0.20 KG/person
        quantity = Math.round(peopleCount * 0.20 * 100) / 100;
        unit = DonationQuantityUnit.KG;
        rateDesc = '0.20 KG per person';
      } else if (normalized.includes('dal')) {
        // Dal: 0.10 KG/person
        quantity = Math.round(peopleCount * 0.10 * 100) / 100;
        unit = DonationQuantityUnit.KG;
        rateDesc = '0.10 KG per person';
      } else if (
        normalized.includes('roti') ||
        normalized.includes('chapati') ||
        normalized.includes('phulka') ||
        normalized.includes('naan') ||
        normalized.includes('paratha')
      ) {
        // Roti / Chapati: 3 ITEMS/person
        quantity = Math.round(peopleCount * 3);
        unit = DonationQuantityUnit.ITEMS;
        rateDesc = '3 ITEMS per person';
      } else if (
        normalized.includes('bread') ||
        normalized.includes('pav') ||
        normalized.includes('bun')
      ) {
        // Bread: 3 ITEMS/person
        quantity = Math.round(peopleCount * 3);
        unit = DonationQuantityUnit.ITEMS;
        rateDesc = '3 ITEMS per person';
      } else if (normalized.includes('milk')) {
        // Milk: 0.25 LITERS/person
        quantity = Math.round(peopleCount * 0.25 * 100) / 100;
        unit = DonationQuantityUnit.LITERS;
        rateDesc = '0.25 LITERS per person';
      } else if (normalized.includes('juice')) {
        // Juice: 0.25 LITERS/person
        quantity = Math.round(peopleCount * 0.25 * 100) / 100;
        unit = DonationQuantityUnit.LITERS;
        rateDesc = '0.25 LITERS per person';
      } else if (normalized.includes('water')) {
        // Water: 0.50 LITERS/person
        quantity = Math.round(peopleCount * 0.50 * 100) / 100;
        unit = DonationQuantityUnit.LITERS;
        rateDesc = '0.50 LITERS per person';
      } else if (
        normalized.includes('curry') ||
        normalized.includes('vegetable') ||
        normalized.includes('sabzi') ||
        normalized.includes('subzi') ||
        normalized.includes('veg')
      ) {
        // Vegetable curry / Vegetables / Sabzi: 0.15 KG/person
        quantity = Math.round(peopleCount * 0.15 * 100) / 100;
        unit = DonationQuantityUnit.KG;
        rateDesc = '0.15 KG per person';
      } else {
        // Unknown food item: 1 PORTION/person
        quantity = Math.round(peopleCount * 1);
        unit = DonationQuantityUnit.PORTIONS;
        rateDesc = '1 PORTION per person';
      }

      return {
        foodItem: item,
        quantity,
        unit,
        reasoning: `Deterministic local estimate: ${rateDesc} for ${peopleCount} people.`,
      };
    });

    return {
      estimates,
      source: 'LOCAL_FALLBACK',
    };
  }
}

// /04-core-code/services/calculation-service.spec.js

import { CalculationService } from './calculation-service.js';

// --- Mock Dependencies ---
const mockProductStrategy = {
    calculatePrice: jest.fn((item, priceMatrix) => {
        if (!item.width || !item.height) {
            return { price: null, error: 'Incomplete data.' };
        }
        if (item.width > 3000) {
            return { price: null, error: 'Width exceeds maximum.' };
        }
        return { price: item.width * 0.1 + item.height * 0.2 };
    })
};

const mockConfigManager = {
    getPriceMatrix: jest.fn(() => ({}))
};

// --- Test Suite ---
describe('CalculationService (Refactored)', () => {
    let calculationService;

    beforeEach(() => {
        calculationService = new CalculationService({
            productFactory: null,
            configManager: mockConfigManager
        });
        
        mockProductStrategy.calculatePrice.mockClear();
        mockConfigManager.getPriceMatrix.mockClear();
    });

    it('should correctly calculate and sum prices for valid items using the product strategy', () => {
        // [REFACTORED] Updated mock data to use new fabric type names 'B1', 'B2'
        const quoteData = {
            rollerBlindItems: [
                { width: 1000, height: 1000, fabricType: 'B1', linePrice: null },
                { width: 2000, height: 1500, fabricType: 'B1', linePrice: null },
                { width: null, height: null, fabricType: null, linePrice: null }
            ],
            summary: { 
                totalSum: 0,
                accessories: {
                    winder: { price: 30 },
                    motor: { price: 250 }
                }
            }
        };

        const { updatedQuoteData, firstError } = calculationService.calculateAndSum(quoteData, mockProductStrategy);

        expect(updatedQuoteData.summary.totalSum).toBe(1080);
        expect(updatedQuoteData.rollerBlindItems[0].linePrice).toBe(300);
        expect(updatedQuoteData.rollerBlindItems[1].linePrice).toBe(500);
        expect(firstError).toBeNull();
        expect(mockConfigManager.getPriceMatrix).toHaveBeenCalledTimes(2);
        expect(mockProductStrategy.calculatePrice).toHaveBeenCalledTimes(2);
    });

    it('should return the first error encountered and still sum valid items', () => {
        // [REFACTORED] Updated mock data to use new fabric type name 'B1'
        const quoteData = {
            rollerBlindItems: [
                { width: 1000, height: 1000, fabricType: 'B1', linePrice: null },
                { width: 4000, height: 1500, fabricType: 'B1', linePrice: null }, 
                { width: 2000, height: 2000, fabricType: 'B1', linePrice: null }
            ],
            summary: { totalSum: 0, accessories: {} }
        };

        const { updatedQuoteData, firstError } = calculationService.calculateAndSum(quoteData, mockProductStrategy);

        expect(updatedQuoteData.summary.totalSum).toBe(900);
        expect(updatedQuoteData.rollerBlindItems[0].linePrice).toBe(300);
        expect(updatedQuoteData.rollerBlindItems[1].linePrice).toBeNull();
        expect(updatedQuoteData.rollerBlindItems[2].linePrice).toBe(600);
        expect(firstError).not.toBeNull();
        expect(firstError.rowIndex).toBe(1);
        expect(firstError.message).toContain('Width exceeds maximum.');
    });
});
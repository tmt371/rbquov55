// /04-core-code/services/calculation-service.spec.js

import { CalculationService } from './calculation-service.js';

// --- Mock Dependencies ---
// [REFACTORED] The mock strategy now reflects a more complex role.
const mockProductStrategy = {
    calculatePrice: jest.fn((item, priceMatrix) => {
        if (!item.width || !item.height) {
            return { price: null, error: 'Incomplete data.' };
        }
        if (item.width > 3000) {
            return { price: null, error: 'Width exceeds maximum.' };
        }
        // A simplified pricing logic for testing the main calculation loop.
        return { price: item.width * 0.1 + item.height * 0.2 };
    }),
    // [REFACTORED] Mock the new accessory calculation methods that were moved to the strategy.
    calculateDualPrice: jest.fn(() => 10), // Mocked to return a fixed price
    calculateWinderPrice: jest.fn(() => 30),
    calculateMotorPrice: jest.fn(() => 250),
    calculateRemotePrice: jest.fn(() => 100),
    calculateChargerPrice: jest.fn(() => 50),
    calculateCordPrice: jest.fn(() => 15)
};

const mockConfigManager = {
    getPriceMatrix: jest.fn(() => ({})), // Returns a dummy matrix
    // [REFACTORED] The service no longer calls this directly for accessories.
    getAccessoryPrice: jest.fn() 
};

// --- Test Suite ---
describe('CalculationService (Refactored)', () => {
    let calculationService;

    beforeEach(() => {
        calculationService = new CalculationService({
            productFactory: null,
            configManager: mockConfigManager
        });
        
        // Clear history of all mock functions before each test
        Object.values(mockProductStrategy).forEach(mockFn => mockFn.mockClear());
        mockConfigManager.getPriceMatrix.mockClear();
    });
    
    // [REFACTORED] This test is still valid as the main loop logic hasn't changed.
    it('should correctly calculate and sum prices for valid items using the product strategy', () => {
        const quoteData = {
            rollerBlindItems: [
                { width: 1000, height: 1000, fabricType: 'BO', linePrice: null },
                { width: 2000, height: 1500, fabricType: 'BO', linePrice: null },
                { width: null, height: null, fabricType: null, linePrice: null }
            ],
            summary: { 
                totalSum: 0,
                // Simulate existing accessory prices
                accessories: {
                    winder: { price: 30 },
                    motor: { price: 250 }
                }
            }
        };

        const { updatedQuoteData, firstError } = calculationService.calculateAndSum(quoteData, mockProductStrategy);

        // Verify the total sum includes item prices and pre-existing accessory prices.
        // Item 1: 1000*0.1 + 1000*0.2 = 300
        // Item 2: 2000*0.1 + 1500*0.2 = 500
        // Accessories: 30 + 250 = 280
        // Total = 300 + 500 + 280 = 1080
        expect(updatedQuoteData.summary.totalSum).toBe(1080);

        // Verify individual line prices are set correctly.
        expect(updatedQuoteData.rollerBlindItems[0].linePrice).toBe(300);
        expect(updatedQuoteData.rollerBlindItems[1].linePrice).toBe(500);

        // Verify no error was returned.
        expect(firstError).toBeNull();

        // Verify the dependencies were called as expected.
        expect(mockConfigManager.getPriceMatrix).toHaveBeenCalledTimes(2);
        expect(mockProductStrategy.calculatePrice).toHaveBeenCalledTimes(2);
    });

    // [REFACTORED] This test is also still valid.
    it('should return the first error encountered and still sum valid items', () => {
        const quoteData = {
            rollerBlindItems: [
                { width: 1000, height: 1000, fabricType: 'BO', linePrice: null },
                { width: 4000, height: 1500, fabricType: 'BO', linePrice: null }, // This line will cause an error.
                { width: 2000, height: 2000, fabricType: 'BO', linePrice: null }  // This line should still be calculated.
            ],
            summary: { totalSum: 0, accessories: {} }
        };

        const { updatedQuoteData, firstError } = calculationService.calculateAndSum(quoteData, mockProductStrategy);

        // Verify the total sum only includes valid items.
        // Item 1: 1000*0.1 + 1000*0.2 = 300
        // Item 3: 2000*0.1 + 2000*0.2 = 600
        // Total = 300 + 600 = 900
        expect(updatedQuoteData.summary.totalSum).toBe(900);

        // Verify line prices. The error line should have a null price.
        expect(updatedQuoteData.rollerBlindItems[0].linePrice).toBe(300);
        expect(updatedQuoteData.rollerBlindItems[1].linePrice).toBeNull();
        expect(updatedQuoteData.rollerBlindItems[2].linePrice).toBe(600);

        // Verify the correct error was reported.
        expect(firstError).not.toBeNull();
        expect(firstError.rowIndex).toBe(1);
        expect(firstError.message).toContain('Width exceeds maximum.');
    });

    // [REMOVED] Tests for individual accessory calculations are no longer relevant here.
    // They should be part of the test suite for the strategy file (e.g., roller-blind-strategy.spec.js).
});
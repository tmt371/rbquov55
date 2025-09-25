// File: 04-core-code/services/quote-service.spec.js

import { QuoteService } from './quote-service.js';

// --- Mock Dependencies ---
const getMockInitialItem = () => ({
    itemId: 'item-1',
    // Phase 1
    width: null, height: null, fabricType: null, linePrice: null,
    // Phase 2
    location: '', fabric: '', color: '', over: '',
    oi: '', lr: '', sd: '', chain: null, winder: '', motor: ''
});

const mockProductStrategy = {
    getInitialItemData: () => ({ ...getMockInitialItem(), itemId: `item-${Date.now()}` })
};

const mockProductFactory = {
    getProductStrategy: () => mockProductStrategy
};

// [REFACTORED] Updated the mock config manager to provide the new type sequence for testing
const mockConfigManager = {
    getFabricTypeSequence: () => ['B1', 'B2', 'SN']
};

const getMockInitialState = () => ({
    quoteData: {
        rollerBlindItems: [{ ...getMockInitialItem() }],
        summary: { totalSum: 0 }
    }
});


// --- Test Suite ---
describe('QuoteService', () => {
    let quoteService;
    let mockInitialItem;

    beforeEach(() => {
        mockInitialItem = getMockInitialItem(); 
        quoteService = new QuoteService({
            initialState: getMockInitialState(),
            productFactory: mockProductFactory,
            configManager: mockConfigManager // Provide the mock config manager
        });
    });

    it('should initialize with a single empty row', () => {
        const items = quoteService.getItems();
        expect(items).toHaveLength(1);
        expect(items[0]).toEqual(expect.objectContaining({
            width: null, height: null, fabricType: null, location: ''
        }));
    });

    it('should insert a new row at the correct position', () => {
        quoteService.insertRow(0); 
        const items = quoteService.getItems();
        expect(items).toHaveLength(2);
        expect(items[1].itemId).not.toBe(items[0].itemId); 
    });

    it('should delete a row and maintain a single empty row at the end', () => {
        quoteService.updateItemValue(0, 'width', 1000); 
        quoteService.insertRow(0);
        quoteService.updateItemValue(1, 'width', 2000); 

        let items = quoteService.getItems();
        expect(items).toHaveLength(3); 

        quoteService.deleteRow(0); 
        items = quoteService.getItems();
        expect(items).toHaveLength(2); 
        expect(items[0].width).toBe(2000);
    });

    it('should clear the last row with data instead of deleting it', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        let items = quoteService.getItems();
        expect(items).toHaveLength(2); 
        
        quoteService.deleteRow(0);
        items = quoteService.getItems();
        expect(items).toHaveLength(1); 
        expect(items[0].width).toBeNull();
    });
    
    it('should ensure only one empty row exists at the end after updates', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        const items = quoteService.getItems();
        expect(items).toHaveLength(2); 

        quoteService.updateItemValue(1, 'width', 2000);
        expect(items).toHaveLength(3); 

        quoteService.deleteRow(1); 
        expect(items).toHaveLength(2);
    });

    // [REFACTORED] Test for cycleItemType now uses the mockConfigManager
    it('should cycle through fabric types based on the sequence from configManager', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        quoteService.updateItemValue(0, 'height', 1000);
        
        // Initial state is null, first cycle should be B1
        quoteService.cycleItemType(0);
        expect(quoteService.getItems()[0].fabricType).toBe('B1');

        // Second cycle should be B2
        quoteService.cycleItemType(0);
        expect(quoteService.getItems()[0].fabricType).toBe('B2');

        // Third cycle should be SN
        quoteService.cycleItemType(0);
        expect(quoteService.getItems()[0].fabricType).toBe('SN');

        // Fourth cycle should loop back to B1
        quoteService.cycleItemType(0);
        expect(quoteService.getItems()[0].fabricType).toBe('B1');
    });
});
// /04-core-code/services/calculation-service.js

/**
 * @fileoverview Service for handling all price and sum calculations.
 * Encapsulates the business logic for pricing items and handling errors.
 */
export class CalculationService {
    constructor({ productFactory, configManager }) {
        this.productFactory = productFactory;
        this.configManager = configManager;
        console.log("CalculationService Initialized.");
    }

    /**
     * Calculates line prices for all valid items and the total sum using a provided product strategy.
     * Skips items with errors and returns the first error found.
     * @param {object} quoteData The current quote data from QuoteService.
     * @param {object} productStrategy The specific product strategy to use for calculations.
     * @returns {{updatedQuoteData: object, firstError: object|null}}
     */
    calculateAndSum(quoteData, productStrategy) {
        if (!productStrategy) {
            console.error("CalculationService: productStrategy is required for calculateAndSum.");
            return { quoteData, firstError: { message: "Product strategy not provided." } };
        }

        const updatedQuoteData = JSON.parse(JSON.stringify(quoteData));
        const items = updatedQuoteData.rollerBlindItems; 
        let firstError = null;

        items.forEach((item, index) => {
            item.linePrice = null;
            if (item.width && item.height && item.fabricType) {
                const priceMatrix = this.configManager.getPriceMatrix(item.fabricType);
                const result = productStrategy.calculatePrice(item, priceMatrix);
                
                if (result.price !== null) {
                    item.linePrice = result.price;
                } else if (result.error && !firstError) {
                    const errorColumn = result.error.toLowerCase().includes('width') ? 'width' : 'height';
                    firstError = {
                        message: `Row ${index + 1}: ${result.error}`,
                        rowIndex: index,
                        column: errorColumn
                    };
                }
            }
        });

        const itemsTotal = items.reduce((sum, item) => sum + (item.linePrice || 0), 0);
        
        let accessoriesTotal = 0;
        if (updatedQuoteData.summary && updatedQuoteData.summary.accessories) {
            const acc = updatedQuoteData.summary.accessories;
            accessoriesTotal += acc.winder?.price || 0;
            accessoriesTotal += acc.motor?.price || 0;
            accessoriesTotal += acc.remote?.price || 0;
            accessoriesTotal += acc.charger?.price || 0;
            accessoriesTotal += acc.cord3m?.price || 0;
        }

        updatedQuoteData.summary.totalSum = itemsTotal + accessoriesTotal;

        return { updatedQuoteData, firstError };
    }

    calculateDualPrice(items) {
        const dualCount = items.filter(item => item.dual === 'D').length;
        const pricePerPair = 15;
        const totalPrice = Math.floor(dualCount / 2) * pricePerPair;
        return totalPrice;
    }

    // --- K5 Accessory Calculation Methods ---

    calculateWinderPrice(items) {
        const count = items.filter(item => item.winder === 'HD').length;
        const pricePerUnit = this.configManager.getAccessoryPrice('winderHD');
        return count * pricePerUnit;
    }

    calculateMotorPrice(items) {
        const count = items.filter(item => !!item.motor).length;
        const pricePerUnit = this.configManager.getAccessoryPrice('motorStandard');
        return count * pricePerUnit;
    }

    calculateRemotePrice(count) {
        const pricePerUnit = this.configManager.getAccessoryPrice('remoteStandard');
        return count * pricePerUnit;
    }

    calculateChargerPrice(count) {
        const pricePerUnit = this.configManager.getAccessoryPrice('chargerStandard');
        return count * pricePerUnit;
    }

    calculateCordPrice(count) {
        const pricePerUnit = this.configManager.getAccessoryPrice('cord3m');
        return count * pricePerUnit;
    }
}
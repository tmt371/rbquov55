// File: 04-core-code/strategies/roller-blind-strategy.js

/**
 * @fileoverview Contains all business logic specific to the Roller Blind product.
 * This includes price calculation, validation rules, etc.
 */

export class RollerBlindStrategy {
    constructor() {
        console.log("RollerBlindStrategy Initialized.");
    }

    /**
     * Calculates the price for a single roller blind item based on a price matrix.
     * This logic is migrated from the old price-calculator.js.
     * @param {object} item - The roller blind item containing width, height, and fabricType.
     * @param {object} priceMatrix - The price matrix for the given fabricType.
     * @returns {{price: number|null, error?: string}} - The result of the calculation.
     */
    calculatePrice(item, priceMatrix) {
        if (!item || !item.width || !item.height || !item.fabricType) {
            return { price: null, error: 'Incomplete item data.' };
        }
        if (!priceMatrix) {
            return { price: null, error: `Price matrix not found for fabric type: ${item.fabricType}` };
        }

        const widthIndex = priceMatrix.widths.findIndex(w => item.width <= w);
        const dropIndex = priceMatrix.drops.findIndex(d => item.height <= d);

        if (widthIndex === -1) {
            const errorMsg = `Width ${item.width} exceeds the maximum width in the price matrix.`;
            return { price: null, error: errorMsg };
        }
        if (dropIndex === -1) {
            const errorMsg = `Height ${item.height} exceeds the maximum height in the price matrix.`;
            return { price: null, error: errorMsg };
        }

        const price = priceMatrix.prices[dropIndex][widthIndex];
        
        return price !== undefined ? { price: price } : { price: null, error: 'Price not found for the given dimensions.' };
    }

    /**
     * Returns the validation rules specific to roller blinds.
     * This logic is migrated from the old state-manager.js.
     * @returns {object}
     */
    getValidationRules() {
        return {
            width: { min: 250, max: 3300, name: 'Width' },
            height: { min: 300, max: 3300, name: 'Height' }
        };
    }

    /**
     * Returns a new, empty item object for a roller blind.
     * @returns {object}
     */
    getInitialItemData() {
        return {
            itemId: `item-${Date.now()}`,
            // --- Phase 1 Fields ---
            width: null,
            height: null,
            fabricType: null,
            linePrice: null,
            // --- [NEW] Phase 2 Fields ---
            location: '',       // K1: 安裝處所
            fabric: '',         // K1: 布料名稱
            color: '',          // K1: 布料顏色
            over: '',           // K2: 正反捲 (O / '')
            oi: '',             // K2: 內外裝 (IN / OUT)
            lr: '',             // K2: 左右拉繩 (L / R)
            dual: '',           // K3: 雙層支架 (D / '')
            chain: null,        // K3: 拉繩長度 (mm)
            winder: '',         // K4: 強化捲軸器 (HD / '')
            motor: ''           // K4: 電動馬達 (B-motor / '')
        };
    }
}
// File: 04-core-code/services/quote-service.js

/**
 * @fileoverview Service for managing quote data.
 * Acts as the single source of truth for the quoteData state object.
 * It contains all the business logic for mutating the quote data.
 */

export class QuoteService {
    constructor({ initialState, productFactory }) {
        // 使用深拷貝確保 QuoteService 擁有獨立的、純淨的資料狀態
        this.quoteData = JSON.parse(JSON.stringify(initialState.quoteData));
        this.productFactory = productFactory;
        this.initialSummary = JSON.parse(JSON.stringify(initialState.quoteData.summary));


        const currentProduct = 'rollerBlind'; // 未來此值可由外部傳入
        this.productStrategy = this.productFactory.getProductStrategy(currentProduct);
        this.itemListName = `${currentProduct}Items`; // e.g., 'rollerBlindItems'

        console.log("QuoteService Initialized.");
    }

    getQuoteData() {
        return this.quoteData;
    }

    getItems() {
        return this.quoteData[this.itemListName];
    }
    
    _getItems() {
        return this.quoteData[this.itemListName];
    }

    insertRow(selectedIndex) {
        const items = this._getItems();
        const newItem = this.productStrategy.getInitialItemData();
        const newRowIndex = selectedIndex + 1;
        items.splice(newRowIndex, 0, newItem);
        return newRowIndex;
    }

    deleteRow(selectedIndex) {
        const items = this._getItems();
        const isLastRow = selectedIndex === items.length - 1;
        const item = items[selectedIndex];
        const isRowEmpty = !item.width && !item.height && !item.fabricType;

        if (isLastRow && !isRowEmpty) {
            this.clearRow(selectedIndex);
            return;
        }

        if (items.length === 1) {
            this.clearRow(selectedIndex);
            return;
        }

        items.splice(selectedIndex, 1);
    }

    clearRow(selectedIndex) {
        const itemToClear = this._getItems()[selectedIndex];
        if (itemToClear) {
            const newItem = this.productStrategy.getInitialItemData();
            // Preserve itemId, but clear all other fields
            newItem.itemId = itemToClear.itemId;
            this._getItems()[selectedIndex] = newItem;
        }
    }

    updateItemValue(rowIndex, column, value) {
        const targetItem = this._getItems()[rowIndex];
        if (!targetItem) return false;

        if (targetItem[column] !== value) {
            targetItem[column] = value;
            targetItem.linePrice = null;

            // Auto-set Winder if area exceeds threshold and motor is not set
            if ((column === 'width' || column === 'height') && targetItem.width && targetItem.height) {
                if ((targetItem.width * targetItem.height) > 4000000 && !targetItem.motor) {
                    targetItem.winder = 'HD';
                }
            }
            
            this.consolidateEmptyRows();
            return true;
        }
        return false;
    }
    
    updateItemProperty(rowIndex, property, value) {
        const item = this._getItems()[rowIndex];
        if (item && item[property] !== value) {
            item[property] = value;
            return true;
        }
        return false;
    }

    updateWinderMotorProperty(rowIndex, property, value) {
        const item = this._getItems()[rowIndex];
        if (!item) return false;

        if (item[property] !== value) {
            item[property] = value;
            // Mutex Logic: If a value is set, clear the other property
            if (value) {
                if (property === 'winder') item.motor = '';
                if (property === 'motor') item.winder = '';
            }
            return true;
        }
        return false;
    }
    
    updateAccessorySummary(data) {
        if (data && this.quoteData.summary.accessories) {
            Object.assign(this.quoteData.summary.accessories, data);
        }
    }
    
    cycleItemProperty(rowIndex, property, options) {
        const item = this._getItems()[rowIndex];
        if (!item) return false;

        const currentValue = item[property];
        const currentIndex = options.indexOf(currentValue);
        const nextIndex = (currentIndex + 1) % options.length;
        const nextValue = options[nextIndex];

        if (item[property] !== nextValue) {
            item[property] = nextValue;
            return true;
        }
        return false;
    }

    cycleK3Property(rowIndex, column) {
        const item = this._getItems()[rowIndex];
        if (!item) return false;

        const currentValue = item[column] || '';
        let nextValue = currentValue;

        switch (column) {
            case 'over':
                nextValue = (currentValue === '') ? 'O' : '';
                break;
            case 'oi':
                if (currentValue === '') nextValue = 'IN';
                else if (currentValue === 'IN') nextValue = 'OUT';
                else if (currentValue === 'OUT') nextValue = 'IN';
                break;
            case 'lr':
                if (currentValue === '') nextValue = 'L';
                else if (currentValue === 'L') nextValue = 'R';
                else if (currentValue === 'R') nextValue = 'L';
                break;
        }

        if (item[column] !== nextValue) {
            item[column] = nextValue;
            return true;
        }
        return false;
    }

    batchUpdateProperty(property, value) {
        const items = this._getItems();
        let changed = false;
        items.forEach(item => {
            if (item.width || item.height) {
                if (item[property] !== value) {
                    item[property] = value;
                    changed = true;
                }
            }
        });
        return changed;
    }
    
    batchUpdatePropertyByType(type, property, value) {
        const items = this._getItems();
        let changed = false;
        items.forEach((item, index) => {
            if (item.fabricType === type) {
                if (item[property] !== value) {
                    item[property] = value;
                    changed = true;
                }
            }
        });
        return changed;
    }

    batchUpdateLFProperties(rowIndexes, fabricName, fabricColor) {
        const items = this._getItems();
        const newFabricName = `L-Filter ${fabricName}`;
        let changed = false;

        for (const index of rowIndexes) {
            const item = items[index];
            if (item) {
                if (item.fabric !== newFabricName) {
                    item.fabric = newFabricName;
                    changed = true;
                }
                if (item.color !== fabricColor) {
                    item.color = fabricColor;
                    changed = true;
                }
            }
        }
        return changed;
    }
    
    removeLFProperties(rowIndexes) {
        const items = this._getItems();
        let changed = false;
        for (const index of rowIndexes) {
            const item = items[index];
            if (item) {
                if (item.fabric !== '') {
                    item.fabric = '';
                    changed = true;
                }
                if (item.color !== '') {
                    item.color = '';
                    changed = true;
                }
            }
        }
        return changed;
    }

    cycleItemType(rowIndex) {
        const item = this._getItems()[rowIndex];
        if (!item || (!item.width && !item.height)) return false;

        const TYPE_SEQUENCE = ['BO', 'BO1', 'SN'];
        const currentType = item.fabricType;
        const currentIndex = TYPE_SEQUENCE.indexOf(currentType);
        const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
        
        if (item.fabricType !== nextType) {
            item.fabricType = nextType;
            item.linePrice = null;
            return true;
        }
        return false;
    }

    reset() {
        const initialItem = this.productStrategy.getInitialItemData();
        this.quoteData[this.itemListName] = [initialItem];
        this.quoteData.summary = JSON.parse(JSON.stringify(this.initialSummary));
    }

    hasData() {
        const items = this._getItems();
        if (!items) return false;
        return items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
    }

    deleteMultipleRows(indexesToDelete) {
        const sortedIndexes = [...indexesToDelete].sort((a, b) => b - a);

        sortedIndexes.forEach(index => {
            this.deleteRow(index);
        });

        this.consolidateEmptyRows();
    }

    consolidateEmptyRows() {
        const items = this._getItems();
        
        while (items.length > 1) {
            const lastItem = items[items.length - 1];
            const secondLastItem = items[items.length - 2];
            const isLastItemEmpty = !lastItem.width && !lastItem.height && !lastItem.fabricType;
            const isSecondLastItemEmpty = !secondLastItem.width && !secondLastItem.height && !secondLastItem.fabricType;

            if (isLastItemEmpty && isSecondLastItemEmpty) {
                items.pop();
            } else {
                break;
            }
        }

        const lastItem = items[items.length - 1];
        if (!lastItem) return;
        const isLastItemEmpty = !lastItem.width && !lastItem.height && !lastItem.fabricType;
        if (!isLastItemEmpty) {
            const newItem = this.productStrategy.getInitialItemData();
            items.push(newItem);
        }
    }
}
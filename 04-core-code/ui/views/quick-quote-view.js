// File: 04-core-code/ui/views/quick-quote-view.js

/**
 * @fileoverview View module responsible for all logic related to the Quick Quote screen.
 */
export class QuickQuoteView {
    constructor({ quoteService, calculationService, focusService, fileService, uiService, eventAggregator, productFactory, publishStateChangeCallback }) {
        this.quoteService = quoteService;
        this.calculationService = calculationService;
        this.focusService = focusService;
        this.fileService = fileService;
        this.uiService = uiService;
        this.eventAggregator = eventAggregator;
        this.productFactory = productFactory;
        this.publish = publishStateChangeCallback;
        this.currentProduct = 'rollerBlind';
    }

    handleToggleMultiDeleteMode() {
        const isEnteringMode = this.uiService.toggleMultiDeleteMode();
        if (!isEnteringMode) {
            this.focusService.focusFirstEmptyCell('width');
        }
        this.publish();
    }

    handleSequenceCellClick({ rowIndex }) {
        if (this.uiService.getState().isMultiDeleteMode) {
            const items = this.quoteService.getItems();
            const item = items[rowIndex];
            const isLastRowEmpty = (rowIndex === items.length - 1) && (!item.width && !item.height);

            if (isLastRowEmpty) {
                this.eventAggregator.publish('showNotification', { message: "Cannot select the final empty row.", type: 'error' });
                return;
            }
            this.uiService.toggleMultiDeleteSelection(rowIndex);
        } else {
            this.uiService.toggleRowSelection(rowIndex);
        }
        this.publish();
    }

    handleDeleteRow() {
        const { isMultiDeleteMode, multiDeleteSelectedIndexes, selectedRowIndex } = this.uiService.getState();
        if (isMultiDeleteMode) {
            if (multiDeleteSelectedIndexes.size === 0) {
                this.eventAggregator.publish('showNotification', { message: 'Please select rows to delete.' });
                return;
            }
            this.quoteService.deleteMultipleRows(multiDeleteSelectedIndexes);
            this.uiService.toggleMultiDeleteMode();
            this.focusService.focusFirstEmptyCell('width');
        } else {
            if (selectedRowIndex === null) return;
            this.quoteService.deleteRow(selectedRowIndex);
            this.uiService.clearRowSelection();
            this.uiService.setSumOutdated(true);
            this.focusService.focusAfterDelete();
        }
        this.publish();
        this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
    }

    handleInsertRow() {
        const { selectedRowIndex } = this.uiService.getState();
        if (selectedRowIndex === null) return;
        const items = this.quoteService.getItems();
        const isLastRow = selectedRowIndex === items.length - 1;
        if (isLastRow) {
             this.eventAggregator.publish('showNotification', { message: "Cannot insert after the last row.", type: 'error' });
             return;
        }
        const nextItem = items[selectedRowIndex + 1];
        const isNextRowEmpty = !nextItem.width && !nextItem.height && !nextItem.fabricType;
        if (isNextRowEmpty) {
            this.eventAggregator.publish('showNotification', { message: "Cannot insert before an empty row.", type: 'error' });
            return;
        }
        const newRowIndex = this.quoteService.insertRow(selectedRowIndex);
        this.uiService.setActiveCell(newRowIndex, 'width');
        this.uiService.clearRowSelection();
        this.publish();
        this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
    }

    handleNumericKeyPress({ key }) { // [FIXED] Destructuring the data object
        if (!isNaN(parseInt(key))) {
            this.uiService.appendInputValue(key);
        } else if (key === 'DEL') {
            this.uiService.deleteLastInputChar();
        } else if (key === 'W' || key === 'H') {
            this.focusService.focusFirstEmptyCell(key === 'W' ? 'width' : 'height');
        } else if (key === 'ENT') {
            this._commitValue();
            return;
        }
        this.publish();
    }

    _commitValue() {
        const { inputValue, inputMode, activeCell } = this.uiService.getState();
        const value = inputValue === '' ? null : parseInt(inputValue, 10);
        const productStrategy = this.productFactory.getProductStrategy(this.currentProduct);
        const validationRules = productStrategy.getValidationRules();
        const rule = validationRules[inputMode];

        if (rule && value !== null && (isNaN(value) || value < rule.min || value > rule.max)) {
            this.eventAggregator.publish('showNotification', { message: `${rule.name} must be between ${rule.min} and ${rule.max}.`, type: 'error' });
            this.uiService.clearInputValue();
            this.publish();
            return;
        }
        const changed = this.quoteService.updateItemValue(activeCell.rowIndex, activeCell.column, value);
        if (changed) {
            this.uiService.setSumOutdated(true);
        }
        this.focusService.focusAfterCommit();
        this.publish();
    }

    handleSaveToFile() {
        const quoteData = this.quoteService.getQuoteData();
        const result = this.fileService.saveToJson(quoteData);
        const notificationType = result.success ? 'info' : 'error';
        this.eventAggregator.publish('showNotification', { message: result.message, type: notificationType });
    }

    handleExportCSV() {
        const quoteData = this.quoteService.getQuoteData();
        const result = this.fileService.exportToCsv(quoteData);
        const notificationType = result.success ? 'info' : 'error';
        this.eventAggregator.publish('showNotification', { message: result.message, type: notificationType });
    }
    
    handleReset(initialUIState) {
        if (window.confirm("This will clear all data. Are you sure?")) {
            this.quoteService.reset();
            this.uiService.reset(initialUIState); 
            this.publish();
            this.eventAggregator.publish('showNotification', { message: 'Quote has been reset.' });
        }
    }
    
    handleClearRow() {
        const { selectedRowIndex } = this.uiService.getState();
        if (selectedRowIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a row to clear.', type: 'error' });
            return;
        }
        this.focusService.focusAfterClear();
        this.quoteService.clearRow(selectedRowIndex);
        this.uiService.clearRowSelection();
        this.uiService.setSumOutdated(true);
        this.publish();
    }
    
    handleMoveActiveCell({ direction }) { // [FIXED] Destructuring the data object
        this.focusService.moveActiveCell(direction);
        this.publish();
    }
    
    handleTableCellClick({ rowIndex, column }) {
        const item = this.quoteService.getItems()[rowIndex];
        if (!item) return;
        this.uiService.clearRowSelection();
        if (column === 'width' || column === 'height') {
            this.uiService.setActiveCell(rowIndex, column);
            this.uiService.setInputValue(item[column]);
        } else if (column === 'TYPE') {
            this.uiService.setActiveCell(rowIndex, column);
            const changed = this.quoteService.cycleItemType(rowIndex);
            if(changed) {
                this.uiService.setSumOutdated(true);
            }
        }
        this.publish();
    }
    
    handleCycleType() {
        const items = this.quoteService.getItems();
        const eligibleItems = items.filter(item => item.width && item.height);
        if (eligibleItems.length === 0) return;
        const TYPE_SEQUENCE = ['BO', 'BO1', 'SN'];
        const firstType = eligibleItems[0].fabricType;
        const currentIndex = TYPE_SEQUENCE.indexOf(firstType);
        const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
        let changed = false;
        items.forEach(item => {
            if (item.width && item.height) {
                if (item.fabricType !== nextType) {
                   item.fabricType = nextType;
                   item.linePrice = null;
                   changed = true;
                }
            }
        });
        if (changed) {
            this.uiService.setSumOutdated(true);
            this.publish();
        }
    }

    handleCalculateAndSum() {
        const currentQuoteData = this.quoteService.getQuoteData();
        const productStrategy = this.productFactory.getProductStrategy(this.currentProduct);
        const { updatedQuoteData, firstError } = this.calculationService.calculateAndSum(currentQuoteData, productStrategy);

        this.quoteService.quoteData = updatedQuoteData;
        if (firstError) {
            this.uiService.setSumOutdated(true);
            this.publish();
            this.eventAggregator.publish('showNotification', { message: firstError.message, type: 'error' });
            this.uiService.setActiveCell(firstError.rowIndex, firstError.column);
        } else {
            this.uiService.setSumOutdated(false);
        }
        this.publish();
    }

    handleSaveThenLoad() {
        this.handleSaveToFile();
        this.eventAggregator.publish('triggerFileLoad');
    }
}
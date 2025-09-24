// File: 04-core-code/services/ui-service.js

/**
 * @fileoverview A dedicated service for managing all UI-related state.
 * Acts as the single source of truth for the UI state.
 */
export class UIService {
    constructor(initialUIState) {
        // Use a deep copy to ensure the service has its own state object.
        this.state = JSON.parse(JSON.stringify(initialUIState));
        
        // Initialize states not present in the initial config
        this.state.isMultiDeleteMode = false;
        this.state.multiDeleteSelectedIndexes = new Set();
        this.state.locationInputValue = '';
        this.state.targetCell = null;
        this.state.activeEditMode = null;
        
        this.state.lfSelectedRowIndexes = new Set();
        this.state.lfModifiedRowIndexes = new Set();

        this.state.k4ActiveMode = null; // 'dual', or 'chain'
        this.state.chainInputValue = '';
        this.state.k4DualPrice = null;

        this._initializeK5State();
        
        console.log("UIService Initialized.");
    }

    _initializeK5State() {
        this.state.k5ActiveMode = null;
        this.state.k5RemoteCount = 0;
        this.state.k5ChargerCount = 0;
        this.state.k5CordCount = 0;
        this.state.k5WinderTotalPrice = null;
        this.state.k5MotorTotalPrice = null;
        this.state.k5RemoteTotalPrice = null;
        this.state.k5ChargerTotalPrice = null;
        this.state.k5CordTotalPrice = null;
        this.state.k5GrandTotal = null;
        
        this.state.k5WinderSummaryValue = null;
        this.state.k5MotorSummaryValue = null;

        // [NEW] Add state for new K5 summary display boxes
        this.state.k5RemoteSummaryValue = null;
        this.state.k5ChargerSummaryValue = null;
        this.state.k5CordSummaryValue = null;
        this.state.k5AccessoriesTotalValue = null;
    }

    getState() {
        return this.state;
    }

    reset(initialUIState) {
        this.state = JSON.parse(JSON.stringify(initialUIState));
        this.state.isMultiDeleteMode = false;
        this.state.multiDeleteSelectedIndexes = new Set();
        this.state.locationInputValue = '';
        this.state.targetCell = null;
        this.state.activeEditMode = null;
        
        this.state.lfSelectedRowIndexes = new Set();
        this.state.lfModifiedRowIndexes = new Set();

        this.state.k4ActiveMode = null;
        this.state.chainInputValue = '';
        this.state.k4DualPrice = null;

        this._initializeK5State();
    }

    setActiveCell(rowIndex, column) {
        this.state.activeCell = { rowIndex, column };
        this.state.inputMode = column;
    }

    setInputValue(value) {
        this.state.inputValue = String(value || '');
    }

    appendInputValue(key) {
        this.state.inputValue += key;
    }

    deleteLastInputChar() {
        this.state.inputValue = this.state.inputValue.slice(0, -1);
    }

    clearInputValue() {
        this.state.inputValue = '';
    }

    toggleRowSelection(rowIndex) {
        this.state.selectedRowIndex = (this.state.selectedRowIndex === rowIndex) ? null : rowIndex;
    }

    clearRowSelection() {
        this.state.selectedRowIndex = null;
    }

    toggleMultiDeleteMode() {
        const isEnteringMode = !this.state.isMultiDeleteMode;
        this.state.isMultiDeleteMode = isEnteringMode;
        this.state.multiDeleteSelectedIndexes.clear();

        if (isEnteringMode && this.state.selectedRowIndex !== null) {
            this.state.multiDeleteSelectedIndexes.add(this.state.selectedRowIndex);
        }
        
        this.clearRowSelection();

        return isEnteringMode;
    }
    
    toggleMultiDeleteSelection(rowIndex) {
        if (this.state.multiDeleteSelectedIndexes.has(rowIndex)) {
            this.state.multiDeleteSelectedIndexes.delete(rowIndex);
        } else {
            this.state.multiDeleteSelectedIndexes.add(rowIndex);
        }
    }

    setSumOutdated(isOutdated) {
        this.state.isSumOutdated = isOutdated;
    }

    setCurrentView(viewName) {
        this.state.currentView = viewName;
    }

    setVisibleColumns(columns) {
        this.state.visibleColumns = columns;
    }
    
    setActiveTab(tabId) {
        this.state.activeTabId = tabId;
    }

    setLocationInputValue(value) {
        this.state.locationInputValue = value;
    }

    setTargetCell(cell) { // cell should be { rowIndex, column } or null
        this.state.targetCell = cell;
    }

    setActiveEditMode(mode) {
        this.state.activeEditMode = mode;
    }

    toggleLFSelection(rowIndex) {
        if (this.state.lfSelectedRowIndexes.has(rowIndex)) {
            this.state.lfSelectedRowIndexes.delete(rowIndex);
        } else {
            this.state.lfSelectedRowIndexes.add(rowIndex);
        }
    }

    clearLFSelection() {
        this.state.lfSelectedRowIndexes.clear();
    }

    addLFModifiedRows(rowIndexes) {
        for (const index of rowIndexes) {
            this.state.lfModifiedRowIndexes.add(index);
        }
    }

    removeLFModifiedRows(rowIndexes) {
        for (const index of rowIndexes) {
            this.state.lfModifiedRowIndexes.delete(index);
        }
    }
    
    hasLFModifiedRows() {
        return this.state.lfModifiedRowIndexes.size > 0;
    }

    // --- K4 State Management ---
    setK4ActiveMode(mode) {
        this.state.k4ActiveMode = mode;
    }

    setChainInputValue(value) {
        this.state.chainInputValue = String(value || '');
    }
    
    clearChainInputValue() {
        this.state.chainInputValue = '';
    }
    
    setK4DualPrice(price) {
        this.state.k4DualPrice = price;
    }

    // --- K5 State Management ---
    setK5ActiveMode(mode) {
        this.state.k5ActiveMode = mode;
    }
    
    setK5Count(accessory, count) {
        if (count < 0) return;
        switch(accessory) {
            case 'remote': this.state.k5RemoteCount = count; break;
            case 'charger': this.state.k5ChargerCount = count; break;
            case 'cord': this.state.k5CordCount = count; break;
        }
    }

    setK5TotalPrice(accessory, price) {
        switch(accessory) {
            case 'winder': this.state.k5WinderTotalPrice = price; break;
            case 'motor': this.state.k5MotorTotalPrice = price; break;
            case 'remote': this.state.k5RemoteTotalPrice = price; break;
            case 'charger': this.state.k5ChargerTotalPrice = price; break;
            case 'cord': this.state.k5CordTotalPrice = price; break;
        }
    }

    setK5GrandTotal(price) {
        this.state.k5GrandTotal = price;
    }

    setK5WinderSummaryValue(value) {
        this.state.k5WinderSummaryValue = value;
    }

    setK5MotorSummaryValue(value) {
        this.state.k5MotorSummaryValue = value;
    }

    // [NEW] Setters for the new K5 summary display values
    setK5RemoteSummaryValue(value) {
        this.state.k5RemoteSummaryValue = value;
    }

    setK5ChargerSummaryValue(value) {
        this.state.k5ChargerSummaryValue = value;
    }

    setK5CordSummaryValue(value) {
        this.state.k5CordSummaryValue = value;
    }

    setK5AccessoriesTotalValue(value) {
        this.state.k5AccessoriesTotalValue = value;
    }
}
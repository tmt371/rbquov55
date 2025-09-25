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

        // [REFACTORED] Renamed k4... state variables to reflect their 'Dual/Chain' functionality
        this.state.dualChainMode = null; // 'dual', or 'chain'
        this.state.dualChainInputValue = '';
        this.state.dualPrice = null;

        // [REFACTORED] Renamed k5... initialization to reflect its 'Drive/Accessory' functionality
        this._initializeDriveAccessoryState();
        
        console.log("UIService Initialized.");
    }

    // [REFACTORED] Renamed method from _initializeK5State
    _initializeDriveAccessoryState() {
        // [REFACTORED] Renamed all k5... state variables
        this.state.driveAccessoryMode = null;
        this.state.driveRemoteCount = 0;
        this.state.driveChargerCount = 0;
        this.state.driveCordCount = 0;
        this.state.driveWinderTotalPrice = null;
        this.state.driveMotorTotalPrice = null;
        this.state.driveRemoteTotalPrice = null;
        this.state.driveChargerTotalPrice = null;
        this.state.driveCordTotalPrice = null;
        this.state.driveGrandTotal = null;
        
        this.state.summaryWinderPrice = null;
        this.state.summaryMotorPrice = null;
        this.state.summaryRemotePrice = null;
        this.state.summaryChargerPrice = null;
        this.state.summaryCordPrice = null;
        this.state.summaryAccessoriesTotal = null;
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

        // [REFACTORED] Reset renamed state variables
        this.state.dualChainMode = null;
        this.state.dualChainInputValue = '';
        this.state.dualPrice = null;

        this._initializeDriveAccessoryState();
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

    // --- [REFACTORED] Dual/Chain Mode State Management ---
    setDualChainMode(mode) {
        this.state.dualChainMode = mode;
    }

    setDualChainInputValue(value) {
        this.state.dualChainInputValue = String(value || '');
    }
    
    clearDualChainInputValue() {
        this.state.dualChainInputValue = '';
    }
    
    setDualPrice(price) {
        this.state.dualPrice = price;
    }

    // --- [REFACTORED] Drive & Accessories State Management ---
    setDriveAccessoryMode(mode) {
        this.state.driveAccessoryMode = mode;
    }
    
    setDriveAccessoryCount(accessory, count) {
        if (count < 0) return;
        switch(accessory) {
            case 'remote': this.state.driveRemoteCount = count; break;
            case 'charger': this.state.driveChargerCount = count; break;
            case 'cord': this.state.driveCordCount = count; break;
        }
    }

    setDriveAccessoryTotalPrice(accessory, price) {
        switch(accessory) {
            case 'winder': this.state.driveWinderTotalPrice = price; break;
            case 'motor': this.state.driveMotorTotalPrice = price; break;
            case 'remote': this.state.driveRemoteTotalPrice = price; break;
            case 'charger': this.state.driveChargerTotalPrice = price; break;
            case 'cord': this.state.driveCordTotalPrice = price; break;
        }
    }

    setDriveGrandTotal(price) {
        this.state.driveGrandTotal = price;
    }

    setSummaryWinderPrice(value) {
        this.state.summaryWinderPrice = value;
    }

    setSummaryMotorPrice(value) {
        this.state.summaryMotorPrice = value;
    }

    setSummaryRemotePrice(value) {
        this.state.summaryRemotePrice = value;
    }

    setSummaryChargerPrice(value) {
        this.state.summaryChargerPrice = value;
    }

    setSummaryCordPrice(value) {
        this.state.summaryCordPrice = value;
    }

    setSummaryAccessoriesTotal(value) {
        this.state.summaryAccessoriesTotal = value;
    }
}
// File: 04-core-code/ui/views/dual-chain-view.js

/**
 * @fileoverview A dedicated sub-view for handling all logic related to the Dual/Chain tab.
 */
export class DualChainView {
    constructor({ quoteService, uiService, calculationService, eventAggregator, publishStateChangeCallback }) {
        this.quoteService = quoteService;
        this.uiService = uiService;
        this.calculationService = calculationService;
        this.eventAggregator = eventAggregator;
        this.publish = publishStateChangeCallback;
        console.log("DualChainView Initialized.");
    }

    /**
     * Handles the toggling of modes (dual, chain).
     * @param {object} data - The event data containing the mode.
     */
    handleModeChange({ mode }) {
        // [REFACTORED] Read the new semantic state 'dualChainMode'
        const currentMode = this.uiService.getState().dualChainMode;

        // --- Logic on EXITING a mode ---
        if (currentMode === 'dual') {
            const items = this.quoteService.getItems();
            const dualCount = items.filter(item => item.dual === 'D').length;
            if (dualCount % 2 !== 0) {
                this.eventAggregator.publish('showNotification', {
                    message: '雙層支架(D)的總數必須為偶數，請修正後再退出。',
                    type: 'error'
                });
                return;
            }
            const price = this.calculationService.calculateDualPrice(items);
            // [REFACTORED] Set the new semantic state 'dualPrice'
            this.uiService.setDualPrice(price);

            // [REFACTORED] Trigger total calculation on exiting dual mode
            this._updateSummaryAccessoriesTotal();
        }

        const newMode = currentMode === mode ? null : mode;
        // [REFACTORED] Set the new semantic state 'dualChainMode'
        this.uiService.setDualChainMode(newMode);

        // --- Logic on ENTERING a mode ---
        if (newMode === 'dual') {
            // [REFACTORED] Set the new semantic state 'dualPrice'
            this.uiService.setDualPrice(null);
        }
        
        if (!newMode) {
            this.uiService.setTargetCell(null);
            // [REFACTORED] Clear using new semantic method
            this.uiService.clearDualChainInputValue();
        }

        this.publish();
    }

    /**
     * Handles the Enter key press in the chain input box.
     * @param {object} data - The event data containing the value.
     */
    handleChainEnterPressed({ value }) {
        const { targetCell: currentTarget } = this.uiService.getState();
        if (!currentTarget) return;

        const valueAsNumber = Number(value);
        if (value !== '' && (!Number.isInteger(valueAsNumber) || valueAsNumber <= 0)) {
            this.eventAggregator.publish('showNotification', {
                message: '僅能輸入正整數。',
                type: 'error'
            });
            return;
        }

        const valueToSave = value === '' ? null : valueAsNumber;
        this.quoteService.updateItemProperty(currentTarget.rowIndex, currentTarget.column, valueToSave);
        
        this.uiService.setTargetCell(null);
        // [REFACTORED] Clear using new semantic method
        this.uiService.clearDualChainInputValue();
        this.publish();
    }

    /**
     * Handles clicks on table cells when a mode is active.
     * @param {object} data - The event data { rowIndex, column }.
     */
    handleTableCellClick({ rowIndex, column }) {
        // [REFACTORED] Read the new semantic state 'dualChainMode'
        const { dualChainMode } = this.uiService.getState();
        const item = this.quoteService.getItems()[rowIndex];
        if (!item) return;

        if (dualChainMode === 'dual' && column === 'dual') {
            const newValue = item.dual === 'D' ? '' : 'D';
            this.quoteService.updateItemProperty(rowIndex, 'dual', newValue);
            this.publish();
        }

        if (dualChainMode === 'chain' && column === 'chain') {
            this.uiService.setTargetCell({ rowIndex, column: 'chain' });
            // [REFACTORED] Set input value using new semantic method
            this.uiService.setDualChainInputValue(item.chain || '');
            this.publish();

            setTimeout(() => {
                const inputBox = document.getElementById('k4-input-display');
                inputBox?.focus();
                inputBox?.select();
            }, 50); 
        }
    }
    
    /**
     * This method is called by the main DetailConfigView when the K5 tab becomes active.
     */
    activate() {
        this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'location', 'dual', 'chain']);
        
        // Synchronize all summary data from Drive/Accessory state when this tab is activated
        const currentState = this.uiService.getState();
        // [REFACTORED] Read from new 'drive...' state and set new 'summary...' state
        this.uiService.setSummaryWinderPrice(currentState.driveWinderTotalPrice);
        this.uiService.setSummaryMotorPrice(currentState.driveMotorTotalPrice);
        this.uiService.setSummaryRemotePrice(currentState.driveRemoteTotalPrice);
        this.uiService.setSummaryChargerPrice(currentState.driveChargerTotalPrice);
        this.uiService.setSummaryCordPrice(currentState.driveCordTotalPrice);

        // [REFACTORED] Calculate the final total after syncing
        this._updateSummaryAccessoriesTotal();
    }

    /**
     * [REFACTORED] Renamed method and updated logic to use new semantic state.
     * Calculates the total of all accessories displayed on the K5 summary tab.
     * @private
     */
    _updateSummaryAccessoriesTotal() {
        const state = this.uiService.getState();
        
        // [REFACTORED] Read all values from the new semantic state variables
        const dualPrice = state.dualPrice || 0;
        const winderPrice = state.driveWinderTotalPrice || 0;
        const motorPrice = state.driveMotorTotalPrice || 0;
        const remotePrice = state.driveRemoteTotalPrice || 0;
        const chargerPrice = state.driveChargerTotalPrice || 0;
        const cordPrice = state.driveCordTotalPrice || 0;

        const total = dualPrice + winderPrice + motorPrice + remotePrice + chargerPrice + cordPrice;
        
        // [REFACTORED] Set the total using the new semantic method
        this.uiService.setSummaryAccessoriesTotal(total);
    }
}
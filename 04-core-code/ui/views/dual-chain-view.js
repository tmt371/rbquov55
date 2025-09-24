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
        const currentMode = this.uiService.getState().k4ActiveMode;

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
            this.uiService.setK4DualPrice(price);

            // [NEW] Trigger total calculation on exiting dual mode
            this._updateK5AccessoriesTotal();
        }

        const newMode = currentMode === mode ? null : mode;
        this.uiService.setK4ActiveMode(newMode);

        // --- Logic on ENTERING a mode ---
        if (newMode === 'dual') {
            this.uiService.setK4DualPrice(null);
        }
        
        if (!newMode) {
            this.uiService.setTargetCell(null);
            this.uiService.clearChainInputValue();
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
        this.uiService.clearChainInputValue();
        this.publish();
    }

    /**
     * Handles clicks on table cells when a mode is active.
     * @param {object} data - The event data { rowIndex, column }.
     */
    handleTableCellClick({ rowIndex, column }) {
        const { k4ActiveMode } = this.uiService.getState();
        const item = this.quoteService.getItems()[rowIndex];
        if (!item) return;

        if (k4ActiveMode === 'dual' && column === 'dual') {
            const newValue = item.dual === 'D' ? '' : 'D';
            this.quoteService.updateItemProperty(rowIndex, 'dual', newValue);
            this.publish();
        }

        if (k4ActiveMode === 'chain' && column === 'chain') {
            this.uiService.setTargetCell({ rowIndex, column: 'chain' });
            this.uiService.setChainInputValue(item.chain || '');
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
        
        // Synchronize all summary data from K4's state when this tab is activated
        const currentState = this.uiService.getState();
        this.uiService.setK5WinderSummaryValue(currentState.k5WinderTotalPrice);
        this.uiService.setK5MotorSummaryValue(currentState.k5MotorTotalPrice);
        this.uiService.setK5RemoteSummaryValue(currentState.k5RemoteTotalPrice);
        this.uiService.setK5ChargerSummaryValue(currentState.k5ChargerTotalPrice);
        this.uiService.setK5CordSummaryValue(currentState.k5CordTotalPrice);

        // [NEW] Calculate the final total after syncing
        this._updateK5AccessoriesTotal();
    }

    /**
     * [NEW] Calculates the total of all accessories displayed on the K5 tab.
     * @private
     */
    _updateK5AccessoriesTotal() {
        const state = this.uiService.getState();
        
        const dualPrice = state.k4DualPrice || 0;
        const winderPrice = state.k5WinderTotalPrice || 0;
        const motorPrice = state.k5MotorTotalPrice || 0;
        const remotePrice = state.k5RemoteTotalPrice || 0;
        const chargerPrice = state.k5ChargerTotalPrice || 0;
        const cordPrice = state.k5CordTotalPrice || 0;

        const total = dualPrice + winderPrice + motorPrice + remotePrice + chargerPrice + cordPrice;
        
        this.uiService.setK5AccessoriesTotalValue(total);
    }
}
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
     */
    handleModeChange({ mode }) {
        const currentMode = this.uiService.getState().dualChainMode;

        if (currentMode === 'dual') {
            const items = this.quoteService.getItems();
            const productType = this.quoteService.getCurrentProductType();
            const dualCount = items.filter(item => item.dual === 'D').length;

            if (dualCount % 2 !== 0) {
                this.eventAggregator.publish('showNotification', {
                    message: '雙層支架(D)的總數必須為偶數，請修正後再退出。',
                    type: 'error'
                });
                return;
            }
            
            // [REFACTORED] Use the new generic bridge method to get the price.
            const price = this.calculationService.calculateAccessoryPrice(productType, 'dual', { items });
            this.uiService.setDualPrice(price);

            this._updateSummaryAccessoriesTotal();
        }

        const newMode = currentMode === mode ? null : mode;
        this.uiService.setDualChainMode(newMode);

        if (newMode === 'dual') {
            this.uiService.setDualPrice(null);
        }
        
        if (!newMode) {
            this.uiService.setTargetCell(null);
            this.uiService.clearDualChainInputValue();
        }

        this.publish();
    }

    /**
     * Handles the Enter key press in the chain input box.
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
        this.uiService.clearDualChainInputValue();
        this.publish();
    }

    /**
     * Handles clicks on table cells when a mode is active.
     */
    handleTableCellClick({ rowIndex, column }) {
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
        
        const currentState = this.uiService.getState();
        this.uiService.setSummaryWinderPrice(currentState.driveWinderTotalPrice);
        this.uiService.setSummaryMotorPrice(currentState.driveMotorTotalPrice);
        this.uiService.setSummaryRemotePrice(currentState.driveRemoteTotalPrice);
        this.uiService.setSummaryChargerPrice(currentState.driveChargerTotalPrice);
        this.uiService.setSummaryCordPrice(currentState.driveCordTotalPrice);

        this._updateSummaryAccessoriesTotal();
    }

    /**
     * Calculates the total of all accessories displayed on the K5 summary tab.
     */
    _updateSummaryAccessoriesTotal() {
        const state = this.uiService.getState();
        
        const dualPrice = state.dualPrice || 0;
        const winderPrice = state.driveWinderTotalPrice || 0;
        const motorPrice = state.driveMotorTotalPrice || 0;
        const remotePrice = state.driveRemoteTotalPrice || 0;
        const chargerPrice = state.driveChargerTotalPrice || 0;
        const cordPrice = state.driveCordTotalPrice || 0;

        const total = dualPrice + winderPrice + motorPrice + remotePrice + chargerPrice + cordPrice;
        
        this.uiService.setSummaryAccessoriesTotal(total);
    }
}
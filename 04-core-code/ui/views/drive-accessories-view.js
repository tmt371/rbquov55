// File: 04-core-code/ui/views/drive-accessories-view.js

/**
 * @fileoverview A dedicated sub-view for handling all logic related to the Drive/Accessories tab.
 */
export class DriveAccessoriesView {
    constructor({ quoteService, uiService, calculationService, eventAggregator, publishStateChangeCallback }) {
        this.quoteService = quoteService;
        this.uiService = uiService;
        this.calculationService = calculationService;
        this.eventAggregator = eventAggregator;
        this.publish = publishStateChangeCallback;
        console.log("DriveAccessoriesView Initialized.");
    }

    activate() {
        this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'location', 'winder', 'motor']);
    }

    handleModeChange({ mode }) {
        const currentMode = this.uiService.getState().driveAccessoryMode;
        const newMode = currentMode === mode ? null : mode;

        if (currentMode) {
            this._recalculateAllDriveAccessoryPrices();
        }
        
        this.uiService.setDriveAccessoryMode(newMode);

        if (newMode) {
            const message = this._getHintMessage(newMode);
            this.eventAggregator.publish('showNotification', { message });

            const items = this.quoteService.getItems();
            const hasMotor = items.some(item => !!item.motor);
            if (hasMotor) {
                if (newMode === 'remote' && this.uiService.getState().driveRemoteCount === 0) {
                    this.uiService.setDriveAccessoryCount('remote', 1);
                }
                if (newMode === 'charger' && this.uiService.getState().driveChargerCount === 0) {
                    this.uiService.setDriveAccessoryCount('charger', 1);
                }
            }
        }

        this.publish();
    }

    handleTableCellClick({ rowIndex, column }) {
        const { driveAccessoryMode } = this.uiService.getState();
        if (!driveAccessoryMode || (column !== 'winder' && column !== 'motor')) return;

        const item = this.quoteService.getItems()[rowIndex];
        if (!item) return;

        const isActivatingWinder = driveAccessoryMode === 'winder' && column === 'winder';
        const isActivatingMotor = driveAccessoryMode === 'motor' && column === 'motor';

        if (isActivatingWinder) {
            if (item.motor) {
                this.eventAggregator.publish('showConfirmationDialog', {
                    message: '該捲簾已經設定為電動，確定要改為HD？',
                    buttons: [
                        { text: '確定', callback: () => this._toggleWinder(rowIndex, true) },
                        { text: '取消', className: 'secondary', callback: () => {} }
                    ]
                });
            } else {
                this._toggleWinder(rowIndex, false);
            }
        } else if (isActivatingMotor) {
            if (item.winder) {
                this.eventAggregator.publish('showConfirmationDialog', {
                    message: '該捲簾已經設定為HD，確定要改為電動？',
                    buttons: [
                        { text: '確定', callback: () => this._toggleMotor(rowIndex, true) },
                        { text: '取消', className: 'secondary', callback: () => {} }
                    ]
                });
            } else {
                this._toggleMotor(rowIndex, false);
            }
        }
    }
    
    handleCounterChange({ accessory, direction }) {
        const state = this.uiService.getState();
        const counts = {
            remote: state.driveRemoteCount,
            charger: state.driveChargerCount,
            cord: state.driveCordCount
        };
        let currentCount = counts[accessory];
        const newCount = direction === 'add' ? currentCount + 1 : Math.max(0, currentCount - 1);

        if (newCount === 0) {
            const items = this.quoteService.getItems();
            const hasMotor = items.some(item => !!item.motor);
            if (hasMotor && (accessory === 'remote' || accessory === 'charger')) {
                const accessoryName = accessory === 'remote' ? '遙控器' : '充電器';
                this.eventAggregator.publish('showConfirmationDialog', {
                    message: `系統偵測到有電動馬達，確定不要${accessoryName}？`,
                    buttons: [
                        { text: '確定不要', callback: () => {
                            this.uiService.setDriveAccessoryCount(accessory, 0);
                            this.publish();
                        }},
                        { text: '取消', className: 'secondary', callback: () => {} }
                    ]
                });
                return; 
            }
        }
        
        this.uiService.setDriveAccessoryCount(accessory, newCount);
        this.publish();
    }

    _toggleWinder(rowIndex, isConfirmed) {
        const item = this.quoteService.getItems()[rowIndex];
        const newValue = item.winder ? '' : 'HD';
        this.quoteService.updateWinderMotorProperty(rowIndex, 'winder', newValue);
        this.publish();
    }

    _toggleMotor(rowIndex, isConfirmed) {
        const item = this.quoteService.getItems()[rowIndex];
        const newValue = item.motor ? '' : 'Motor';
        this.quoteService.updateWinderMotorProperty(rowIndex, 'motor', newValue);
        this.publish();
    }
    
    _recalculateAllDriveAccessoryPrices() {
        const items = this.quoteService.getItems();
        const state = this.uiService.getState();
        const productType = this.quoteService.getCurrentProductType();
        const summaryData = {};
        let grandTotal = 0;

        // [REFACTORED] All calls now use the new generic bridge method on the calculation service.
        const winderPrice = this.calculationService.calculateAccessoryPrice(productType, 'winder', { items });
        const winderCount = items.filter(item => item.winder === 'HD').length;
        this.uiService.setDriveAccessoryTotalPrice('winder', winderPrice);
        summaryData.winder = { count: winderCount, price: winderPrice };
        grandTotal += winderPrice;

        const motorPrice = this.calculationService.calculateAccessoryPrice(productType, 'motor', { items });
        const motorCount = items.filter(item => !!item.motor).length;
        this.uiService.setDriveAccessoryTotalPrice('motor', motorPrice);
        summaryData.motor = { count: motorCount, price: motorPrice };
        grandTotal += motorPrice;
        
        const remoteCount = state.driveRemoteCount;
        const remotePrice = this.calculationService.calculateAccessoryPrice(productType, 'remote', { count: remoteCount });
        this.uiService.setDriveAccessoryTotalPrice('remote', remotePrice);
        summaryData.remote = { type: 'standard', count: remoteCount, price: remotePrice };
        grandTotal += remotePrice;

        const chargerCount = state.driveChargerCount;
        const chargerPrice = this.calculationService.calculateAccessoryPrice(productType, 'charger', { count: chargerCount });
        this.uiService.setDriveAccessoryTotalPrice('charger', chargerPrice);
        summaryData.charger = { count: chargerCount, price: chargerPrice };
        grandTotal += chargerPrice;

        const cordCount = state.driveCordCount;
        const cordPrice = this.calculationService.calculateAccessoryPrice(productType, 'cord', { count: cordCount });
        this.uiService.setDriveAccessoryTotalPrice('cord', cordPrice);
        summaryData.cord3m = { count: cordCount, price: cordPrice };
        grandTotal += cordPrice;

        this.uiService.setDriveGrandTotal(grandTotal);
        this.quoteService.updateAccessorySummary(summaryData);
    }

    _getHintMessage(mode) {
        const hints = {
            winder: '請點擊第二表 Winder 欄位下的儲存格以設定 HD。',
            motor: '請點擊第二表 Motor 欄位下的儲存格以設定 Motor。',
            remote: '請點擊 + 或 - 來增加或減少遙控器的數量。',
            charger: '請點擊 + 或 - 來增加或減少充電器的數量。',
            cord: '請點擊 + 或 - 來增加或減少延長線的數量。'
        };
        return hints[mode] || '請進行您的設定。';
    }
}
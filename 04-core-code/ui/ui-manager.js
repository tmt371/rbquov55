// File: 04-core-code/ui/ui-manager.js

import { TableComponent } from './table-component.js';
import { SummaryComponent } from './summary-component.js';
import { PanelComponent } from './panel-component.js';
import { NotificationComponent } from './notification-component.js';
import { DialogComponent } from './dialog-component.js';
import { LeftPanelComponent } from './left-panel-component.js';

export class UIManager {
    constructor(appElement, eventAggregator) {
        this.appElement = appElement;
        this.eventAggregator = eventAggregator;

        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        this.insertButton = document.getElementById('key-insert');
        this.deleteButton = document.getElementById('key-delete');
        this.mSelButton = document.getElementById('key-m-sel');
        this.clearButton = document.getElementById('key-clear');
        this.leftPanelElement = document.getElementById('left-panel');
        
        this.cachedLeftPanelHeight = 0;

        const tableElement = document.getElementById('results-table');
        this.tableComponent = new TableComponent(tableElement);

        const summaryElement = document.getElementById('total-sum-value');
        this.summaryComponent = new SummaryComponent(summaryElement);

        this.leftPanelComponent = new LeftPanelComponent(this.leftPanelElement);

        this.functionPanel = new PanelComponent({
            panelElement: document.getElementById('function-panel'),
            toggleElement: document.getElementById('function-panel-toggle'),
            eventAggregator: this.eventAggregator,
            expandedClass: 'is-expanded',
            retractEventName: 'operationSuccessfulAutoHidePanel'
        });

        this.notificationComponent = new NotificationComponent({
            containerElement: document.getElementById('toast-container'),
            eventAggregator: this.eventAggregator
        });

        this.dialogComponent = new DialogComponent({
            overlayElement: document.getElementById('confirmation-dialog-overlay'),
            eventAggregator: this.eventAggregator
        });

        this.initialize();
        this._initializeLeftPanelLayout();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
    }

    render(state) {
        const isDetailView = state.ui.currentView === 'DETAIL_CONFIG';
        this.appElement.classList.toggle('detail-view-active', isDetailView);

        this.tableComponent.render(state);
        this.summaryComponent.render(state.quoteData.summary, state.ui.isSumOutdated);
        this.leftPanelComponent.render(state.ui, state.quoteData);
        
        this._updateButtonStates(state);
        this._updateLeftPanelState(state.ui.currentView);
        this._scrollToActiveCell(state);
    }

    // [DEBUG] Added extensive console.log statements for debugging
    _adjustLeftPanelLayout() {
        console.log("=============================================");
        console.log(`[DEBUG] Firing _adjustLeftPanelLayout at: ${new Date().toLocaleTimeString()}`);

        const appContainer = this.appElement;
        const numericKeyboard = this.numericKeyboardPanel;
        const leftPanel = this.leftPanelElement;

        if (!appContainer || !numericKeyboard || !leftPanel) {
            console.error("[DEBUG] A required element was not found. Aborting layout adjustment.");
            return;
        }

        const isKeyboardCollapsed = numericKeyboard.classList.contains('is-collapsed');
        console.log(`[DEBUG] Is numeric keyboard collapsed? ${isKeyboardCollapsed}`);

        // --- Height Calculation ---
        console.log(`[DEBUG] Cached panel height (before calculation): ${this.cachedLeftPanelHeight}`);
        if (this.cachedLeftPanelHeight === 0 && !isKeyboardCollapsed) {
            const key7 = document.getElementById('key-7');
            if (key7) {
                const key7Rect = key7.getBoundingClientRect();
                console.log("[DEBUG] 'key-7' Rect:", JSON.stringify(key7Rect));
                const keyHeight = key7Rect.height;
                const gap = 5;
                this.cachedLeftPanelHeight = (keyHeight * 4) + (gap * 3);
                console.log(`[DEBUG] New cached height calculated: ${this.cachedLeftPanelHeight}`);
            }
        }
        const panelHeight = this.cachedLeftPanelHeight || 155;
        console.log(`[DEBUG] Final panel height to be used: ${panelHeight}`);

        // --- Top Position Calculation ---
        const containerRect = appContainer.getBoundingClientRect();
        console.log("[DEBUG] App container Rect:", JSON.stringify(containerRect));
        const keyboardTopPadding = 38;
        const keyboardBottomPadding = 8;
        const keyboardExpandedHeight = panelHeight + keyboardTopPadding + keyboardBottomPadding;
        console.log(`[DEBUG] Calculated expanded keyboard height: ${keyboardExpandedHeight}`);
        
        const keyboardLogicalTop = containerRect.bottom - keyboardExpandedHeight;
        console.log(`[DEBUG] Calculated logical keyboard top: ${keyboardLogicalTop} (container.bottom - expandedHeight)`);
        
        // --- Apply ONLY Vertical Styles ---
        const finalTop = keyboardLogicalTop + 'px';
        const finalHeight = panelHeight + 'px';
        
        leftPanel.style.top = finalTop;
        leftPanel.style.height = finalHeight;

        console.log(`[DEBUG] FINAL APPLIED STYLE -> top: ${finalTop}, height: ${finalHeight}`);
        console.log("=============================================");
    }

    _initializeLeftPanelLayout() {
        const resizeObserver = new ResizeObserver(() => {
            if (this.leftPanelElement.classList.contains('is-expanded')) {
                this._adjustLeftPanelLayout();
            }
        });
        resizeObserver.observe(this.appElement);
        
        new MutationObserver(() => {
            if(this.leftPanelElement.classList.contains('is-expanded')) {
                 this._adjustLeftPanelLayout();
            }
        }).observe(this.numericKeyboardPanel, { attributes: true, attributeFilter: ['class'] });
    }
    
    _updateLeftPanelState(currentView) {
        if (this.leftPanelElement) {
            const isExpanded = (currentView === 'DETAIL_CONFIG');
            this.leftPanelElement.classList.toggle('is-expanded', isExpanded);

            if (isExpanded) {
                setTimeout(() => this._adjustLeftPanelLayout(), 0);
            }
        }
    }

    _updateButtonStates(state) {
        const { selectedRowIndex, isMultiSelectMode, multiSelectSelectedIndexes } = state.ui;
        const items = state.quoteData.rollerBlindItems;
        const isSingleRowSelected = selectedRowIndex !== null;
        
        let insertDisabled = true;
        if (isSingleRowSelected) {
            const isLastRow = selectedRowIndex === items.length - 1;
            if (!isLastRow) {
                const nextItem = items[selectedRowIndex + 1];
                const isNextRowEmpty = !nextItem.width && !nextItem.height && !nextItem.fabricType;
                if (!isNextRowEmpty) { insertDisabled = false; }
            }
        }
        if (this.insertButton) this.insertButton.disabled = insertDisabled;

        let deleteDisabled = true;
        if (isMultiSelectMode) {
            if (multiSelectSelectedIndexes.size > 0) { deleteDisabled = false; }
        } else if (isSingleRowSelected) {
            const item = items[selectedRowIndex];
            const isLastRow = selectedRowIndex === items.length - 1;
            const isRowEmpty = !item.width && !item.height && !item.fabricType;
            if (!(isLastRow && isRowEmpty)) { deleteDisabled = false; }
        }
        if (this.deleteButton) this.deleteButton.disabled = deleteDisabled;
        
        const mSelDisabled = !isSingleRowSelected && !isMultiSelectMode;
        if (this.mSelButton) {
            this.mSelButton.disabled = mSelDisabled;
            this.mSelButton.style.backgroundColor = isMultiSelectMode ? '#f5c6cb' : '';
        }

        if (this.clearButton) this.clearButton.disabled = !isSingleRowSelected;
    }
    
    _scrollToActiveCell(state) {
        if (!state.ui.activeCell) return;
        const { rowIndex, column } = state.ui.activeCell;
        const activeCellElement = document.querySelector(`tr[data-row-index="${rowIndex}"] td[data-column="${column}"]`);
        if (activeCellElement) {
            activeCellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    _toggleNumericKeyboard() {
        if (this.numericKeyboardPanel) {
            this.numericKeyboardPanel.classList.toggle('is-collapsed');
        }
    }
}
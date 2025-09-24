// File: 04-core-code/ui/ui-manager.js

import { TableComponent } from './table-component.js';
import { SummaryComponent } from './summary-component.js';
import { PanelComponent } from './panel-component.js';
import { NotificationComponent } from './notification-component.js';
import { DialogComponent } from './dialog-component.js';
import { LeftPanelComponent } from './left-panel-component.js'; // [REFACTOR] Import the new component

export class UIManager {
    constructor(appElement, eventAggregator) {
        this.appElement = appElement;
        this.eventAggregator = eventAggregator;

        // --- DOM 元素引用 (已簡化) ---
        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        this.insertButton = document.getElementById('key-insert');
        this.deleteButton = document.getElementById('key-delete');
        this.mDelButton = document.getElementById('key-f5');
        this.clearButton = document.getElementById('key-clear');
        this.leftPanelElement = document.getElementById('left-panel');
        
        // --- 實例化所有子元件 ---
        const tableElement = document.getElementById('results-table');
        this.tableComponent = new TableComponent(tableElement);

        const summaryElement = document.getElementById('total-sum-value');
        this.summaryComponent = new SummaryComponent(summaryElement);

        // [REFACTOR] Instantiate the new LeftPanelComponent
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

        // --- Delegate rendering to specialized components ---
        this.tableComponent.render(state);
        this.summaryComponent.render(state.quoteData.summary, state.ui.isSumOutdated);
        this.leftPanelComponent.render(state.ui, state.quoteData); // [REFACTOR] Delegate left panel rendering
        
        this._updateButtonStates(state);
        this._updateLeftPanelState(state.ui.currentView);
        this._scrollToActiveCell(state);
    }

    // [REFACTOR] _updateTabStates and _updatePanelButtonStates have been moved to LeftPanelComponent

    _adjustLeftPanelLayout() {
        const appContainer = this.appElement;
        const numericKeyboard = this.numericKeyboardPanel;
        const key7 = document.getElementById('key-7');
        const leftPanel = this.leftPanelElement;

        if (!appContainer || !numericKeyboard || !key7 || !leftPanel) return;
        
        const containerRect = appContainer.getBoundingClientRect();
        const key7Rect = key7.getBoundingClientRect();
        const rightPageMargin = 40;
        
        leftPanel.style.left = containerRect.left + 'px';
        const newWidth = containerRect.width - rightPageMargin;
        leftPanel.style.width = newWidth + 'px';
        leftPanel.style.top = key7Rect.top + 'px';
        const keyHeight = key7Rect.height;
        const gap = 5;
        const totalKeysHeight = (keyHeight * 4) + (gap * 3);
        leftPanel.style.height = totalKeysHeight + 'px';
    }

    _initializeLeftPanelLayout() {
        window.addEventListener('resize', () => {
            if (this.leftPanelElement.classList.contains('is-expanded')) {
                this._adjustLeftPanelLayout();
            }
        });
        this._adjustLeftPanelLayout();
    }
    
    _updateLeftPanelState(currentView) {
        if (this.leftPanelElement) {
            const isExpanded = (currentView === 'DETAIL_CONFIG');
            this.leftPanelElement.classList.toggle('is-expanded', isExpanded);

            if (isExpanded) {
                this._adjustLeftPanelLayout();
            } else {
                this.leftPanelElement.style.left = '';
            }
        }
    }

    // This function now only handles buttons outside the left panel
    _updateButtonStates(state) {
        const { selectedRowIndex, isMultiDeleteMode, multiDeleteSelectedIndexes } = state.ui;
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
        if (isMultiDeleteMode) {
            if (multiDeleteSelectedIndexes.size > 0) { deleteDisabled = false; }
        } else if (isSingleRowSelected) {
            const item = items[selectedRowIndex];
            const isLastRow = selectedRowIndex === items.length - 1;
            const isRowEmpty = !item.width && !item.height && !item.fabricType;
            if (!(isLastRow && isRowEmpty)) { deleteDisabled = false; }
        }
        if (this.deleteButton) this.deleteButton.disabled = deleteDisabled;
        
        const mDelDisabled = !isSingleRowSelected && !isMultiDeleteMode;
        if (this.mDelButton) {
            this.mDelButton.disabled = mDelDisabled;
            this.mDelButton.style.backgroundColor = isMultiDeleteMode ? '#f5c6cb' : '';
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
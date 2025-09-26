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
        // [REINSTATED] Restore the initialization for the dynamic JS-based layout.
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

    // [REINSTATED & REFACTORED] This method is restored but now ONLY handles vertical positioning (top and height).
    // Horizontal positioning (left and width) is now handled by CSS.
    _adjustLeftPanelLayout() {
        const numericKeyboard = this.numericKeyboardPanel;
        const leftPanel = this.leftPanelElement;

        if (!numericKeyboard || !leftPanel) return;
        
        // Use a stable element on the keyboard for measurement that is always present.
        const key7 = document.getElementById('key-7');
        if (!key7) return;

        // --- Height and Top Position Calculation ---
        const key7Rect = key7.getBoundingClientRect();
        const keyboardPanelRect = numericKeyboard.getBoundingClientRect();

        // If keyboard is collapsed, key7Rect.top will be 0. We need a stable reference.
        // The stable reference is the keyboard panel's top position.
        const topPosition = keyboardPanelRect.top;

        // Calculate height based on key size, but only if visible.
        if (this.cachedLeftPanelHeight === 0 && !numericKeyboard.classList.contains('is-collapsed')) {
             const keyHeight = key7Rect.height;
             const gap = 5;
             this.cachedLeftPanelHeight = (keyHeight * 4) + (gap * 3);
        }
        
        const panelHeight = this.cachedLeftPanelHeight || 155; // Use fallback

        // Apply the calculated vertical styles.
        leftPanel.style.top = topPosition + 'px';
        leftPanel.style.height = panelHeight + 'px';
    }

    // [REINSTATED] Restore the initialization logic.
    _initializeLeftPanelLayout() {
        const resizeObserver = new ResizeObserver(() => {
            if (this.leftPanelElement.classList.contains('is-expanded')) {
                this._adjustLeftPanelLayout();
            }
        });
        resizeObserver.observe(this.appElement);
        
        // Initial adjustment might be needed, or on first open.
        // A MutationObserver could also work to detect class changes on the keyboard.
        new MutationObserver(() => {
            if(this.leftPanelElement.classList.contains('is-expanded')) {
                 this._adjustLeftPanelLayout();
            }
        }).observe(this.numericKeyboardPanel, { attributes: true, attributeFilter: ['class'] });
    }
    
    // [REFACTORED] Restore the call to the layout adjustment method.
    _updateLeftPanelState(currentView) {
        if (this.leftPanelElement) {
            const isExpanded = (currentView === 'DETAIL_CONFIG');
            this.leftPanelElement.classList.toggle('is-expanded', isExpanded);

            if (isExpanded) {
                this._adjustLeftPanelLayout();
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
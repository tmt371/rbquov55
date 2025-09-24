// File: 04-core-code/app-controller.js

import { initialState } from './config/initial-state.js';

const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';
const AUTOSAVE_INTERVAL_MS = 60000;

export class AppController {
    constructor({ eventAggregator, uiService, quoteService, fileService, quickQuoteView, detailConfigView }) {
        this.eventAggregator = eventAggregator;
        this.uiService = uiService;
        this.quoteService = quoteService;
        this.fileService = fileService;
        
        this.quickQuoteView = quickQuoteView;
        this.detailConfigView = detailConfigView;

        this.autoSaveTimerId = null;
        console.log("AppController (Refactored with grouped subscriptions) Initialized.");
        this.initialize();
    }

    initialize() {
        this._subscribeQuickQuoteEvents();
        this._subscribeDetailViewEvents();
        this._subscribeGlobalEvents();
        
        this._startAutoSave();
    }
    
    _subscribeQuickQuoteEvents() {
        const delegate = (handlerName, ...args) => this.quickQuoteView[handlerName](...args);

        this.eventAggregator.subscribe('numericKeyPressed', (data) => delegate('handleNumericKeyPress', data));
        this.eventAggregator.subscribe('userRequestedInsertRow', () => delegate('handleInsertRow'));
        this.eventAggregator.subscribe('userRequestedDeleteRow', () => delegate('handleDeleteRow'));
        this.eventAggregator.subscribe('userRequestedSave', () => delegate('handleSaveToFile'));
        this.eventAggregator.subscribe('userRequestedExportCSV', () => delegate('handleExportCSV'));
        this.eventAggregator.subscribe('userRequestedReset', () => delegate('handleReset', initialState.ui));
        this.eventAggregator.subscribe('userRequestedClearRow', () => delegate('handleClearRow'));
        this.eventAggregator.subscribe('userMovedActiveCell', (data) => delegate('handleMoveActiveCell', data));
        this.eventAggregator.subscribe('userRequestedCycleType', () => delegate('handleCycleType'));
        this.eventAggregator.subscribe('userRequestedCalculateAndSum', () => delegate('handleCalculateAndSum'));
        this.eventAggregator.subscribe('userRequestedMultiDeleteMode', () => delegate('handleToggleMultiDeleteMode'));
        this.eventAggregator.subscribe('userChoseSaveThenLoad', () => delegate('handleSaveThenLoad'));
    }

    _subscribeDetailViewEvents() {
        const delegate = (handlerName, data) => {
            if (this.uiService.getState().currentView === 'DETAIL_CONFIG') {
                this.detailConfigView[handlerName](data);
            }
        };
        
        this.eventAggregator.subscribe('tableCellClicked', (data) => {
            const currentView = this.uiService.getState().currentView;
            if (currentView === 'QUICK_QUOTE') {
                this.quickQuoteView.handleTableCellClick(data);
            } else {
                this.detailConfigView.handleTableCellClick(data);
            }
        });
         this.eventAggregator.subscribe('sequenceCellClicked', (data) => {
            const currentView = this.uiService.getState().currentView;
            if (currentView === 'QUICK_QUOTE') {
                this.quickQuoteView.handleSequenceCellClick(data);
            } else {
                this.detailConfigView.handleSequenceCellClick(data);
            }
        });

        // Detail Config View Specific Events
        this.eventAggregator.subscribe('userRequestedFocusMode', (data) => delegate('handleFocusModeRequest', data));
        this.eventAggregator.subscribe('panelInputEnterPressed', (data) => delegate('handlePanelInputEnter', data));
        this.eventAggregator.subscribe('panelInputBlurred', (data) => delegate('handlePanelInputBlur', data));
        this.eventAggregator.subscribe('locationInputEnterPressed', (data) => delegate('handleLocationInputEnter', data));
        this.eventAggregator.subscribe('userRequestedLFEditMode', () => delegate('handleLFEditRequest'));
        this.eventAggregator.subscribe('userRequestedLFDeleteMode', () => delegate('handleLFDeleteRequest'));
        this.eventAggregator.subscribe('userToggledK3EditMode', () => delegate('handleToggleK3EditMode'));
        this.eventAggregator.subscribe('userRequestedBatchCycle', (data) => delegate('handleBatchCycle', data));
        
        // [REFACTORED] Renamed events for semantic clarity
        this.eventAggregator.subscribe('dualChainModeChanged', (data) => delegate('handleDualChainModeChange', data));
        this.eventAggregator.subscribe('chainEnterPressed', (data) => delegate('handleChainEnterPressed', data));
        this.eventAggregator.subscribe('driveModeChanged', (data) => delegate('handleDriveModeChange', data));
        this.eventAggregator.subscribe('accessoryCounterChanged', (data) => delegate('handleAccessoryCounterChange', data));
    }

    _subscribeGlobalEvents() {
        this.eventAggregator.subscribe('userNavigatedToDetailView', () => this._handleNavigationToDetailView());
        this.eventAggregator.subscribe('userNavigatedToQuickQuoteView', () => this._handleNavigationToQuickQuoteView());
        this.eventAggregator.subscribe('userSwitchedTab', (data) => this._handleTabSwitch(data));
        this.eventAggregator.subscribe('userRequestedLoad', () => this._handleUserRequestedLoad());
        this.eventAggregator.subscribe('userChoseLoadDirectly', () => this._handleLoadDirectly());
        this.eventAggregator.subscribe('fileLoaded', (data) => this._handleFileLoad(data));
    }
    
    _handleNavigationToDetailView() {
        const currentView = this.uiService.getState().currentView;
        if (currentView === 'QUICK_QUOTE') {
            this.uiService.setCurrentView('DETAIL_CONFIG');
            this.detailConfigView.activateTab('k1-tab'); 
        } else {
            this.uiService.setCurrentView('QUICK_QUOTE');
            this.uiService.setVisibleColumns(initialState.ui.visibleColumns);
            this._publishStateChange();
        }
    }

    _handleNavigationToQuickQuoteView() {
        this.uiService.setCurrentView('QUICK_QUOTE');
        this.uiService.setVisibleColumns(initialState.ui.visibleColumns);
        this._publishStateChange();
    }

    _handleTabSwitch({ tabId }) {
        this.detailConfigView.activateTab(tabId);
    }

    _handleUserRequestedLoad() {
        if (this.quoteService.hasData()) {
            this.eventAggregator.publish('showLoadConfirmationDialog');
        } else {
            this.eventAggregator.publish('triggerFileLoad');
        }
    }

    _handleLoadDirectly() {
        this.eventAggregator.publish('triggerFileLoad');
    }

    _handleFileLoad({ fileName, content }) {
        const result = this.fileService.parseFileContent(fileName, content);
        if (result.success) {
            this.quoteService.quoteData = result.data;
            this.uiService.reset(initialState.ui);
            this.uiService.setSumOutdated(true);
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: result.message });
        } else {
            this.eventAggregator.publish('showNotification', { message: result.message, type: 'error' });
        }
    }
    
    _getFullState() {
        return {
            ui: this.uiService.getState(),
            quoteData: this.quoteService.getQuoteData()
        };
    }
    
    publishInitialState() { this._publishStateChange(); }
    _publishStateChange() {
        this.eventAggregator.publish('stateChanged', this._getFullState());
    }

    _startAutoSave() {
        if (this.autoSaveTimerId) { clearInterval(this.autoSaveTimerId); }
        this.autoSaveTimerId = setInterval(() => this._handleAutoSave(), AUTOSAVE_INTERVAL_MS);
    }

    _handleAutoSave() {
        try {
            const items = this.quoteService.getItems();
            const hasContent = items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
            if (hasContent) {
                const dataToSave = JSON.stringify(this.quoteService.getQuoteData());
                localStorage.setItem(AUTOSAVE_STORAGE_KEY, dataToSave);
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
}
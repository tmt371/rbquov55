// File: 04-core-code/main.js

import { EventAggregator } from './event-aggregator.js';
import { ConfigManager } from './config-manager.js';
import { InputHandler } from './input-handler.js';
import { UIManager } from './ui/ui-manager.js';
import { AppController } from './app-controller.js';

import { initialState } from './config/initial-state.js';
import { ProductFactory } from './strategies/product-factory.js';

import { QuoteService } from './services/quote-service.js';
import { CalculationService } from './services/calculation-service.js';
import { FocusService } from './services/focus-service.js';
import { FileService } from './services/file-service.js';
import { UIService } from './services/ui-service.js';

import { QuickQuoteView } from './ui/views/quick-quote-view.js';
import { DetailConfigView } from './ui/views/detail-config-view.js';
import { K1LocationView } from './ui/views/k1-location-view.js';
import { K2FabricView } from './ui/views/k2-fabric-view.js';
import { K3OptionsView } from './ui/views/k3-options-view.js';
// [REFACTORED] Import views from their new, semantic file names and with new class names
import { DualChainView } from './ui/views/dual-chain-view.js';
import { DriveAccessoriesView } from './ui/views/drive-accessories-view.js';


const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';

class App {
    constructor() {
        let startingState = JSON.parse(JSON.stringify(initialState));
        try {
            const autoSavedDataJSON = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
            if (autoSavedDataJSON) {
                const message = "It looks like you have unsaved work from a previous session.\n\n- 'OK' to restore the unsaved work.\n- 'Cancel' to start a new, blank quote.";
                if (window.confirm(message)) {
                    const autoSavedData = JSON.parse(autoSavedDataJSON);
                    startingState.quoteData = autoSavedData;
                    console.log("Restored data from auto-save.");
                } else {
                    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
                    console.log("Auto-saved data discarded by user.");
                }
            }
        } catch (error) {
            console.error("Failed to process auto-saved data:", error);
            localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
        }
        
        this.eventAggregator = new EventAggregator();
        this.configManager = new ConfigManager(this.eventAggregator);
        
        const productFactory = new ProductFactory();

        // Services are instantiated here...
        const quoteService = new QuoteService({
            initialState: startingState,
            productFactory: productFactory
        });
        const calculationService = new CalculationService({
            productFactory: productFactory,
            configManager: this.configManager
        });
        const fileService = new FileService();
        const uiService = new UIService(startingState.ui);
        const focusService = new FocusService({
            uiService: uiService,
            quoteService: quoteService
        });

        const publishStateChangeCallback = () => this.eventAggregator.publish('stateChanged', this.appController._getFullState());

        const quickQuoteView = new QuickQuoteView({
            quoteService,
            calculationService,
            focusService,
            fileService,
            uiService,
            eventAggregator: this.eventAggregator,
            productFactory,
            publishStateChangeCallback
        });

        const k1LocationView = new K1LocationView({
            quoteService,
            uiService,
            publishStateChangeCallback
        });

        const k2FabricView = new K2FabricView({
            quoteService,
            uiService,
            eventAggregator: this.eventAggregator,
            publishStateChangeCallback
        });

        const k3OptionsView = new K3OptionsView({
            quoteService,
            uiService,
            publishStateChangeCallback
        });
        
        // [REFACTORED] Instantiate views with new class names and semantic variable names
        const dualChainView = new DualChainView({
            quoteService,
            uiService,
            calculationService,
            eventAggregator: this.eventAggregator,
            publishStateChangeCallback
        });

        const driveAccessoriesView = new DriveAccessoriesView({
            quoteService,
            uiService,
            calculationService,
            eventAggregator: this.eventAggregator,
            publishStateChangeCallback
        });

        const detailConfigView = new DetailConfigView({
            quoteService,
            uiService,
            calculationService,
            eventAggregator: this.eventAggregator,
            publishStateChangeCallback,
            k1LocationView: k1LocationView,
            k2FabricView: k2FabricView,
            k3OptionsView: k3OptionsView,
            // [REFACTORED] Inject instances with new semantic names
            dualChainView: dualChainView,
            driveAccessoriesView: driveAccessoriesView
        });
        
        this.appController = new AppController({
            eventAggregator: this.eventAggregator,
            uiService,
            quoteService,
            fileService,
            quickQuoteView,
            detailConfigView
        });
    }

    async _loadPartials() {
        try {
            const response = await fetch('./04-core-code/ui/partials/left-panel.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (error) {
            console.error("Failed to load HTML partial:", error);
            this.eventAggregator.publish('showNotification', { message: 'Error: Could not load UI components!', type: 'error'});
        }
    }

    async run() {
        console.log("Application starting...");
        
        await this._loadPartials();

        this.inputHandler = new InputHandler(this.eventAggregator);
        this.uiManager = new UIManager(
            document.getElementById('app'), 
            this.eventAggregator
        );

        await this.configManager.initialize();

        this.eventAggregator.subscribe('stateChanged', (state) => {
            this.uiManager.render(state);
        });
        
        this.appController.publishInitialState(); 
        this.inputHandler.initialize(); 
        console.log("Application running and interactive.");
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.run();
});
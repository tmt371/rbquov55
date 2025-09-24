// /04-core-code/ui/dialog-component.js

/**
 * @fileoverview A generic, configurable component to manage confirmation dialogs.
 */
export class DialogComponent {
    constructor({ overlayElement, eventAggregator }) {
        if (!overlayElement || !eventAggregator) {
            throw new Error("Overlay element and event aggregator are required for DialogComponent.");
        }
        this.overlay = overlayElement;
        this.eventAggregator = eventAggregator;
        
        // Get generic container elements instead of specific buttons
        this.messageElement = this.overlay.querySelector('.dialog-message');
        this.buttonsContainer = this.overlay.querySelector('.dialog-buttons');

        this.initialize();
        console.log("DialogComponent (Refactored as Generic) Initialized.");
    }

    initialize() {
        // --- Keep old event for backward compatibility ---
        this.eventAggregator.subscribe('showLoadConfirmationDialog', () => {
            this.show({
                message: 'The current quote contains unsaved data. What would you like to do?',
                buttons: [
                    { text: 'Save then Load', callback: () => this.eventAggregator.publish('userChoseSaveThenLoad') },
                    { text: 'Load Directly', callback: () => this.eventAggregator.publish('userChoseLoadDirectly') },
                    { text: 'Cancel', className: 'secondary', callback: () => {} }
                ]
            });
        });

        // --- Add new generic event subscription for confirmation dialogs ---
        this.eventAggregator.subscribe('showConfirmationDialog', (config) => this.show(config));

        // Allow clicking the background overlay to also cancel/hide.
        this.overlay.addEventListener('click', (event) => {
            if (event.target === this.overlay) {
                this.hide();
            }
        });
    }

    /**
     * Shows a dialog with a configurable message and buttons.
     * @param {object} config - The configuration object.
     * @param {string} config.message - The message to display.
     * @param {Array<object>} config.buttons - An array of button objects.
     * @param {string} config.buttons[].text - The button's text.
     * @param {string} [config.buttons[].className] - Optional CSS class for the button.
     * @param {Function} config.buttons[].callback - The function to call on click.
     */
    show({ message, buttons = [] }) {
        // Clear previous buttons
        this.buttonsContainer.innerHTML = '';

        // Set new message
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }

        // Create and append new buttons
        buttons.forEach(btnConfig => {
            const button = document.createElement('button');
            button.className = 'dialog-button';
            if (btnConfig.className) {
                button.classList.add(btnConfig.className);
            }
            button.textContent = btnConfig.text;
            
            button.addEventListener('click', () => {
                if (btnConfig.callback && typeof btnConfig.callback === 'function') {
                    btnConfig.callback();
                }
                this.hide();
            });

            this.buttonsContainer.appendChild(button);
        });

        this.overlay.classList.remove('is-hidden');
    }

    hide() {
        this.overlay.classList.add('is-hidden');
    }
}
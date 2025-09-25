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
        this.dialogBox = this.overlay.querySelector('.dialog-box');
        this.eventAggregator = eventAggregator;
        
        this.messageElement = this.overlay.querySelector('.dialog-message');
        this.buttonsContainer = this.overlay.querySelector('.dialog-buttons');

        this.initialize();
        console.log("DialogComponent (Refactored for Grid Layout) Initialized.");
    }

    initialize() {
        // --- Keep old event for backward compatibility, but adapt to new grid format ---
        this.eventAggregator.subscribe('showLoadConfirmationDialog', () => {
            this.show({
                message: 'The current quote contains unsaved data. What would you like to do?',
                layout: [ // Use the new layout format
                    [
                        { type: 'button', text: 'Save then Load', callback: () => this.eventAggregator.publish('userChoseSaveThenLoad'), colspan: 1 },
                        { type: 'button', text: 'Load Directly', callback: () => this.eventAggregator.publish('userChoseLoadDirectly'), colspan: 1 },
                        { type: 'button', text: 'Cancel', className: 'secondary', callback: () => {}, colspan: 1 }
                    ]
                ]
            });
        });

        this.eventAggregator.subscribe('showConfirmationDialog', (config) => this.show(config));

        this.overlay.addEventListener('click', (event) => {
            if (event.target === this.overlay) {
                this.hide();
            }
        });
    }

    /**
     * Shows a dialog with a configurable message and a grid-based layout.
     * @param {object} config - The configuration object.
     * @param {string} config.message - The message to display.
     * @param {Array<Array<object>>} config.layout - An array of rows, where each row is an array of cell objects.
     */
    show({ message, layout = [], position = 'center' }) {
        this.buttonsContainer.innerHTML = '';

        if (this.messageElement) {
            this.messageElement.textContent = message;
        }

        // [REFACTORED] Build the grid layout dynamically
        layout.forEach(row => {
            row.forEach(cellConfig => {
                const cell = document.createElement('div');
                cell.className = 'dialog-grid-cell';

                if (cellConfig.type === 'button') {
                    cell.classList.add('button-cell');
                    const button = document.createElement('button');
                    button.className = 'dialog-button';
                    if (cellConfig.className) {
                        button.classList.add(cellConfig.className);
                    }
                    button.textContent = cellConfig.text;
                    
                    button.addEventListener('click', () => {
                        if (cellConfig.callback && typeof cellConfig.callback === 'function') {
                            cellConfig.callback();
                        }
                        this.hide();
                    });
                    cell.appendChild(button);

                } else if (cellConfig.type === 'text') {
                    cell.classList.add('text-cell');
                    cell.textContent = cellConfig.text;
                }
                
                if (cellConfig.className) {
                    cell.classList.add(cellConfig.className);
                }

                if (cellConfig.colspan) {
                    cell.style.gridColumn = `span ${cellConfig.colspan}`;
                }

                this.buttonsContainer.appendChild(cell);
            });
        });

        // [NEW] Adjust dialog position based on config
        if (position === 'bottomThird') {
            this.dialogBox.style.marginTop = `calc( (100vh - 20vh) / 3 * 2 - 50% )`;
        } else {
            this.dialogBox.style.marginTop = ''; // Revert to default centered position
        }

        this.overlay.classList.remove('is-hidden');
    }

    hide() {
        this.overlay.classList.add('is-hidden');
    }
}
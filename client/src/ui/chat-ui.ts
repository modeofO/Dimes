type SendMessageCallback = (message: string) => void;

export class ChatUI {
    private container: HTMLElement;
    private messagesArea: HTMLElement;
    private input: HTMLInputElement;
    private sendButton: HTMLButtonElement;
    private onSendMessage: SendMessageCallback;

    constructor(containerId: string, onSendMessage: SendMessageCallback) {
        const containerElement = document.getElementById(containerId);
        if (!containerElement) {
            throw new Error(`Chat container with ID "${containerId}" not found.`);
        }
        this.container = containerElement;
        this.onSendMessage = onSendMessage;

        this.render();
        this.messagesArea = this.container.querySelector('.chat-messages') as HTMLElement;
        this.input = this.container.querySelector('.chat-input') as HTMLInputElement;
        this.sendButton = this.container.querySelector('.chat-send') as HTMLButtonElement;

        this.setupEventListeners();
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="chat-header">CAD Agent</div>
            <div class="chat-messages"></div>
            <div class="chat-input-area">
                <input type="text" class="chat-input" placeholder="Talk to the agent...">
                <button class="chat-send">Send</button>
            </div>
        `;
    }

    private setupEventListeners(): void {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    private sendMessage(): void {
        const messageText = this.input.value.trim();
        if (messageText) {
            this.addMessage('user', messageText);
            this.onSendMessage(messageText);
            this.input.value = '';
        }
    }

    public addMessage(sender: 'user' | 'agent', text: string): void {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        
        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        contentElement.textContent = text;
        
        messageElement.appendChild(contentElement);
        this.messagesArea.appendChild(messageElement);
        this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    }
} 
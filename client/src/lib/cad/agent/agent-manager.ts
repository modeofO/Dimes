import { v4 as uuidv4 } from 'uuid';

type AgentMessageHandler = (message: any) => void;

export class AgentManager {
    private ws: WebSocket | null = null;
    private sessionId: string;
    private onMessageCallback: AgentMessageHandler | null = null;
    private isConnected: boolean = false;
    private messageQueue: string[] = [];
    private reconnectInterval: number = 5000; // 5 seconds
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;

    constructor(private serverUrl: string, sessionId?: string) {
        this.sessionId = sessionId || `ws-session-${uuidv4()}`;
        this.connect();
    }

    private connect(): void {
        console.log(`Attempting to connect to WebSocket server at ${this.serverUrl}...`);
        
        // Include session ID in query parameter
        this.ws = new WebSocket(`${this.serverUrl}?sessionId=${this.sessionId}`);

        this.ws.onopen = () => {
            console.log('✅ WebSocket connection established.');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.flushMessageQueue();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('◀️ Received message from server:', message);
                if (this.onMessageCallback) {
                    this.onMessageCallback(message);
                }
            } catch (error) {
                console.error('Error parsing message from server:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.warn(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
            this.isConnected = false;
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Attempting to reconnect in ${this.reconnectInterval / 1000}s... (Attempt ${this.reconnectAttempts})`);
                setTimeout(() => this.connect(), this.reconnectInterval);
            } else {
                console.error('Max reconnection attempts reached. Could not connect to WebSocket server.');
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    public onMessage(callback: AgentMessageHandler): void {
        this.onMessageCallback = callback;
    }

    public sendMessage(type: string, content: any): void {
        const message = JSON.stringify({ type, payload: { content } });
        if (this.isConnected && this.ws) {
            console.log('▶️ Sending message to server:', message);
            this.ws.send(message);
        } else {
            console.log('Queueing message:', message);
            this.messageQueue.push(message);
        }
    }

    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                this.ws?.send(message);
                console.log('Sent queued message:', message);
            }
        }
    }

    public dispose(): void {
        if (this.ws) {
            this.ws.close();
        }
    }
} 
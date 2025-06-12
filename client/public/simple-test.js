console.log('Plain JavaScript loading...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded via JavaScript!');
    
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = 'JavaScript is working!';
        statusElement.style.backgroundColor = 'green';
        statusElement.style.color = 'white';
    }
    
    const container = document.getElementById('cad-viewport');
    if (container) {
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #e0e0e0; color: #333; font-family: Arial;">
                <div style="text-align: center; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h2 style="color: #2c3e50; margin: 0 0 10px 0;">✅ JavaScript Working!</h2>
                    <p style="margin: 5px 0;">Plain JavaScript execution successful</p>
                    <p style="margin: 5px 0;">No TypeScript compilation needed</p>
                    <p style="margin: 15px 0 5px 0; font-weight: bold;">Issue might be with TypeScript</p>
                </div>
            </div>
        `;
    }
}); 
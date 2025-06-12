console.log('Vite is working!');

document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = 'TypeScript and Vite are working!';
        statusElement.style.backgroundColor = 'green';
        statusElement.style.color = 'white';
    }
    
    // Add a simple test message to the page
    const appElement = document.getElementById('app');
    if (appElement) {
        appElement.innerHTML = `
            <h1>CAD Engine Test</h1>
            <p>If you can see this, Vite is working correctly!</p>
            <div id="test-status">Testing...</div>
        `;
        
        // Test that JavaScript is working
        setTimeout(() => {
            const testStatus = document.getElementById('test-status');
            if (testStatus) {
                testStatus.textContent = 'JavaScript is working!';
                testStatus.style.color = 'green';
            }
        }, 1000);
    }
}); 
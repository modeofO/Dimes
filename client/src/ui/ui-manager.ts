export class UIManager {
    private treeContainer: HTMLElement;

    constructor(containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`UI container with id #${containerId} not found`);
        }
        this.treeContainer = container;
        this.treeContainer.innerHTML = '<ul></ul>';
    }

    public addPlane(planeId: string, planeType: string): void {
        const planeList = this.treeContainer.querySelector('ul');
        if (planeList) {
            const li = document.createElement('li');
            li.id = `tree-plane-${planeId}`;
            li.textContent = `${planeType} Plane (${planeId})`;
            li.innerHTML += '<ul></ul>'; // Add list for sketches
            planeList.appendChild(li);
        }
    }

    public addSketch(sketchId: string, planeId: string): void {
        const planeLi = document.getElementById(`tree-plane-${planeId}`);
        if (planeLi) {
            const sketchList = planeLi.querySelector('ul');
            if (sketchList) {
                const li = document.createElement('li');
                li.id = `tree-sketch-${sketchId}`;
                li.textContent = `-> Sketch (${sketchId})`;
                li.innerHTML += '<ul></ul>'; // Add list for elements
                sketchList.appendChild(li);
            }
        }
    }

    public addSketchElement(elementId: string, sketchId: string, elementType: string): void {
        const sketchLi = document.getElementById(`tree-sketch-${sketchId}`);
        if (sketchLi) {
            const elementList = sketchLi.querySelector('ul');
            if (elementList) {
                const li = document.createElement('li');
                li.id = `tree-element-${elementId}`;
                const capitalizedElementType = elementType.charAt(0).toUpperCase() + elementType.slice(1);
                li.textContent = `--> ${capitalizedElementType} (${elementId})`;
                elementList.appendChild(li);
            }
        }
    }

    public addExtrudedFeature(featureId: string, sketchId: string, featureType: string): void {
        const sketchLi = document.getElementById(`tree-sketch-${sketchId}`);
        if (sketchLi) {
            const childList = sketchLi.querySelector('ul');
            if (childList) {
                const li = document.createElement('li');
                li.id = `tree-feature-${featureId}`;
                li.textContent = `--> ${featureType} (${featureId})`;
                childList.appendChild(li);
            }
        }
    }

    public clear(): void {
        this.treeContainer.innerHTML = '<ul></ul>';
    }
} 
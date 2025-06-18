export class UIManager {
    private treeContainer: HTMLElement;
    private onSelectionChange: (id: string | null, type: string | null) => void;
    private selectedId: string | null = null;

    constructor(containerId: string, onSelectionChange: (id: string | null, type: string | null) => void) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`UI container with id #${containerId} not found`);
        }
        this.treeContainer = container;
        this.onSelectionChange = onSelectionChange;
        this.treeContainer.innerHTML = '<ul></ul>';
    }

    private createTreeItem(id: string, text: string, type: string): HTMLLIElement {
        const li = document.createElement('li');
        li.id = `tree-${type}-${id}`;
        li.textContent = text;
        li.dataset.id = id;
        li.dataset.type = type;
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setSelected(id, type);
            this.onSelectionChange(id, type);
        });
        return li;
    }

    public addPlane(planeId: string, planeType: string): void {
        const planeList = this.treeContainer.querySelector('ul');
        if (planeList) {
            const li = this.createTreeItem(planeId, `${planeType} Plane (${planeId})`, 'plane');
            li.innerHTML += '<ul></ul>'; // Add list for sketches
            planeList.appendChild(li);
        }
    }

    public addSketch(sketchId: string, planeId: string): void {
        const planeLi = document.getElementById(`tree-plane-${planeId}`);
        if (planeLi) {
            const sketchList = planeLi.querySelector('ul');
            if (sketchList) {
                const li = this.createTreeItem(sketchId, `-> Sketch (${sketchId})`, 'sketch');
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
                const capitalizedElementType = elementType.charAt(0).toUpperCase() + elementType.slice(1);
                const li = this.createTreeItem(elementId, `--> ${capitalizedElementType} (${elementId})`, 'element');
                elementList.appendChild(li);
            }
        }
    }

    public addExtrudedFeature(featureId: string, sketchId: string, featureType: string): void {
        const sketchLi = document.getElementById(`tree-sketch-${sketchId}`);
        if (sketchLi) {
            const childList = sketchLi.querySelector('ul');
            if (childList) {
                const li = this.createTreeItem(featureId, `--> ${featureType} (${featureId})`, 'feature');
                childList.appendChild(li);
            }
        }
    }

    public setSelected(id: string | null, type: string | null): void {
        // Clear previous selection
        if (this.selectedId) {
            const oldSelectedElement = document.querySelector('.selected');
            if (oldSelectedElement) {
                oldSelectedElement.classList.remove('selected');
            }
        }

        this.selectedId = id;

        if (id && type) {
            const newSelectedElement = document.getElementById(`tree-${type}-${id}`);
            if (newSelectedElement) {
                newSelectedElement.classList.add('selected');
            }
        }
        
        // If the external event (like a scene click) triggered this,
        // we don't want to call the callback again.
        // But the handler in main.ts is smart enough to prevent a loop.
    }

    public clear(): void {
        this.treeContainer.innerHTML = '<ul></ul>';
        this.selectedId = null;
    }
} 
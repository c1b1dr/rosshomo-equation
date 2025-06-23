// Rossmo Heatmap Application
class RossmoHeatmap {
    constructor() {
        this.canvas = document.getElementById('map-canvas');
        this.heatmapCanvas = document.getElementById('heatmap-canvas');
        this.overlayCanvas = document.getElementById('overlay-canvas');
        
        this.ctx = this.canvas.getContext('2d');
        this.heatmapCtx = this.heatmapCanvas.getContext('2d');
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        this.canvasSize = 600;
        this.gridSize = 20;
        this.cellSize = this.canvasSize / this.gridSize;
        
        // Rossmo parameters
        this.f = 2;
        this.g = 3;
        this.B = 3;
        this.intensity = 0.8;
        
        // Crime locations (grid coordinates)
        this.crimes = [];
        
        // Perpetrator home location
        this.homeLocation = null;
        this.showHome = true;
        
        // UI state
        this.mode = 'view'; // 'add-crime', 'remove-crime', 'set-home', 'view'
        this.showGrid = true;
        this.showCrimes = true;
        this.backgroundImage = null;
        
        // Probability data
        this.probabilityGrid = [];
        this.maxProbability = 0;
        this.maxPosition = null;
        
        // Enhanced heatmap resolution for smoother visualization
        this.heatmapResolution = 100; // Higher resolution for smoother heatmap
        this.smoothProbabilityGrid = [];
        
        this.initializeCanvas();
        this.setupEventListeners();
        this.loadDefaultScenario();
        this.render();
    }
    
    initializeCanvas() {
        // Set canvas size
        [this.canvas, this.heatmapCanvas, this.overlayCanvas].forEach(canvas => {
            canvas.width = this.canvasSize;
            canvas.height = this.canvasSize;
            canvas.style.width = this.canvasSize + 'px';
            canvas.style.height = this.canvasSize + 'px';
        });
        
        // Initialize probability grid
        this.initializeProbabilityGrid();
    }
    
    initializeProbabilityGrid() {
        this.probabilityGrid = [];
        for (let x = 0; x < this.gridSize; x++) {
            this.probabilityGrid[x] = [];
            for (let y = 0; y < this.gridSize; y++) {
                this.probabilityGrid[x][y] = 0;
            }
        }
    }
    
    setupEventListeners() {
        // Parameter controls
        document.getElementById('param-f').addEventListener('input', (e) => {
            this.f = parseFloat(e.target.value);
            document.getElementById('f-value').textContent = this.f.toFixed(1);
        });
        
        document.getElementById('param-g').addEventListener('input', (e) => {
            this.g = parseFloat(e.target.value);
            document.getElementById('g-value').textContent = this.g.toFixed(1);
        });
        
        document.getElementById('param-b').addEventListener('input', (e) => {
            this.B = parseFloat(e.target.value);
            document.getElementById('b-value').textContent = this.B.toFixed(1);
        });
        
        document.getElementById('grid-size').addEventListener('input', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.cellSize = this.canvasSize / this.gridSize;
            document.getElementById('grid-value').textContent = this.gridSize;
            document.getElementById('grid-value-y').textContent = this.gridSize;
            this.initializeProbabilityGrid();
            this.render();
        });
        
        document.getElementById('heatmap-intensity').addEventListener('input', (e) => {
            this.intensity = parseFloat(e.target.value);
            document.getElementById('intensity-value').textContent = this.intensity.toFixed(1);
            this.renderHeatmap();
        });
        
        // Mode buttons
        document.getElementById('add-crime-mode').addEventListener('click', () => {
            this.setMode('add-crime');
        });
        
        document.getElementById('remove-crime-mode').addEventListener('click', () => {
            this.setMode('remove-crime');
        });
        
        document.getElementById('clear-crimes').addEventListener('click', () => {
            this.crimes = [];
            this.updateCrimeList();
            this.render();
        });
        
        // Home location controls
        document.getElementById('set-home-mode').addEventListener('click', () => {
            this.setMode('set-home');
        });
        
        document.getElementById('clear-home').addEventListener('click', () => {
            this.homeLocation = null;
            this.updateHomeInfo();
            this.render();
        });
        
        document.getElementById('toggle-home-visibility').addEventListener('click', () => {
            this.showHome = !this.showHome;
            this.updateHomeVisibilityButton();
            this.render();
        });
        
        // Visualization controls
        document.getElementById('show-grid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.render();
        });
        
        document.getElementById('show-crimes').addEventListener('change', (e) => {
            this.showCrimes = e.target.checked;
            this.render();
        });
        
        document.getElementById('show-legend').addEventListener('change', (e) => {
            const legend = document.getElementById('color-legend');
            if (e.target.checked) {
                legend.classList.remove('hidden');
            } else {
                legend.classList.add('hidden');
            }
        });
        
        document.getElementById('calculate-heatmap').addEventListener('click', () => {
            this.calculateHeatmap();
        });
        
        // Map upload
        document.getElementById('map-upload').addEventListener('change', (e) => {
            this.loadCustomMap(e.target.files[0]);
        });
        
        document.getElementById('reset-map').addEventListener('click', () => {
            this.backgroundImage = null;
            this.render();
        });
        
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.loadPreset(e.target.dataset.preset);
            });
        });
        
        // Canvas interactions
        this.overlayCanvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });
        
        this.overlayCanvas.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        this.overlayCanvas.addEventListener('mouseleave', () => {
            document.getElementById('mouse-coords').textContent = '-';
            document.getElementById('probability-value').textContent = '-';
        });
    }
    
    setMode(mode) {
        this.mode = mode;
        
        // Update button states
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (mode === 'add-crime') {
            document.getElementById('add-crime-mode').classList.add('active');
            this.overlayCanvas.style.cursor = 'crosshair';
        } else if (mode === 'remove-crime') {
            document.getElementById('remove-crime-mode').classList.add('active');
            this.overlayCanvas.style.cursor = 'pointer';
        } else if (mode === 'set-home') {
            document.getElementById('set-home-mode').classList.add('active');
            this.overlayCanvas.style.cursor = 'crosshair';
        } else {
            this.overlayCanvas.style.cursor = 'default';
        }
    }
    
    handleCanvasClick(e) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        
        if (gridX >= 0 && gridX < this.gridSize && gridY >= 0 && gridY < this.gridSize) {
            if (this.mode === 'add-crime') {
                this.addCrime(gridX, gridY);
            } else if (this.mode === 'remove-crime') {
                this.removeCrime(gridX, gridY);
            } else if (this.mode === 'set-home') {
                this.setHomeLocation(gridX, gridY);
            }
        }
    }
    
    handleMouseMove(e) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        
        if (gridX >= 0 && gridX < this.gridSize && gridY >= 0 && gridY < this.gridSize) {
            document.getElementById('mouse-coords').textContent = `(${gridX}, ${gridY})`;
            
            if (this.probabilityGrid[gridX] && this.probabilityGrid[gridX][gridY] !== undefined) {
                const prob = this.probabilityGrid[gridX][gridY];
                document.getElementById('probability-value').textContent = prob.toFixed(6);
            }
        }
    }
    
    addCrime(x, y) {
        // Check if crime already exists at this location
        const exists = this.crimes.some(crime => crime.x === x && crime.y === y);
        if (!exists) {
            this.crimes.push({ x, y });
            this.updateCrimeList();
            this.render();
        }
    }
    
    removeCrime(x, y) {
        const index = this.crimes.findIndex(crime => crime.x === x && crime.y === y);
        if (index !== -1) {
            this.crimes.splice(index, 1);
            this.updateCrimeList();
            this.render();
        }
    }
    
    setHomeLocation(x, y) {
        this.homeLocation = { x, y };
        this.updateHomeInfo();
        this.calculateHomeAccuracy();
        this.render();
        // Automatically switch back to view mode after setting home
        this.setMode('view');
    }
    
    updateHomeInfo() {
        const homeLocationElement = document.getElementById('home-location');
        if (this.homeLocation) {
            homeLocationElement.textContent = `(${this.homeLocation.x}, ${this.homeLocation.y})`;
        } else {
            homeLocationElement.textContent = 'Nicht festgelegt';
        }
    }
    
    updateHomeVisibilityButton() {
        const button = document.getElementById('toggle-home-visibility');
        if (this.showHome) {
            button.textContent = 'Wohnort verstecken';
            button.classList.remove('hidden');
        } else {
            button.textContent = 'Wohnort anzeigen';
            button.classList.add('hidden');
        }
    }
    
    calculateHomeAccuracy() {
        if (!this.homeLocation || !this.maxPosition) {
            document.getElementById('home-accuracy').textContent = '';
            return;
        }
        
        const distance = this.manhattanDistance(
            this.homeLocation.x, this.homeLocation.y,
            this.maxPosition.x, this.maxPosition.y
        );
        
        const accuracyElement = document.getElementById('home-accuracy');
        if (distance === 0) {
            accuracyElement.textContent = '🎯 Perfekt! Exakt getroffen!';
            accuracyElement.style.color = '#27ae60';
        } else if (distance <= 2) {
            accuracyElement.textContent = `✅ Sehr gut! Abweichung: ${distance} Felder`;
            accuracyElement.style.color = '#27ae60';
        } else if (distance <= 4) {
            accuracyElement.textContent = `⚠️ Gut. Abweichung: ${distance} Felder`;
            accuracyElement.style.color = '#f39c12';
        } else {
            accuracyElement.textContent = `❌ Weit entfernt. Abweichung: ${distance} Felder`;
            accuracyElement.style.color = '#e74c3c';
        }
    }
    
    updateCrimeList() {
        const crimesList = document.getElementById('crimes');
        crimesList.innerHTML = '';
        
        this.crimes.forEach((crime, index) => {
            const li = document.createElement('li');
            li.textContent = `Tatort ${index + 1}: (${crime.x}, ${crime.y})`;
            crimesList.appendChild(li);
        });
        
        document.getElementById('crime-count').textContent = this.crimes.length;
    }
    
    loadCustomMap(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;
                this.render();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    loadPreset(preset) {
        this.crimes = [];
        
        switch (preset) {
            case 'default':
                this.crimes = [
                    { x: 8, y: 6 },
                    { x: 12, y: 8 },
                    { x: 10, y: 12 },
                    { x: 14, y: 10 }
                ];
                this.f = 2;
                this.g = 3;
                this.B = 3;
                break;
                
            case 'urban':
                this.crimes = [
                    { x: 5, y: 5 },
                    { x: 7, y: 6 },
                    { x: 6, y: 8 },
                    { x: 9, y: 7 },
                    { x: 8, y: 10 },
                    { x: 11, y: 9 }
                ];
                this.f = 1.8;
                this.g = 2.5;
                this.B = 2;
                break;
                
            case 'suburban':
                this.crimes = [
                    { x: 6, y: 4 },
                    { x: 10, y: 7 },
                    { x: 8, y: 11 },
                    { x: 13, y: 9 }
                ];
                this.f = 2.5;
                this.g = 3.5;
                this.B = 4;
                break;
        }
        
        // Update UI
        document.getElementById('param-f').value = this.f;
        document.getElementById('f-value').textContent = this.f.toFixed(1);
        document.getElementById('param-g').value = this.g;
        document.getElementById('g-value').textContent = this.g.toFixed(1);
        document.getElementById('param-b').value = this.B;
        document.getElementById('b-value').textContent = this.B.toFixed(1);
        
        this.updateCrimeList();
        this.render();
    }
    
    loadDefaultScenario() {
        this.loadPreset('default');
    }
    
    // Rossmo Formula Implementation
    manhattanDistance(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }
    
    calculateRossmoValue(x, y, crimeX, crimeY) {
        const d = this.manhattanDistance(x, y, crimeX, crimeY);
        
        // Avoid division by zero
        if (d === 0) return 0;
        
        // Indicator function V
        const V = d > this.B ? 1 : 0;
        
        let probability = 0;
        
        if (V === 1) {
            // Distance Decay Term
            probability = 1 / Math.pow(d, this.f);
        } else {
            // Buffer Zone Term
            const numerator = Math.pow(this.B, this.g - this.f);
            const denominator = Math.pow(2 * this.B - d, this.g);
            probability = numerator / denominator;
        }
        
        return probability;
    }
    
    calculateHeatmap() {
        if (this.crimes.length === 0) {
            alert('Bitte fügen Sie mindestens einen Tatort hinzu!');
            return;
        }
        
        // Initialize grid
        this.initializeProbabilityGrid();
        this.maxProbability = 0;
        this.maxPosition = null;
        
        // Calculate probability for each grid cell
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                let totalProbability = 0;
                
                // Sum over all crime locations
                this.crimes.forEach(crime => {
                    totalProbability += this.calculateRossmoValue(x, y, crime.x, crime.y);
                });
                
                this.probabilityGrid[x][y] = totalProbability;
                
                // Track maximum
                if (totalProbability > this.maxProbability) {
                    this.maxProbability = totalProbability;
                    this.maxPosition = { x, y };
                }
            }
        }
        
        // Normalize probabilities (optional, for better visualization)
        if (this.maxProbability > 0) {
            for (let x = 0; x < this.gridSize; x++) {
                for (let y = 0; y < this.gridSize; y++) {
                    this.probabilityGrid[x][y] /= this.maxProbability;
                }
            }
            this.maxProbability = 1;
        }
        
        // Update UI
        document.getElementById('max-probability').textContent = this.maxProbability.toFixed(6);
        document.getElementById('max-position').textContent = 
            this.maxPosition ? `(${this.maxPosition.x}, ${this.maxPosition.y})` : '-';
        
        // Update home accuracy if home is set
        this.calculateHomeAccuracy();
        
        this.renderSmoothHeatmap();
    }
    
    render() {
        // Clear canvases
        this.ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);
        this.overlayCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);
        
        // Draw background image if available
        if (this.backgroundImage) {
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvasSize, this.canvasSize);
        } else {
            // Default background
            this.ctx.fillStyle = '#f8f9fa';
            this.ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);
        }
        
        // Draw grid
        if (this.showGrid) {
            this.drawGrid();
        }
        
        // Draw crimes
        if (this.showCrimes) {
            this.drawCrimes();
        }
        
        // Draw home location
        if (this.homeLocation && this.showHome) {
            this.drawHomeLocation();
        }
    }
    
    drawGrid() {
        this.overlayCtx.strokeStyle = '#ddd';
        this.overlayCtx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= this.gridSize; x++) {
            const pixelX = x * this.cellSize;
            this.overlayCtx.beginPath();
            this.overlayCtx.moveTo(pixelX, 0);
            this.overlayCtx.lineTo(pixelX, this.canvasSize);
            this.overlayCtx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.gridSize; y++) {
            const pixelY = y * this.cellSize;
            this.overlayCtx.beginPath();
            this.overlayCtx.moveTo(0, pixelY);
            this.overlayCtx.lineTo(this.canvasSize, pixelY);
            this.overlayCtx.stroke();
        }
    }
    
    drawCrimes() {
        this.crimes.forEach((crime, index) => {
            const centerX = crime.x * this.cellSize + this.cellSize / 2;
            const centerY = crime.y * this.cellSize + this.cellSize / 2;
            
            // Draw crime marker
            this.overlayCtx.fillStyle = '#e74c3c';
            this.overlayCtx.beginPath();
            this.overlayCtx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
            this.overlayCtx.fill();
            
            // Draw border
            this.overlayCtx.strokeStyle = '#c0392b';
            this.overlayCtx.lineWidth = 2;
            this.overlayCtx.stroke();
            
            // Draw number
            this.overlayCtx.fillStyle = 'white';
            this.overlayCtx.font = 'bold 12px Arial';
            this.overlayCtx.textAlign = 'center';
            this.overlayCtx.textBaseline = 'middle';
            this.overlayCtx.fillText((index + 1).toString(), centerX, centerY);
        });
    }
    
    drawHomeLocation() {
        const centerX = this.homeLocation.x * this.cellSize + this.cellSize / 2;
        const centerY = this.homeLocation.y * this.cellSize + this.cellSize / 2;
        
        // Draw home marker (house shape)
        this.overlayCtx.fillStyle = '#2c3e50';
        this.overlayCtx.strokeStyle = '#34495e';
        this.overlayCtx.lineWidth = 2;
        
        // Draw house base (square)
        const size = 12;
        this.overlayCtx.fillRect(centerX - size/2, centerY - size/4, size, size/2);
        this.overlayCtx.strokeRect(centerX - size/2, centerY - size/4, size, size/2);
        
        // Draw roof (triangle)
        this.overlayCtx.beginPath();
        this.overlayCtx.moveTo(centerX - size/2 - 2, centerY - size/4);
        this.overlayCtx.lineTo(centerX, centerY - size/2 - 2);
        this.overlayCtx.lineTo(centerX + size/2 + 2, centerY - size/4);
        this.overlayCtx.closePath();
        this.overlayCtx.fill();
        this.overlayCtx.stroke();
        
        // Draw door
        this.overlayCtx.fillStyle = '#ecf0f1';
        this.overlayCtx.fillRect(centerX - 2, centerY - size/4, 4, size/2);
        
        // Draw label
        this.overlayCtx.fillStyle = 'white';
        this.overlayCtx.font = 'bold 10px Arial';
        this.overlayCtx.textAlign = 'center';
        this.overlayCtx.textBaseline = 'middle';
        this.overlayCtx.strokeStyle = '#2c3e50';
        this.overlayCtx.lineWidth = 3;
        this.overlayCtx.strokeText('H', centerX, centerY + size/2 + 8);
        this.overlayCtx.fillText('H', centerX, centerY + size/2 + 8);
    }
    
    renderHeatmap() {
        // Clear heatmap canvas
        this.heatmapCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);
        
        // Create image data for heatmap
        const imageData = this.heatmapCtx.createImageData(this.canvasSize, this.canvasSize);
        const data = imageData.data;
        
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const probability = this.probabilityGrid[x][y];
                
                if (probability > 0) {
                    // Calculate color based on probability
                    const intensity = Math.min(probability * this.intensity, 1);
                    const red = Math.floor(255 * intensity);
                    const green = Math.floor(255 * (1 - intensity) * 0.5);
                    const blue = 0;
                    const alpha = Math.floor(255 * intensity * 0.7);
                    
                    // Fill the entire cell
                    for (let px = 0; px < this.cellSize; px++) {
                        for (let py = 0; py < this.cellSize; py++) {
                            const pixelX = x * this.cellSize + px;
                            const pixelY = y * this.cellSize + py;
                            
                            if (pixelX < this.canvasSize && pixelY < this.canvasSize) {
                                const index = (pixelY * this.canvasSize + pixelX) * 4;
                                data[index] = red;     // Red
                                data[index + 1] = green; // Green
                                data[index + 2] = blue;  // Blue
                                data[index + 3] = alpha; // Alpha
                            }
                        }
                    }
                }
            }
        }
        
        this.heatmapCtx.putImageData(imageData, 0, 0);
    }
    
    renderSmoothHeatmap() {
        // Clear heatmap canvas
        this.heatmapCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);
        
        // Create higher resolution probability grid for smoother visualization
        const smoothGrid = [];
        const smoothCellSize = this.canvasSize / this.heatmapResolution;
        
        for (let x = 0; x < this.heatmapResolution; x++) {
            smoothGrid[x] = [];
            for (let y = 0; y < this.heatmapResolution; y++) {
                // Convert smooth grid coordinates to original grid coordinates
                const origX = (x / this.heatmapResolution) * this.gridSize;
                const origY = (y / this.heatmapResolution) * this.gridSize;
                
                // Interpolate probability value
                smoothGrid[x][y] = this.interpolateProbability(origX, origY);
            }
        }
        
        // Create image data for smooth heatmap
        const imageData = this.heatmapCtx.createImageData(this.canvasSize, this.canvasSize);
        const data = imageData.data;
        
        for (let x = 0; x < this.heatmapResolution; x++) {
            for (let y = 0; y < this.heatmapResolution; y++) {
                const probability = smoothGrid[x][y];
                
                if (probability > 0) {
                    // Enhanced color mapping with distinct probability ranges
                    const intensity = Math.min(probability * this.intensity, 1);
                    const percentage = intensity * 100;
                    
                    let red, green, blue, alpha;
                    
                    // Strong color coding based on probability ranges
                    if (percentage < 10) {
                        // 0-10%: Dark Blue (Sehr niedrig)
                        red = 0;
                        green = 0;
                        blue = 128;
                        alpha = 180;
                    } else if (percentage < 20) {
                        // 10-20%: Blue (Niedrig)
                        red = 0;
                        green = 102;
                        blue = 204;
                        alpha = 190;
                    } else if (percentage < 30) {
                        // 20-30%: Light Blue (Gering)
                        red = 0;
                        green = 204;
                        blue = 255;
                        alpha = 200;
                    } else if (percentage < 40) {
                        // 30-40%: Cyan-Green (Mäßig)
                        red = 0;
                        green = 255;
                        blue = 153;
                        alpha = 210;
                    } else if (percentage < 50) {
                        // 40-50%: Green (Mittel)
                        red = 102;
                        green = 255;
                        blue = 51;
                        alpha = 220;
                    } else if (percentage < 60) {
                        // 50-60%: Yellow-Green (Erhöht)
                        red = 204;
                        green = 255;
                        blue = 0;
                        alpha = 230;
                    } else if (percentage < 70) {
                        // 60-70%: Yellow (Hoch)
                        red = 255;
                        green = 204;
                        blue = 0;
                        alpha = 240;
                    } else if (percentage < 80) {
                        // 70-80%: Orange (Sehr hoch)
                        red = 255;
                        green = 102;
                        blue = 0;
                        alpha = 250;
                    } else if (percentage < 90) {
                        // 80-90%: Red-Orange (Extrem hoch)
                        red = 255;
                        green = 51;
                        blue = 0;
                        alpha = 255;
                    } else {
                        // 90-100%: Dark Red (Maximum)
                        red = 204;
                        green = 0;
                        blue = 0;
                        alpha = 255;
                    }
                    
                    // Fill multiple pixels for smoother appearance
                    const pixelsPerCell = Math.ceil(this.canvasSize / this.heatmapResolution);
                    for (let px = 0; px < pixelsPerCell; px++) {
                        for (let py = 0; py < pixelsPerCell; py++) {
                            const pixelX = x * pixelsPerCell + px;
                            const pixelY = y * pixelsPerCell + py;
                            
                            if (pixelX < this.canvasSize && pixelY < this.canvasSize) {
                                const index = (pixelY * this.canvasSize + pixelX) * 4;
                                data[index] = red;     // Red
                                data[index + 1] = green; // Green
                                data[index + 2] = blue;  // Blue
                                data[index + 3] = alpha; // Alpha
                            }
                        }
                    }
                }
            }
        }
        
        this.heatmapCtx.putImageData(imageData, 0, 0);
    }
    
    interpolateProbability(x, y) {
        // Bilinear interpolation for smooth probability values
        const x1 = Math.floor(x);
        const y1 = Math.floor(y);
        const x2 = Math.min(x1 + 1, this.gridSize - 1);
        const y2 = Math.min(y1 + 1, this.gridSize - 1);
        
        const fx = x - x1;
        const fy = y - y1;
        
        // Get probability values at grid corners
        const p11 = this.probabilityGrid[x1] ? this.probabilityGrid[x1][y1] || 0 : 0;
        const p12 = this.probabilityGrid[x1] ? this.probabilityGrid[x1][y2] || 0 : 0;
        const p21 = this.probabilityGrid[x2] ? this.probabilityGrid[x2][y1] || 0 : 0;
        const p22 = this.probabilityGrid[x2] ? this.probabilityGrid[x2][y2] || 0 : 0;
        
        // Bilinear interpolation
        const p1 = p11 * (1 - fx) + p21 * fx;
        const p2 = p12 * (1 - fx) + p22 * fx;
        
        return p1 * (1 - fy) + p2 * fy;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rossmoApp = new RossmoHeatmap();
});


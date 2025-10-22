// Game State (게임 상태)
let gameState = {
    resources: {
        wood: 0,
        stone: 0,
        food: 0,
        water: 0,
        bread: 0
    },
    buildings: {
        house: {
            level: 0,
            population: 0
        },
        restaurant: {
            level: 0,
            workers: 0 // 현재 배치된 요리사 수
        },
        sawmill: { // 나무 생산 보너스
            level: 0
        },
        quarry: { // 돌 생산 보너스
            level: 0
        },
        waterplant: { // 물 생산 보너스
            level: 0
        },
        farm: { // 식량 생산 보너스
            level: 0
        }
    },
    workers: {
        wood: 0,
        stone: 0,
        food: 0,
        water: 0
    },
    lastBreadCheck: Date.now(),
    gameFinished: false 
};

// Population Goal (인구 목표)
const POPULATION_GOAL = 128;

// Max Workers per Restaurant Level (식당 레벨당 최대 요리사 수)
const MAX_WORKERS_PER_RESTAURANT_LEVEL = 4;

// Resource Node Data (자원 노드 정보)
const resourceNodes = [
    // Wood Nodes (나무 노드)
    { type: 'wood', icon: '🌲', x: 15, y: 20 },
    { type: 'wood', icon: '🌳', x: 25, y: 15 },
    { type: 'wood', icon: '🌲', x: 35, y: 25 },
    { type: 'wood', icon: '🌳', x: 20, y: 35 },
    { type: 'wood', icon: '🌲', x: 30, y: 40 },
    
    // Stone Nodes (돌 노드)
    { type: 'stone', icon: '⛰️', x: 70, y: 15 },
    { type: 'stone', icon: '🗿', x: 80, y: 25 },
    { type: 'stone', icon: '⛰️', x: 85, y: 35 },
    { type: 'stone', icon: '🪨', x: 75, y: 45 },
    
    // Food Nodes (식량 노드)
    { type: 'food', icon: '🌾', x: 45, y: 70 },
    { type: 'food', icon: '🚜', x: 55, y: 75 },
    { type: 'food', icon: '🌾', x: 65, y: 70 },
    { type: 'food', icon: '🌽', x: 50, y: 80 },
    { type: 'food', icon: '🥕', x: 60, y: 85 },
    
    // Water Nodes (물 노드)
    { type: 'water', icon: '🏞️', x: 20, y: 60 },
    { type: 'water', icon: '💧', x: 15, y: 70 },
    { type: 'water', icon: '🏊', x: 25, y: 75 },
    { type: 'water', icon: '⛲', x: 30, y: 65 }
];

/**
 * Initializes the game map by creating resource node elements.
 */
function initializeMap() {
    const gameMap = document.getElementById('game-map');
    
    resourceNodes.forEach((node, index) => {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'resource-node';
        nodeElement.innerHTML = node.icon;
        nodeElement.style.left = `${node.x}%`;
        nodeElement.style.top = `${node.y}%`;
        nodeElement.id = `node-${index}`;
        
        // Add click event for manual harvesting
        nodeElement.addEventListener('click', () => {
            if (!gameState.gameFinished) { 
                harvestResource(node.type, nodeElement, node.x, node.y);
            }
        });
        
        gameMap.appendChild(nodeElement);
    });
}

/**
 * Harvests a single unit of the specified resource.
 * @param {string} type - The resource type ('wood', 'stone', 'food', 'water').
 * @param {HTMLElement} element - The map element clicked.
 * @param {number} x - X coordinate for floating text.
 * @param {number} y - Y coordinate for floating text.
 */
function harvestResource(type, element, x, y) {
    if (gameState.gameFinished) return;

    gameState.resources[type]++;
    
    // Animation effect
    element.classList.add('harvesting');
    setTimeout(() => {
        element.classList.remove('harvesting');
    }, 500);
    
    // Create floating text
    createFloatingText(`+1`, x, y, element.parentNode);
    
    updateUI();
}

/**
 * Creates a floating text animation for visual feedback.
 * @param {string} text - The text to display.
 * @param {number} x - X coordinate (%).
 * @param {number} y - Y coordinate (%).
 * @param {HTMLElement} container - The container element.
 */
function createFloatingText(text, x, y, container) {
    const floatingText = document.createElement('div');
    floatingText.className = 'floating-text';
    floatingText.textContent = text;
    floatingText.style.left = `${x}%`;
    floatingText.style.top = `${y}%`;
    
    container.appendChild(floatingText);
    
    // Remove after 1 second
    setTimeout(() => {
        container.removeChild(floatingText);
    }, 1000);
}

// --- Building Functions (건물 관련 함수) ---

/**
 * Builds the first House.
 */
function buildHouse() {
    if (gameState.gameFinished) return;

    const woodCost = 10;
    const stoneCost = 5;
    
    if (gameState.resources.wood >= woodCost && gameState.resources.stone >= stoneCost) {
        gameState.resources.wood -= woodCost;
        gameState.resources.stone -= stoneCost;
        gameState.buildings.house.level = 1;
        gameState.buildings.house.population = 2; // Initial population
        updateUI();
        checkWinCondition();
    } else {
        showMessage('자원이 부족합니다! (나무 10개, 돌 5개 필요)', 'warning');
    }
}

/**
 * Upgrades the House, increasing population capacity.
 */
function upgradeHouse() {
    if (gameState.gameFinished) return;
    
    const currentLevel = gameState.buildings.house.level;
    const woodCost = 20 * currentLevel;
    const stoneCost = 10 * currentLevel;
    
    if (gameState.resources.wood >= woodCost && gameState.resources.stone >= stoneCost) {
        gameState.resources.wood -= woodCost;
        gameState.resources.stone -= stoneCost;
        gameState.buildings.house.level++;
        gameState.buildings.house.population = Math.pow(2, gameState.buildings.house.level);
        updateUI();
        checkWinCondition();
    } else {
        showMessage(`자원이 부족합니다! (나무 ${woodCost}개, 돌 ${stoneCost}개 필요)`, 'warning');
    }
}

/**
 * Builds the first Restaurant (Bread production).
 */
function buildRestaurant() {
    if (gameState.gameFinished) return;
    
    const woodCost = 15;
    const stoneCost = 8;
    
    if (gameState.resources.wood >= woodCost && gameState.resources.stone >= stoneCost) {
        gameState.resources.wood -= woodCost;
        gameState.resources.stone -= stoneCost;
        gameState.buildings.restaurant.level = 1;
        updateUI();
    } else {
        showMessage('자원이 부족합니다! (나무 15개, 돌 8개 필요)', 'warning');
    }
}

/**
 * Upgrades the Restaurant, increasing max chef capacity.
 */
function upgradeRestaurant() {
    if (gameState.gameFinished) return;
    
    const currentLevel = gameState.buildings.restaurant.level;
    const woodCost = 30 * currentLevel;
    const stoneCost = 15 * currentLevel;
    
    if (gameState.resources.wood >= woodCost && gameState.resources.stone >= stoneCost) {
        gameState.resources.wood -= woodCost;
        gameState.resources.stone -= stoneCost;
        gameState.buildings.restaurant.level++;
        updateUI();
    } else {
        showMessage(`자원이 부족합니다! (나무 ${woodCost}개, 돌 ${stoneCost}개 필요)`, 'warning');
    }
}

/**
 * Assigns or unassigns a worker to the restaurant (Chef).
 * Chef assignment is limited by total population and restaurant level.
 * @param {number} change - 1 for assign, -1 for unassign.
 */
function assignRestaurantWorker(change) {
    if (gameState.gameFinished) return;
    
    const totalPopulation = gameState.buildings.house.population;
    const currentAssigned = Object.values(gameState.workers).reduce((sum, count) => sum + count, 0) + gameState.buildings.restaurant.workers;
    const maxRestaurantWorkers = gameState.buildings.restaurant.level * MAX_WORKERS_PER_RESTAURANT_LEVEL;
    
    if (change > 0) {
        // Assign worker
        if (currentAssigned < totalPopulation) {
            if (gameState.buildings.restaurant.workers < maxRestaurantWorkers) {
                gameState.buildings.restaurant.workers++;
            } else {
                showMessage(`식당 레벨(${gameState.buildings.restaurant.level})이 허용하는 최대 요리사 수(${maxRestaurantWorkers}명)를 초과할 수 없습니다!`, 'error');
                return;
            }
        } else {
            showMessage('배치할 수 있는 유휴 인구가 없습니다!', 'error');
            return;
        }
    } else if (change < 0) {
        // Unassign worker
        if (gameState.buildings.restaurant.workers > 0) {
            gameState.buildings.restaurant.workers--;
        } else {
            return;
        }
    }
    
    updateUI();
}

/**
 * Builds the Sawmill (Wood production bonus).
 */
function buildSawmill() {
    if (gameState.gameFinished) return;
    
    const woodCost = 50;
    const stoneCost = 20;
    if (gameState.resources.wood >= woodCost && gameState.resources.stone >= stoneCost) {
        gameState.resources.wood -= woodCost;
        gameState.resources.stone -= stoneCost;
        gameState.buildings.sawmill.level = 1;
        updateUI();
    } else {
        showMessage('자원이 부족합니다! (나무 50개, 돌 20개 필요)', 'warning');
    }
}

/**
 * Upgrades the Sawmill.
 */
function upgradeSawmill() {
    if (gameState.gameFinished) return;
    
    const currentLevel = gameState.buildings.sawmill.level;
    const woodCost = 100 * currentLevel;
    const stoneCost = 40 * currentLevel;
    if (gameState.resources.wood >= woodCost && gameState.resources.stone >= stoneCost) {
        gameState.resources.wood -= woodCost;
        gameState.resources.stone -= stoneCost;
        gameState.buildings.sawmill.level++;
        updateUI();
    } else {
        showMessage(`자원이 부족합니다! (나무 ${woodCost}개, 돌 ${stoneCost}개 필요)`, 'warning');
    }
}

/**
 * Builds the Quarry (Stone production bonus).
 */
function buildQuarry() {
    if (gameState.gameFinished) return;
    
    const stoneCost = 50;
    const woodCost = 20;
    if (gameState.resources.stone >= stoneCost && gameState.resources.wood >= woodCost) {
        gameState.resources.stone -= stoneCost;
        gameState.resources.wood -= woodCost;
        gameState.buildings.quarry.level = 1;
        updateUI();
    } else {
        showMessage('자원이 부족합니다! (돌 50개, 나무 20개 필요)', 'warning');
    }
}

/**
 * Upgrades the Quarry.
 */
function upgradeQuarry() {
    if (gameState.gameFinished) return;
    
    const currentLevel = gameState.buildings.quarry.level;
    const stoneCost = 100 * currentLevel;
    const woodCost = 40 * currentLevel;
    if (gameState.resources.stone >= stoneCost && gameState.resources.wood >= woodCost) {
        gameState.resources.stone -= stoneCost;
        gameState.resources.wood -= woodCost;
        gameState.buildings.quarry.level++;
        updateUI();
    } else {
        showMessage(`자원이 부족합니다! (돌 ${stoneCost}개, 나무 ${woodCost}개 필요)`, 'warning');
    }
}

/**
 * Builds the Water Plant (Water production bonus).
 */
function buildWaterPlant() {
    if (gameState.gameFinished) return;
    
    const stoneCost = 30;
    const woodCost = 30;
    if (gameState.resources.stone >= stoneCost && gameState.resources.wood >= woodCost) {
        gameState.resources.stone -= stoneCost;
        gameState.resources.wood -= woodCost;
        gameState.buildings.waterplant.level = 1;
        updateUI();
    } else {
        showMessage('자원이 부족합니다! (돌 30개, 나무 30개 필요)', 'warning');
    }
}

/**
 * Upgrades the Water Plant.
 */
function upgradeWaterPlant() {
    if (gameState.gameFinished) return;
    
    const currentLevel = gameState.buildings.waterplant.level;
    const stoneCost = 60 * currentLevel;
    const woodCost = 60 * currentLevel;
    if (gameState.resources.stone >= stoneCost && gameState.resources.wood >= woodCost) {
        gameState.resources.stone -= stoneCost;
        gameState.resources.wood -= woodCost;
        gameState.buildings.waterplant.level++;
        updateUI();
    } else {
        showMessage(`자원이 부족합니다! (돌 ${stoneCost}개, 나무 ${woodCost}개 필요)`, 'warning');
    }
}

/**
 * Builds the Farm (Food production bonus).
 */
function buildFarm() {
    if (gameState.gameFinished) return;
    
    const woodCost = 40;
    const waterCost = 20; 
    if (gameState.resources.wood >= woodCost && gameState.resources.water >= waterCost) {
        gameState.resources.wood -= woodCost;
        gameState.resources.water -= waterCost;
        gameState.buildings.farm.level = 1;
        updateUI();
    } else {
        showMessage('자원이 부족합니다! (나무 40개, 물 20개 필요)', 'warning');
    }
}

/**
 * Upgrades the Farm.
 */
function upgradeFarm() {
    if (gameState.gameFinished) return;
    
    const currentLevel = gameState.buildings.farm.level;
    const woodCost = 80 * currentLevel;
    const waterCost = 40 * currentLevel;
    if (gameState.resources.wood >= woodCost && gameState.resources.water >= waterCost) {
        gameState.resources.wood -= woodCost;
        gameState.resources.water -= waterCost;
        gameState.buildings.farm.level++;
        updateUI();
    } else {
        showMessage(`자원이 부족합니다! (나무 ${woodCost}개, 물 ${waterCost}개 필요)`, 'warning');
    }
}

// --- Production & Consumption Logic (생산 및 소모 로직) ---

/**
 * Produces bread based on assigned chefs and available resources.
 * Chef: Water 1 + Food 1 -> Bread 1
 */
function produceBread() {
    const restaurantWorkers = gameState.buildings.restaurant.workers;
    
    for (let i = 0; i < restaurantWorkers; i++) {
        if (gameState.resources.water >= 1 && gameState.resources.food >= 1) {
            gameState.resources.water -= 1;
            gameState.resources.food -= 1;
            gameState.resources.bread += 1;
        }
    }
}

/**
 * Consumes bread by the non-chef population.
 * Consumption = Math.ceil(Math.sqrt(Consuming Population) * 1.5)
 * @returns {boolean} True if bread is sufficient for work, false otherwise.
 */
function consumeBread() {
    const totalPopulation = gameState.buildings.house.population;
    const restaurantWorkers = gameState.buildings.restaurant.workers;
    // Chefs do not consume bread
    const consumingPopulation = totalPopulation - restaurantWorkers; 
    if (consumingPopulation <= 0) return true; 

    // Calculate bread needed
    const baseConsumption = Math.sqrt(consumingPopulation);
    const breadNeeded = Math.ceil(baseConsumption * 1.5); 
    
    if (gameState.resources.bread >= breadNeeded) {
        gameState.resources.bread -= breadNeeded;
        return true; // Work continues
    } else {
        return false; // Work stops due to hunger
    }
}

/**
 * Updates the bread status UI element.
 */
function updateBreadStatus() {
    const breadStatus = document.getElementById('bread-status');
    const totalPopulation = gameState.buildings.house.population;
    const restaurantWorkers = gameState.buildings.restaurant.workers;
    const consumingPopulation = totalPopulation - restaurantWorkers; 

    if (consumingPopulation <= 0 || totalPopulation === 0) {
        breadStatus.innerHTML = '';
        return;
    }

    // Calculate bread needed
    const baseConsumption = Math.sqrt(consumingPopulation);
    const breadNeeded = Math.ceil(baseConsumption * 1.5); 

    if (gameState.resources.bread >= breadNeeded) {
        breadStatus.innerHTML = `<div style="color: #28a745;">🍞 빵 상태: 충분 (${breadNeeded}개 필요)</div>`;
    } else if (gameState.resources.bread > 0) {
        breadStatus.innerHTML = `<div class="bread-warning">⚠️ 빵 부족! ${breadNeeded}개 필요, ${gameState.resources.bread}개 보유</div>`;
    } else {
        breadStatus.innerHTML = `<div style="color: #dc3545; font-weight: bold;">🚫 빵이 없어 일꾼들이 일하지 않습니다! (${breadNeeded}개 필요)</div>`;
    }
}

/**
 * Assigns or unassigns a worker to a specific resource type.
 * @param {string} resourceType - The resource type ('wood', 'stone', 'food', 'water').
 * @param {number} change - 1 for assign, -1 for unassign.
 */
function assignWorker(resourceType, change) {
    if (gameState.gameFinished) return;
    
    const totalPopulation = gameState.buildings.house.population;
    const currentAssigned = Object.values(gameState.workers).reduce((sum, count) => sum + count, 0) + gameState.buildings.restaurant.workers;
    
    if (change > 0) {
        // Assign worker
        if (currentAssigned < totalPopulation) {
            gameState.workers[resourceType]++;
        } else {
            showMessage('배치할 수 있는 인구가 없습니다!', 'error');
            return;
        }
    } else if (change < 0) {
        // Unassign worker
        if (gameState.workers[resourceType] > 0) {
            gameState.workers[resourceType]--;
        } else {
            return;
        }
    }
    
    updateUI();
}

/**
 * Updates the visual worker indicators on the resource nodes.
 */
function updateWorkerIndicators() {
    document.querySelectorAll('.worker-indicator').forEach(el => el.remove());
    
    const workersPerNode = {};
    Object.entries(gameState.workers).forEach(([type, count]) => {
        const nodesOfType = resourceNodes.map((node, index) => ({...node, originalIndex: index})).filter(node => node.type === type);
        if (nodesOfType.length === 0) return;

        // Distribute workers evenly
        const baseWorkers = Math.floor(count / nodesOfType.length);
        let remainder = count % nodesOfType.length;
        
        nodesOfType.forEach((node, i) => {
            const nodeIndex = node.originalIndex;
            workersPerNode[nodeIndex] = baseWorkers + (remainder > 0 ? 1 : 0);
            if(remainder > 0) remainder--;
        });
    });

    // Create indicators on the map
    Object.entries(workersPerNode).forEach(([nodeIndex, count]) => {
         if (count > 0) {
            const nodeElement = document.getElementById(`node-${nodeIndex}`);
            if (nodeElement) {
                const indicator = document.createElement('div');
                indicator.className = 'worker-indicator';
                indicator.textContent = count;
                nodeElement.appendChild(indicator);
            }
        }
    });
}

/**
 * Handles automatic resource production every tick (2 seconds).
 */
function autoProduction() {
    if (gameState.gameFinished) return;

    // 1. Produce Bread first
    produceBread();
    
    // 2. Check Bread Consumption
    const canWork = consumeBread();
    
    // 3. Only produce resources if workers are fed
    if (canWork) {
        // Calculate production bonus (100% per level)
        const bonuses = {
            wood: gameState.buildings.sawmill.level,
            stone: gameState.buildings.quarry.level,
            food: gameState.buildings.farm.level,
            water: gameState.buildings.waterplant.level
        };

        Object.keys(gameState.workers).forEach(resourceType => {
            const workerCount = gameState.workers[resourceType];
            const bonusLevel = bonuses[resourceType] || 0;
            
            // Production Multiplier: Base 1 + Bonus Level (Level 1 means 100% bonus = 1, total 2x production)
            const productionMultiplier = 1 + bonusLevel; 
            
            gameState.resources[resourceType] += workerCount * productionMultiplier;
        });
    } else {
        // If bread is insufficient, production is effectively 0 for non-chef workers.
    }
    
    updateUI();
}

/**
 * Updates all dynamic elements in the UI to reflect current game state.
 */
function updateUI() {
    if (gameState.gameFinished) return;

    // Resource Counts
    document.getElementById('wood-count').textContent = gameState.resources.wood;
    document.getElementById('stone-count').textContent = gameState.resources.stone;
    document.getElementById('food-count').textContent = gameState.resources.food;
    document.getElementById('water-count').textContent = gameState.resources.water;
    document.getElementById('bread-count').textContent = gameState.resources.bread;
    
    // Calculate max restaurant workers based on current level
    const maxRestaurantWorkers = gameState.buildings.restaurant.level * MAX_WORKERS_PER_RESTAURANT_LEVEL;

    // Building Info
    document.getElementById('house-level').textContent = gameState.buildings.house.level;
    document.getElementById('house-population').textContent = gameState.buildings.house.population;
    
    document.getElementById('restaurant-level').textContent = gameState.buildings.restaurant.level;
    document.getElementById('restaurant-workers').textContent = gameState.buildings.restaurant.workers;
    document.getElementById('restaurant-max-workers').textContent = maxRestaurantWorkers; 

    // Population Info
    const totalPopulation = gameState.buildings.house.population;
    const assignedPopulation = Object.values(gameState.workers).reduce((sum, count) => sum + count, 0) + gameState.buildings.restaurant.workers;
    const idlePopulation = totalPopulation - assignedPopulation;
    
    document.getElementById('total-population').textContent = totalPopulation;
    document.getElementById('assigned-population').textContent = assignedPopulation;
    document.getElementById('idle-population').textContent = idlePopulation;
    
    // Worker Counts (Resource Gatherers)
    document.getElementById('wood-workers').textContent = gameState.workers.wood;
    document.getElementById('stone-workers').textContent = gameState.workers.stone;
    document.getElementById('food-workers').textContent = gameState.workers.food;
    document.getElementById('water-workers').textContent = gameState.workers.water;
    
    // Bread Status
    updateBreadStatus();
    
    // Worker Assignment Panel Visibility
    const workerAssignment = document.getElementById('worker-assignment');
    workerAssignment.style.display = totalPopulation > 0 ? 'block' : 'none';
    
    // --- Building Button States ---
    
    // House Buttons
    const buildHouseBtn = document.getElementById('build-house-btn');
    const upgradeHouseBtn = document.getElementById('upgrade-house-btn');
    
    if (gameState.buildings.house.level === 0) {
        buildHouseBtn.style.display = 'inline-block';
        upgradeHouseBtn.style.display = 'none';
        buildHouseBtn.disabled = gameState.resources.wood < 10 || gameState.resources.stone < 5;
    } else {
        buildHouseBtn.style.display = 'none';
        upgradeHouseBtn.style.display = 'inline-block';
        
        const currentLevel = gameState.buildings.house.level;
        const woodCost = 20 * currentLevel;
        const stoneCost = 10 * currentLevel;
        
        document.getElementById('upgrade-wood-cost').textContent = woodCost;
        document.getElementById('upgrade-stone-cost').textContent = stoneCost;
        
        upgradeHouseBtn.disabled = gameState.resources.wood < woodCost || gameState.resources.stone < stoneCost;
    }
    
    // Restaurant Buttons
    const buildRestaurantBtn = document.getElementById('build-restaurant-btn');
    const upgradeRestaurantBtn = document.getElementById('upgrade-restaurant-btn');
    const restaurantWorkerControl = document.getElementById('restaurant-worker-control');
    const restaurantWorkerPlusBtn = document.getElementById('restaurant-worker-plus-btn');

    if (gameState.buildings.restaurant.level === 0) {
        buildRestaurantBtn.style.display = 'inline-block';
        upgradeRestaurantBtn.style.display = 'none';
        restaurantWorkerControl.style.display = 'none';
        buildRestaurantBtn.disabled = gameState.resources.wood < 15 || gameState.resources.stone < 8;
    } else {
        buildRestaurantBtn.style.display = 'none';
        upgradeRestaurantBtn.style.display = 'inline-block';
        restaurantWorkerControl.style.display = 'block';
        
        const currentLevel = gameState.buildings.restaurant.level;
        const woodCost = 30 * currentLevel;
        const stoneCost = 15 * currentLevel;
        
        document.getElementById('upgrade-restaurant-wood').textContent = woodCost;
        document.getElementById('upgrade-restaurant-stone').textContent = stoneCost;
        
        upgradeRestaurantBtn.disabled = gameState.resources.wood < woodCost || gameState.resources.stone < stoneCost;
        
        // Chef Assignment Button State (Limited by idle population AND restaurant level)
        const canAssignMore = assignedPopulation < totalPopulation;
        const isMaxWorkers = gameState.buildings.restaurant.workers >= maxRestaurantWorkers;
        restaurantWorkerPlusBtn.disabled = !canAssignMore || isMaxWorkers;
    }

    // Sawmill Buttons (Wood Bonus)
    const sawmillLevel = gameState.buildings.sawmill.level;
    const buildSawmillBtn = document.getElementById('build-sawmill-btn');
    const upgradeSawmillBtn = document.getElementById('upgrade-sawmill-btn');
    document.getElementById('sawmill-level').textContent = sawmillLevel;
    document.getElementById('sawmill-bonus').textContent = sawmillLevel * 100;
    if (sawmillLevel === 0) {
        buildSawmillBtn.style.display = 'inline-block';
        upgradeSawmillBtn.style.display = 'none';
        buildSawmillBtn.disabled = gameState.resources.wood < 50 || gameState.resources.stone < 20;
    } else {
        buildSawmillBtn.style.display = 'none';
        upgradeSawmillBtn.style.display = 'inline-block';
        const woodCost = 100 * sawmillLevel;
        const stoneCost = 40 * sawmillLevel;
        document.getElementById('upgrade-sawmill-wood').textContent = woodCost;
        document.getElementById('upgrade-sawmill-stone').textContent = stoneCost;
        upgradeSawmillBtn.disabled = gameState.resources.wood < woodCost || gameState.resources.stone < stoneCost;
    }

    // Quarry Buttons (Stone Bonus)
    const quarryLevel = gameState.buildings.quarry.level;
    const buildQuarryBtn = document.getElementById('build-quarry-btn');
    const upgradeQuarryBtn = document.getElementById('upgrade-quarry-btn');
    document.getElementById('quarry-level').textContent = quarryLevel;
    document.getElementById('quarry-bonus').textContent = quarryLevel * 100;
    if (quarryLevel === 0) {
        buildQuarryBtn.style.display = 'inline-block';
        upgradeQuarryBtn.style.display = 'none';
        buildQuarryBtn.disabled = gameState.resources.stone < 50 || gameState.resources.wood < 20;
    } else {
        buildQuarryBtn.style.display = 'none';
        upgradeQuarryBtn.style.display = 'inline-block';
        const stoneCost = 100 * quarryLevel;
        const woodCost = 40 * quarryLevel;
        document.getElementById('upgrade-quarry-stone').textContent = stoneCost;
        document.getElementById('upgrade-quarry-wood').textContent = woodCost;
        upgradeQuarryBtn.disabled = gameState.resources.stone < stoneCost || gameState.resources.wood < woodCost;
    }

    // Water Plant Buttons (Water Bonus)
    const waterplantLevel = gameState.buildings.waterplant.level;
    const buildWaterPlantBtn = document.getElementById('build-waterplant-btn');
    const upgradeWaterPlantBtn = document.getElementById('upgrade-waterplant-btn');
    document.getElementById('waterplant-level').textContent = waterplantLevel;
    document.getElementById('waterplant-bonus').textContent = waterplantLevel * 100;
    if (waterplantLevel === 0) {
        buildWaterPlantBtn.style.display = 'inline-block';
        upgradeWaterPlantBtn.style.display = 'none';
        buildWaterPlantBtn.disabled = gameState.resources.stone < 30 || gameState.resources.wood < 30;
    } else {
        buildWaterPlantBtn.style.display = 'none';
        upgradeWaterPlantBtn.style.display = 'inline-block';
        const stoneCost = 60 * waterplantLevel;
        const woodCost = 60 * waterplantLevel;
        document.getElementById('upgrade-waterplant-stone').textContent = stoneCost;
        document.getElementById('upgrade-waterplant-wood').textContent = woodCost;
        upgradeWaterPlantBtn.disabled = gameState.resources.stone < stoneCost || gameState.resources.wood < woodCost;
    }

    // Farm Buttons (Food Bonus)
    const farmLevel = gameState.buildings.farm.level;
    const buildFarmBtn = document.getElementById('build-farm-btn');
    const upgradeFarmBtn = document.getElementById('upgrade-farm-btn');
    document.getElementById('farm-level').textContent = farmLevel;
    document.getElementById('farm-bonus').textContent = farmLevel * 100;
    if (farmLevel === 0) {
        buildFarmBtn.style.display = 'inline-block';
        upgradeFarmBtn.style.display = 'none';
        buildFarmBtn.disabled = gameState.resources.wood < 40 || gameState.resources.water < 20;
    } else {
        buildFarmBtn.style.display = 'none';
        upgradeFarmBtn.style.display = 'inline-block';
        const woodCost = 80 * farmLevel;
        const waterCost = 40 * farmLevel;
        document.getElementById('upgrade-farm-wood').textContent = woodCost;
        document.getElementById('upgrade-farm-water').textContent = waterCost;
        upgradeFarmBtn.disabled = gameState.resources.wood < woodCost || gameState.resources.water < waterCost;
    }
    
    // Update map indicators
    updateWorkerIndicators();
}

/**
 * Checks the win condition (reaching the population goal).
 */
function checkWinCondition() {
    if (gameState.buildings.house.population >= POPULATION_GOAL) {
        showEndingScreen();
    }
}

/**
 * Displays the ending screen.
 */
function showEndingScreen() {
    gameState.gameFinished = true;
    document.getElementById('ending-screen').classList.add('active');
}

/**
 * Displays a custom message box instead of using alert/confirm.
 * @param {string} message - The message content.
 * @param {string} type - The message type ('info', 'warning', 'error').
 */
function showMessage(message, type = 'info') {
    if (gameState.gameFinished) return; 

    const mapContainer = document.getElementById('game-map');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.position = 'absolute';
    messageElement.style.top = '10%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, 0)';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.zIndex = '200';
    messageElement.style.opacity = '1';
    messageElement.style.transition = 'opacity 0.5s, top 0.5s';
    messageElement.style.fontSize = '16px';
    messageElement.style.fontWeight = 'bold';

    if (type === 'warning') {
        messageElement.style.backgroundColor = '#ffc107';
        messageElement.style.color = '#343a40';
    } else if (type === 'error') {
        messageElement.style.backgroundColor = '#dc3545';
        messageElement.style.color = 'white';
    } else {
        messageElement.style.backgroundColor = '#28a745';
        messageElement.style.color = 'white';
    }

    mapContainer.appendChild(messageElement);

    setTimeout(() => {
        messageElement.style.opacity = '0';
        messageElement.style.top = '5%';
    }, 1500);

    setTimeout(() => {
        mapContainer.removeChild(messageElement);
    }, 2000);
}

// --- Game Setup (게임 시작) ---

// Initialize the map and UI when the DOM is fully loaded.
window.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    updateUI();
});

// Start the automatic production timer (runs every 2 seconds).
setInterval(autoProduction, 2000);

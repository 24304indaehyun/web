        // 게임 상태
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
                sawmill: { // 나무
                    level: 0
                },
                quarry: { // 돌
                    level: 0
                },
                waterplant: { // 물
                    level: 0
                },
                farm: { // 식량
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
            gameFinished: false,
            
            // --- 재해 상태 추적 ---
            activeDisaster: null, // 현재 활성화된 재해 타입 ('wildfire', 'drought', 'earthquake', 'plague')
            activeEffects: {
                wildfireNodes: [], // 불이 난 노드 인덱스 목록
                droughtActive: false, // 가뭄 패널티 플래그
                plagueActive: false // 역병 시각 효과 플래그
            }
        };
        
        // --- 재해 관련 전역 변수 ---
        const DISASTER_THRESHOLD = 32; // 인구 32명 이상일 때 재해 활성화
        const DISASTER_INTERVAL = 10000; // 10초마다 재해 확인
        let disasterTimer = null;
        
        // 인구 목표 설정
        const POPULATION_GOAL = 128;
        
        // 식당 레벨당 최대 요리사 수
        const MAX_WORKERS_PER_RESTAURANT_LEVEL = 4;
        
        // 자원 노드 정보 (기존과 동일)
        const resourceNodes = [
            // 나무 노드들 - index 0~4
            { type: 'wood', icon: '🌲', x: 15, y: 20 },
            { type: 'wood', icon: '🌳', x: 25, y: 15 },
            { type: 'wood', icon: '🌲', x: 35, y: 25 },
            { type: 'wood', icon: '🌳', x: 20, y: 35 },
            { type: 'wood', icon: '🌲', x: 30, y: 40 },
            
            // 돌 노드들 - index 5~8
            { type: 'stone', icon: '⛰️', x: 70, y: 15 },
            { type: 'stone', icon: '🗿', x: 80, y: 25 },
            { type: 'stone', icon: '⛰️', x: 85, y: 35 },
            { type: 'stone', icon: '🗻', x: 75, y: 45 },
            
            // 식량 노드들 - index 9~13
            { type: 'food', icon: '🌾', x: 45, y: 70 },
            { type: 'food', icon: '🥦', x: 55, y: 75 },
            { type: 'food', icon: '🌾', x: 65, y: 70 },
            { type: 'food', icon: '🌽', x: 50, y: 80 },
            { type: 'food', icon: '🥕', x: 60, y: 85 },
            
            // 물 노드들 - index 14~17
            { type: 'water', icon: '🏞️', x: 20, y: 60 },
            { type: 'water', icon: '💧', x: 15, y: 70 },
            { type: 'water', icon: '🌊', x: 25, y: 75 },
            { type: 'water', icon: '⛲', x: 30, y: 65 }
        ];
        
        // 지도 초기화 (인덱스 저장)
        function initializeMap() {
            const gameMap = document.getElementById('game-map');
            
            resourceNodes.forEach((node, index) => {
                const nodeElement = document.createElement('div');
                nodeElement.className = 'resource-node';
                nodeElement.innerHTML = node.icon;
                nodeElement.style.left = `${node.x}%`;
                nodeElement.style.top = `${node.y}%`;
                nodeElement.id = `node-${index}`;
                
                // 클릭 이벤트 추가
                nodeElement.addEventListener('click', () => {
                    if (!gameState.gameFinished) {
                        harvestResource(node.type, nodeElement, node.x, node.y);
                    }
                });
                
                gameMap.appendChild(nodeElement);
            });
        }
        
        // 자원 채취 함수 (게임 종료 시 확인 로직 추가)
        function harvestResource(type, element, x, y) {
            if (gameState.gameFinished) return;

            gameState.resources[type]++;
            
            // 애니메이션 효과
            element.classList.add('harvesting');
            setTimeout(() => {
                element.classList.remove('harvesting');
            }, 500);
            
            // 플로팅 텍스트 생성
            createFloatingText(`+1`, x, y, element.parentNode);
            
            updateUI();
        }
        
        // 플로팅 텍스트 생성 (기존과 동일)
        function createFloatingText(text, x, y, container) {
            const floatingText = document.createElement('div');
            floatingText.className = 'floating-text';
            floatingText.textContent = text;
            floatingText.style.left = `${x}%`;
            floatingText.style.top = `${y}%`;
            
            container.appendChild(floatingText);
            
            // 1초 후 제거
            setTimeout(() => {
                container.removeChild(floatingText);
            }, 1000);
        }
        
        // 건물 건설/업그레이드 함수들 (로직 변경 없음)
        function buildHouse() {
            if (gameState.gameFinished) return;
            const woodCost = 10;
            const stoneCost = 5;
            if (gameState.resources.wood >= woodCost && gameState.resources.stone >= stoneCost) {
                gameState.resources.wood -= woodCost;
                gameState.resources.stone -= stoneCost;
                gameState.buildings.house.level = 1;
                gameState.buildings.house.population = 2;
                updateUI();
                checkWinCondition();
                startDisasterTimer();
            } else { showMessage('자원이 부족합니다! (나무 10개, 돌 5개 필요)', 'warning'); }
        }
        
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
                startDisasterTimer();
            } else { showMessage(`자원이 부족합니다! (나무 ${woodCost}개, 돌 ${stoneCost}개 필요)`, 'warning'); }
        }

        function buildRestaurant() {
            if (gameState.gameFinished) return;
            const woodCost = 15;
            const stoneCost = 8;
            if (gameState.resources.wood >= woodCost && gameState.resources.stone >= stoneCost) {
                gameState.resources.wood -= woodCost;
                gameState.resources.stone -= stoneCost;
                gameState.buildings.restaurant.level = 1;
                updateUI();
            } else { showMessage('자원이 부족합니다! (나무 15개, 돌 8개 필요)', 'warning'); }
        }

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
            } else { showMessage(`자원이 부족합니다! (나무 ${woodCost}개, 돌 ${stoneCost}개 필요)`, 'warning'); }
        }
        
        function assignRestaurantWorker(change) {
            if (gameState.gameFinished) return;
            const totalPopulation = gameState.buildings.house.population;
            const currentAssigned = Object.values(gameState.workers).reduce((sum, count) => sum + count, 0) + gameState.buildings.restaurant.workers;
            const maxRestaurantWorkers = gameState.buildings.restaurant.level * MAX_WORKERS_PER_RESTAURANT_LEVEL;
            
            if (change > 0) {
                if (currentAssigned < totalPopulation) {
                    if (gameState.buildings.restaurant.workers < maxRestaurantWorkers) {
                        gameState.buildings.restaurant.workers++;
                    } else {
                        showMessage(`식당 레벨(${gameState.buildings.restaurant.level})이 허용하는 최대 요리사 수(${maxRestaurantWorkers}명)를 초과할 수 없습니다!`, 'error');
                        return;
                    }
                } else { showMessage('배치할 수 있는 유휴 인구가 없습니다!', 'error'); return; }
            } else if (change < 0) {
                if (gameState.buildings.restaurant.workers > 0) {
                    gameState.buildings.restaurant.workers--;
                } else { return; }
            }
            updateUI();
        }

        function buildSawmill() {
            if (gameState.gameFinished) return;
            const woodCost = 50;
            const stoneCost = 20;
            if (gameState.resources.wood >= woodCost && gameState.resources.stone >= stoneCost) {
                gameState.resources.wood -= woodCost;
                gameState.resources.stone -= stoneCost;
                gameState.buildings.sawmill.level = 1;
                updateUI();
            } else { showMessage('자원이 부족합니다! (나무 50개, 돌 20개 필요)', 'warning'); }
        }

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
            } else { showMessage(`자원이 부족합니다! (나무 ${woodCost}개, 돌 ${stoneCost}개 필요)`, 'warning'); }
        }

        function buildQuarry() {
            if (gameState.gameFinished) return;
            const stoneCost = 50;
            const woodCost = 20;
            if (gameState.resources.stone >= stoneCost && gameState.resources.wood >= woodCost) {
                gameState.resources.stone -= stoneCost;
                gameState.resources.wood -= woodCost;
                gameState.buildings.quarry.level = 1;
                updateUI();
            } else { showMessage('자원이 부족합니다! (돌 50개, 나무 20개 필요)', 'warning'); }
        }

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
            } else { showMessage(`자원이 부족합니다! (돌 ${stoneCost}개, 나무 ${woodCost}개 필요)`, 'warning'); }
        }

        function buildWaterPlant() {
            if (gameState.gameFinished) return;
            const stoneCost = 30;
            const woodCost = 30;
            if (gameState.resources.stone >= stoneCost && gameState.resources.wood >= woodCost) {
                gameState.resources.stone -= stoneCost;
                gameState.resources.wood -= woodCost;
                gameState.buildings.waterplant.level = 1;
                updateUI();
            } else { showMessage('자원이 부족합니다! (돌 30개, 나무 30개 필요)', 'warning'); }
        }

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
            } else { showMessage(`자원이 부족합니다! (돌 ${stoneCost}개, 나무 ${woodCost}개 필요)`, 'warning'); }
        }

        function buildFarm() {
            if (gameState.gameFinished) return;
            const woodCost = 40;
            const waterCost = 20; 
            if (gameState.resources.wood >= woodCost && gameState.resources.water >= waterCost) {
                gameState.resources.wood -= woodCost;
                gameState.resources.water -= waterCost;
                gameState.buildings.farm.level = 1;
                updateUI();
            } else { showMessage('자원이 부족합니다! (나무 40개, 물 20개 필요)', 'warning'); }
        }

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
            } else { showMessage(`자원이 부족합니다! (나무 ${woodCost}개, 물 ${waterCost}개 필요)`, 'warning'); }
        }
        
        // 빵 생산/소모 (로직 변경 없음)
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
        
        function consumeBread() {
            const totalPopulation = gameState.buildings.house.population;
            const restaurantWorkers = gameState.buildings.restaurant.workers;
            const consumingPopulation = totalPopulation - restaurantWorkers; 
            if (consumingPopulation <= 0) return true; 

            const baseConsumption = Math.sqrt(consumingPopulation);
            const breadNeeded = Math.ceil(baseConsumption * 1.5); 
            
            if (gameState.resources.bread >= breadNeeded) {
                gameState.resources.bread -= breadNeeded;
                return true; 
            } else {
                return false; 
            }
        }
        
        function updateBreadStatus() {
            const breadStatus = document.getElementById('bread-status');
            const totalPopulation = gameState.buildings.house.population;
            const restaurantWorkers = gameState.buildings.restaurant.workers;
            const consumingPopulation = totalPopulation - restaurantWorkers; 

            if (consumingPopulation <= 0 || totalPopulation === 0) {
                breadStatus.innerHTML = '';
                return;
            }

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
        
        // 일꾼 배치/해제 함수 (로직 변경 없음)
        function assignWorker(resourceType, change) {
            if (gameState.gameFinished) return;
            const totalPopulation = gameState.buildings.house.population;
            const currentAssigned = Object.values(gameState.workers).reduce((sum, count) => sum + count, 0) + gameState.buildings.restaurant.workers;
            
            if (change > 0) {
                if (currentAssigned < totalPopulation) {
                    gameState.workers[resourceType]++;
                } else { showMessage('배치할 수 있는 인구가 없습니다!', 'error'); return; }
            } else if (change < 0) {
                if (gameState.workers[resourceType] > 0) {
                    gameState.workers[resourceType]--;
                } else { return; }
            }
            updateUI();
        }
        
        // 일꾼 인디케이터 업데이트 (로직 변경 없음)
        function updateWorkerIndicators() {
            document.querySelectorAll('.worker-indicator').forEach(el => el.remove());
            
            const workersPerNode = {};
            Object.entries(gameState.workers).forEach(([type, count]) => {
                const nodesOfType = resourceNodes.map((node, index) => ({...node, originalIndex: index})).filter(node => node.type === type);
                if (nodesOfType.length === 0) return;

                const baseWorkers = Math.floor(count / nodesOfType.length);
                let remainder = count % nodesOfType.length;
                
                nodesOfType.forEach((node, i) => {
                    const nodeIndex = node.originalIndex;
                    workersPerNode[nodeIndex] = baseWorkers + (remainder > 0 ? 1 : 0);
                    if(remainder > 0) remainder--;
                });
            });

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
        
        // 자동 자원 생산 (재해 효과 플래그를 사용하여 업데이트)
        function autoProduction() {
            if (gameState.gameFinished) return;

            produceBread();
            
            const canWork = consumeBread();
            
            if (canWork) {
                const bonuses = {
                    wood: gameState.buildings.sawmill.level,
                    stone: gameState.buildings.quarry.level,
                    food: gameState.buildings.farm.level,
                    water: gameState.buildings.waterplant.level
                };

                let woodMultiplier = 1;
                let waterMultiplier = 1;

                // 재해 효과 적용
                // 산불: 불이 하나라도 남아있으면 나무꾼 효율 50% 감소
                if (gameState.activeEffects.wildfireNodes.length > 0) {
                    woodMultiplier = 0.5;
                }
                // 가뭄: 가뭄이 활성화되어 있으면 물 생산량 30% 감소
                if (gameState.activeEffects.droughtActive) {
                    waterMultiplier = 0.7;
                }

                Object.keys(gameState.workers).forEach(resourceType => {
                    const workerCount = gameState.workers[resourceType];
                    const bonusLevel = bonuses[resourceType] || 0;
                    
                    let productionMultiplier = (1 + bonusLevel); 
                    
                    if (resourceType === 'wood') productionMultiplier *= woodMultiplier;
                    if (resourceType === 'water') productionMultiplier *= waterMultiplier;
                    
                    gameState.resources[resourceType] += Math.floor(workerCount * productionMultiplier);
                });
            }
            
            updateUI();
        }
        
        // UI 업데이트 함수
        function updateUI() {
            if (gameState.gameFinished) return;

            // 자원 업데이트 (기존과 동일)
            document.getElementById('wood-count').textContent = gameState.resources.wood;
            document.getElementById('stone-count').textContent = gameState.resources.stone;
            document.getElementById('food-count').textContent = gameState.resources.food;
            document.getElementById('water-count').textContent = gameState.resources.water;
            document.getElementById('bread-count').textContent = gameState.resources.bread;
            
            // ... (건물 및 인구 업데이트 로직은 변경 없음) ...
            
            // 식당 최대 요리사 수 계산
            const maxRestaurantWorkers = gameState.buildings.restaurant.level * MAX_WORKERS_PER_RESTAURANT_LEVEL;

            // 집/식당 정보 업데이트
            document.getElementById('house-level').textContent = gameState.buildings.house.level;
            document.getElementById('house-population').textContent = gameState.buildings.house.population;
            
            document.getElementById('restaurant-level').textContent = gameState.buildings.restaurant.level;
            document.getElementById('restaurant-workers').textContent = gameState.buildings.restaurant.workers;
            document.getElementById('restaurant-max-workers').textContent = maxRestaurantWorkers; // 최대 요리사 수 업데이트

            // 인구 정보 업데이트
            const totalPopulation = gameState.buildings.house.population;
            const assignedPopulation = Object.values(gameState.workers).reduce((sum, count) => sum + count, 0) + gameState.buildings.restaurant.workers;
            const idlePopulation = totalPopulation - assignedPopulation;
            
            document.getElementById('total-population').textContent = totalPopulation;
            document.getElementById('assigned-population').textContent = assignedPopulation;
            document.getElementById('idle-population').textContent = idlePopulation;
            
            // ** 역병 시각 효과 **
            const plagueVisual = document.getElementById('plague-visual');
            if (gameState.activeEffects.plagueActive) {
                plagueVisual.innerHTML = `<span class="plague-indicator" title="역병이 퍼지고 있습니다">💀</span>`;
            } else {
                plagueVisual.innerHTML = '';
            }

            // 일꾼 수 업데이트 (기존과 동일)
            document.getElementById('wood-workers').textContent = gameState.workers.wood;
            document.getElementById('stone-workers').textContent = gameState.workers.stone;
            document.getElementById('food-workers').textContent = gameState.workers.food;
            document.getElementById('water-workers').textContent = gameState.workers.water;
            
            // 빵 상태 업데이트 (기존과 동일)
            updateBreadStatus();
            
            // 일꾼 배치 패널 표시/숨김 (기존과 동일)
            const workerAssignment = document.getElementById('worker-assignment');
            if (totalPopulation > 0) {
                workerAssignment.style.display = 'block';
            } else {
                workerAssignment.style.display = 'none';
            }
            
            // 건물 버튼 상태 업데이트 (로직 변경 없음)
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
                const canAssignMore = assignedPopulation < totalPopulation;
                const isMaxWorkers = gameState.buildings.restaurant.workers >= maxRestaurantWorkers;
                restaurantWorkerPlusBtn.disabled = !canAssignMore || isMaxWorkers;
            }
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
            
            updateWorkerIndicators();
        }
        
        // --- 승리 조건 확인 함수 추가 ---
        function checkWinCondition() {
            if (gameState.buildings.house.population >= POPULATION_GOAL) {
                showEndingScreen();
            }
        }

        // --- 엔딩 화면 표시 함수 추가 ---
        function showEndingScreen() {
            gameState.gameFinished = true;
            document.getElementById('ending-screen').classList.add('active');
        }


        // --- 커스텀 메시지 표시 함수 (기존과 동일) ---
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

        // --- 재해 시스템 함수 ---

        // 산불 진화 함수 (플레이어 상호작용)
        function extinguishFire(nodeIndex) {
            if (gameState.gameFinished) return;

            const nodeElement = document.getElementById(`node-${nodeIndex}`);
            const fireElement = nodeElement ? nodeElement.querySelector('.fire-overlay') : null;

            if (fireElement) {
                nodeElement.removeChild(fireElement);
                // 배열에서 해당 노드 인덱스 제거
                gameState.activeEffects.wildfireNodes = gameState.activeEffects.wildfireNodes.filter(idx => idx !== nodeIndex);

                showMessage(`🔥 산불을 진화했습니다! (${gameState.activeEffects.wildfireNodes.length}개 남음)`, 'info');

                // 모든 불이 꺼지면 wildfire 효과 즉시 종료
                if (gameState.activeEffects.wildfireNodes.length === 0) {
                    endWildfireEffect();
                }
                updateUI();
            }
        }
        
        // 산불 효과 종료 (타이머 만료 또는 진화 완료 시)
        function endWildfireEffect() {
            // 모든 시각 효과 제거
            const fireNodes = gameState.activeEffects.wildfireNodes;
            fireNodes.forEach(nodeIndex => {
                const nodeElement = document.getElementById(`node-${nodeIndex}`);
                const fireElement = nodeElement ? nodeElement.querySelector('.fire-overlay') : null;
                if (fireElement) nodeElement.removeChild(fireElement);
            });

            gameState.activeEffects.wildfireNodes = [];
            
            // 재해 알림
            if (gameState.activeDisaster === 'wildfire') {
                showAlert('산불 진화 완료! 나무꾼 생산이 정상화됩니다.', 'info');
                gameState.activeDisaster = null;
            }
        }

        // 가뭄 효과 종료
        function endDroughtEffect() {
            gameState.activeEffects.droughtActive = false;
            if (gameState.activeDisaster === 'drought') {
                showAlert('가뭄이 끝났습니다. 물 생산량이 정상화됩니다.', 'info');
                gameState.activeDisaster = null;
            }
        }

        // 역병 시각 효과 종료
        function endPlagueEffect() {
            gameState.activeEffects.plagueActive = false;
            if (gameState.activeDisaster === 'plague') {
                 // 역병은 즉시 효과이므로, 시각 효과만 제거
                 gameState.activeDisaster = null;
            }
            updateUI();
        }

        // 재해 목록 정의
        const disasters = [
            {
                type: 'drought',
                name: '가뭄 ☀️',
                duration: 20000, // 20초 지속
                effect: (start) => {
                    const waterLoss = Math.floor(gameState.resources.water * 0.2);
                    const foodLoss = Math.floor(gameState.resources.food * 0.3);
                    gameState.resources.water = Math.max(0, gameState.resources.water - waterLoss);
                    gameState.resources.food = Math.max(0, gameState.resources.food - foodLoss);

                    gameState.activeEffects.droughtActive = true;

                    const alertText = `🚨 가뭄 발생! 💧물 ${waterLoss}개, 🌾식량 ${foodLoss}개 손실. 💧물 생산량이 30% 감소합니다!`;
                    showAlert(alertText, 'warning');
                    updateUI();

                    setTimeout(endDroughtEffect, disasters.find(d => d.type === 'drought').duration);
                }
            },
            {
                type: 'earthquake',
                name: '지진 ⚡',
                duration: 1000, // 흔들림은 1초만 지속
                effect: (start) => {
                    // ** 시각 효과: 화면 흔들림 **
                    document.getElementById('game-container').classList.add('earthquake-shake');
                    setTimeout(() => {
                        document.getElementById('game-container').classList.remove('earthquake-shake');
                    }, disasters.find(d => d.type === 'earthquake').duration);

                    const affectedBuildings = ['house', 'restaurant', 'sawmill', 'quarry', 'waterplant', 'farm'];
                    const buildingToHurt = affectedBuildings[Math.floor(Math.random() * affectedBuildings.length)];
                    let currentLevel = gameState.buildings[buildingToHurt].level;

                    if (currentLevel > 1) {
                        gameState.buildings[buildingToHurt].level--;
                        
                        // 인구, 요리사 등 종속된 값 업데이트
                        if (buildingToHurt === 'house') { gameState.buildings.house.population = Math.pow(2, gameState.buildings.house.level); }
                        if (buildingToHurt === 'restaurant') { 
                            const max = gameState.buildings.restaurant.level * MAX_WORKERS_PER_RESTAURANT_LEVEL;
                            if (gameState.buildings.restaurant.workers > max) { gameState.buildings.restaurant.workers = max; }
                        }

                        const alertText = `🚨 지진 발생! 🏘️${buildingToHurt} 건물의 레벨이 1 하락했습니다!`;
                        showAlert(alertText, 'error');
                    } else if (currentLevel === 1) {
                        const stoneLoss = Math.floor(gameState.resources.stone * 0.4);
                        gameState.resources.stone = Math.max(0, gameState.resources.stone - stoneLoss);
                        const alertText = `🚨 지진 발생! ⛰️돌 자원 ${stoneLoss}개 손실!`;
                        showAlert(alertText, 'error');

                    } else {
                        showAlert('지진이 발생했지만, 당신의 마을은 안전했습니다.', 'info');
                    }
                    updateUI();
                    gameState.activeDisaster = null; // 즉시 효과
                }
            },
            {
                type: 'wildfire',
                name: '산불 🔥',
                duration: 30000, // 30초 안에 진압해야 함.
                effect: (start) => {
                    const woodLoss = Math.floor(gameState.resources.wood * 0.5);
                    gameState.resources.wood = Math.max(0, gameState.resources.wood - woodLoss);

                    // ** 시각 효과 & 상호작용 **
                    const woodNodeIndices = resourceNodes
                        .map((node, index) => node.type === 'wood' ? index : -1)
                        .filter(index => index !== -1);
                    
                    woodNodeIndices.forEach(index => {
                        const nodeElement = document.getElementById(`node-${index}`);
                        const fireElement = document.createElement('div');
                        fireElement.className = 'fire-overlay';
                        fireElement.textContent = '🔥';
                        fireElement.onclick = (e) => {
                            e.stopPropagation(); // 노드 클릭 이벤트 방지
                            extinguishFire(index);
                        };
                        nodeElement.appendChild(fireElement);
                        gameState.activeEffects.wildfireNodes.push(index);
                    });


                    const alertText = `🚨 대규모 산불 발생! 🌲나무 자원 ${woodLoss}개 손실. 지도 위의 🔥불을 모두 클릭해서 진화해야 합니다! (나무꾼 효율 50% 감소)`;
                    showAlert(alertText, 'warning');
                    updateUI();
                    
                    // 30초 후, 아직 불이 남아있다면 강제 종료 처리
                    setTimeout(() => {
                        if (gameState.activeDisaster === 'wildfire') {
                            endWildfireEffect();
                        }
                    }, disasters.find(d => d.type === 'wildfire').duration);
                }
            },
            {
                type: 'plague',
                name: '역병 💀',
                duration: 5000, // 시각 효과는 5초 지속
                effect: (start) => {
                    // ** 시각 효과: 해골 아이콘 활성화 **
                    gameState.activeEffects.plagueActive = true;

                    const totalPopulation = gameState.buildings.house.population;
                    const assignedWorkers = Object.values(gameState.workers).reduce((sum, count) => sum + count, 0);
                    const idleAndChefPopulation = totalPopulation - assignedWorkers;
                    
                    // 인구 손실 계산 (10% ~ 30% 사이)
                    const populationLossRate = (Math.random() * 0.2) + 0.1; 
                    let workersToKill = Math.ceil(idleAndChefPopulation * populationLossRate);
                    
                    if (workersToKill > 0) {
                        let deadWorkers = workersToKill;

                        // 요리사부터 감소 (가장 중요한 인력 보호를 위해 가장 나중에 감소하는 것이 일반적이지만, 역병의 무작위성을 위해 순서 변경 가능)
                        let workersRemoved = Math.min(deadWorkers, gameState.buildings.restaurant.workers);
                        deadWorkers -= workersRemoved;
                        gameState.buildings.restaurant.workers -= workersRemoved;
                        
                        // 유휴 인구 감소 (집의 인구수만 직접 감소)
                        workersRemoved = Math.min(deadWorkers, totalPopulation - assignedWorkers - gameState.buildings.restaurant.workers);
                        deadWorkers -= workersRemoved;
                        
                        // 최종 총 인구 감소 (사망자 수만큼)
                        gameState.buildings.house.population -= (workersToKill - deadWorkers);

                        // 인구 레벨 조정 (인구 수가 레벨의 최대치를 넘지 않도록)
                        let newLevel = gameState.buildings.house.level;
                        while (gameState.buildings.house.population < Math.pow(2, newLevel - 1) && newLevel > 1) {
                            newLevel--;
                        }
                        gameState.buildings.house.level = newLevel;
                        
                        const alertText = `🚨 역병 발생! 총 ${workersToKill - deadWorkers}명의 인구가 사망했습니다! (총 인구 ${gameState.buildings.house.population}명)`;
                        showAlert(alertText, 'error');
                    } else {
                        showAlert('역병이 발생했지만, 당신의 도시는 잘 막아냈습니다.', 'info');
                    }
                    updateUI();

                    setTimeout(endPlagueEffect, disasters.find(d => d.type === 'plague').duration);
                }
            }
        ];

        // 재해 타이머 시작
        function startDisasterTimer() {
            if (gameState.gameFinished) return;

            if (gameState.buildings.house.population < DISASTER_THRESHOLD) {
                if (disasterTimer) {
                    clearInterval(disasterTimer);
                    disasterTimer = null;
                }
                return;
            }

            if (!disasterTimer) {
                 disasterTimer = setInterval(rollForDisaster, DISASTER_INTERVAL);
            }
        }
        
        // 재해 무작위 선택 및 실행
        function rollForDisaster() {
            if (gameState.gameFinished || gameState.activeDisaster) return; // 이미 재해가 발생 중이면 건너뜀

            // 20% 확률로 재해 발생
            if (Math.random() < 0.20) {
                const randomDisaster = disasters[Math.floor(Math.random() * disasters.length)];
                activateDisaster(randomDisaster);
            }
        }

        // 재해 활성화
        function activateDisaster(disaster) {
            // 이미 재해가 활성화되어 있다면 무시 (수동 실행 시에도 적용)
            if (gameState.activeDisaster) {
                showMessage(`[DEV] 이미 ${gameState.activeDisaster} 재해가 활성화되어 있습니다.`, 'warning');
                return;
            }
            
            gameState.activeDisaster = disaster.type;
            disaster.effect(true);
        }

        // 재해 알림 표시
        function showAlert(message, type) {
            const alertElement = document.getElementById('disaster-alert');
            alertElement.textContent = message;
            
            if (type === 'warning') {
                alertElement.style.backgroundColor = '#ffc107'; 
                alertElement.style.color = '#343a40';
            } else if (type === 'error') {
                alertElement.style.backgroundColor = '#dc3545';
                alertElement.style.color = 'white';
            } else {
                alertElement.style.backgroundColor = '#28a745';
                alertElement.style.color = 'white';
            }
            
            alertElement.classList.add('active');

            setTimeout(() => {
                alertElement.classList.remove('active');
            }, 3000); 
        }

        // --- 개발자 커맨드 함수 (수정됨: 재해 명령 추가) ---
        function executeDevCommand() {
            if (gameState.gameFinished) return; 

            const inputElement = document.getElementById('dev-command-input');
            const command = inputElement.value.trim().toLowerCase();
            inputElement.value = ''; // 입력창 비우기

            // 명령어 패턴: type: value
            const parts = command.split(':').map(p => p.trim());
            
            if (parts.length !== 2) {
                showMessage('잘못된 형식입니다. (자원이름): (갯수) 또는 disaster: (타입) 형식으로 입력하세요.', 'error');
                return;
            }

            const commandType = parts[0];
            const commandValue = parts[1];

            if (commandType === 'disaster') {
                const disasterType = commandValue;
                const disasterObj = disasters.find(d => d.type === disasterType);

                if (!disasterObj) {
                    showMessage(`존재하지 않는 재해 타입입니다: ${disasterType} (가능: drought, earthquake, wildfire, plague)`, 'error');
                    return;
                }
                
                if (gameState.activeDisaster) {
                    showMessage(`이미 ${gameState.activeDisaster} 재해가 활성화되어 있습니다.`, 'warning');
                    return;
                }

                activateDisaster(disasterObj);
                showMessage(`[DEV] 재해 ${disasterObj.name}를 강제 발생시켰습니다!`, 'info');
                return;
            }

            // 기존 자원 추가 로직
            const resourceType = commandType;
            const amountStr = commandValue;

            // 유효한 자원 목록 (wood, stone, food, water, bread)
            if (!gameState.resources.hasOwnProperty(resourceType)) {
                showMessage(`존재하지 않는 자원 이름입니다: ${resourceType}`, 'error');
                return;
            }

            const amount = parseInt(amountStr);

            if (isNaN(amount) || amount <= 0) {
                showMessage('갯수는 0보다 큰 숫자로 입력해야 합니다.', 'error');
                return;
            }

            gameState.resources[resourceType] += amount;
            showMessage(`[DEV] ${resourceType} 자원 ${amount}개를 추가했습니다.`, 'info');
            updateUI();
        }

        // 게임 시작 시 초기화
        window.addEventListener('DOMContentLoaded', () => {
            initializeMap();
            updateUI();
            
            // 개발자 커맨드 Enter 키 바인딩
            const devInput = document.getElementById('dev-command-input');
            if (devInput) {
                devInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        executeDevCommand();
                    }
                });
            }
        });
        
        // 자동 생산 타이머 (2초마다)
        setInterval(autoProduction, 2000);
        
        // 인구가 32명 이상이면 재해 타이머를 시작 (초기화 후 한번 확인)
        startDisasterTimer();

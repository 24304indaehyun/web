        // 상수 정의
        const HARVEST_AMOUNT = 5;
        const FOOD_PER_POPULATION = 1; // 2초당 인구 1명당 소비하는 식량
        const BREAD_PRODUCTION_PER_WORKER = 3; // 2초당 요리사 1명당 생산하는 빵
        const RESOURCE_PRODUCTION_PER_WORKER = 2; // 2초당 노동자 1명당 생산하는 기본 자원
        const MAX_POPULATION_PER_LEVEL = 10;
        const DISASTER_THRESHOLD = 32; // 재해 발생 최소 인구
        const DISASTER_INTERVAL = 10000; // 10초마다 재해 트리거 확인

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

        // 지도 자원 위치 (아이콘 및 좌표)
        const resourceNodes = [
            { icon: '🌲', type: 'wood', x: 15, y: 10 },
            { icon: '🌲', type: 'wood', x: 25, y: 35 },
            { icon: '⛏️', type: 'stone', x: 70, y: 20 },
            { icon: '⛏️', type: 'stone', x: 85, y: 50 },
            { icon: '🌾', type: 'food', x: 40, y: 60 },
            { icon: '🌾', type: 'food', x: 60, y: 75 },
            { icon: '💧', type: 'water', x: 5, y: 80 },
            { icon: '💧', type: 'water', x: 90, y: 90 },
        ];

        let disasterTimer = null; // 재해 타이머 ID

        // --- UI 및 메시지 함수 ---

        // 메시지 표시 함수
        function showMessage(text, type = 'info', duration = 3000) {
            const box = document.getElementById('message-box');
            clearTimeout(box.timer);
            box.textContent = text;
            
            box.style.backgroundColor = type === 'error' ? '#dc3545' : (type === 'success' ? '#10b981' : '#4f46e5');
            
            box.classList.add('active');
            box.timer = setTimeout(() => {
                box.classList.remove('active');
            }, duration);
        }

        // 재해 알림창 표시/숨김 함수
        function showAlert(message, type = 'info', duration = 3000) {
            const alertElement = document.getElementById('disaster-alert');
            clearTimeout(alertElement.timer);
            
            if (!message) {
                alertElement.classList.remove('active');
                return;
            }
            
            alertElement.textContent = message;
            alertElement.style.backgroundColor = (type === 'error' || type === 'disaster') ? '#dc3545' : '#4a90e2';
            alertElement.classList.add('active');
            
            if (duration > 0) {
                alertElement.timer = setTimeout(() => {
                    alertElement.classList.remove('active');
                }, duration);
            }
        }


        // UI 업데이트
        function updateUI() {
            // 1. 자원 통계 업데이트
            const resourceList = document.getElementById('resource-stats');
            resourceList.innerHTML = '';
            const resourceNames = {
                wood: '나무 🌲',
                stone: '돌 ⛏️',
                food: '식량 🌾',
                water: '물 💧',
                bread: '빵 🥖'
            };

            for (const key in gameState.resources) {
                const li = document.createElement('li');
                li.innerHTML = `${resourceNames[key]}: <span>${gameState.resources[key].toLocaleString()}</span>`;
                resourceList.appendChild(li);
            }
            
            // 2. 인구 및 노동자 통계 업데이트
            const totalPopulation = gameState.buildings.house.population;
            const assignedWorkers = gameState.workers.wood + gameState.workers.stone + gameState.workers.food + gameState.workers.water + gameState.buildings.restaurant.workers;
            const availableWorkers = totalPopulation - assignedWorkers;
            
            document.getElementById('population-count').textContent = totalPopulation.toLocaleString();
            document.getElementById('available-workers').textContent = availableWorkers.toLocaleString();

            // 3. 건물 레벨 및 정보 업데이트
            document.getElementById('house-level').textContent = gameState.buildings.house.level;
            document.getElementById('house-population').textContent = gameState.buildings.house.population;
            
            document.getElementById('restaurant-level').textContent = gameState.buildings.restaurant.level;
            document.getElementById('restaurant-workers').textContent = gameState.buildings.restaurant.workers;
            
            document.getElementById('sawmill-level').textContent = gameState.buildings.sawmill.level;
            document.getElementById('sawmill-workers').textContent = gameState.workers.wood;
            
            document.getElementById('quarry-level').textContent = gameState.buildings.quarry.level;
            document.getElementById('quarry-workers').textContent = gameState.workers.stone;
            
            document.getElementById('waterplant-level').textContent = gameState.buildings.waterplant.level;
            document.getElementById('waterplant-workers').textContent = gameState.workers.water;
            
            document.getElementById('farm-level').textContent = gameState.buildings.farm.level;
            document.getElementById('farm-workers').textContent = gameState.workers.food;

            // 4. 승리 조건 확인
            if (totalPopulation >= 1000 && !gameState.gameFinished) {
                gameState.gameFinished = true;
                showMessage("🎉 축하합니다! 도시를 성공적으로 발전시켰습니다!", 'success', 0);
            }

            // 5. 재해 타이머 시작/정지
            if (totalPopulation >= DISASTER_THRESHOLD && disasterTimer === null) {
                startDisasterTimer();
                showMessage(`인구가 ${DISASTER_THRESHOLD}명을 넘어 재해 시스템이 활성화됩니다!`, 'info');
            } else if (totalPopulation < DISASTER_THRESHOLD && disasterTimer !== null) {
                clearInterval(disasterTimer);
                disasterTimer = null;
                showMessage("인구가 감소하여 재해 시스템이 비활성화됩니다.", 'info');
                // 재해 비활성화 시 현재 활성 재해 종료
                if(gameState.activeDisaster) {
                    endDisaster(gameState.activeDisaster);
                }
            }
        }

        // --- 지도 및 자원 함수 ---

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
                nodeElement.setAttribute('data-type', node.type); // <-- CSS 연동을 위해 data-type 추가
                
                // 클릭 이벤트 추가
                nodeElement.addEventListener('click', () => {
                    if (!gameState.gameFinished) {
                        harvestResource(node.type, nodeElement, node.x, node.y);
                    }
                });
                
                gameMap.appendChild(nodeElement);
            });
        }

        // 자원 수집 함수
        function harvestResource(type, element, x, y) {
            gameState.resources[type] += HARVEST_AMOUNT;
            updateUI();
            
            // 시각 효과
            const floatElement = document.createElement('div');
            floatElement.textContent = `+${HARVEST_AMOUNT} ${type === 'wood' ? '🌲' : type === 'stone' ? '⛏️' : type === 'food' ? '🌾' : '💧'}`;
            floatElement.style.position = 'absolute';
            floatElement.style.left = `${x}%`;
            floatElement.style.top = `${y}%`;
            floatElement.style.color = '#fff';
            floatElement.style.fontWeight = 'bold';
            floatElement.style.fontSize = '12px';
            floatElement.style.pointerEvents = 'none';
            floatElement.style.textShadow = '1px 1px 2px #000';
            floatElement.style.animation = 'floatUp 1s forwards';

            const gameMap = document.getElementById('game-map');
            gameMap.appendChild(floatElement);

            setTimeout(() => {
                gameMap.removeChild(floatElement);
            }, 1000);
            
            // CSS 애니메이션 키프레임 (JS 내부에서 정의)
            if (!document.getElementById('floatUp-keyframes')) {
                const style = document.createElement('style');
                style.id = 'floatUp-keyframes';
                style.textContent = `
                    @keyframes floatUp {
                        0% { transform: translateY(0); opacity: 1; }
                        100% { transform: translateY(-30px); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
        }


        // --- 노동자 관리 함수 ---

        // 노동자 할당/해제
        function assignWorker(type, change) {
            const totalPopulation = gameState.buildings.house.population;
            const assignedWorkers = gameState.workers.wood + gameState.workers.stone + gameState.workers.food + gameState.workers.water + gameState.buildings.restaurant.workers;
            const availableWorkers = totalPopulation - assignedWorkers;
            
            // 식당 노동자는 별도의 키를 사용
            const workerKey = (type === 'restaurant') ? 'restaurant.workers' : `workers.${type}`;
            const currentWorkers = (type === 'restaurant') ? gameState.buildings.restaurant.workers : gameState.workers[type];

            if (change > 0) {
                if (availableWorkers < change) {
                    showMessage('사용 가능한 노동자가 부족합니다!', 'error');
                    return;
                }
                if (currentWorkers + change > 10 * ((type === 'restaurant' ? gameState.buildings.restaurant.level : gameState.buildings[type === 'wood' ? 'sawmill' : type === 'stone' ? 'quarry' : type === 'water' ? 'waterplant' : 'farm'].level))) {
                     showMessage('건물 레벨에 비해 너무 많은 노동자를 배치할 수 없습니다! 건물을 업그레이드하세요.', 'error');
                     return;
                }
            } else if (change < 0) {
                if (currentWorkers < -change) {
                    showMessage(`이미 ${currentWorkers}명의 노동자만 있습니다.`, 'error');
                    return;
                }
            }
            
            if (type === 'restaurant') {
                gameState.buildings.restaurant.workers += change;
            } else {
                gameState.workers[type] += change;
            }

            updateUI();
            showMessage(`${change > 0 ? '+' : ''}${change}명의 ${type === 'wood' ? '벌목꾼' : type === 'stone' ? '채석꾼' : type === 'food' ? '농부' : type === 'water' ? '물 관리인' : '요리사'}를 할당/해제했습니다.`, 'info');
        }


        // --- 건물 건설 및 업그레이드 함수 (예시: 주택) ---

        function buildHouse() {
            const cost = { wood: 100, stone: 50 };
            if (gameState.buildings.house.level === 0) {
                if (gameState.resources.wood >= cost.wood && gameState.resources.stone >= cost.stone) {
                    gameState.resources.wood -= cost.wood;
                    gameState.resources.stone -= cost.stone;
                    gameState.buildings.house.level = 1;
                    gameState.buildings.house.population = MAX_POPULATION_PER_LEVEL;
                    document.getElementById('build-house-btn').style.display = 'none';
                    document.getElementById('upgrade-house-btn').style.display = 'inline-block';
                    showMessage('🏠 주택 건설 완료! 인구 10명이 추가되었습니다.', 'success');
                } else {
                    showMessage('자원이 부족합니다! (나무 100, 돌 50 필요)', 'error');
                }
            }
            updateUI();
        }

        function upgradeHouse() {
            const currentLevel = gameState.buildings.house.level;
            const cost = { wood: 200 * currentLevel, stone: 100 * currentLevel };

            if (gameState.resources.wood >= cost.wood && gameState.resources.stone >= cost.stone) {
                gameState.resources.wood -= cost.wood;
                gameState.resources.stone -= cost.stone;
                gameState.buildings.house.level += 1;
                gameState.buildings.house.population = gameState.buildings.house.level * MAX_POPULATION_PER_LEVEL;
                
                // 다음 업그레이드 비용 업데이트 (UI만)
                document.getElementById('upgrade-house-btn').textContent = `주택 업그레이드 (나무 ${200 * (currentLevel + 1)}, 돌 ${100 * (currentLevel + 1)})`;

                showMessage(`🏠 주택 레벨 ${gameState.buildings.house.level}로 업그레이드 완료! 최대 인구 증가.`, 'success');
            } else {
                showMessage(`자원이 부족합니다! (나무 ${cost.wood}, 돌 ${cost.stone} 필요)`, 'error');
            }
            updateUI();
        }
        
        // --- 나머지 건물 건설 함수 (간략화) ---
        function buildBuilding(type, wood, stone, water) {
            const cost = { wood, stone, water: water || 0 };
            
            if (gameState.buildings[type].level === 0) {
                if (gameState.resources.wood >= cost.wood && gameState.resources.stone >= cost.stone && gameState.resources.water >= cost.water) {
                    gameState.resources.wood -= cost.wood;
                    gameState.resources.stone -= cost.stone;
                    gameState.resources.water -= cost.water;
                    gameState.buildings[type].level = 1;
                    document.getElementById(`build-${type}-btn`).style.display = 'none';
                    document.getElementById(`upgrade-${type}-btn`).style.display = 'inline-block';
                    showMessage(`${type} 건설 완료!`, 'success');
                } else {
                    showMessage('자원이 부족합니다!', 'error');
                }
            }
        }
        
        function upgradeBuilding(type) {
            const currentLevel = gameState.buildings[type].level;
            const cost = { 
                wood: (type === 'farm' ? 80 : 40) * currentLevel, 
                stone: (type === 'farm' ? 0 : 20) * currentLevel,
                water: (type === 'farm' ? 40 : 0) * currentLevel
            };
            
            if (gameState.resources.wood >= cost.wood && gameState.resources.stone >= cost.stone && gameState.resources.water >= cost.water) {
                gameState.resources.wood -= cost.wood;
                gameState.resources.stone -= cost.stone;
                gameState.resources.water -= cost.water;
                gameState.buildings[type].level += 1;
                
                // 다음 업그레이드 비용 업데이트 (UI만)
                const nextWood = (type === 'farm' ? 80 : 40) * (currentLevel + 1);
                const nextStone = (type === 'farm' ? 0 : 20) * (currentLevel + 1);
                const nextWater = (type === 'farm' ? 40 : 0) * (currentLevel + 1);

                document.getElementById(`upgrade-${type}-btn`).textContent = `${type} 업그레이드 (나무 ${nextWood}` 
                    + (nextStone > 0 ? `, 돌 ${nextStone}` : '')
                    + (nextWater > 0 ? `, 물 ${nextWater}` : '')
                    + `)`;
                
                showMessage(`${type} 레벨 ${gameState.buildings[type].level}로 업그레이드 완료!`, 'success');
            } else {
                showMessage('자원이 부족합니다!', 'error');
            }
        }

        // 벌목장
        function buildSawmill() { buildBuilding('sawmill', 20, 10); updateUI(); }
        function upgradeSawmill() { upgradeBuilding('sawmill'); updateUI(); }
        // 채석장
        function buildQuarry() { buildBuilding('quarry', 20, 10); updateUI(); }
        function upgradeQuarry() { upgradeBuilding('quarry'); updateUI(); }
        // 물 공급 시설
        function buildWaterplant() { buildBuilding('waterplant', 30, 15); updateUI(); }
        function upgradeWaterplant() { upgradeBuilding('waterplant'); updateUI(); }
        // 농장
        function buildFarm() { buildBuilding('farm', 40, 0, 20); updateUI(); }
        function upgradeFarm() { upgradeBuilding('farm'); updateUI(); }
        // 식당
        function buildRestaurant() { buildBuilding('restaurant', 50, 30); updateUI(); }
        function upgradeRestaurant() { upgradeBuilding('restaurant'); updateUI(); }


        // --- 자동 생산 및 인구 변화 로직 ---

        function autoProduction() {
            if (gameState.gameFinished) return;

            // 1. 노동자 자원 생산
            const productionRate = 1; // 2초당 생산 틱
            
            // 건물 레벨 보너스 (1레벨당 10% 증가)
            const getProductionBonus = (type) => 1 + (gameState.buildings[type].level * 0.1);
            
            // 재해 페널티 계산
            const droughtPenalty = gameState.activeEffects.droughtActive ? 0.5 : 1; // 가뭄 시 물, 식량 생산 50% 감소

            // 나무 (벌목장)
            const sawmillBonus = getProductionBonus('sawmill');
            gameState.resources.wood += gameState.workers.wood * RESOURCE_PRODUCTION_PER_WORKER * productionRate * sawmillBonus;

            // 돌 (채석장)
            const quarryBonus = getProductionBonus('quarry');
            gameState.resources.stone += gameState.workers.stone * RESOURCE_PRODUCTION_PER_WORKER * productionRate * quarryBonus;

            // 식량 (농장) - 가뭄 페널티 적용
            const farmBonus = getProductionBonus('farm');
            gameState.resources.food += gameState.workers.food * RESOURCE_PRODUCTION_PER_WORKER * productionRate * farmBonus * droughtPenalty;

            // 물 (물 공급 시설) - 가뭄 페널티 적용
            const waterplantBonus = getProductionBonus('waterplant');
            gameState.resources.water += gameState.workers.water * RESOURCE_PRODUCTION_PER_WORKER * productionRate * waterplantBonus * droughtPenalty;


            // 2. 빵 생산 (식당)
            const restaurantBonus = getProductionBonus('restaurant');
            let breadProduced = gameState.buildings.restaurant.workers * BREAD_PRODUCTION_PER_WORKER * productionRate * restaurantBonus;

            // 빵 생산에 필요한 식량 및 물 (빵 1개당 식량 2, 물 1)
            const foodNeeded = breadProduced * 2;
            const waterNeeded = breadProduced * 1;
            
            if (gameState.resources.food >= foodNeeded && gameState.resources.water >= waterNeeded) {
                gameState.resources.food -= foodNeeded;
                gameState.resources.water -= waterNeeded;
                gameState.resources.bread += breadProduced;
            } else {
                // 재료 부족 시 생산량 조절 (가장 부족한 재료 기준)
                const maxBreadFood = Math.floor(gameState.resources.food / 2);
                const maxBreadWater = Math.floor(gameState.resources.water / 1);
                const actualBread = Math.min(breadProduced, maxBreadFood, maxBreadWater);
                
                if (actualBread > 0) {
                    gameState.resources.food -= actualBread * 2;
                    gameState.resources.water -= actualBread * 1;
                    gameState.resources.bread += actualBread;
                    showMessage('빵 생산 재료가 부족합니다!', 'error', 2000);
                }
            }


            // 3. 인구 식량 소비 및 성장
            const totalPopulation = gameState.buildings.house.population;
            let foodConsumption = totalPopulation * FOOD_PER_POPULATION * productionRate;
            let breadConsumption = totalPopulation * FOOD_PER_POPULATION * productionRate; // 빵도 식량으로 간주하고 소비

            let survival = true;

            // 빵 소비 (우선)
            if (gameState.resources.bread >= breadConsumption) {
                gameState.resources.bread -= breadConsumption;
                foodConsumption = 0; // 빵으로 다 해결했으면 식량 소비는 0
            } else {
                // 빵 부족분은 식량으로 충당
                foodConsumption += (breadConsumption - gameState.resources.bread);
                gameState.resources.bread = 0;
            }

            // 남은 식량 소비
            if (gameState.resources.food >= foodConsumption) {
                gameState.resources.food -= foodConsumption;
            } else {
                // 식량 부족 -> 인구 감소 위험
                survival = false;
            }
            
            // 인구 변화
            if (survival) {
                // 인구 성장 (빵이 있어야 성장)
                if (gameState.resources.bread > 0 && totalPopulation < gameState.buildings.house.level * MAX_POPULATION_PER_LEVEL) {
                    const growthRate = gameState.buildings.house.level * 0.1;
                    const newPopulation = Math.floor(totalPopulation * growthRate / 100);
                    gameState.buildings.house.population += Math.max(1, newPopulation); // 최소 1명씩은 성장
                }
            } else {
                // 식량/빵 부족으로 인구 감소
                const deathCount = Math.ceil(totalPopulation * 0.05); // 5% 감소
                gameState.buildings.house.population = Math.max(0, totalPopulation - deathCount);
                showMessage(`☠️ 식량이 부족하여 인구 ${deathCount}명이 사망했습니다!`, 'error', 3000);
            }
            
            // 역병 페널티 (인구 성장 둔화)
            if (gameState.activeEffects.plagueActive) {
                gameState.buildings.house.population = Math.floor(totalPopulation * 0.99); // 인구 1% 추가 감소
            }


            // 4. UI 업데이트
            updateUI();
            
            // 5. 재해 트리거 확인
            triggerDisaster();
        }
        
        // --- 재해 관리 핵심 함수 (가뭄 시각 효과 포함) ---

        // 가뭄 시각 효과 활성화
        function activateDroughtVisual() {
            const gameContainer = document.getElementById('game-container');
            // 컨테이너에 drought 클래스 추가 (맵 배경 및 노드 변경용)
            gameContainer.classList.add('drought-active');
        }

        // 가뭄 시각 효과 비활성화
        function deactivateDroughtVisual() {
            const gameContainer = document.getElementById('game-container');
            gameContainer.classList.remove('drought-active');
        }

        // 재해 시작 함수
        function startDisaster(type) {
            if (gameState.activeDisaster) return; // 이미 재해 중이면 무시
            
            gameState.activeDisaster = type;
            
            switch (type) {
                case 'wildfire':
                    // 산불 로직 (노드에 불 붙이는 로직 필요)
                    const woodNodes = resourceNodes.map((node, index) => index).filter(i => resourceNodes[i].type === 'wood');
                    const burnNodeIndex = woodNodes[Math.floor(Math.random() * woodNodes.length)];
                    gameState.activeEffects.wildfireNodes = [burnNodeIndex];
                    document.getElementById(`node-${burnNodeIndex}`).innerHTML += '<span class="fire-overlay">🔥</span>';
                    showAlert('🔥 산불 발생! 나무꾼의 효율이 감소합니다. 노드를 클릭해서 불을 끄세요!', 'disaster', 10000);
                    break;
                case 'drought':
                    gameState.activeEffects.droughtActive = true;
                    activateDroughtVisual(); // 가뭄 시각 효과 활성화
                    showAlert('🏜️ 가뭄 발생! 물과 식량 생산량이 크게 감소합니다. 💦', 'disaster', 10000);
                    break;
                case 'earthquake':
                    document.getElementById('game-container').classList.add('earthquake-shake');
                    showAlert('💥 지진 발생! 건물에 피해를 줄 수 있습니다!', 'disaster', 3000);
                    // 3초 후 지진 종료 시각 효과만 해제
                    setTimeout(() => {
                        document.getElementById('game-container').classList.remove('earthquake-shake');
                    }, 3000);
                    break;
                case 'plague':
                    gameState.activeEffects.plagueActive = true;
                    showAlert('💀 역병 발생! 인구 성장이 둔화되고 인구 감소가 가속됩니다.', 'disaster', 10000);
                    break;
            }
            updateUI();
        }

        // 재해 종료 함수
        function endDisaster(type) {
            if (gameState.activeDisaster !== type) return; 
            
            switch (type) {
                case 'wildfire':
                    gameState.activeEffects.wildfireNodes.forEach(index => {
                        const nodeElement = document.getElementById(`node-${index}`);
                        if (nodeElement) {
                            nodeElement.querySelector('.fire-overlay')?.remove();
                        }
                    });
                    gameState.activeEffects.wildfireNodes = [];
                    showAlert('✔️ 산불이 진압되었습니다.', 'info');
                    break;
                case 'drought':
                    gameState.activeEffects.droughtActive = false;
                    deactivateDroughtVisual(); // 가뭄 시각 효과 비활성화
                    showAlert('✔️ 가뭄이 끝났습니다. 강물이 다시 흐릅니다.', 'info');
                    break;
                case 'earthquake':
                    // 지진은 startDisaster에서 시각 효과가 자동 종료됨.
                    break;
                case 'plague':
                    gameState.activeEffects.plagueActive = false;
                    showAlert('✔️ 역병이 물러갔습니다.', 'info');
                    break;
            }
            gameState.activeDisaster = null;
            updateUI();
        }

        // 재해 트리거 함수 (10% 확률로 재해 발생)
        function triggerDisaster() {
            if (gameState.gameFinished || gameState.buildings.house.population < DISASTER_THRESHOLD || gameState.activeDisaster) {
                return;
            }

            // 10% 확률로 재해 발생
            if (Math.random() < 0.1) {
                const disasters = ['wildfire', 'drought', 'earthquake', 'plague'];
                // 인구 64명 이하일 때 plague는 발생하지 않음 (plague는 더 강력한 후반 재해로 설정)
                const availableDisasters = gameState.buildings.house.population >= 64 ? disasters : disasters.filter(d => d !== 'plague');
                
                const randomDisaster = availableDisasters[Math.floor(Math.random() * availableDisasters.length)];
                startDisaster(randomDisaster);
                
                // 산불과 역병, 가뭄은 15초 후 자동 종료되도록 타이머 설정
                if (randomDisaster === 'wildfire' || randomDisaster === 'plague' || randomDisaster === 'drought') {
                    setTimeout(() => {
                        endDisaster(randomDisaster);
                    }, 15000); // 15초 동안 지속
                }
            }
        }

        // 재해 타이머 시작 함수
        function startDisasterTimer() {
            if (disasterTimer === null) {
                disasterTimer = setInterval(triggerDisaster, DISASTER_INTERVAL);
            }
        }
        
        
        // --- 개발자 커맨드 실행 함수 ---
        function executeDevCommand() {
            const input = document.getElementById('dev-command-input');
            const command = input.value.trim().toLowerCase();
            input.value = ''; // 커맨드 초기화

            const parts = command.split(':').map(p => p.trim());
            if (parts.length !== 2) {
                showMessage('잘못된 커맨드 형식입니다. (예: wood: 1000, disaster: drought)', 'error');
                return;
            }

            const commandType = parts[0];
            const commandValue = parts[1];

            if (commandType === 'disaster') {
                const disasterType = commandValue.toLowerCase().trim();
                
                // --- 재해 시작 로직 ---
                if (['wildfire', 'drought', 'earthquake', 'plague'].includes(disasterType)) {
                    startDisaster(disasterType);
                    showMessage(`[DEV] 재해 '${disasterType}'를 발동합니다.`, 'info');
                } else if (disasterType === 'end') { // 재해 종료 커맨드 추가
                    if (gameState.activeDisaster) {
                        endDisaster(gameState.activeDisaster);
                        showMessage(`[DEV] 현재 재해 '${gameState.activeDisaster}'를 종료합니다.`, 'info');
                    } else {
                        showMessage(`[DEV] 현재 활성화된 재해가 없습니다.`, 'info');
                    }
                } else {
                    showMessage(`알 수 없는 재해 타입입니다: ${disasterType}`, 'error');
                }
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
        
        // 함수들을 전역으로 노출하여 HTML에서 사용할 수 있도록 설정
        window.buildHouse = buildHouse;
        window.upgradeHouse = upgradeHouse;
        window.buildRestaurant = buildRestaurant;
        window.upgradeRestaurant = upgradeRestaurant;
        window.buildSawmill = buildSawmill;
        window.upgradeSawmill = upgradeSawmill;
        window.buildQuarry = buildQuarry;
        window.upgradeQuarry = upgradeQuarry;
        window.buildWaterplant = buildWaterplant;
        window.upgradeWaterplant = upgradeWaterplant;
        window.buildFarm = buildFarm;
        window.upgradeFarm = upgradeFarm;
        window.assignWorker = assignWorker;
        window.executeDevCommand = executeDevCommand;

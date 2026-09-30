// Мини-игра Cyber Jump (с персонажем-киборгом и бонусами)
        const gameCanvas = document.getElementById('game-canvas');
        const gCtx = gameCanvas.getContext('2d');
        let gameRunning = false;
        let score = 0;
        let highscore = localStorage.getItem('posmotri_highscore') || 0;
        document.getElementById('game-highscore').textContent = highscore;

        // Персонаж-киборг
        let player = { 
            x: 40, 
            y: 100, 
            w: 24, 
            h: 32, 
            dy: 0, 
            jumpPower: -9, 
            gravity: 0.45, 
            grounded: true,
            animFrame: 0 
        };

        let obstacles = [];
        let bonuses = [];
        let gameTimer = 0;
        let bgOffset = 0; // Для бегущего неонового фона

        let hasShield = false;
        let slowTimeTimer = 0;
        let doubleScoreTimer = 0;

        function resizeGameCanvas() {
            gameCanvas.width = gameCanvas.parentElement.clientWidth;
            gameCanvas.height = gameCanvas.parentElement.clientHeight;
            player.y = gameCanvas.height - player.h - 12;
        }
        window.addEventListener('resize', resizeGameCanvas);
        resizeGameCanvas();

        function startCyberGame(e) {
            e.stopPropagation();
            hapticClick();
            document.getElementById('start-game-btn').style.display = 'none';
            gameRunning = true;
            score = 0;
            obstacles = [];
            bonuses = [];
            gameTimer = 0;
            bgOffset = 0;
            hasShield = false;
            slowTimeTimer = 0;
            doubleScoreTimer = 0;
            updateBuffsUI();
            player.y = gameCanvas.height - player.h - 12;
            player.dy = 0;
            requestAnimationFrame(updateGame);
        }

        function triggerGameJump() {
            if (!gameRunning) return;
            if (player.grounded) {
                player.dy = player.jumpPower;
                player.grounded = false;
                hapticClick();
            }
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                if (gameRunning) {
                    e.preventDefault();
                    triggerGameJump();
                }
            }
        });

        function updateBuffsUI() {
            document.getElementById('buff-shield').style.display = hasShield ? 'block' : 'none';
            document.getElementById('buff-slow').style.display = slowTimeTimer > 0 ? 'block' : 'none';
            document.getElementById('buff-x2').style.display = doubleScoreTimer > 0 ? 'block' : 'none';
        }

        function updateGame() {
            if (!gameRunning) return;

            gCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

            // Скорость мира
            let speedMultiplier = slowTimeTimer > 0 ? 0.6 : 1.0;

            // Отрисовка динамического кибер-фона (линии на полу)
            bgOffset += (3.5 * speedMultiplier);
            if (bgOffset > 40) bgOffset = 0;
            
            gCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            gCtx.lineWidth = 1;
            const floorY = gameCanvas.height - 12;
            
            // Земля
            gCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            gCtx.fillRect(0, floorY, gameCanvas.width, 2);

            // Движущиеся полосы на земле
            for (let i = -bgOffset; i < gameCanvas.width; i += 40) {
                gCtx.beginPath();
                gCtx.moveTo(i, floorY);
                gCtx.lineTo(i - 15, floorY + 12);
                gCtx.stroke();
            }

            // Таймеры бонусов
            if (slowTimeTimer > 0) slowTimeTimer--;
            if (doubleScoreTimer > 0) doubleScoreTimer--;
            updateBuffsUI();

            // Физика игрока
            player.dy += player.gravity;
            player.y += player.dy;
            if (player.y >= floorY - player.h) {
                player.y = floorY - player.h;
                player.dy = 0;
                player.grounded = true;
            }

            // Анимация бега персонажа (покачивание)
            if (player.grounded) {
                player.animFrame += 0.15 * speedMultiplier;
            }

            // Рендер персонажа-киборга
            const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary').trim() || '#ff2d55';
            
            gCtx.save();
            gCtx.translate(player.x + player.w/2, player.y + player.h/2);
            
            // Если в прыжке — небольшой поворот
            if (!player.grounded) {
                gCtx.rotate(0.1);
            }

            // Тело киборга
            gCtx.fillStyle = primaryColor;
            gCtx.fillRect(-player.w/2, -player.h/2, player.w, player.h - 6);

            // Шлем / Визор (светящаяся полоса)
            gCtx.fillStyle = '#00ffcc';
            gCtx.fillRect(-player.w/2 + 2, -player.h/2 + 4, player.w - 4, 6);

            // Ноги (анимация бега)
            gCtx.fillStyle = '#111';
            let legOffset = player.grounded ? Math.sin(player.animFrame) * 4 : 0;
            gCtx.fillRect(-player.w/2 + 2, player.h/2 - 6, 6, 6 + legOffset);
            gCtx.fillRect(player.w/2 - 8, player.h/2 - 6, 6, 6 - legOffset);

            gCtx.restore();

            // Эффект щита вокруг персонажа
            if (hasShield) {
                gCtx.strokeStyle = '#00ffcc';
                gCtx.lineWidth = 2;
                gCtx.beginPath();
                gCtx.arc(player.x + player.w/2, player.y + player.h/2, player.w, 0, Math.PI * 2);
                gCtx.stroke();
            }

            // Генерация препятствий и бонусов
            gameTimer++;

            if (gameTimer % 90 === 0) {
                obstacles.push({ x: gameCanvas.width, y: floorY - 26, w: 14, h: 26, speed: 4.5 * speedMultiplier });
            }

            if (gameTimer % 140 === 0) {
                const types = ['shield', 'slow', 'x2'];
                const selectedType = types[Math.floor(Math.random() * types.length)];
                bonuses.push({ x: gameCanvas.width, y: floorY - 55, w: 18, h: 18, type: selectedType, speed: 4.0 * speedMultiplier });
            }

            // Обработка препятствий
            for (let i = obstacles.length - 1; i >= 0; i--) {
                let obs = obstacles[i];
                obs.speed = 4.5 * speedMultiplier;
                obs.x -= obs.speed;
                
                // Рисуем футуристический конус / барьер
                gCtx.fillStyle = '#ff3366';
                gCtx.fillRect(obs.x, obs.y, obs.w, obs.h);
                gCtx.fillStyle = '#fff';
                gCtx.fillRect(obs.x + 4, obs.y + 4, obs.w - 8, 4);

                // Столкновение
                if (
                    player.x < obs.x + obs.w &&
                    player.x + player.w > obs.x &&
                    player.y < obs.y + obs.h &&
                    player.y + player.h > obs.y
                ) {
                    if (hasShield) {
                        hasShield = false;
                        obstacles.splice(i, 1);
                        showToast('Щит поглотил удар!', '🛡️');
                        continue;
                    }

                    gameRunning = false;
                    showToast('Игра окончена! Счет: ' + score, '🕹️');
                    if (score > highscore) {
                        highscore = score;
                        localStorage.setItem('posmotri_highscore', highscore);
                        document.getElementById('game-highscore').textContent = highscore;
                        showToast('Новый рекорд!', '🏆');
                    }
                    document.getElementById('start-game-btn').textContent = 'ИГРАТЬ СНОВА';
                    document.getElementById('start-game-btn').style.display = 'block';
                    return;
                }

                if (obs.x + obs.w < 0) {
                    obstacles.splice(i, 1);
                    let points = doubleScoreTimer > 0 ? 20 : 10;
                    score += points;
                    document.getElementById('game-score').textContent = score;
                }
            }

            // Обработка бонусов
            for (let i = bonuses.length - 1; i >= 0; i--) {
                let b = bonuses[i];
                b.x -= b.speed;

                gCtx.beginPath();
                gCtx.arc(b.x + b.w/2, b.y + b.h/2, b.w/2, 0, Math.PI * 2);
                gCtx.fillStyle = b.type === 'shield' ? '#00ffcc' : (b.type === 'slow' ? '#ffcc00' : '#ff00ff');
                gCtx.fill();
                gCtx.closePath();

                if (
                    player.x < b.x + b.w &&
                    player.x + player.w > b.x &&
                    player.y < b.y + b.h &&
                    player.y + player.h > b.y
                ) {
                    if (b.type === 'shield') {
                        hasShield = true;
                        showToast('Получен щит!', '🛡️');
                    } else if (b.type === 'slow') {
                        slowTimeTimer = 300; 
                        showToast('Замедление времени!', '⚡');
                    } else if (b.type === 'x2') {
                        doubleScoreTimer = 300; 
                        showToast('Множитель x2 активен!', '✨');
                    }
                    bonuses.splice(i, 1);
                    continue;
                }

                if (b.x + b.w < 0) {
                    bonuses.splice(i, 1);
                }
            }

            requestAnimationFrame(updateGame);
        }
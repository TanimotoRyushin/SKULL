const container = document.getElementById('container');
    const playerCount = 6; // プレイヤー人数
const radius = 240; // 円の半径
const imagePath = './img/coaster.png'; // 画像のパス（ここを確認してください）

// ゲーム状態変数
let players = [];
let currentPlayerIndex = 0;
let startPlayerIndex = 0;
let phase = 'placement'; // 'placement', 'bidding', 'reveal'
let currentBid = 0;
let highestBidderIndex = -1;
let passedPlayers = [];
let revealedCount = 0;
let message = '';

// コントロールパネルの作成
const controlsDiv = document.createElement('div');
controlsDiv.id = 'controls';
container.appendChild(controlsDiv);

class Player {
    constructor(id) {
        this.id = id;
        // 花3枚, ドクロ1枚
        this.hand = ['flower', 'flower', 'flower', 'skull'];
        this.stack = []; // 場に出したカード
        this.points = 0;
        this.isOut = false;
    }

    playCard(type) {
        const index = this.hand.indexOf(type);
        if (index > -1) {
            this.hand.splice(index, 1);
            this.stack.push({ type: type, revealed: false });
            return true;
        }
        return false;
    }
}

// ゲーム初期化
function initGame() {
    players = [];
    for (let i = 0; i < playerCount; i++) {
        players.push(new Player(i));
    }
    startRound();
}

function startRound() {
    phase = 'placement';
    currentBid = 0;
    highestBidderIndex = -1;
    passedPlayers = [];
    revealedCount = 0;
    currentPlayerIndex = startPlayerIndex;
    
    // スタックと手札のリセット（前のラウンドで出したカードを手札に戻す処理は省略し、簡易的に再配布）
    players.forEach(p => {
        if (!p.isOut) {
            p.hand = ['flower', 'flower', 'flower', 'skull'];
            p.stack = [];
        }
    });
    
    updateUI();
}

function nextTurn() {
    let loopCount = 0;
    do {
        currentPlayerIndex = (currentPlayerIndex + 1) % playerCount;
        loopCount++;
    } while ((players[currentPlayerIndex].isOut || passedPlayers.includes(currentPlayerIndex)) && loopCount < playerCount);

    updateUI();
}

// UI描画
function updateUI() {
    renderBoard();
    renderControls();
}

function renderBoard() {
    // 既存のプレイヤー要素を削除
    document.querySelectorAll('.player-wrapper').forEach(el => el.remove());

    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;

    players.forEach((player, i) => {
        if (player.isOut) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'player-wrapper';
        if (i === currentPlayerIndex) wrapper.classList.add('active');

        const angle = (i / playerCount) * 2 * Math.PI - (Math.PI / 2); // 上から開始
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        wrapper.style.left = `${x}px`;
        wrapper.style.top = `${y}px`;

        // アバター
        const img = document.createElement('img');
        img.src = imagePath;
        img.className = 'player-avatar';
        img.onerror = function() { this.style.backgroundColor = '#ccc'; };
        wrapper.appendChild(img);

        // 情報
        const info = document.createElement('div');
        info.className = 'player-info';
        info.innerHTML = `P${i+1} <br>手札: ${player.hand.length}<br>得点: ${player.points}`;
        wrapper.appendChild(info);

        // スタック
        const stackDiv = document.createElement('div');
        stackDiv.className = 'card-stack';
        player.stack.forEach((card, idx) => {
            const disc = document.createElement('div');
            disc.className = 'card-disc';
            if (card.revealed) {
                disc.style.backgroundColor = card.type === 'skull' ? '#000' : '#e91e63';
                disc.style.borderColor = card.type === 'skull' ? '#f00' : '#fff';
            }
            // めくりフェーズでクリック可能にする
            if (phase === 'reveal' && i !== highestBidderIndex && !card.revealed && idx === player.stack.length - 1) {
                disc.style.cursor = 'pointer';
                disc.onclick = () => revealCard(i);
            }
            stackDiv.appendChild(disc);
        });
        wrapper.appendChild(stackDiv);

        container.appendChild(wrapper);
    });
}

function renderControls() {
    controlsDiv.innerHTML = '';
    const player = players[currentPlayerIndex];
    const title = document.createElement('h3');
    controlsDiv.appendChild(title);

    if (phase === 'placement') {
        title.textContent = `P${currentPlayerIndex + 1} のターン`;
        
        // カード配置ボタン
        if (player.hand.length > 0) {
            ['flower', 'skull'].forEach(type => {
                if (player.hand.includes(type)) {
                    const btn = document.createElement('button');
                    btn.textContent = type === 'flower' ? '花を置く' : 'ドクロを置く';
                    btn.onclick = () => {
                        player.playCard(type);
                        nextTurn();
                    };
                    controlsDiv.appendChild(btn);
                }
            });
        }

        // チャレンジ開始ボタン（場に1枚以上あれば）
        const totalCards = players.reduce((sum, p) => sum + p.stack.length, 0);
        if (totalCards > 0 && player.stack.length > 0) {
            const btn = document.createElement('button');
            btn.textContent = 'チャレンジ開始';
            btn.onclick = () => {
                phase = 'bidding';
                currentBid = 0;
                highestBidderIndex = currentPlayerIndex;
                updateUI();
            };
            controlsDiv.appendChild(btn);
        }

    } else if (phase === 'bidding') {
        title.textContent = `P${currentPlayerIndex + 1} の宣言 (現在: ${currentBid})`;
        const totalCards = players.reduce((sum, p) => sum + p.stack.length, 0);

        // ビッド入力
        const input = document.createElement('input');
        input.type = 'number';
        input.min = currentBid + 1;
        input.max = totalCards;
        input.value = currentBid + 1;
        controlsDiv.appendChild(input);

        const bidBtn = document.createElement('button');
        bidBtn.textContent = '宣言';
        bidBtn.onclick = () => {
            const val = parseInt(input.value);
            if (val > currentBid && val <= totalCards) {
                currentBid = val;
                highestBidderIndex = currentPlayerIndex;
                nextTurn();
                // 全員パスして一周したらめくりフェーズへ（簡易判定）
                if (currentPlayerIndex === highestBidderIndex) {
                    phase = 'reveal';
                    revealedCount = 0;
                    // まず自分のカードを全てめくる
                    players[highestBidderIndex].stack.forEach(c => c.revealed = true);
                    revealedCount += players[highestBidderIndex].stack.length;
                    updateUI();
                }
            }
        };
        controlsDiv.appendChild(bidBtn);

        const passBtn = document.createElement('button');
        passBtn.textContent = 'パス';
        passBtn.onclick = () => {
            passedPlayers.push(currentPlayerIndex);
            nextTurn();
            // 全員パスしてチャレンジャーに戻ってきたら
            if (currentPlayerIndex === highestBidderIndex) {
                phase = 'reveal';
                revealedCount = 0;
                // 自分のカードを全てめくる
                players[highestBidderIndex].stack.forEach(c => c.revealed = true);
                revealedCount += players[highestBidderIndex].stack.length;
                updateUI();
            }
        };
        controlsDiv.appendChild(passBtn);

    } else if (phase === 'reveal') {
        title.textContent = `P${highestBidderIndex + 1} チャレンジ中: ${revealedCount}/${currentBid}`;
        const msg = document.createElement('p');
        msg.textContent = '他プレイヤーの山札をクリックしてめくってください';
        controlsDiv.appendChild(msg);
        
        // 判定ロジック
        const allRevealed = players.flatMap(p => p.stack).filter(c => c.revealed);
        const hasSkull = allRevealed.some(c => c.type === 'skull');

        if (hasSkull) {
            title.textContent = '失敗！ドクロが出ました';
            const btn = document.createElement('button');
            btn.textContent = '次のラウンドへ';
            btn.onclick = () => {
                startPlayerIndex = (startPlayerIndex + 1) % playerCount;
                startRound();
            };
            controlsDiv.appendChild(btn);
        } else if (revealedCount >= currentBid) {
            title.textContent = '成功！';
            const btn = document.createElement('button');
            btn.textContent = 'ポイント獲得して次へ';
            btn.onclick = () => {
                players[highestBidderIndex].points += 1;
                if (players[highestBidderIndex].points >= 2) {
                    alert(`P${highestBidderIndex + 1} の勝利！`);
                    initGame();
                } else {
                    startPlayerIndex = highestBidderIndex;
                    startRound();
                }
            };
            controlsDiv.appendChild(btn);
        }
    }
}

function revealCard(playerIdx) {
    const player = players[playerIdx];
    // まだめくられていない一番上のカードを探す
    for (let i = player.stack.length - 1; i >= 0; i--) {
        if (!player.stack[i].revealed) {
            player.stack[i].revealed = true;
            revealedCount++;
            updateUI();
            return;
        }
    }
}

// ゲーム開始
initGame();
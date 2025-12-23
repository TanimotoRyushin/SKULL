const container = document.getElementById('container');
const count = 6; // 配置する個数
const radius = 200; // 円の半径
const imagePath = './img/coaster.png'; // 画像のパス（ここを確認してください）

// コンテナの中心座標を取得
const centerX = container.clientWidth / 2;
const centerY = container.clientHeight / 2;

for (let i = 0; i < count; i++) {
    const img = document.createElement('img');
    img.src = imagePath;
    img.alt = 'coaster';
    img.className = 'coaster-img';
    
    // 画像読み込みエラー時の処理を追加
    img.onerror = function() {
        console.error('画像が見つかりません:', this.src);
        this.style.backgroundColor = '#ffcccc'; // エラー時は背景を赤くする
    };
    
    // 角度を計算 (ラジアン)
    const angle = (i / count) * 2 * Math.PI;

    // 中心からの座標を計算
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    img.style.left = `${x}px`;
    img.style.top = `${y}px`;

    container.appendChild(img);
}
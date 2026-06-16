// app.ts — AI 해양 탐사: 물고기 분류기
import { AppHelper } from "./appHelper.js";
// ============================================================
// Global state
// ============================================================
const appCanvas = document.getElementById("appCanvas");
const uiLayer = document.getElementById("uiLayer");
let ctx;
let W;
let H;
let appData;
let textData;
let assetList;
let bgImage = null;
let bgCached = null;
let bg2Image = null;
let bg2Cached = null;
let robotImg = null;
let robotOpenImg = null;
let rCheckImg = null;
let rFailImg = null;
let robotBodyCanvas = null;
let robotDomeCanvas = null;
let robotOpenProgress = 0; // 0=닫힘, 1=열림
let robotOpenTarget = 0; // 목표값
let robotOpenCloseTimeout = null;
let fishImages = [];
let trashImages = [];
let trashLabels = [];
const FISH_FILES = [
    "fish1", "fish2", "fish3", "fish4", "fish5", "fish6", "fish7",
    "fish8", "fish9", "fish10", "fish11", "fish12", "fish13", "fish14",
    "fish15", "fish16", "fish17", "fish18", "fish19", "fish20", "fish21", "fish22"
];
const TRASH_FILES = [
    { file: "apple_core", label: "Apple Core" },
    { file: "banana_peel", label: "Banana Peel" },
    { file: "chicken_bone", label: "Chicken Bone" },
    { file: "empty_can", label: "Empty Can" },
    { file: "fork", label: "Fork" },
    { file: "gas_can", label: "Gas Can" },
    { file: "lightbulb", label: "Lightbulb" },
    { file: "paper_cup", label: "Paper Cup" },
    { file: "plastic_bottle", label: "Plastic Bottle" },
    { file: "rope", label: "Rope" },
    { file: "sock", label: "Sock" },
    { file: "soda_cup", label: "Soda Cup" },
    { file: "tire", label: "Tire" },
];
const DOME_SPLIT = 0.258; // 이미지 높이 기준 뚜껑/몸통 분리 비율
const DOME_OPEN_ANGLE = Math.PI / 2; // 열림 각도 (90도)
let stage = "intro";
let introStepIndex = 0;
let currentIndex = 0;
let trainingData = [];
let oceanResults = [];
let trainQueue = [];
let trainReady = false;
let aiRobotTime = 0;
let paused = false;
let gameSpeed = 1;
let oceanObjects = [];
let oceanBubbles = [];
let oceanTime = 0;
let bgHills = [];
let fgHills = [];
let robotX = 0;
let robotY = 0;
let robotTargetX = 0;
let scanTargetObject = null;
let scanProgress = 0;
let robotEyeColor = "#4dd0e1";
let robotEyeTimer = 0;
// 바다 단계: 하나씩 순서대로
let oceanQueue = [];
let oceanQueueIndex = 0;
let oceanObjX = 0;
let oceanObjTargetX = 0;
let oceanPhase = "idle";
let oceanScanProg = 0;
let oceanJudgeTimer = 0;
let oceanCurrentVerdict = null;
let dykShownIndices = new Set();
let introFrameObjects = [];
// 타자기 효과
let typewriterText = "";
let typewriterIndex = 0;
let typewriterTimer = null;
let typewriterDone = false;
let typewriterElement = null;
// 사운드
let bubbleSound = null;
let clickSound = null;
let classifySound = null;
let enterSound = null;
let laserSound = null;
let poyoSound = null;
let introAdvanceLocked = false;
// DOM refs
let titleEl;
let counterNum;
let introBubble;
let continueBtn;
let classifyButtons;
let btnYes;
let btnNo;
let didYouKnow;
let dykFact;
let dykBtn;
let oceanIntroEl;
let bigArrow;
let runBtn;
let playbackControls;
let pauseBtn;
let rewindBtn;
let forwardBtn;
let oceanContinueBtn;
let resultOverlay;
let resultScore;
let resultDetail;
let restartBtn;
let meetAiTooltip;
// Review (2-3 page)
let reviewBottom;
let reviewBubble;
let reviewTrainBtn;
let reviewContinueBtn;
let reviewToggle;
let reviewFishBtn;
let reviewTrashBtn;
let reviewShowFish = true;
let reviewStep = 0;
let reviewObjects = [];
let reviewFishObjects = [];
let reviewTrashObjects = [];
// ============================================================
// Helpers
// ============================================================
const rand = (a, b) => Math.random() * (b - a) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return {
        r: parseInt(h.substr(0, 2), 16),
        g: parseInt(h.substr(2, 2), 16),
        b: parseInt(h.substr(4, 2), 16),
    };
}
function roundRect(c, x, y, w, h, r) {
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
}
// ============================================================
// Drawing — Lab background
// ============================================================
function cacheBackground() {
    if (bgImage) {
        bgCached = document.createElement("canvas");
        bgCached.width = W;
        bgCached.height = H;
        const c = bgCached.getContext("2d");
        c.drawImage(bgImage, 0, 0, W, H);
        c.globalCompositeOperation = "screen";
        c.fillStyle = "rgba(100, 160, 220, 0.25)";
        c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = "multiply";
        c.fillStyle = "rgba(140, 180, 255, 0.15)";
        c.fillRect(0, 0, W, H);
    }
    if (bg2Image) {
        bg2Cached = document.createElement("canvas");
        bg2Cached.width = W;
        bg2Cached.height = H;
        const c2 = bg2Cached.getContext("2d");
        c2.drawImage(bg2Image, 0, 0, W, H);
    }
}
function drawLabBackground() {
    if (bgCached) {
        ctx.drawImage(bgCached, 0, 0);
        // 바다색 그라데이션 살짝 추가
        ctx.save();
        ctx.globalAlpha = 0.08;
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#1a5276");
        grad.addColorStop(1, "#0d3b66");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }
    else {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#2a4a6f");
        grad.addColorStop(1, "#1a3555");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }
}
// ============================================================
// Drawing — Ocean background
// ============================================================
function initOceanBubbles() {
    oceanBubbles = [];
    for (let i = 0; i < 30; i++) {
        oceanBubbles.push({ x: rand(0, W), y: rand(0, H), size: rand(2, 6), speed: rand(0.3, 1.0), drift: rand(-0.3, 0.3) });
    }
    bgHills = [];
    for (let i = 0; i < 8; i++) {
        bgHills.push({ cx: (W / 6) * i - W / 12, cy: H * 0.55 + rand(-20, 20), rx: rand(80, 140), ry: rand(100, 180) });
    }
    fgHills = [];
    for (let i = 0; i < 10; i++) {
        fgHills.push({ cx: (W / 8) * i - W / 16, cy: H * 0.75 + rand(-10, 10), rx: rand(70, 120), ry: rand(80, 130) });
    }
}
function drawOceanBackground() {
    if (bg2Cached) {
        ctx.drawImage(bg2Cached, 0, 0);
    }
    else {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#1e3a5f");
        grad.addColorStop(0.4, "#15375c");
        grad.addColorStop(1, "#0a1f3c");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }
}
// ============================================================
// Drawing — Photo frame (training)
// ============================================================
function drawPhotoFrame(cx, cy, size, showScanner) {
    ctx.fillStyle = "#f5f5f0";
    ctx.fillRect(cx - size / 2 - 15, cy - size / 2 - 15, size + 30, size + 65);
    const inner = size + 8; // 안쪽 사진 영역을 약간 넓힘
    ctx.fillStyle = "#1a2332";
    ctx.fillRect(cx - inner / 2, cy - inner / 2, inner, inner);
    if (showScanner) {
        ctx.strokeStyle = "#4dd0e1";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "#4dd0e1";
        ctx.shadowBlur = 6;
        const bs = 38;
        const r = 8; // 꼭짓점 둥글기
        const offX = size / 2 + 25;
        const offTop = size / 2 + 25;
        const offBot = size / 2 + 60;
        // 좌상
        ctx.beginPath();
        ctx.moveTo(cx - offX, cy - offTop + bs);
        ctx.lineTo(cx - offX, cy - offTop + r);
        ctx.quadraticCurveTo(cx - offX, cy - offTop, cx - offX + r, cy - offTop);
        ctx.lineTo(cx - offX + bs, cy - offTop);
        ctx.stroke();
        // 우상
        ctx.beginPath();
        ctx.moveTo(cx + offX - bs, cy - offTop);
        ctx.lineTo(cx + offX - r, cy - offTop);
        ctx.quadraticCurveTo(cx + offX, cy - offTop, cx + offX, cy - offTop + r);
        ctx.lineTo(cx + offX, cy - offTop + bs);
        ctx.stroke();
        // 좌하
        ctx.beginPath();
        ctx.moveTo(cx - offX, cy + offBot - bs);
        ctx.lineTo(cx - offX, cy + offBot - r);
        ctx.quadraticCurveTo(cx - offX, cy + offBot, cx - offX + r, cy + offBot);
        ctx.lineTo(cx - offX + bs, cy + offBot);
        ctx.stroke();
        // 우하
        ctx.beginPath();
        ctx.moveTo(cx + offX - bs, cy + offBot);
        ctx.lineTo(cx + offX - r, cy + offBot);
        ctx.quadraticCurveTo(cx + offX, cy + offBot, cx + offX, cy + offBot - r);
        ctx.lineTo(cx + offX, cy + offBot - bs);
        ctx.stroke();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
    }
}
// ============================================================
// Drawing — AI Robot
// ============================================================
function drawRobot(x, y, size, eyeColor, showScanBeam, scanTargetX, scanTargetY) {
    // 스캔 빔
    if (showScanBeam && scanTargetX !== null && scanTargetY !== null) {
        ctx.save();
        const beamGrad = ctx.createLinearGradient(x, y + size * 0.9, scanTargetX, scanTargetY);
        const isGreen = eyeColor === "#66bb6a";
        const bc = isGreen ? "102, 187, 106" : "77, 208, 225";
        beamGrad.addColorStop(0, `rgba(${bc}, 0.5)`);
        beamGrad.addColorStop(1, `rgba(${bc}, 0.1)`);
        ctx.fillStyle = beamGrad;
        const btw = size * 0.3;
        const bbw = size * 1.2;
        ctx.beginPath();
        ctx.moveTo(x - btw / 2, y + size * 0.9);
        ctx.lineTo(x + btw / 2, y + size * 0.9);
        ctx.lineTo(scanTargetX + bbw / 2, scanTargetY);
        ctx.lineTo(scanTargetX - bbw / 2, scanTargetY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    // 로봇 이미지 그리기 — 뚜껑 회전 애니메이션
    if (robotImg && robotBodyCanvas && robotDomeCanvas) {
        const p = Math.max(0, Math.min(1, robotOpenProgress));
        const fullH = size * 4.2;
        const naturalW = fullH * (robotImg.naturalWidth / robotImg.naturalHeight);
        const fullW = naturalW * 0.96; // 넓이 좁히기
        const baseX = x - fullW / 2;
        const baseY = y - fullH * 0.45;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        // 1) 몸통 (귀+하체 고정, 전체 이미지에서 뚜껑 가운데만 빠진 상태)
        ctx.drawImage(robotBodyCanvas, 0, 0, robotBodyCanvas.width, robotBodyCanvas.height, baseX, baseY, fullW, fullH);
        // 2) 뚜껑 (가운데 상단만 회전)
        const domeDrawH = fullH * DOME_SPLIT;
        const domeMarginRatio = 0.25;
        const domeDrawW = fullW * (1 - domeMarginRatio * 2);
        const domeDrawX = baseX + fullW * domeMarginRatio;
        const pivotX = domeDrawX + domeDrawW * 1.0;
        const pivotY = baseY + domeDrawH;
        const angle = p * DOME_OPEN_ANGLE;
        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(angle);
        ctx.translate(-pivotX, -pivotY);
        ctx.drawImage(robotDomeCanvas, 0, 0, robotDomeCanvas.width, robotDomeCanvas.height, domeDrawX, baseY, domeDrawW, domeDrawH);
        ctx.restore();
        ctx.restore();
    }
    else if (robotImg) {
        const drawH = size * 4.2;
        const drawW = drawH * (robotImg.naturalWidth / robotImg.naturalHeight) * 0.96;
        ctx.drawImage(robotImg, x - drawW / 2, y - drawH * 0.45, drawW, drawH);
    }
}
// ============================================================
// Drawing — Fish
// ============================================================
function drawFish(obj, cx, cy, baseSize) {
    const img = fishImages[obj.imgIndex];
    if (!img)
        return;
    const size = baseSize * 1.35;
    const aspect = img.naturalWidth / img.naturalHeight;
    let drawW, drawH;
    if (aspect > 1) {
        drawW = size;
        drawH = size / aspect;
    }
    else {
        drawH = size;
        drawW = size * aspect;
    }
    ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
}
// ============================================================
// Drawing — Trash
// ============================================================
function drawTrash(obj, cx, cy, baseSize, extraRotation) {
    const img = trashImages[obj.imgIndex];
    if (!img)
        return;
    const size = baseSize * 1.15;
    const aspect = img.naturalWidth / img.naturalHeight;
    let drawW, drawH;
    if (aspect > 1) {
        drawW = size;
        drawH = size / aspect;
    }
    else {
        drawH = size;
        drawW = size * aspect;
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(obj.rotation + extraRotation);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
}
// ============================================================
// Object generation
// ============================================================
let lastFishImgIndex = -1;
let lastTrashImgIndex = -1;
function createFish() {
    const p = pick(appData.fishPalettes);
    let idx = Math.floor(Math.random() * fishImages.length);
    if (fishImages.length > 1) {
        while (idx === lastFishImgIndex) {
            idx = Math.floor(Math.random() * fishImages.length);
        }
    }
    lastFishImgIndex = idx;
    return {
        type: "fish",
        imgIndex: idx,
        shape: pick(["triangle", "oval", "round", "diamond"]),
        size: rand(0.9, 1.15),
        bodyColor: p.body,
        accentColor: p.accent,
        finColor: p.fin,
        eyeSize: rand(0.9, 1.2),
        hasStripes: Math.random() < 0.4,
        hasSpots: Math.random() < 0.3,
        spotPositions: null,
        features: [],
    };
}
function createTrash() {
    const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI, -Math.PI / 4, -Math.PI / 2, -Math.PI * 3 / 4];
    const idx = Math.floor(Math.random() * trashImages.length);
    return {
        type: "trash",
        imgIndex: idx,
        trashType: pick(["can", "bottle", "bag", "cup"]),
        size: rand(0.85, 1.15),
        rotation: pick(angles),
        features: [],
    };
}
function computeFeatures(obj) {
    if (obj.type === "fish") {
        const rgb = hexToRgb(obj.bodyColor);
        const brightness = (rgb.r + rgb.g + rgb.b) / 3 / 255;
        const colorful = (Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b)) / 255;
        return [brightness, 0.75, 0.85, colorful, obj.size];
    }
    else {
        const profile = {
            can: [0.6, 0.4, 0.35, 0.3, 1.0],
            bottle: [0.7, 0.3, 0.35, 0.2, 1.0],
            bag: [0.75, 0.8, 0.1, 0.05, 1.0],
            cup: [0.95, 0.65, 0.3, 0.1, 0.9],
        };
        return profile[obj.trashType] || [0.5, 0.5, 0.5, 0.5, 1.0];
    }
}
function generateObject() {
    const obj = Math.random() < 0.55 ? createFish() : createTrash();
    if (obj.type === "fish" && obj.hasSpots) {
        obj.spotPositions = [];
        for (let i = 0; i < 4; i++) {
            obj.spotPositions.push({ x: rand(-0.3, 0.4), y: rand(-0.3, 0.3) });
        }
    }
    obj.features = computeFeatures(obj);
    return obj;
}
// ============================================================
// AI prediction (KNN)
// ============================================================
function euclidean(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++)
        sum += Math.pow(a[i] - b[i], 2);
    return Math.sqrt(sum);
}
function predict(features) {
    // 학습 데이터 없으면 판단 불가
    if (trainingData.length === 0)
        return null;
    const dists = trainingData.map((d) => ({ label: d.label, dist: euclidean(features, d.features) }));
    dists.sort((a, b) => a.dist - b.dist);
    const k = Math.min(3, dists.length);
    const near = dists.slice(0, k);
    let fishCount = 0;
    near.forEach((n) => { if (n.label === "fish")
        fishCount++; });
    const label = fishCount > k / 2 ? "fish" : "trash";
    const confidence = Math.max(fishCount, k - fishCount) / k;
    // confidence가 낮으면 판단 애매 → null
    if (confidence < 0.6)
        return null;
    return { label, confidence };
}
// ============================================================
// Training queue (conveyor belt)
// ============================================================
function initTrainQueue() {
    trainQueue = [];
    // 인트로 프레임 오브젝트가 있으면 그대로 사용
    const obj1 = introFrameObjects[2] || generateObject();
    const obj2 = introFrameObjects[1] || generateObject();
    const obj3 = introFrameObjects[0] || generateObject();
    // 인트로와 동일한 위치에서 시작 (리셋 없이 이어짐)
    trainQueue.push({ obj: obj1, x: 0, y: 0, targetX: 0, targetY: 0, scale: 1, targetScale: 1, state: "active", startX: 0, startY: 0, progress: 0 });
    trainQueue.push({ obj: obj2, x: -W * 0.29, y: 0, targetX: -W * 0.29, targetY: 0, scale: 1, targetScale: 1, state: "waiting", startX: 0, startY: 0, progress: 0 });
    trainQueue.push({ obj: obj3, x: -W * 0.58, y: 0, targetX: -W * 0.58, targetY: 0, scale: 1, targetScale: 1, state: "waiting", startX: 0, startY: 0, progress: 0 });
}
function advanceTrainQueue() {
    const active = trainQueue.find((q) => q.state === "active");
    if (active) {
        // 프레임 들어갈 때 enter 소리
        if (enterSound) {
            enterSound.currentTime = 0;
            enterSound.play().catch(() => {});
        }
        active.state = "leaving";
        active.startX = active.x;
        active.startY = active.y;
        active.targetX = W * 0.31;
        active.targetY = H * -0.02;
        active.targetScale = 0;
        active.progress = 0;
    }
    const waiting = trainQueue.filter((q) => q.state === "waiting");
    waiting.sort((a, b) => b.targetX - a.targetX);
    if (waiting.length > 0) {
        waiting[0].state = "active";
        waiting[0].targetX = 0;
        waiting[0].targetY = 0;
        for (let i = 1; i < waiting.length; i++) {
            waiting[i].targetX = -W * 0.29 * i;
        }
    }
    const newObj = generateObject();
    const newIdx = waiting.length;
    trainQueue.push({ obj: newObj, x: -W * 1.4, y: 0, targetX: -W * 0.29 * newIdx, targetY: 0, scale: 1, targetScale: 1, state: "waiting", startX: 0, startY: 0, progress: 0 });
}
function updateTrainQueue() {
    const speed = 0.12;
    trainQueue.forEach((q) => {
        if (q.state === "leaving") {
            // 포물선 애니메이션
            q.progress = Math.min(1, q.progress + 0.06);
            const t = q.progress;
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            q.x = q.startX + (q.targetX - q.startX) * ease;
            const arcHeight = -H * 0.38;
            const linearY = q.startY + (q.targetY - q.startY) * ease;
            q.y = linearY + arcHeight * Math.sin(t * Math.PI);
            q.scale = 0.35;
            if (t > 0.85) q.scale = 0;
        }
        else {
            q.x += (q.targetX - q.x) * speed;
            q.y += (q.targetY - q.y) * speed;
        }
    });
    trainQueue = trainQueue.filter((q) => !(q.state === "leaving" && q.progress >= 1));
    const hasLeaving = trainQueue.some((q) => q.state === "leaving");
    const active = trainQueue.find((q) => q.state === "active");
    if (active && Math.abs(active.x - active.targetX) < 20 && !hasLeaving && !trainReady && !messageShowing) {
        trainReady = true;
        const roundNum = currentIndex;
        const dykIdx = roundNum === 5 ? 0 : roundNum === 15 ? 1 : -1;
        const tMsg = textData.trainMessages[String(roundNum)];
        if (tMsg && !shownMessageRounds.has(roundNum)) {
            shownMessageRounds.add(roundNum);
            messageShowing = true;
            btnYes.disabled = true;
            btnNo.disabled = true;
            if (dykIdx >= 0) {
                trainMessageOverlay = true;
                // 팝업 이미지 설정
                const dykImage = document.getElementById("dyk-image");
                const dykImages = [
                    { src: "image/trashfolder/plastic_bottle.png", rotate: "0deg" },
                    { src: "image/trashfolder/empty_can.png", rotate: "0deg" },
                ];
                const imgInfo = dykImages[dykIdx];
                if (imgInfo) {
                    dykImage.src = imgInfo.src;
                    dykImage.style.transform = `rotate(${imgInfo.rotate})`;
                    dykImage.classList.add("show");
                }
                else {
                    dykImage.classList.remove("show");
                }
                // 15회 팝업은 텍스트가 길어서 넓이 확장 + 왼쪽 정렬
                if (dykIdx === 1) {
                    didYouKnow.style.maxWidth = "540px";
                    dykFact.style.textAlign = "left";
                }
                else {
                    didYouKnow.style.maxWidth = "";
                    dykFact.style.textAlign = "";
                }
                didYouKnow.classList.remove("hidden");
                startTypewriter(textData.dykFacts[dykIdx], dykFact);
                pendingTrainMsg = tMsg;
            }
            else {
                showTrainMessage(tMsg);
            }
        }
        else {
            btnYes.disabled = false;
            btnNo.disabled = false;
        }
    }
}
function getActiveTrainObject() {
    const active = trainQueue.find((q) => q.state === "active");
    return active ? active.obj : null;
}
// ============================================================
// Ocean — 하나씩 순서대로 분류 시스템
// ============================================================
let oceanRobotY = 0;
let oceanRobotTargetY = 0;
const OCEAN_OBJ_Y = 0; // initOceanQueue에서 설정
const OCEAN_SPACING = 0; // initOceanQueue에서 설정
let oceanConveyorX = 0; // 컨베이어 전체 오프셋
let oceanConveyorTarget = 0;
let oceanItemVerdicts = [];
let oceanItemStates = [];
let oceanItemFallY = [];
let oceanItemFallSpeed = [];
let oceanItemFallX = [];
let oceanBeamColor = "cyan"; // "cyan" | "green" | "red"
let oceanReversing = false; // 앞으로 이동 오프셋
function initOceanQueue() {
    oceanQueue = [];
    const firstObj = introFrameObjects[0] || generateObject();
    oceanQueue.push(firstObj);
    for (let i = 1; i < appData.oceanTotal; i++) {
        oceanQueue.push(generateObject());
    }
    const objSize = Math.min(W, H) * 0.25;
    const spacing = objSize * 1.9;
    const scanPos = W / 2;
    // 왼→오 이동: 객체 i의 위치 = conveyorX - i * spacing
    // 첫 객체가 인트로 위치(W*0.2)에서 시작
    oceanConveyorX = W * 0.2;
    oceanQueueIndex = 0;
    oceanPhase = "entering";
    oceanScanProg = 0;
    oceanJudgeTimer = 0;
    oceanCurrentVerdict = null;
    oceanItemVerdicts = new Array(oceanQueue.length).fill(null);
    oceanItemStates = new Array(oceanQueue.length).fill("waiting");
    oceanItemFallY = new Array(oceanQueue.length).fill(0);
    oceanItemFallSpeed = new Array(oceanQueue.length).fill(0);
    oceanItemFallX = new Array(oceanQueue.length).fill(0);
    robotX = scanPos;
    oceanRobotY = H * 0.60;
    oceanRobotTargetY = H * 0.20;
    robotEyeColor = "#4dd0e1";
    robotEyeTimer = 0;
    oceanResults = [];
}
function updateOceanSingle() {
    if (paused)
        return;
    if (oceanPhase === "done" || oceanPhase === "idle")
        return;
    // 로봇 위로 이동
    oceanRobotY += (oceanRobotTargetY - oceanRobotY) * 0.08 * gameSpeed;
    const objSize = Math.min(W, H) * 0.25;
    const spacing = objSize * 1.9;
    const scanPos = W / 2;
    // 뒤로감기 모드 — 전체 역재생
    if (oceanReversing) {
        oceanConveyorX -= 5 * gameSpeed;
        oceanPhase = "entering";
        oceanBeamColor = "cyan";
        robotEyeColor = "#4dd0e1";
        robotEyeTimer = 0;
        oceanScanProg = 0;
        oceanJudgeTimer = 0;
        // 낙하 중인 객체 부드럽게 복귀
        for (let ri = 0; ri < oceanItemFallSpeed.length; ri++) {
            if (oceanItemFallY[ri] > 0) {
                oceanItemFallY[ri] = Math.max(0, oceanItemFallY[ri] - 12);
                oceanItemFallX[ri] = Math.max(0, oceanItemFallX[ri] - 5);
                if (oceanItemFallY[ri] <= 0) {
                    oceanItemFallSpeed[ri] = 0;
                }
            }
        }
        // 컨베이어 위치 기반으로 현재 인덱스 갱신 + 판정 제거
        const currentIdx = Math.max(0, Math.round((oceanConveyorX - scanPos) / spacing));
        if (currentIdx < oceanQueueIndex) {
            for (let ri = currentIdx; ri <= oceanQueueIndex; ri++) {
                oceanItemVerdicts[ri] = null;
                oceanItemStates[ri] = "waiting";
            }
            oceanQueueIndex = currentIdx;
            currentIndex = Math.max(0, currentIndex - 1);
            updateCounter();
        }
        if (oceanConveyorX <= scanPos) {
            oceanConveyorX = scanPos;
            oceanReversing = false;
            oceanQueueIndex = 0;
        }
        return;
    }
    const scanTarget = scanPos + oceanQueueIndex * spacing;
    if (oceanPhase === "entering") {
        // 컨베이어 오른쪽으로 이동
        const dx = scanTarget - oceanConveyorX;
        oceanConveyorX += dx * 0.08 * gameSpeed;
        if (Math.abs(dx) < 8) {
            oceanConveyorX = scanTarget;
            oceanPhase = "scanning";
            oceanScanProg = 0;
            oceanBeamColor = "cyan";
            oceanItemStates[oceanQueueIndex] = "scanning";
            if (laserSound) { laserSound.currentTime = 0; laserSound.play().catch(() => {}); }
            if (poyoSound) { poyoSound.currentTime = 0; poyoSound.play().catch(() => {}); }
        }
    }
    else if (oceanPhase === "scanning") {
        oceanScanProg += 18 * gameSpeed;
        if (oceanScanProg >= 50) {
            const obj = oceanQueue[oceanQueueIndex];
            const pred = predict(obj.features);
            oceanItemVerdicts[oceanQueueIndex] = pred;
            oceanItemStates[oceanQueueIndex] = "judged";
            oceanPhase = "judged";
            oceanJudgeTimer = 0;
            oceanResults.push({
                obj: obj,
                correct: pred ? pred.label === obj.type : false,
                actual: obj.type,
                predicted: pred ? pred.label : "unknown",
            });
            currentIndex = oceanResults.length;
            updateCounter();
            if (pred) {
                if (pred.label === "fish") {
                    oceanBeamColor = "green";
                    robotEyeColor = "#66bb6a";
                }
                else {
                    oceanBeamColor = "red";
                    robotEyeColor = "#ef5350";
                    oceanItemFallSpeed[oceanQueueIndex] = 1;
                }
            }
            else {
                oceanBeamColor = "cyan";
                robotEyeColor = "#4dd0e1";
                oceanItemFallSpeed[oceanQueueIndex] = 1;
            }
            robotEyeTimer = 60;
        }
    }
    else if (oceanPhase === "judged") {
        oceanJudgeTimer += gameSpeed;
        if (oceanJudgeTimer > 10) {
            oceanBeamColor = "cyan";
            oceanQueueIndex++;
            // 무한 루프: 남은 객체가 3개 미만이면 추가 생성
            while (oceanQueue.length - oceanQueueIndex < 3) {
                oceanQueue.push(generateObject());
                oceanItemVerdicts.push(null);
                oceanItemStates.push("waiting");
                oceanItemFallY.push(0);
                oceanItemFallSpeed.push(0);
                oceanItemFallX.push(0);
            }
            oceanPhase = "entering";
        }
    }
    if (robotEyeTimer > 0) {
        robotEyeTimer--;
        if (robotEyeTimer === 0)
            robotEyeColor = "#4dd0e1";
    }
    // 낙하 업데이트 (앞으로 이동하면서 떨어짐) — 화면 내 객체만
    const maxFallCheck = Math.min(oceanQueueIndex + 5, oceanItemFallSpeed.length);
    for (let i = 0; i < maxFallCheck; i++) {
        if (oceanItemFallSpeed[i] > 0 && oceanItemFallY[i] < H) {
            oceanItemFallSpeed[i] += 0.8;
            oceanItemFallY[i] += oceanItemFallSpeed[i];
            oceanItemFallX[i] += 2.5;
        }
    }
}
function drawOceanSingle() {
    if (oceanPhase === "done" || oceanPhase === "idle")
        return;
    const objY = H * 0.62;
    const objSize = Math.min(W, H) * 0.25;
    const spacing = objSize * 1.9;
    // 로봇 (상단 중앙) — 판정에 따라 이미지 교체
    const rSize = Math.min(W, H) * 0.11;
    robotY = oceanRobotY;
    // 로봇 크기 통일 (1페이지와 동일)
    const robotDrawH = rSize * 4.2;
    const robotDrawW = robotImg ? robotDrawH * (robotImg.naturalWidth / robotImg.naturalHeight) * 0.96 : robotDrawH * 0.7;
    if (robotEyeTimer > 0 && oceanBeamColor === "green" && rCheckImg) {
        const sw = robotDrawW;
        const sh = robotDrawH;
        ctx.drawImage(rCheckImg, robotX - sw / 2, robotY - sh * 0.45, sw, sh);
    }
    else if (robotEyeTimer > 0 && oceanBeamColor === "red" && rFailImg) {
        const sw = robotDrawW;
        const sh = robotDrawH;
        ctx.drawImage(rFailImg, robotX - sw / 2, robotY - sh * 0.45, sw, sh);
    }
    else {
        drawRobot(robotX, robotY, rSize, robotEyeColor, false, null, null);
    }
    // 스캔 빔 — 판정별 색상
    if (oceanPhase !== "done") {
        ctx.save();
        const beamTop = robotY + rSize * 1.5;
        const beamBot = H * 1.05;
        const beamGrad = ctx.createLinearGradient(0, beamTop, 0, beamBot);
        let bc = "77, 208, 225";
        if (oceanBeamColor === "green")
            bc = "102, 187, 106";
        else if (oceanBeamColor === "red")
            bc = "239, 83, 80";
        beamGrad.addColorStop(0, `rgba(${bc}, 0.4)`);
        beamGrad.addColorStop(1, `rgba(${bc}, 0.05)`);
        ctx.fillStyle = beamGrad;
        const topW = rSize * 0.5;
        const botW = rSize * 2.0;
        ctx.beginPath();
        ctx.moveTo(W / 2 - topW, beamTop);
        ctx.lineTo(W / 2 + topW, beamTop);
        ctx.lineTo(W / 2 + botW, beamBot);
        ctx.lineTo(W / 2 - botW, beamBot);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    // 객체들 그리기 (컨베이어 벨트 — 왼→오, 간격 유지)
    for (let i = 0; i < oceanQueue.length; i++) {
        const itemX = oceanConveyorX - i * spacing;
        if (itemX < -objSize * 2 || itemX > W + objSize * 2)
            continue;
        const fallY = oceanItemFallY[i] || 0;
        const fallX = oceanItemFallX[i] || 0;
        const bob = fallY > 0 ? 0 : Math.sin(oceanTime * 2 + i * 0.7) * 6;
        const drawY = objY + bob + fallY;
        const drawItemX = itemX + fallX;
        const obj = oceanQueue[i];
        const bx = objSize * 0.6;
        // 화면 아래로 떨어져나간 객체 스킵
        if (drawY > H + objSize)
            continue;
        // 객체 그리기
        if (obj.type === "fish") {
            drawFish(obj, drawItemX, drawY, objSize);
        }
        else {
            drawTrash(obj, drawItemX, drawY, objSize, 0);
        }
        // 판정 완료 — 바운딩 박스 + 동그란 배지
        const verdict = oceanItemVerdicts[i];
        const hasVerdict = i <= oceanQueueIndex && oceanItemStates[i] === "judged";
        if (hasVerdict) {
            let boxColor;
            let badgeType;
            if (!verdict) {
                boxColor = "#4dd0e1";
                badgeType = "question";
            }
            else if (verdict.label === "fish") {
                boxColor = "#66bb6a";
                badgeType = "check";
            }
            else {
                boxColor = "#ef5350";
                badgeType = "ban";
            }
            ctx.save();
            // 바운딩 박스
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = 3;
            ctx.shadowColor = boxColor;
            ctx.shadowBlur = 10;
            ctx.strokeRect(drawItemX - bx, drawY - bx, bx * 2, bx * 2);
            ctx.shadowBlur = 0;
            // 동그란 배지 (직접 그리기)
            const badgeY = drawY + bx + 16;
            const br = 14;
            ctx.fillStyle = boxColor;
            ctx.beginPath();
            ctx.arc(drawItemX, badgeY, br, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.fillStyle = "white";
            ctx.lineWidth = 2.5;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            if (badgeType === "check") {
                ctx.beginPath();
                ctx.moveTo(drawItemX - 6, badgeY);
                ctx.lineTo(drawItemX - 2, badgeY + 5);
                ctx.lineTo(drawItemX + 7, badgeY - 5);
                ctx.stroke();
            }
            else if (badgeType === "ban") {
                ctx.beginPath();
                ctx.arc(drawItemX, badgeY, 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(drawItemX - 6, badgeY + 5);
                ctx.lineTo(drawItemX + 6, badgeY - 5);
                ctx.stroke();
            }
            else {
                ctx.font = "bold 16px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("?", drawItemX, badgeY);
            }
            ctx.restore();
        }
    }
    // 진행 카운트
}
// ============================================================
// Game logic — UI updates
// ============================================================
function updateCounter() {
    counterNum.textContent = String(currentIndex);
}
function startTypewriter(text, element) {
    // 이전 타자기 중지
    if (typewriterTimer !== null) {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
    }
    // 버블 사운드 루프 재생
    if (bubbleSound) {
        bubbleSound.currentTime = 0;
        bubbleSound.loop = true;
        bubbleSound.play().catch(() => {});
    }
    typewriterText = text;
    typewriterIndex = 0;
    typewriterDone = false;
    typewriterElement = element;
    // 전체 텍스트를 투명으로 넣어 박스 크기 고정, 보이는 부분만 흰색
    element.innerHTML = `<span style="color:transparent;white-space:pre-wrap">${text.replace(/</g, "&lt;")}</span>`;
    typewriterTimer = window.setInterval(() => {
        typewriterIndex++;
        const visible = typewriterText.slice(0, typewriterIndex).replace(/</g, "&lt;");
        const hidden = typewriterText.slice(typewriterIndex).replace(/</g, "&lt;");
        element.innerHTML =
            `<span style="white-space:pre-wrap">${visible}</span><span style="color:transparent;white-space:pre-wrap">${hidden}</span>`;
        if (typewriterIndex >= typewriterText.length) {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
            typewriterDone = true;
            if (bubbleSound) { bubbleSound.loop = false; bubbleSound.pause(); }
        }
    }, 30);
}
function finishTypewriter() {
    if (typewriterTimer !== null) {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
    }
    if (bubbleSound) { bubbleSound.loop = false; bubbleSound.pause(); }
    if (!typewriterDone && typewriterText && typewriterElement) {
        typewriterElement.innerHTML = `<span style="white-space:pre-wrap">${typewriterText.replace(/</g, "&lt;")}</span>`;
        typewriterDone = true;
        // 텍스트 완성 직후 바로 넘어가지 않도록 잠금
        introAdvanceLocked = true;
        setTimeout(() => { introAdvanceLocked = false; }, 300);
    }
}
function setupIntroStep(step) {
    introStepIndex = step;
    // 이전 타자기 중지
    finishTypewriter();
    // 모든 인트로 UI 숨기기
    introBubble.classList.add("hidden");
    introBubble.classList.remove("centered");
    meetAiTooltip.classList.add("hidden");
    classifyButtons.classList.add("hidden");
    bigArrow.classList.add("hidden");
    bigArrow.style.top = "";
    bigArrow.style.right = "";
    bigArrow.style.bottom = "";
    bigArrow.style.left = "";
    // 제목 항상 표시 (인트로 중 어둡게)
    titleEl.textContent = textData.headerTitle;
    titleEl.classList.remove("hidden");
    titleEl.style.opacity = "0.4";
    // 계속하다 버튼 항상 표시
    continueBtn.classList.remove("hidden");
    const stepText = textData.introSteps[step] || "";
    if (step === 0) {
        // 하단 말풍선에 타자기 효과
        introBubble.classList.remove("hidden");
        startTypewriter(stepText, introBubble);
    }
    else if (step === 1) {
        // "Let's meet A.I." 툴팁 + 화살표 + 분류버튼(비활성)
        meetAiTooltip.textContent = textData.meetAI;
        meetAiTooltip.classList.remove("hidden");
        bigArrow.classList.remove("hidden");
        bigArrow.style.top = "11%";
        bigArrow.style.right = "15%";
        bigArrow.style.bottom = "";
        bigArrow.style.left = "";
        classifyButtons.classList.remove("hidden");
        btnYes.disabled = true;
        btnNo.disabled = true;
        typewriterDone = true;
    }
    else if (step === 2) {
        // 하단 말풍선에 타자기 효과
        introBubble.classList.remove("hidden");
        startTypewriter(stepText, introBubble);
    }
    else if (step === 3) {
        // 중앙 말풍선 + 타자기 효과 + 화살표 + 분류버튼(비활성)
        introBubble.classList.remove("hidden");
        introBubble.classList.add("centered");
        startTypewriter(stepText, introBubble);
        bigArrow.classList.remove("hidden");
        bigArrow.style.top = "";
        bigArrow.style.right = "";
        bigArrow.style.bottom = "20%";
        bigArrow.style.left = "calc(46% - 22px)";
        classifyButtons.classList.remove("hidden");
        btnYes.disabled = true;
        btnNo.disabled = true;
    }
}
function advanceIntro() {
    if (stage !== "intro")
        return;
    // 타자기 진행 중이면 먼저 텍스트 완성
    if (!typewriterDone) {
        finishTypewriter();
        return;
    }
    // 텍스트 완성 직후 잠금
    if (introAdvanceLocked)
        return;
    introStepIndex++;
    if (introStepIndex >= textData.introSteps.length) {
        startTraining();
    }
    else {
        setupIntroStep(introStepIndex);
    }
}
function startTraining() {
    stage = "train";
    currentIndex = 0;
    trainingData = [];
    titleEl.textContent = textData.headerTitle;
    titleEl.style.opacity = "1";
    titleEl.classList.remove("hidden");
    introBubble.classList.add("hidden");
    introBubble.classList.remove("centered");
    meetAiTooltip.classList.add("hidden");
    bigArrow.classList.add("hidden");
    continueBtn.classList.remove("hidden");
    classifyButtons.classList.remove("hidden");
    updateCounter();
    initTrainQueue();
    trainReady = false;
    btnYes.disabled = true;
    btnNo.disabled = true;
}
function nextTrainRound() {
    // 무제한 분류 — 다음 단계는 "계속하다" 버튼으로만
    advanceTrainQueue();
    trainReady = false;
    btnYes.disabled = true;
    btnNo.disabled = true;
}
function handleAnswer(userLabel) {
    if (stage !== "train" || !trainReady)
        return;
    const activeObj = getActiveTrainObject();
    if (!activeObj)
        return;
    // 분류 버튼 소리
    if (classifySound) {
        classifySound.currentTime = 0;
        classifySound.play().catch(() => {});
    }
    btnYes.disabled = true;
    btnNo.disabled = true;
    trainReady = false;
    // 뚜껑 열림 (열린 채 유지)
    robotOpenTarget = 1;
    trainingData.push({ features: activeObj.features, label: userLabel });
    currentIndex++;
    updateCounter();
    setTimeout(() => nextTrainRound(), 100);
}
let trainMessageOverlay = false;
let pendingTrainMsg = null;
let pendingDykIndex = -1;
let shownMessageRounds = new Set();
let messageShowing = false;
function showTrainMessage(msg) {
    // 버튼 숨기기 + 오버레이 활성화
    classifyButtons.classList.add("hidden");
    continueBtn.classList.add("hidden");
    trainMessageOverlay = true;
    introBubble.classList.remove("hidden");
    introBubble.classList.remove("centered");
    startTypewriter(msg, introBubble);
    const closeHandler = () => {
        if (!typewriterDone) {
            finishTypewriter();
            return;
        }
        introBubble.classList.add("hidden");
        trainMessageOverlay = false;
        messageShowing = false;
        classifyButtons.classList.remove("hidden");
        continueBtn.classList.remove("hidden");
        btnYes.disabled = false;
        btnNo.disabled = false;
        document.getElementById("appContainer").removeEventListener("click", closeHandler);
    };
    document.getElementById("appContainer").addEventListener("click", closeHandler);
}
function showDidYouKnow() {
    let idx;
    do {
        idx = Math.floor(Math.random() * textData.dykFacts.length);
    } while (dykShownIndices.has(idx) && dykShownIndices.size < textData.dykFacts.length);
    dykShownIndices.add(idx);
    didYouKnow.classList.remove("hidden");
    startTypewriter(textData.dykFacts[idx], dykFact);
}
function closeDidYouKnow() {
    if (!typewriterDone) {
        finishTypewriter();
        return;
    }
    didYouKnow.classList.add("hidden");
    const dykImage = document.getElementById("dyk-image");
    dykImage.classList.remove("show");
    if (pendingTrainMsg) {
        const msg = pendingTrainMsg;
        pendingTrainMsg = null;
        setTimeout(() => showTrainMessage(msg), 200);
    }
    else {
        messageShowing = false;
        trainMessageOverlay = false;
        btnYes.disabled = false;
        btnNo.disabled = false;
    }
}
function showOceanIntro() {
    stage = "ocean-intro";
    classifyButtons.classList.add("hidden");
    continueBtn.classList.add("hidden");
    titleEl.classList.add("hidden");
    document.querySelector(".top-ui").classList.add("hidden");
    robotOpenTarget = 0;
    robotOpenProgress = 0;
    trainMessageOverlay = true;
    initOceanBubbles();
    // 하단 텍스트 표시
    introBubble.classList.remove("hidden");
    introBubble.classList.remove("centered");
    startTypewriter("이제 A.I.가 \"물고기\"가 어떻게 생겼는지 아는지 봅시다.", introBubble);
    const closeHandler = () => {
        if (!typewriterDone) {
            finishTypewriter();
            return;
        }
        introBubble.classList.add("hidden");
        document.getElementById("appContainer").removeEventListener("click", closeHandler);
        // 두 번째 텍스트 표시
        startTypewriter("AI는 학습된 내용을 바탕으로 무작위로 선택된 객체들을\n분석하고 레이블을 지정합니다.", introBubble);
        introBubble.classList.remove("hidden");
        const closeHandler2 = () => {
            if (!typewriterDone) {
                finishTypewriter();
                return;
            }
            introBubble.classList.add("hidden");
            document.getElementById("appContainer").removeEventListener("click", closeHandler2);
            // 세 번째: "해봅시다!" + 화살표 + 실행 버튼 + 오버레이 해제
            trainMessageOverlay = false;
            oceanIntroEl.classList.remove("hidden");
            bigArrow.classList.remove("hidden");
            bigArrow.style.top = "";
            bigArrow.style.right = "42px";
            bigArrow.style.bottom = "100px";
            bigArrow.style.left = "";
            runBtn.classList.remove("hidden");
            runBtn.textContent = textData.runBtn;
        };
        document.getElementById("appContainer").addEventListener("click", closeHandler2);
    };
    document.getElementById("appContainer").addEventListener("click", closeHandler);
}
function startOceanRun() {
    stage = "ocean-run";
    currentIndex = 0;
    oceanResults = [];
    paused = false;
    gameSpeed = 1;
    oceanIntroEl.classList.add("hidden");
    bigArrow.classList.add("hidden");
    runBtn.classList.add("hidden");
    playbackControls.classList.remove("hidden");
    oceanContinueBtn.classList.remove("hidden");
    updateCounter();
    initOceanQueue();
}
// ============================================================
// Review stage (2-3 page)
// ============================================================
const REVIEW_MESSAGES = [
    "당신의 훈련을 바탕으로, A.I.가 \"물고기\"로 식별한 객체들\n이 여기 있습니다. A.I.는 잘했나요?",
    "\"물고기\"와 \"물고기가 아닌 것\"으로 식별된 객체 사이를 전\n환합니다.",
    "AI를 더 많이 학습시킬 수 있습니다...\n...또는 계속하세요."
];
function showReview() {
    stage = "review";
    reviewStep = 0;
    reviewShowFish = true;
    // AI 학습 데이터 기반으로 물고기 20개, 쓰레기 20개 각각 생성
    reviewFishObjects = [];
    reviewTrashObjects = [];
    let safetyCount = 0;
    while ((reviewFishObjects.length < 20 || reviewTrashObjects.length < 20) && safetyCount < 200) {
        safetyCount++;
        const obj = generateObject();
        const pred = predict(obj.features);
        const label = pred ? pred.label : (obj.type === "fish" ? "fish" : "trash");
        if (label === "fish" && reviewFishObjects.length < 20) {
            reviewFishObjects.push({ obj: obj, predicted: label });
        }
        else if (label === "trash" && reviewTrashObjects.length < 20) {
            reviewTrashObjects.push({ obj: obj, predicted: label });
        }
    }
    // Hide ocean UI
    playbackControls.classList.add("hidden");
    oceanContinueBtn.classList.add("hidden");
    document.querySelector(".top-ui").classList.add("hidden");
    // Show review UI
    reviewBottom.classList.remove("hidden");
    reviewToggle.classList.remove("hidden");
    reviewBubble.textContent = REVIEW_MESSAGES[0];
    reviewFishBtn.classList.add("active");
    reviewTrashBtn.classList.remove("active");
    // 화면 클릭으로 메시지 진행
    const reviewClickHandler = (e) => {
        // 토글 버튼, 훈련 버튼, 계속하다 버튼 클릭은 무시
        if (e.target.closest(".review-toggle") || e.target.closest(".review-train-btn"))
            return;
        if (e.target.closest(".review-continue-btn"))
            return;
        advanceReviewStep();
    };
    document.getElementById("appContainer").addEventListener("click", reviewClickHandler);
    // 저장해서 나중에 제거
    window._reviewClickHandler = reviewClickHandler;
}
function advanceReviewStep() {
    reviewStep++;
    if (reviewStep >= REVIEW_MESSAGES.length) {
        // 마지막 단계: 버튼 클릭 대기 (화면 클릭 핸들러 제거)
        if (window._reviewClickHandler) {
            document.getElementById("appContainer").removeEventListener("click", window._reviewClickHandler);
            window._reviewClickHandler = null;
        }
        reviewBottom.classList.add("hidden");
        reviewToggle.classList.add("hidden");
        showResult();
        return;
    }
    reviewBubble.textContent = REVIEW_MESSAGES[reviewStep];
}
function drawReviewScreen() {
    drawOceanBackground();
    // 토글에 따라 해당 배열 선택
    const items = reviewShowFish ? reviewFishObjects : reviewTrashObjects;
    // 3행 레이아웃: 7 - 7 - 6 (맨 아래줄은 로봇이 가운데)
    const rowCounts = [7, 7, 6];
    const rowYs = [H * 0.13, H * 0.38, H * 0.63];
    const cellW = W / 8;
    const objSize = Math.min(cellW * 0.7, H * 0.14);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
        const count = rowCounts[r];
        const totalW = (r === 2 ? 7 : count) * cellW;
        const startX = (W - totalW) / 2 + cellW / 2;
        for (let c = 0; c < count && idx < items.length; c++, idx++) {
            const item = items[idx];
            const baseY = rowYs[r];
            let x;
            if (r === 2) {
                if (c < 3) {
                    x = startX + c * cellW;
                }
                else {
                    x = startX + (c + 1) * cellW;
                }
            }
            else {
                x = startX + c * cellW;
            }
            const swayX = Math.sin(oceanTime * 0.8 + idx * 1.1) * 5;
            const floatY = Math.sin(oceanTime * 1.2 + idx * 0.9) * 4;
            if (item.obj.type === "fish") {
                drawFish(item.obj, x + swayX, baseY + floatY, objSize);
            }
            else {
                drawTrash(item.obj, x + swayX, baseY + floatY, objSize, 0);
            }
        }
    }
    // 로봇: 3번째 줄 가운데
    const robotSize = Math.min(W, H) * 0.08;
    drawRobot(W * 0.5, rowYs[2], robotSize, "#4dd0e1", false, null, null);
}
function showResult() {
    if (stage === "result")
        return;
    stage = "result";
    const correct = oceanResults.filter((r) => r.correct).length;
    const pct = Math.round((correct / oceanResults.length) * 100);
    resultScore.textContent = pct + "%";
    resultDetail.textContent = `${oceanResults.length}개 중 ${correct}개를 맞혔어요!`;
    resultOverlay.classList.remove("hidden");
    playbackControls.classList.add("hidden");
    oceanContinueBtn.classList.add("hidden");
}
function resetGame() {
    resultOverlay.classList.add("hidden");
    reviewBottom.classList.add("hidden");
    reviewToggle.classList.add("hidden");
    stage = "intro";
    introStepIndex = 0;
    trainQueue = [];
    currentIndex = 0;
    oceanObjects = [];
    oceanResults = [];
    oceanQueue = [];
    oceanPhase = "idle";
    dykShownIndices.clear();
    shownMessageRounds.clear();
    messageShowing = false;
    updateCounter();
    introFrameObjects = [generateObject(), generateObject(), generateObject()];
    setupIntroStep(0);
}
// ============================================================
// Main render loop
// ============================================================
function render() {
    oceanTime += 0.02 * (paused ? 0 : gameSpeed);
    // 로봇 뚜껑 애니메이션 보간
    robotOpenProgress += (robotOpenTarget - robotOpenProgress) * 0.12;
    if (stage === "review") {
        drawReviewScreen();
    }
    else if (stage === "ocean-intro" || stage === "ocean-run") {
        drawOceanBackground();
        if (stage === "ocean-intro") {
            const robotSize = Math.min(W, H) * 0.11;
            const robotIntroY = H * 0.53;
            drawRobot(W * 0.5, robotIntroY, robotSize, "#4dd0e1", false, null, null);
            const introObj = introFrameObjects[0] || generateObject();
            const introObjX = W * 0.2;
            const introObjY = H * 0.60 + Math.sin(oceanTime * 2.5) * 6;
            if (introObj.type === "fish") {
                drawFish(introObj, introObjX, introObjY, Math.min(W, H) * 0.25);
            }
            else {
                drawTrash(introObj, introObjX, introObjY, Math.min(W, H) * 0.25, 0);
            }
            // 텍스트 표시 중 오버레이
            if (trainMessageOverlay) {
                ctx.save();
                ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
                ctx.fillRect(0, 0, W, H);
                ctx.restore();
            }
        }
        else {
            // ocean-run: 하나씩 순서대로 분류
            updateOceanSingle();
            drawOceanSingle();
        }
    }
    else {
        drawLabBackground();
        const frameSize = Math.min(W, H) * 0.32;
        const cx = W / 2;
        const cy = H / 2 + H * 0.03;
        if (stage === "train") {
            updateTrainQueue();
            const sorted = [...trainQueue].sort((a, b) => a.x - b.x);
            sorted.forEach((q) => {
                const frameX = cx + q.x;
                const frameY = cy + q.y;
                if (frameX < -frameSize || frameX > W + frameSize)
                    return;
                if (q.scale < 0.05)
                    return;
                const isActive = q.state === "active" && Math.abs(q.x) < 30;
                ctx.save();
                ctx.globalAlpha = 1;
                ctx.translate(frameX, frameY);
                ctx.scale(q.scale, q.scale);
                ctx.translate(-frameX, -frameY);
                drawPhotoFrame(frameX, frameY, frameSize, isActive);
                ctx.save();
                ctx.beginPath();
                ctx.rect(frameX - frameSize / 2, frameY - frameSize / 2, frameSize, frameSize);
                ctx.clip();
                if (q.obj.type === "fish") {
                    drawFish(q.obj, frameX, frameY, frameSize * 0.8);
                }
                else {
                    drawTrash(q.obj, frameX, frameY, frameSize * 0.8, 0);
                }
                ctx.restore();
                ctx.restore();
            });
        }
        else if (stage === "intro") {
            const introPositions = [
                { x: cx - W * 0.58, scale: 1, alpha: 1, scanner: false },
                { x: cx - W * 0.29, scale: 1, alpha: 1, scanner: false },
                { x: cx, scale: 1, alpha: 1, scanner: true },
            ];
            introPositions.forEach((pos, i) => {
                const obj = introFrameObjects[i];
                if (!obj)
                    return;
                const s = frameSize * pos.scale;
                ctx.save();
                ctx.globalAlpha = pos.alpha;
                drawPhotoFrame(pos.x, cy, s, pos.scanner);
                ctx.beginPath();
                ctx.rect(pos.x - s / 2, cy - s / 2, s, s);
                ctx.clip();
                if (obj.type === "fish") {
                    drawFish(obj, pos.x, cy, s * 0.8);
                }
                else {
                    drawTrash(obj, pos.x, cy, s * 0.8, 0);
                }
                ctx.restore();
            });
        }
        // AI 로봇 (오른쪽)
        if (stage === "train" || stage === "intro") {
            drawRobot(W * 0.80, H * 0.50, Math.min(W, H) * 0.13, "#4dd0e1", false, null, null);
        }
        // 텍스트 부각용 어두운 오버레이
        if (stage === "intro" || trainMessageOverlay) {
            ctx.save();
            ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
            titleEl.style.opacity = "0.4";
            classifyButtons.style.opacity = "0.3";
            classifyButtons.style.pointerEvents = "none";
            continueBtn.style.opacity = "0.3";
            continueBtn.style.pointerEvents = "none";
        }
        else if (stage === "train") {
            titleEl.style.opacity = "1";
            classifyButtons.style.opacity = "1";
            classifyButtons.style.pointerEvents = "auto";
            continueBtn.style.opacity = "1";
            continueBtn.style.pointerEvents = "auto";
        }
    }
    requestAnimationFrame(render);
}
// ============================================================
// Event binding
// ============================================================
function bindEvents() {
    continueBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (stage === "intro")
            advanceIntro();
        else if (stage === "train")
            showOceanIntro();
    });
    btnYes.addEventListener("click", (e) => {
        e.stopPropagation();
        handleAnswer("fish");
    });
    btnNo.addEventListener("click", (e) => {
        e.stopPropagation();
        handleAnswer("trash");
    });
    dykBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDidYouKnow();
    });
    runBtn.addEventListener("click", startOceanRun);
    oceanContinueBtn.addEventListener("click", showReview);
    // Review events
    reviewContinueBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        advanceReviewStep();
    });
    reviewTrainBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        // 클릭 핸들러 정리
        if (window._reviewClickHandler) {
            document.getElementById("appContainer").removeEventListener("click", window._reviewClickHandler);
            window._reviewClickHandler = null;
        }
        // 리뷰에서 훈련으로 돌아가기
        reviewBottom.classList.add("hidden");
        reviewToggle.classList.add("hidden");
        stage = "train";
        currentIndex = 0;
        trainQueue = [];
        trainReady = false;
        trainMessageOverlay = false;
        initTrainQueue();
        titleEl.classList.remove("hidden");
        classifyButtons.classList.remove("hidden");
        continueBtn.classList.remove("hidden");
        document.querySelector(".top-ui").classList.remove("hidden");
        updateCounter();
    });
    reviewFishBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        reviewShowFish = true;
        reviewFishBtn.classList.add("active");
        reviewTrashBtn.classList.remove("active");
    });
    reviewTrashBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        reviewShowFish = false;
        reviewTrashBtn.classList.add("active");
        reviewFishBtn.classList.remove("active");
    });
    // 재생 컨트롤 아이콘 그리기
    function drawBtnIcon(btn, drawFn) {
        const cv = btn.querySelector("canvas");
        if (!cv)
            return;
        const c = cv.getContext("2d");
        const s = cv.width;
        c.clearRect(0, 0, s, s);
        c.strokeStyle = "white";
        c.fillStyle = "white";
        c.lineWidth = 2;
        c.lineCap = "round";
        c.lineJoin = "round";
        drawFn(c, s);
    }
    function drawRewindIcon(c, s) {
        const m = s / 2;
        // 왼쪽 삼각형
        c.beginPath();
        c.moveTo(m, m - 7);
        c.lineTo(m - 8, m);
        c.lineTo(m, m + 7);
        c.fill();
        // 오른쪽 삼각형
        c.beginPath();
        c.moveTo(m + 8, m - 7);
        c.lineTo(m, m);
        c.lineTo(m + 8, m + 7);
        c.fill();
    }
    function drawPauseIcon(c, s) {
        const m = s / 2;
        c.fillRect(m - 5, m - 7, 4, 14);
        c.fillRect(m + 1, m - 7, 4, 14);
    }
    function drawPlayIcon(c, s) {
        const m = s / 2;
        c.beginPath();
        c.moveTo(m - 5, m - 8);
        c.lineTo(m + 7, m);
        c.lineTo(m - 5, m + 8);
        c.closePath();
        c.fill();
    }
    function drawForwardIcon(c, s) {
        const m = s / 2;
        c.beginPath();
        c.moveTo(m - 8, m - 7);
        c.lineTo(m, m);
        c.lineTo(m - 8, m + 7);
        c.fill();
        c.beginPath();
        c.moveTo(m, m - 7);
        c.lineTo(m + 8, m);
        c.lineTo(m, m + 7);
        c.fill();
    }
    drawBtnIcon(rewindBtn, drawRewindIcon);
    drawBtnIcon(pauseBtn, drawPauseIcon);
    drawBtnIcon(forwardBtn, drawForwardIcon);
    pauseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (oceanReversing) {
            oceanReversing = false;
            paused = false;
        }
        else {
            paused = !paused;
        }
        drawBtnIcon(pauseBtn, paused ? drawPlayIcon : drawPauseIcon);
    });
    rewindBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (stage === "ocean-run") {
            oceanReversing = true;
            paused = false;
            drawBtnIcon(pauseBtn, drawPauseIcon);
        }
    });
    forwardBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (oceanReversing) {
            oceanReversing = false;
        }
        else {
            gameSpeed = Math.min(4, gameSpeed * 2);
        }
    });
    restartBtn.addEventListener("click", resetGame);
    // 쓰레기통: hover 이미지 교체 + 클릭 시 확인 팝업
    const trashBtn = document.getElementById("trash-btn");
    const trashImg = trashBtn.querySelector(".trash-img");
    const eraseConfirm = document.getElementById("erase-confirm");
    const eraseYes = document.getElementById("erase-yes");
    const eraseNo = document.getElementById("erase-no");
    trashBtn.addEventListener("pointerenter", () => { trashImg.src = "image/ui/trash1.png"; });
    trashBtn.addEventListener("pointerleave", () => { trashImg.src = "image/ui/trash.png"; });
    trashBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (stage === "train") {
            trainMessageOverlay = true;
            eraseConfirm.classList.remove("hidden");
        }
    });
    eraseYes.addEventListener("click", (e) => {
        e.stopPropagation();
        eraseConfirm.classList.add("hidden");
        trainMessageOverlay = false;
        trainingData = [];
        currentIndex = 0;
        updateCounter();
        robotOpenTarget = 0;
        robotOpenProgress = 0;
        shownMessageRounds.clear();
    });
    eraseNo.addEventListener("click", (e) => {
        e.stopPropagation();
        eraseConfirm.classList.add("hidden");
        trainMessageOverlay = false;
    });
    // 인트로: 아무 곳이나 클릭하면 다음 단계
    document.getElementById("appContainer").addEventListener("click", () => {
        // 클릭 시 button04a 소리
        if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(() => {});
        }
        if (stage === "intro")
            advanceIntro();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            if (stage === "intro")
                advanceIntro();
            else if (stage === "ocean-intro")
                startOceanRun();
            else if (!didYouKnow.classList.contains("hidden"))
                closeDidYouKnow();
        }
    });
}
// ============================================================
// initApp — Entry point
// ============================================================
export async function initApp() {
    // 1. Load data
    appData = await AppHelper.loadAppData();
    textData = await AppHelper.loadTextData();
    assetList = await AppHelper.loadAssetList();
    // 2. Set canvas size
    W = appData.canvasWidth;
    H = appData.canvasHeight;
    appCanvas.width = W;
    appCanvas.height = H;
    // 3. Get 2D context
    ctx = appCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // 4. Grab DOM refs
    titleEl = document.getElementById("title");
    counterNum = document.getElementById("counter-num");
    introBubble = document.getElementById("intro-bubble");
    continueBtn = document.getElementById("continue-btn");
    classifyButtons = document.getElementById("classify-buttons");
    btnYes = document.getElementById("btn-yes");
    btnNo = document.getElementById("btn-no");
    didYouKnow = document.getElementById("did-you-know");
    dykFact = document.getElementById("dyk-fact");
    dykBtn = document.getElementById("dyk-btn");
    oceanIntroEl = document.getElementById("ocean-intro");
    bigArrow = document.getElementById("big-arrow");
    runBtn = document.getElementById("run-btn");
    playbackControls = document.getElementById("playback-controls");
    pauseBtn = document.getElementById("pause-btn");
    rewindBtn = document.getElementById("rewind-btn");
    forwardBtn = document.getElementById("forward-btn");
    oceanContinueBtn = document.getElementById("ocean-continue-btn");
    resultOverlay = document.getElementById("result-overlay");
    resultScore = document.getElementById("result-score");
    resultDetail = document.getElementById("result-detail");
    restartBtn = document.getElementById("restart-btn");
    meetAiTooltip = document.getElementById("meet-ai-tooltip");
    reviewBottom = document.getElementById("review-bottom");
    reviewBubble = document.getElementById("review-bubble");
    reviewTrainBtn = document.getElementById("review-train-btn");
    reviewContinueBtn = document.getElementById("review-continue-btn");
    reviewToggle = document.getElementById("review-toggle");
    reviewFishBtn = document.getElementById("review-fish-btn");
    reviewTrashBtn = document.getElementById("review-trash-btn");
    // 5. Load images
    function loadImg(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }
    // 기본 이미지 로드
    const [bg, bg2, rb, rck, rfl] = await Promise.all([
        loadImg("background.png"),
        loadImg("background2.png"),
        loadImg("sky.png"),
        loadImg("green.png"),
        loadImg("red.png"),
    ]);
    bgImage = bg;
    bg2Image = bg2;
    cacheBackground();
    robotImg = rb;
    rCheckImg = rck;
    rFailImg = rfl;
    // 물고기 이미지 로드
    const fishPromises = FISH_FILES.map(f => loadImg(`image/fish/${f}.png`));
    const fishResults = await Promise.all(fishPromises);
    fishImages = fishResults.filter((img) => img !== null);
    // 쓰레기 이미지 로드
    const trashPromises = TRASH_FILES.map(t => loadImg(`image/trashfolder/${t.file}.png`));
    const trashResults = await Promise.all(trashPromises);
    trashImages = [];
    trashLabels = [];
    trashResults.forEach((img, i) => {
        if (img) {
            trashImages.push(img);
            trashLabels.push(TRASH_FILES[i].label);
        }
    });
    // 로봇 이미지를 뚜껑(dome)과 몸통(body)으로 분리
    if (robotImg) {
        const natW = robotImg.naturalWidth;
        const natH = robotImg.naturalHeight;
        const domeCutY = Math.floor(natH * DOME_SPLIT);
        // 뚜껑 (상단) — 가운데 부분만 (귀/안테나 제외)
        const domeMargin = Math.floor(natW * 0.25); // 좌우 25%씩 제외
        const domeW = natW - domeMargin * 2;
        robotDomeCanvas = document.createElement("canvas");
        robotDomeCanvas.width = domeW;
        robotDomeCanvas.height = domeCutY;
        const dctx = robotDomeCanvas.getContext("2d");
        dctx.drawImage(robotImg, domeMargin, 0, domeW, domeCutY, 0, 0, domeW, domeCutY);
        // 몸통 (하단) — 전체 이미지(귀 포함)에서 뚜껑 부분은 그대로 남김
        robotBodyCanvas = document.createElement("canvas");
        robotBodyCanvas.width = natW;
        robotBodyCanvas.height = natH;
        const bctx = robotBodyCanvas.getContext("2d");
        bctx.drawImage(robotImg, 0, 0);
        // 뚜껑 영역 가운데만 지우기 (귀는 남김)
        bctx.clearRect(domeMargin, 0, domeW, domeCutY);
    }
    // 5.5 사운드 로드
    bubbleSound = new Audio("sound/bubble.wav");
    bubbleSound.volume = 0.5;
    clickSound = new Audio("sound/button04a.mp3");
    clickSound.volume = 0.3;
    classifySound = new Audio("sound/button05.mp3");
    classifySound.volume = 0.3;
    enterSound = new Audio("sound/turning_a_lock1.mp3");
    enterSound.volume = 0.3;
    laserSound = new Audio("sound/laser7.mp3");
    laserSound.volume = 0.3;
    poyoSound = new Audio("sound/poyo.mp3");
    poyoSound.volume = 0.2;
    // 6. Set text from data.json & init intro
    continueBtn.textContent = textData.continueBtn;
    introFrameObjects = [generateObject(), generateObject(), generateObject()];
    setupIntroStep(0);
    // 7. Bind events
    bindEvents();
    // 7.5 Nav bar dot click
    const navDots = document.querySelectorAll(".nav-dot");
    navDots.forEach((dot) => {
        dot.addEventListener("click", () => {
            const page = Number(dot.getAttribute("data-page"));
            if (!page)
                return;
            // 현재 페이지(2) 클릭 시 무시
            if (dot.classList.contains("active"))
                return;
            // 부모에게 페이지 이동 요청
            window.parent.postMessage({
                source: "typingx-x-iframe",
                type: "navigate-page",
                payload: { page: page }
            }, "*");
        });
    });
    // 8. Start render loop
    render();
}

// 1. ИНИЦИАЛИЗАЦИЯ
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020305, 0.002);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 180, 350);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ReinhardToneMapping; 
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 600;

// 2. НЕОНОВЫЙ ЭФФЕКТ (BLOOM)
const renderScene = new THREE.RenderPass(scene, camera);
const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.1;
bloomPass.strength = 2.0; 
bloomPass.radius = 0.8;    

const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// 3. ОСНОВНОЕ КОЛЬЦО
const RADIUS = 150;
const ringGeo = new THREE.TorusGeometry(RADIUS, 6, 16, 100);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x0a1530, wireframe: true, transparent: true, opacity: 0.2 });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 2;
scene.add(ring);

const tubeGeo = new THREE.TorusGeometry(RADIUS, 1, 8, 100);
const tubeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.05 });
const tube = new THREE.Mesh(tubeGeo, tubeMat);
tube.rotation.x = Math.PI / 2;
scene.add(tube);

// 4. ДЕТЕКТОРЫ И ИХ HTML-ПОДПИСИ
const detectorsData = [
    { id: "ATLAS", angle: 0, color: 0xff1111, desc: "Самый массивный детектор на БАК. Специализируется на поиске бозона Хиггса и частиц темной материи." },
    { id: "CMS", angle: Math.PI, color: 0xffaa00, desc: "Компактный мюонный соленоид. Оснащен мощнейшим сверхпроводящим магнитом." },
    { id: "ALICE", angle: Math.PI/2, color: 0x11ff11, desc: "Изучает столкновения тяжелых ионов свинца для воссоздания кварк-глюонной плазмы." },
    { id: "LHCb", angle: -Math.PI/2, color: 0xff11ff, desc: "Изучает b-кварки. Главная задача: понять, почему материи во Вселенной больше, чем антиматерии." }
];

const detectors = []; 
const labelsContainer = document.getElementById('labels-container');

detectorsData.forEach(data => {
    const group = new THREE.Group();
    
    // 3D Модель детектора
    const geo = new THREE.CylinderGeometry(15, 15, 30, 8);
    const mat = new THREE.MeshBasicMaterial({ color: data.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    group.add(mesh);

    group.position.set(RADIUS * Math.cos(data.angle), 0, RADIUS * Math.sin(data.angle));
    
    // Создаем HTML элемент для подписи
    const labelDiv = document.createElement('div');
    labelDiv.className = 'detector-label';
    labelDiv.innerText = data.id;
    labelDiv.style.borderColor = '#' + data.color.toString(16);
    labelsContainer.appendChild(labelDiv);

    // Сохраняем все данные, включая ссылку на HTML метку
    group.userData = { name: data.id, desc: data.desc, color: data.color, label: labelDiv };
    mesh.userData = group.userData;
    
    scene.add(group);
    detectors.push(mesh); 
});

// 5. ЧАСТИЦЫ
let particleAngle = 0;
let pSpeed = 0.02;
let numBunches = 4;

const matCW = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const matCCW = new THREE.MeshBasicMaterial({ color: 0x00ffff });
const pGeo = new THREE.SphereGeometry(2, 8, 8);

const particlesCW = []; const particlesCCW = [];
for(let i=0; i<10; i++) {
    let p1 = new THREE.Mesh(pGeo, matCW);
    let p2 = new THREE.Mesh(pGeo, matCCW);
    scene.add(p1); scene.add(p2);
    particlesCW.push(p1); particlesCCW.push(p2);
}

// 6. СИСТЕМА ВЗРЫВОВ
const explosionParticles = [];
const expGeo = new THREE.BufferGeometry();
const expCount = 2000;
const posArray = new Float32Array(expCount * 3);
const colorArray = new Float32Array(expCount * 3);
expGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
expGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

const expMat = new THREE.PointsMaterial({
    size: 2.0, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 1.0, depthWrite: false
});
const expSystem = new THREE.Points(expGeo, expMat);
scene.add(expSystem);

function triggerCollision(x, z, energy) {
    let sparkCount = Math.floor(energy * 10);
    for(let i=0; i<sparkCount; i++) {
        explosionParticles.push({
            x: x, y: 0, z: z,
            vx: (Math.random() - 0.5) * energy * 1.5,
            vy: (Math.random() - 0.5) * energy * 1.5,
            vz: (Math.random() - 0.5) * energy * 1.5,
            life: 1.0,
            color: new THREE.Color().setHSL(Math.random(), 1, 0.8)
        });
    }
    let el = document.getElementById('val-collisions');
    el.innerText = parseInt(el.innerText) + 1;
}

// 7. ИНТЕРАКТИВ И СОБЫТИЯ
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(detectors);

    const panel = document.getElementById('info-panel');
    if (intersects.length > 0) {
        const data = intersects[0].object.userData;
        document.getElementById('info-title').innerText = data.name;
        document.getElementById('info-desc').innerText = data.desc;
        document.getElementById('info-title').style.color = '#' + data.color.toString(16);
        panel.style.display = 'block';
        panel.style.borderColor = '#' + data.color.toString(16);
    } else {
        panel.style.display = 'none';
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('slider-energy').addEventListener('input', (e) => {
    document.getElementById('val-energy').innerText = parseFloat(e.target.value).toFixed(1);
    pSpeed = e.target.value * 0.003;
});
document.getElementById('slider-bunches').addEventListener('input', (e) => {
    numBunches = parseInt(e.target.value);
    document.getElementById('val-bunches').innerText = numBunches;
});

// 8. ГЛАВНЫЙ ЦИКЛ АНИМАЦИИ
const tempV = new THREE.Vector3(); // Вектор для проекции 3D->2D

function animate() {
    requestAnimationFrame(animate);

    tube.rotation.z -= 0.001;
    particleAngle += pSpeed;
    
    // Обновление частиц
    for(let i=0; i<10; i++) {
        if (i < numBunches) {
            particlesCW[i].visible = particlesCCW[i].visible = true;

            let offset = i * ((Math.PI * 2) / numBunches);
            let a_cw = particleAngle + offset;
            particlesCW[i].position.set(RADIUS * Math.cos(a_cw), 0, RADIUS * Math.sin(a_cw));

            let a_ccw = -particleAngle + offset;
            particlesCCW[i].position.set(RADIUS * Math.cos(a_ccw), 0, RADIUS * Math.sin(a_ccw));

            let dist = particlesCW[i].position.distanceTo(particlesCCW[i].position);
            if (dist < pSpeed * RADIUS * 1.5) {
                let energy = parseFloat(document.getElementById('slider-energy').value);
                triggerCollision(particlesCW[i].position.x, particlesCW[i].position.z, energy);
            }
        } else {
            particlesCW[i].visible = particlesCCW[i].visible = false;
        }
    }

    // Обновление взрывов
    let positions = expSystem.geometry.attributes.position.array;
    let colors = expSystem.geometry.attributes.color.array;
    let index = 0;

    for(let i = explosionParticles.length - 1; i >= 0; i--) {
        let p = explosionParticles[i];
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        p.life -= 0.03;

        if (p.life <= 0) {
            explosionParticles.splice(i, 1);
        } else {
            positions[index*3] = p.x; positions[index*3+1] = p.y; positions[index*3+2] = p.z;
            colors[index*3] = p.color.r * p.life; colors[index*3+1] = p.color.g * p.life; colors[index*3+2] = p.color.b * p.life;
            index++;
        }
    }
    for(let i = index; i < expCount; i++) {
        positions[i*3] = positions[i*3+1] = positions[i*3+2] = 0;
    }
    expSystem.geometry.attributes.position.needsUpdate = true;
    expSystem.geometry.attributes.color.needsUpdate = true;

    // --- ПРОЕКЦИЯ 3D В 2D ДЛЯ ПОДПИСЕЙ ---
    detectors.forEach(mesh => {
        const group = mesh.parent; 
        
        // Берем позицию детектора и чуть поднимаем
        tempV.copy(group.position);
        tempV.y += 25; 
        
        // Проецируем на экран
        tempV.project(camera);
        
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;
        
        // Двигаем HTML метку
        const label = group.userData.label;
        label.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
        
        // Прячем метку, если она ушла за спину камеры (z > 1)
        label.style.opacity = tempV.z > 1 ? "0" : "1";
    });

    controls.update();
    composer.render();
}

animate();
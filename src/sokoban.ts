import * as THREE from "three"
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader"
import { GUI } from "dat.gui"

let scene: THREE.Scene;
let camera: THREE.Camera;
let renderer: THREE.WebGLRenderer;

const gui = new GUI();

const map = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
];

const makeLevel = (w: number, h: number) => {
    return [
        {
            block: [
                // {x: 0, y: }
            ]
        }
    ]
}

const update = () => {

}


const mainLoop = () => {
    const loop = () => {
        requestAnimationFrame(loop);
        renderer.render(scene, camera);
        update();
    }
    requestAnimationFrame(loop);
}

const initGui = () => {
    gui.add(camera.position, "x", -100, 100, 0.1);
    gui.add(camera.position, "y", -100, 100, 0.1);
    gui.add(camera.position, "z", -100, 100, 0.1);
    gui.add(camera.rotation, "x", 0, 2 * Math.PI, 0.01);
    gui.add(camera.rotation, "y", 0, 2 * Math.PI, 0.01);
    gui.add(camera.rotation, "z", 0, 2 * Math.PI, 0.01);
    
}

const initWorld = async(): Promise<void> => {
    renderer.setClearColor(0x0066ff);
    // camera.position.z = 50;
    const columnSize = 9;
    const size = ~~(Math.min(window.innerWidth, window.innerHeight) * 0.8 / columnSize);
    const maxSize = columnSize * size;
    const planeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const blockMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const pathMaterial = new THREE.MeshPhongMaterial({ color: 0x006700 });

    for(let z = 0; z < 8; z++) {
        for(let x = 0; x < 8; x++) {
            let material;
            const id = map[z][x];
            let px = ~~(x);
            let pz = ~~(z);
            const plane = new THREE.Mesh(planeGeometry, material);
            if(id === 1) {
                material = blockMaterial;
            } else {
                material = pathMaterial;
                plane.scale.y = 0.01;
            }
            plane.material = material;
            plane.position.set(px, 0, pz);
            scene.add(plane);
        }
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 100, 0);
    const dHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    scene.add(ambientLight, directionalLight, dHelper);

    const loader = new GLTFLoader();
    loader.load("../assets/models/steeve.glb", e => {
        const s = 0.3;
        e.scene.scale.set(s, s, s);
        e.scene.position.set(1, 0, 1);
        scene.add(e.scene);
    });

}

const initRenderer = (w: number, h: number): boolean => {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(w, h);

    if(!renderer.capabilities.isWebGL2) {
        console.log("Seems like your device does not support Webgl2");
        return false;
    }

    renderer.setViewport(0, 0, w, h);
    const aspect = w/h;
    const d = 6;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(20, 20, 20);
    camera.rotation.order = "YXZ";
    camera.rotation.y = Math.PI / 4;
    camera.rotation.x = Math.atan(1 / Math.sqrt(2));
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    return true;
}

const main = async(): Promise<void> => {
    if(!initRenderer(innerWidth, innerHeight)) return;
    initGui();
    await initWorld();
    document.body.appendChild(renderer.domElement);

    mainLoop();
}

addEventListener("load", main);
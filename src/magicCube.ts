import * as THREE from "three"
import { GUI } from "dat.gui"

let scene: THREE.Scene;
let camera: THREE.Camera;
let renderer: THREE.WebGLRenderer;

const gui = new GUI();

const update = () => {
    // camera.rotation.z += 0.01;
    // scene.children.forEach((child) => {
    //     if(child instanceof THREE.Mesh) {
    //         if(child.position.x === 0) 
    //         child.rotation.x += 0.01;
    //     }
    // })
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

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });

    const size = 2;
    const spacing = 1.2;

    const maxSize = size * (1 * spacing);
    // camera.position.set(maxSize/2, 0, 0);
    
    for(let z = 0; z < size; z++) {
        for(let y = 0; y < size; y++) {
            for(let x = 0; x < size; x++) {
                const cube = new THREE.Mesh(geometry, material);
                cube.position.set(x * spacing, y * spacing, z * spacing);
                scene.add(cube);
            }
        }
    }
    
   
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
}

const initRenderer = (w: number, h: number): boolean => {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(w, h);

    if(!renderer.capabilities.isWebGL2) {
        console.log("Seems like your device does not support Webgl2");
        return false;
    }

    camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 1000);
    camera.position.set(0, 0, 12.3);
    camera.rotation.set(0, 0.06, 0.7);
    camera.lookAt(0, 0, 0);
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
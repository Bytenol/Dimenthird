/**
 * @todo block texture
 * @todo ensure they are not sinking
 * @todo add localstorage
 * @todo add history
 * @todo add screen
 * @todo onbody resize
 */
import * as THREE from "three"
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader"

type nullable<T> = T | null;

type dir_t = "right" | "left" | "top" | "bottom";

type texture_t = nullable<THREE.Texture>;
interface iTexture { 
    grass: texture_t, 
    brick: texture_t,
    crate: texture_t,
    dot: texture_t,
    dirt: texture_t
};

let scene: THREE.Scene;
let camera: THREE.Camera;
let renderer: THREE.WebGLRenderer;

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


const initRenderer = (_w: number, _h: number): boolean => {
    const parentEl = (document.getElementById("gameScene") as HTMLDivElement);
    const aspect = 0.6325581395348837;
    let h = _h;
    let w = aspect * h;
    parentEl.style.width = w + "px";
    parentEl.style.height = h + "px";
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(w, h);

    if(!renderer.capabilities.isWebGL2) {
        console.log("Seems like your device does not support Webgl2");
        return false;
    }

    renderer.setViewport(0, 0, w, h);

    const d = Math.min(w, h) * 0.9 / 50;    // 40 is a try and error value
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 200);
    camera.position.set(d, d, d);
    camera.rotation.order = "YXZ";
    camera.rotation.y = Math.PI / 4;
    camera.rotation.x = Math.atan(1 / Math.sqrt(2));
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.position.y = 3.6;
    parentEl.appendChild(renderer.domElement);
    return true;
}

const main = async(): Promise<void> => {
    if(!initRenderer(innerWidth, innerHeight)) return;
    await Game.init(innerWidth, innerHeight);

    mainLoop();
}

addEventListener("load", main);

const Level = (() => {

    const level = [`
    ..###....
    ..#*#....
    ..#£####.
    ###@ £*#.
    #* £ ###.
    ####£#...
    ...#*#...
    ...###...
    .........
    `,`
    #####....
    #  @#....
    # ££#.###
    # £ #.#*#
    ### ###*#
    .##    *#
    .#   #  #
    .#   ####
    .#####...
    `,`
    ..####...
    .##  #...
    .# @£##..
    .##£  #..
    .## £ #..
    .#*£  #..
    .#**&*#..
    .######..
    .........
    `,`
    .####....
    .#@ ###..
    .# £  #..
    ### # ##.
    #*# #  #.
    #*£  # #.
    #*   £ #.
    ########.
    .........
    `,`
    .........
    ..######.
    ..#    #.
    ###£££ #.
    #@ £** #.
    # £***##.
    ####  #..
    ...####..
    .........
    `,`
    .........
    ..#####..
    ###  @#..
    #  £* ##.
    #  *£* #.
    ### &£ #.
    ..#   ##.
    ..#####..
    .........
    `,`
    ..####...
    ..#**#...
    .## *##..
    .#  £*#..
    ## £  ##.
    #  #££ #.
    #  @   #.
    ########.
    .........
    `,`
    .........
    ########.
    #  #   #.
    # £**£ #.
    #@£*& ##.
    # £**£ #.
    #  #   #.
    ########.
    .........
    `,`
    .........
    ######...
    #    #...
    # £££##..
    #  #**###
    ##  **£ #
    .#  @   #
    .########
    .........
    `,`
    .#######.
    .#**£**#.
    .#**#**#.
    .# £££ #.
    .#  £  #.
    .# £££ #.
    .#  #@ #.
    .#######.
    .........
    `,`
    .#####...
    .# @ ###.
    ## #£  #.
    # &* * #.
    #  ££ ##.
    ### #*#..
    ..#   #..
    ..#####..
    .........
    `,`
    .######..
    .#    #..
    .# £ @#..
    .##&  #..
    .# & ##..
    .# & #...
    .# & #...
    .# * #...
    .#####...
    `,`
    ...####..
    ...#  #..
    .###£ ##.
    .#  & @#.
    .#  &  #.
    .#  & ##.
    .###& #..
    ...#*##..
    ...###...
    `,`
    #####....
    #   #####
    # # #   #
    # £   £ #
    #**#£#£##
    #*@£   #.
    #**  ###.
    ######...
    .........
    `,`
    .........
    .######..
    .#    ##.
    ##*##£ #.
    # **£  #.
    #  #£  #.
    #  @ ###.
    ######...
    .........
    `];

    enum Character {
        BLOCK = "#",
        GRASS = ".",
        FLOOR = " ",
        DESTINATION = "*",  // crate ending pos
        CRATE = "£",    // crate starting pos
        SOURCE = "@",   // player starting pos
    };

    let boxGeometry: THREE.BoxGeometry;
    let brickMaterial: THREE.MeshPhongMaterial;
    let grassMaterial: THREE.MeshPhongMaterial;
    let destinationMaterial: THREE.MeshPhongMaterial;
    let crateMaterial: THREE.MeshPhongMaterial;
    let dirtMaterial: THREE.MeshPhongMaterial;

    let currentLevel: number = 0;
    let map: string[] = [];
    let crates: THREE.Object3D[] = [];
    let player: any;
    const maxLevel = level.length;
    const MAX_ROW = 9;
    const MAX_COL = MAX_ROW;

    const init = () => {
        setCurrentLevel(0);
        boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        brickMaterial = new THREE.MeshPhongMaterial({ map: AssetManager.texture.brick });
        grassMaterial = new THREE.MeshPhongMaterial({ map: AssetManager.texture.grass });
        crateMaterial = new THREE.MeshPhongMaterial({ map: AssetManager.texture.crate });
        dirtMaterial = new THREE.MeshPhongMaterial({ map: AssetManager.texture.dirt });
        destinationMaterial = new THREE.MeshPhongMaterial({ color: 0x32ff21, map: AssetManager.texture.dot });
    }

    const generateTree = (x: number, z: number) => {
        let l = Math.random() * 2 + 1;
        let bodyGeom = new THREE.BoxGeometry(0.3, l, 0.3);
        let bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x6f2113 });
        const tree = new THREE.Mesh(bodyGeom, bodyMaterial);
        tree.position.set(x, l/2, z);
        l = Math.random() * 2;
        let headGeom = new THREE.BoxGeometry(1, l, 1);
        let mat2 = new THREE.MeshStandardMaterial({ color: 0x23ff00 });
        const head = new THREE.Mesh(headGeom, mat2);
        head.position.y = l;
        tree.add(head);
        scene.add(tree);
    }


    const restart = (levelId: number) => {
       setCurrentLevel(levelId); 
        crates = [];
        map = level[currentLevel].split("\n").map(i => i.trim()).filter(i => i !== '');
    
        scene.children.forEach((child, i) => {
            if(child instanceof THREE.Mesh) 
                scene.children.splice(i, 1);
        });

        const dirtMesh = new THREE.Mesh(boxGeometry, dirtMaterial);
        dirtMesh.position.y = -15;
        dirtMesh.scale.set(9, 20, 9);
        scene.add(dirtMesh);
    
        for(let z=0; z < MAX_ROW; z++) {
            for(let x=0; x < MAX_COL; x++) {
                let material;
                const chr = map[z][x];
                let px = ~~(x);
                let pz = ~~(z);
                let py = 0;
                const plane = new THREE.Mesh(boxGeometry, undefined);
                switch(chr) {
                    case Character.BLOCK:
                        material = brickMaterial;
                        py = 0.5;
                        plane.scale.y = 0.5;
                        break;
                    case Character.DESTINATION:
                        material = destinationMaterial;
                        break;
                    default:
                        material = grassMaterial;
                }
                plane.material = material;
                plane.position.set(px, py, pz);
                scene.add(plane);
                if(chr === Character.CRATE) {
                    const crate = new THREE.Mesh(boxGeometry, crateMaterial);
                    crate.scale.set(1, 0.7, 1);
                    crate.position.set(px, 1, pz);
                    crates.push(crate);
                }
                if(chr === Character.SOURCE) {
                    player = AssetManager.glb.steeve.scene;
                    let s = 0.4;
                    player.scale.set(s, s, s);
                    player.position.set(px, 0, pz);
                    scene.add(player);
                }

                if(x === 0 || z === 0 && Math.random() < 0.5 && chr !== Character.BLOCK) {
                    generateTree(px, pz);
                }
            }
        }

        scene.add(...crates);


        renderer.setClearColor(0x0066ff);
    };

    const getPlayer = () => player;

    const getCrates = () => crates;

    const getMap = () => map;

    const getCurrentLevel = () => currentLevel;

    const setCurrentLevel = (n: number) => {
        currentLevel = Math.max(n, maxLevel - 1);
    };

    return {
        init,
        restart,
        getPlayer,
        getCrates,
        getMap,
        getCurrentLevel,
        Character
    };

})();


/**
 * The principal object to manage game states
 */
const Game = (() => {

    let width: number;
    let height: number;
    

    const init = async(w: number, h: number): Promise<void> => {
        width = w;
        height = h;
        await AssetManager.loadAll("../");
        firstRun();
        Level.restart(0);
        eventHandler();
    }

    const firstRun = async(): Promise<void> => {
        Level.init();
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 100, 0);
        scene.add(ambientLight, directionalLight);
    };

    const collisionCheck = (nextDir: dir_t) => {
        const player = Level.getPlayer();
        const crates = Level.getCrates();
        const map = Level.getMap();
        const oldPlayerPos = {x: player.x, z: player.z};
        const vel = {
            x: nextDir === "right" ? 1 : nextDir === "left" ? -1 : 0,
            z: nextDir === "bottom" ? 1 : nextDir === "top" ? -1 : 0
        };

        const nextPos = { x: player.position.x + vel.x,  z: player.position.z + vel.z};
        const tile = map[nextPos.z][nextPos.x];
        const boxExist = crates.filter(i => i.position.z === nextPos.z && i.position.x === nextPos.x);
        if(boxExist.length) {
            let newPos = {x: nextPos.x + vel.x, z: nextPos.z + vel.z};
            let tile_ = map[newPos.z][newPos.x];
            let boxExist_ = crates.filter(i => i.position.z === newPos.z && i.position.x === newPos.x);
            if(!boxExist_.length && tile_ != Level.Character.BLOCK) {
                player.position.x += vel.x;
                player.position.z += vel.z;
                boxExist[0].position.x += vel.x;
                boxExist[0].position.z += vel.z;
            }
        } else {
            if(tile != Level.Character.BLOCK) {
                player.position.x += vel.x;
                player.position.z += vel.z;
            }
        };
    };

    const eventHandler = () => {
        window.addEventListener("keydown", e => {
            switch(e.key.toLowerCase()) {
                case "arrowright":
                    Level.getPlayer().rotation.y = THREE.MathUtils.degToRad(0);
                    collisionCheck("right");
                    break;
                case "arrowleft":
                    Level.getPlayer().rotation.y = THREE.MathUtils.degToRad(180);
                    collisionCheck("left");
                    break;
                case "arrowup":
                    Level.getPlayer().rotation.y = THREE.MathUtils.degToRad(90);
                    collisionCheck("top");
                    break;
                case "arrowdown":
                    Level.getPlayer().rotation.y = THREE.MathUtils.degToRad(-90);
                    collisionCheck("bottom");
                    break;
            }
        });
    };
    

    return {
        init,
    };

})();



/***
 * Asset manager for the game. All assets glb, textures are loaded once
 * then made static with this object.
 */
const AssetManager = (() => {

    let gltfLoader: GLTFLoader;
    let textureLoader: THREE.TextureLoader;

    const glb: { steeve: any } = {steeve: null};

    const texture: iTexture = {
        grass: null,
        brick: null,
        crate: null,
        dot: null,
        dirt: null 
    };

    const loadAll = async (baseUrl: string) => {
        textureLoader = new THREE.TextureLoader();
        const _loadTexture = (url: string, cb: Function) => {
            return new Promise((resolve, reject) => {
                textureLoader.load(baseUrl + url, e => {
                    cb(e);
                    resolve(true);
                }, undefined, (err: any) => reject(err));
            });
        }
        
        await _loadTexture("/assets/images/brick.png", (e: any) => {texture.brick = e});
        await _loadTexture("/assets/images/grass.png", (e: any) => { texture.grass = e });
        await _loadTexture("/assets/images/pixelWoodenCrate.png", (e: any) => { texture.crate = e });
        await _loadTexture("/assets/images/yellowCircleOutline.jpg", (e: any) => { texture.dot = e });
        await _loadTexture("/assets/images/dirt.png", (e: any) => { texture.dirt = e });

        gltfLoader = new GLTFLoader();
        await new Promise((resolve, reject) => {
            gltfLoader.load(baseUrl + "/assets/models/sokoban/steeve.glb", e => {
                glb.steeve = e;
                resolve(true);
            }, undefined, (err: any) => reject(err));
        })
    };

    return { glb, texture, loadAll };

})();
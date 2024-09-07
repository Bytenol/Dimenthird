/**
 * @next level
 * @todo add localstorage
 * @todo add history
 * @todo add screen
 * @todo onbody resize
 */
import * as THREE from "three"
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader"
import 'bootstrap-icons/font/bootstrap-icons.css';

type nullable<T> = T | null;

type dir_t = "right" | "left" | "top" | "bottom";

type texture_t = nullable<THREE.Texture>;

interface iVec2 {
    x: number,
    z: number
}

interface iTexture { 
    grass: texture_t, 
    brick: texture_t,
    crate: texture_t,
    dot: texture_t,
    dirt: texture_t
}

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

    // setup camera
    const d = Math.min(w, h) * 0.9 / 50;    // 40 is a try and error value
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 200);
    camera.position.set(d, d, d);
    camera.rotation.order = "YXZ";
    camera.rotation.y = Math.PI / 4;
    camera.rotation.x = Math.atan(1 / Math.sqrt(2));
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.position.y = 3.6;

    // add default light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, -20);
    scene.add(ambientLight, directionalLight);
    
    (document.getElementById("gamePlayingScene") as HTMLDivElement).appendChild(renderer.domElement);
    return true;
}

const main = async(): Promise<void> => {
    if(!initRenderer(innerWidth, innerHeight)) return;
    await Game.init(innerWidth, innerHeight);

    mainLoop();
}

addEventListener("load", main);


/**
 * This is where all level related stuffs are being handled
 * This includes Player, Crates and other world setup.
 */
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

    // materials needed for rendering
    let boxGeometry: THREE.BoxGeometry;
    let brickMaterial: THREE.MeshPhongMaterial;
    let grassMaterial: THREE.MeshPhongMaterial;
    let destinationMaterial: THREE.MeshPhongMaterial;

    // default world parameters
    let player: any;    // gltf object
    let _map: string[] = [];
    let _currentLevel: number = 0;
    let _player_dir: dir_t = "bottom";
    let _crates: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>[] = [];
    let _destination: iVec2[] = [];

    const MAX_LEVEL = level.length - 1;
    const MAP_MAX_SIZE = 9;

    const init = () => {
        boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        brickMaterial = new THREE.MeshPhongMaterial({ map: AssetManager.texture.brick });
        grassMaterial = new THREE.MeshPhongMaterial({ map: AssetManager.texture.grass });
        destinationMaterial = new THREE.MeshPhongMaterial({ color: 0xff63ff, map: AssetManager.texture.dot });

        const dirtMaterial = new THREE.MeshPhongMaterial({ map: AssetManager.texture.dirt });
        const dirtMesh = new THREE.Mesh(boxGeometry, dirtMaterial);
        // dirtMesh.name = 
        dirtMesh.position.y = -15;
        dirtMesh.scale.set(9, 20, 9);
        scene.add(dirtMesh);

        // setup player
        player = AssetManager.glb.steeve.scene;
        const s = 0.4;
        player.scale.set(s, s, s);
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
        _crates = [];
        _destination = [];
        _player_dir = "bottom";
        const lastMap = getCurrentLevel() === MAX_LEVEL ? [] : getMap();
        _map = level[getCurrentLevel()].split("\n").map(i => i.trim()).filter(i => i !== '');
        console.assert(JSON.stringify(lastMap) !== JSON.stringify(_map));

        console.log(getCurrentLevel());
        console.log(scene);
        // scene.add(player);
    
        for(let z=0; z < MAP_MAX_SIZE; z++) {
            for(let x=0; x < MAP_MAX_SIZE; x++) {
                let material = brickMaterial;
                const chr = _map[z][x];
                let px = ~~(x);
                let pz = ~~(z);
                let py = 0;
                const plane = new THREE.Mesh(boxGeometry, undefined);
                plane.name = "Removables"+x*z;
                switch(chr) {
                    case Character.BLOCK:
                        material = brickMaterial;
                        // py = 0.7;
                        plane.scale.y = 1;
                        break;
                    case Character.DESTINATION:
                        material = destinationMaterial;
                        plane.scale.y = 0.01;
                        _destination.push({ x: px, z: pz });
                        break;
                    default:
                        material = grassMaterial;
                        plane.scale.y = 0.01;
                }
                plane.material = material;
                plane.position.set(px, py, pz);
                // scene.add(plane);
                if(chr === Character.CRATE) {
                    const crateMaterial = new THREE.MeshPhongMaterial({ map: AssetManager.texture.crate });
                    const crate = new THREE.Mesh(boxGeometry, crateMaterial);
                    crate.scale.set(1, 0.7, 1);
                    crate.position.set(px, 0.5, pz);
                    _crates.push(crate);
                }
                if(chr === Character.SOURCE) {
                    player.position.set(px, 0, pz);
                }

                if(x === 0 || z === 0 && Math.random() < 0.5 && chr !== Character.BLOCK) {
                    // generateTree(px, pz);
                }
            }
        }

        // scene.add(..._crates);
        renderer.setClearColor(0x0066ff);
    };

    const update = () => {
        let isDone = true;
        _crates.forEach((crate) => {
            const isInDest = _destination.some(i => i.x === crate.position.x && i.z === crate.position.z);
            crate.material.color = new THREE.Color( isInDest ? 0xff63ff : 0xffffff);
            if(!isInDest) isDone = false;
        }); 

        if(isDone) {
            Game.setState(Game.State.WAITING_FOR_NEXT_LEVEL);
            const timeOut = setTimeout(() => {
                const nextLevel = getCurrentLevel() + 1;
                console.log("about to start a new Level");
                restart(nextLevel);
                clearTimeout(timeOut);
            }, 3000);
        }
    }

    const getPlayerDir = () => _player_dir;

    const setPlayerDir = (dir: dir_t) => {
        switch(dir) {
            case "right":
                getPlayer().rotation.y = THREE.MathUtils.degToRad(0);
                break;
            case "left":
                getPlayer().rotation.y = THREE.MathUtils.degToRad(180);
                break;
            case "top":
                getPlayer().rotation.y = THREE.MathUtils.degToRad(90);
                break;
            case "bottom":
                getPlayer().rotation.y = THREE.MathUtils.degToRad(-90);
                break;
        }
    
        _player_dir = dir;
    }

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

        setPlayerDir(nextDir);
        update();
    };

    const getPlayer = () => player;

    const getCrates = () => _crates;

    const getMap = () => _map;

    const getCurrentLevel = () => _currentLevel;

    const setCurrentLevel = (n: number) => {
        _currentLevel = Math.min(Math.max(0, n), MAX_LEVEL);
        console.assert(_currentLevel > -1);
        console.assert(_currentLevel < MAX_LEVEL + 1);
    };

    return {
        init,
        update,
        restart,
        getPlayer,
        getCrates,
        getMap,
        getCurrentLevel,
        Character,
        collisionCheck
    };

})();


/**
 * The principal object to manage game states
 */
const Game = (() => {

    let width: number;
    let height: number;

    enum State {
        FRESH,
        IDLE,
        PLAYING,
        PAUSED,
        WAITING_FOR_NEXT_LEVEL,
    }

    let _currentState: State;

    const init = async(w: number, h: number): Promise<void> => {
        width = w;
        height = h;
        await AssetManager.loadAll("../");
        firstRun();
        Level.restart(0);
        EventManager.init();
    }

    const firstRun = async(): Promise<void> => {
        Level.init();

    };

    const getState = () => _currentState;

    const setState = (state: State) => {
        _currentState = state;
    }
    
    return { init, State, getState, setState };

})();


const EventManager = (() => {

    const init = () => {
        KEY_DOWN();
    };


    const KEY_DOWN = () => {
        let l = 0;

        window.addEventListener("keydown", e => {
            switch(e.key.toLowerCase()) {
                case "arrowright":
                    l++;
                    Level.restart(l);
                    // Level.collisionCheck("right");
                    break;
                case "arrowleft":
                    Level.collisionCheck("left");
                    break;
                case "arrowup":
                    Level.collisionCheck("top");
                    break;
                case "arrowdown":
                    Level.collisionCheck("bottom");
                    break;
            }
        });
    }

    return { init };

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

    const _loadTexture = (url: string, cb: Function) => {
        return new Promise((resolve, reject) => {
            textureLoader.load(url, e => {
                cb(e);
                resolve(true);
            }, undefined, (err: any) => reject(err));
        });
    }

    const loadAll = async (baseUrl: string) => {
        textureLoader = new THREE.TextureLoader();
        
        await _loadTexture(baseUrl + "/assets/images/stoneBrick.jpg", (e: any) => {texture.brick = e});
        await _loadTexture(baseUrl + "/assets/images/grass.png", (e: any) => { texture.grass = e });
        await _loadTexture(baseUrl + "/assets/images/pixelWoodenCrate.png", (e: any) => { texture.crate = e });
        await _loadTexture(baseUrl + "/assets/images/yellowCircleOutline.jpg", (e: any) => { texture.dot = e });
        await _loadTexture(baseUrl + "/assets/images/dirt.png", (e: any) => { texture.dirt = e });

        gltfLoader = new GLTFLoader();
        await new Promise((resolve, reject) => {
            gltfLoader.load(baseUrl + "/assets/models/sokoban/steeve.glb", e => {
                glb.steeve = e;
                resolve(true);
            }, undefined, (err: any) => reject(err));
        });

        (document.getElementById("loadingScreen") as HTMLDivElement).style.display = "none";
    };

    return { glb, texture, loadAll };

})();
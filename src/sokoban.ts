/**
 * @file sokoban.ts
 * Sokoban @v2.0.0 [Major update]
 * see: 
 * 
 * The player(steeve) was designed in blender and every other assets randomly
 * sourced for online. I would keep saying a big shout out to Fahad Khan on 
 * sololearn regarding the provision for the level design. otherwise, i would
 * have been forced to do that myself too
 * 
 * incase you want to contribute to the game, feel free to checkout the source
 * code on github ()
 * 
 * It is pertinent to note that for every singleton or any other routine in the code, 
 * The use of _ preceeding a variable or function's name is to be strictly private.
 * 
 * Known Issues
 * --- Score skyrocket even before making any movement attempt [implementation reason]
 * 
 * Features to be added
 * @todo leaderboard
 * @todo save game state
 * @todo restrict maximum history call per level time
 * @todo adapt responsive body resizing
 * @todo lock other levels except if the last as been dutifully unlocked
 */

import * as THREE from "three"
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader"
import 'bootstrap-icons/font/bootstrap-icons.css';


/**
 * types defination, enums and interfaces
 */
type nullable<T> = T | null;
type level_t = string[];
type dir_t = "right" | "left" | "top" | "bottom";
type material_t = nullable<THREE.MeshPhongMaterial>;

interface iMoveHistory {
    playerRot: THREE.Vector3,
    playerPos: THREE.Vector3,
    cratePos: THREE.Vector3[],
    crateColor: THREE.Color[],
};


interface iVec2 { x: number, z: number }


interface iLevelMaterial { 
    grass: material_t, 
    brick: material_t,
    crate: material_t,
    dot: material_t,
    dirt: material_t
}


const enum GameState {
    PLAYING,
    PAUSED
}

const enum Character {
    BLOCK = "#",
    GRASS = ".",
    FLOOR = " ",
    DESTINATION = "*",  // crate ending pos
    CRATE = "£",    // crate starting pos
    SOURCE = "@",   // player starting pos
}


const main = async(): Promise<void> => {
    await Game.init(innerHeight, "../");
}

addEventListener("load", main);


const Game = (() => {

    let player: any;    // gltf object
    let _scene: THREE.Scene;
    let _camera: THREE.Camera;
    let _renderer: THREE.WebGLRenderer;
    let _currentState: GameState;

    const init = async(height: number, assetBaseUrl:string): Promise<void> => {
        _initRenderer(height);
        await AssetManager.loadAll(assetBaseUrl);
        _addDefaultEntity();
        Level.init(_scene);
        Level.restart(0);
        requestAnimationFrame(_loop);
        EventManager.init();
    }

    const getState = () => _currentState;

    const setState = (state: GameState) => {
        _currentState = state;
    }

    const getPlayer = () => player;

    const _rotatePlayer = (dir: dir_t) => {
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
    }

    const collisionCheck = (nextDir: dir_t) => {
        if(!(Game.getState() == GameState.PLAYING))
            return false;

        let hasMoved = false;
        const player = getPlayer();
        const crates = Level.getCrates();
        const map = Level.getMap();
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
            if(!boxExist_.length && tile_ != Character.BLOCK) {
                Level.pushHistory();
                player.position.x += vel.x;
                player.position.z += vel.z;
                boxExist[0].position.x += vel.x;
                boxExist[0].position.z += vel.z;
                _rotatePlayer(nextDir);
                hasMoved = true;
            }
        } else {
            if(tile != Character.BLOCK) {
                Level.pushHistory();
                player.position.x += vel.x;
                player.position.z += vel.z;
                _rotatePlayer(nextDir);
                hasMoved = true;
            }
        };

        return hasMoved;
    };

    const _loop = () => {
        requestAnimationFrame(_loop);
        _renderer.render(_scene, _camera);
    }

    const _initRenderer = (height: number) => {
        const parentEl = (document.getElementById("gameScene") as HTMLDivElement);
        const aspect = 0.6325581395348837;
        let h = height;     // take the full height and maintain aspect ratio
        let w = aspect * h;
        parentEl.style.width = w + "px";
        parentEl.style.height = h + "px";
        _scene = new THREE.Scene();
        _renderer = new THREE.WebGLRenderer();
        _renderer.setSize(w, h);
    
        if(!_renderer.capabilities.isWebGL2)
            throw new Error("Seems like your device does not support Webgl2");
    
        _renderer.setViewport(0, 0, w, h);
        _renderer.setClearColor(0x0066ff);
    
        // rotate camera to give an isometric view
        // code retrieved from chatgpt. I never understand how "d" works tho
        const d = Math.min(w, h) * 0.9 / 50;    // 40 is a try and error value
        _camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 200);
        _camera.position.set(d, d, d);
        _camera.rotation.order = "YXZ";
        _camera.rotation.y = Math.PI / 4;
        _camera.rotation.x = Math.atan(1 / Math.sqrt(2));
        _camera.lookAt(new THREE.Vector3(0, 0, 0));
        _camera.position.y = 3.6;
        
        (document.getElementById("gamePlayingScene") as HTMLDivElement).appendChild(_renderer.domElement);
    }


    const _addDefaultEntity = () => {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 100, -20);
        _scene.add(ambientLight, directionalLight);

        const dirtMaterial = AssetManager.material.dirt as THREE.MeshPhongMaterial;
        const dirtMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), dirtMaterial);
        dirtMesh.name = "dirt";
        dirtMesh.position.y = -15;
        dirtMesh.scale.set(9, 20, 9);
        _scene.add(dirtMesh);

        // setup player
        player = AssetManager.glb.steeve.scene;
        player.name = "player";
        const s = 0.4;
        player.scale.set(s, s, s);
        _scene.add(player);
    }

    
    return { init, getState, setState, getPlayer, collisionCheck };

})();



const Level = (() => {

    const world = [`
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

    let _scene: THREE.Scene;
    let boxGeometry: THREE.BoxGeometry;

    // default world parameters
    let _steps = 0;
    let _score = 0;
    let _map: level_t = [];
    let _currentLevel: number = 0;
    let _destination: iVec2[] = [];
    let _history: iMoveHistory[];
    let _crates: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>[] = [];

    const MAX_LEVEL = world.length - 1;
    const MAP_MAX_SIZE = 9;

    // minimum level step to win. correct untill level 4.
    const MIN_STEP = [11, 100, 39, 55,100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
    console.assert(MIN_STEP.length === world.length);

    const init = (scene: THREE.Scene) => {
        _scene = scene;
        boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const onCollisionCheck = (nextDir: dir_t) => {
        if(Game.collisionCheck(nextDir)) {
            _steps++;
            _score = ~~(MIN_STEP[Level.getCurrentLevel()] / _steps * 100);
            _updatePlayerStep(_steps, _score);
            _checkLevelCompleted();
        }
    }
    

    const _checkLevelCompleted = () => {
        let isCompleted = true;
        _crates.forEach((crate) => {
            const isInDest = _destination.some(i => i.x === crate.position.x && i.z === crate.position.z);
            crate.material.color = new THREE.Color( isInDest ? 0xff63ff : 0xffffff);
            if(!isInDest) isCompleted = false;
        }); 

        if(isCompleted) {
            Game.setState(GameState.PAUSED);
            const levelDoneInfoEl = (<HTMLDivElement>document.getElementById("levelDoneInfo"));
            const levelDoneTextEl = (<HTMLDivElement>document.getElementById("levelDoneText"));
            levelDoneTextEl.innerText = `Level ${getCurrentLevel() + 1} completed`;
            levelDoneInfoEl.style.opacity = "1";
            const timeOut = setTimeout(() => {
                const nextLevel = getCurrentLevel() + 1;
                restart(nextLevel);
                clearTimeout(timeOut);
                levelDoneInfoEl.style.opacity = "0";
            }, 3000);
        }
    }


    const _generateRandomTreeMesh = (x: number, z: number) => {
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
        _scene.add(tree);
    }

    const reset = () => {
        const q = prompt("Do you wish to restart the game? (y/n)");
        if(q?.toLocaleLowerCase() === "y" || q === "")
            restart(getCurrentLevel());
    }


    const restart = (levelId: number) => {
        Game.setState(GameState.PLAYING);
        setCurrentLevel(levelId);
        _crates = [];
        _destination = [];
        _steps = 0;
        _score = 0;
        _history = [];
        Game.getPlayer().rotation.set(0, 0, 0);
        // const lastMap = getCurrentLevel() === MAX_LEVEL ? [] : getMap();
        _map = world[getCurrentLevel()].split("\n").map(i => i.trim()).filter(i => i !== '');

        // this assertion fails when level restarts: so im commenting it out
        // console.assert(JSON.stringify(lastMap) !== JSON.stringify(_map));

        (<HTMLSpanElement>document.getElementById("levelTxt")).innerText = `${getCurrentLevel() + 1}`;
        _updatePlayerStep(_steps, _score);

        const permanentChild = _scene.children.splice(0, 4);
        _scene.children = [];
        _scene.add(...permanentChild);
        // ambientLight, directionalLight, player, dirt
        console.assert(_scene.children.length === 4);
    
        const { brick, grass, dot, crate: assetCrateMaterial } = AssetManager.material;

        for(let z=0; z < MAP_MAX_SIZE; z++) {
            for(let x=0; x < MAP_MAX_SIZE; x++) {
                let material;
                const chr = _map[z][x];
                let px = ~~(x);
                let pz = ~~(z);
                let py = 0;
                const plane = new THREE.Mesh(boxGeometry, undefined);
                plane.name = "Removables"+x*z;
                switch(chr) {
                    case Character.BLOCK:
                        material = brick;
                        py = 0;
                        plane.scale.y = 0.5;
                        break;
                    case Character.DESTINATION:
                        material = dot;
                        py -= 0.5;
                        plane.scale.y = 0.5;
                        _destination.push({ x: px, z: pz });
                        break;
                    default:
                        py = -0.5;
                        material = grass;
                        plane.scale.y = 0.5;
                }
                plane.material = material as THREE.MeshPhongMaterial;
                plane.position.set(px, py, pz);
                _scene.add(plane);
                if(chr === Character.CRATE) {
                    const crateMaterial = (assetCrateMaterial as THREE.MeshPhongMaterial).clone();
                    const crate = new THREE.Mesh(boxGeometry, crateMaterial);
                    crate.scale.set(1, 0.5, 1);
                    crate.position.set(px, 0, pz);
                    _crates.push(crate);
                }
                if(chr === Character.SOURCE) {
                    Game.getPlayer().position.set(px, 0, pz);
                }

                if(x === 0 || z === 0 && Math.random() < 0.5 && chr !== Character.BLOCK) {
                    _generateRandomTreeMesh(px, pz);
                }
            }
        }

        _scene.add(..._crates);
    };

    
    const pushHistory = () => {
        const v: iMoveHistory = {
            playerPos: Game.getPlayer().position.clone(),
            playerRot: Game.getPlayer().rotation.clone(),
            cratePos: [],
            crateColor: [],
        };
        _crates.forEach((crate) => { 
            v.cratePos.push(crate.position.clone()) 
            v.crateColor.push(crate.material.color.clone());
        });
        _history.push(v);
        if(_history.length > 8) _history.splice(0, 1);
        console.assert(_history.length < 9);
    };


    const popHistory = () => {
        if(_history.length <= 0) return;
        const lastState = _history.pop();
        console.assert(lastState?.playerPos !== Game.getPlayer().position);
        Game.getPlayer().position.set(lastState?.playerPos.x, lastState?.playerPos.y, lastState?.playerPos.z);
        Game.getPlayer().rotation.set(lastState?.playerRot.x, lastState?.playerRot.y, lastState?.playerRot.z);

        console.assert(lastState?.cratePos.length === getCrates().length);
        for(let i = 0; i < _crates.length; i++) {
            const cPos = lastState?.cratePos[i] as THREE.Vector3;
            const cCol = lastState?.crateColor[i] as THREE.Color;
            _crates[i].position.set(cPos.x, cPos.y, cPos.z);
            _crates[i].material.color.set(cCol);
        }
    };


    const _updatePlayerStep = (steps: number, score: number) => {
        (<HTMLSpanElement>document.getElementById("stepTxt")).innerText = `${steps}`;
        (<HTMLSpanElement>document.getElementById("scoreTxt")).innerText = `${score}`;
    }


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
        restart,
        getCrates,
        getMap,
        getCurrentLevel,
        pushHistory,
        popHistory,
        reset,
        collisionCheck: onCollisionCheck
    };

})();



const EventManager = (() => {

    const init = () => {
        key_handler();
        domHandler();
    };


    const key_handler = () => {
        window.addEventListener("keydown", e => {
            switch(e.key.toLowerCase()) {
                case "arrowright":
                    Level.collisionCheck("right");
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
                case "z":
                    Level.popHistory();
                    break;
            }
        });
    }

    const domHandler = () => {
        const menuScene = <HTMLDivElement>$("#menuScene");
        const aboutScene = <HTMLDivElement>$("#aboutScene");
        const levelSelectScene = <HTMLDivElement>$("#levelSelectScene");
        const gamePlayingScene = <HTMLDivElement>$("#gamePlayingScene");
        const infoScene = <HTMLDivElement>$("#infoScene");


        ($("#moveBottomBtn") as HTMLButtonElement).addEventListener("click", e => {
            Level.collisionCheck("bottom");
        });

        ($("#moveRightBtn") as HTMLButtonElement).addEventListener("click", e => {
            Level.collisionCheck("right");
        });

        ($("#moveTopBtn") as HTMLButtonElement).addEventListener("click", e => {
            Level.collisionCheck("top");
        });
        
        ($("#moveLeftBtn") as HTMLButtonElement).addEventListener("click", e => {
            Level.collisionCheck("left");
        });

        ($("#historyBtn") as HTMLButtonElement).addEventListener("click", e => {
            Level.popHistory();
        });

        ($("#restartBtn") as HTMLButtonElement).addEventListener("click", e => {
            Level.reset();
        });

        ($("#saveStateBtn") as HTMLButtonElement).addEventListener("click", e => {
            alert("SaveError: This feature is not yet available on every platform");
        });

        ($("#trophyBtn") as HTMLButtonElement).addEventListener("click", e => {
            alert("LeaderBoardError: This feature is not yet available on every platform");
        });

        // navigations
        const lsbtn = document.querySelectorAll(".levelSelectBtn");
        for(let i = 0; i < lsbtn.length; i++) {
            const btn = lsbtn[i] as HTMLButtonElement;
            btn.addEventListener("click", () => {
                gamePlayingScene.style.transform = "translateY(calc(-3 * 100vh))";
                infoScene.style.transform = "translateY(calc(-3 * 100vh))";
                levelSelectScene.style.transform = "translateY(calc(100vh))";
                const level = parseInt(btn.innerText) - 1;
                Level.restart(level);
            });
        }

        ($("#levelBackBtn") as HTMLButtonElement).addEventListener("click", () => {
            Game.setState(GameState.PAUSED);
            menuScene.style.transform = "translateY(calc(0vh))";
            levelSelectScene.style.transform = "translateY(calc(100vh))";
        });

        ($("#levelBtn") as HTMLButtonElement).addEventListener("click", e => {
            menuScene.style.transform = "translateY(calc(100vh))";
            levelSelectScene.style.transform = "translateY(calc(-100vh))";
            Game.setState(GameState.PAUSED);
        });

        ($("#aboutBtn") as HTMLButtonElement).addEventListener("click", e => {
            menuScene.style.transform = "translateY(calc(-100vh))";
            aboutScene.style.transform = "translateY(calc(-2 * 100vh))";
            Game.setState(GameState.PAUSED);
        });

        ($("#aboutBackBtn") as HTMLButtonElement).addEventListener("click", e => {
            menuScene.style.transform = "translateY(calc(0vh))";
            aboutScene.style.transform = "translateY(calc(2 * 100vh))";
            Game.setState(GameState.PAUSED);
        });

        ($("#continueBtn") as HTMLButtonElement).addEventListener("click", e => {
            menuScene.style.transform = "translateY(calc(-100vh))";
            gamePlayingScene.style.transform = "translateY(calc(-3 * 100vh))";
            infoScene.style.transform = "translateY(calc(-3 * 100vh))";
            Game.setState(GameState.PLAYING);
        });

        ($("#gameBackBtn") as HTMLButtonElement).addEventListener("click", e => {
            menuScene.style.transform = "translateY(calc(0vh))";
            gamePlayingScene.style.transform = "translateY(calc(3 * 100vh))";
            infoScene.style.transform = "translateY(calc(3 * 100vh))";
            Game.setState(GameState.PAUSED);
        });
    }

    return { init };

})();


const $ = (selector: string) => document.querySelector(selector);

/***
 * Asset manager for the game. All assets glb, textures are loaded once
 * then made static with this object.
 */
const AssetManager = (() => {

    let gltfLoader: GLTFLoader;
    let textureLoader: THREE.TextureLoader;

    const glb: { steeve: any } = {steeve: null};

    const material: iLevelMaterial = {
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

        await _loadTexture(baseUrl + "/assets/images/stoneBrick.jpg", (e: any) => {
            material.brick = new THREE.MeshPhongMaterial({ map: e });
        });
        await _loadTexture(baseUrl + "/assets/images/grass.png", (e: any) => { 
            material.grass = new THREE.MeshPhongMaterial({ map: e });
        });
        await _loadTexture(baseUrl + "/assets/images/pixelWoodenCrate.png", (e: any) => { 
            material.crate = new THREE.MeshPhongMaterial({ map: e });
        });
        await _loadTexture(baseUrl + "/assets/images/yellowCircleOutline.jpg", (e: any) => { 
            material.dot = new THREE.MeshPhongMaterial({color: 0xff63ff, map: e });
        });
        await _loadTexture(baseUrl + "/assets/images/dirt.png", (e: any) => { 
            material.dirt = new THREE.MeshPhongMaterial({ map: e });
        });

        gltfLoader = new GLTFLoader();
        await new Promise((resolve, reject) => {
            gltfLoader.load(baseUrl + "/assets/models/sokoban/steeve.glb", e => {
                glb.steeve = e;
                resolve(true);
            }, undefined, (err: any) => reject(err));
        });

        (document.getElementById("loadingScreen") as HTMLDivElement).style.display = "none";
    };

    return { glb, material, loadAll };

})();
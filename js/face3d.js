import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
// Mediapipe
import vision from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';
const { FaceLandmarker, FilesetResolver } = vision;
const blendshapesMap = {
    'browInnerUp': 'AU_1',
    'browOuterUpLeft': 'AU_2',
    'browOuterUpRight': 'AU_2',
    'browDownLeft': 'AU_4',
    'browDownRight': 'AU_4',
    'eyeWideLeft': 'AU_5',
    'eyeWideRight': 'AU_5',
    'eyeSquintLeft': 'AU_7',
    'eyeSquintRight': 'AU_7',
    'mouthSmileLeft': 'AU_12',
    'mouthSmileRight': 'AU_12',
    'mouthFrownLeft': 'AU_15',
    'mouthFrownRight': 'AU_15',
    'mouthPucker': 'AU_18',
    'mouthStretchLeft': 'AU_20',
    'mouthStretchRight': 'AU_20',
    'mouthPressLeft': 'AU_23',
    'mouthPressRight': 'AU_23',
    'jawOpen': 'AU_26',
    'noseSneerLeft': 'AU_9',
    'noseSneerRight': 'AU_9',
};
//
const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild( renderer.domElement );
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 100 );
camera.position.z = 5;
const scene = new THREE.Scene();
scene.scale.x = - 1;
const environment = new RoomEnvironment();
const pmremGenerator = new THREE.PMREMGenerator( renderer );
scene.background = new THREE.Color( 0x666666 );
scene.environment = pmremGenerator.fromScene( environment ).texture;
const controls = new OrbitControls( camera, renderer.domElement );
// Face
let face, eyeL, eyeR, teeth;
const eyeRotationLimit = THREE.MathUtils.degToRad( 30 );
const ktx2Loader = new KTX2Loader()
    .setTranscoderPath( 'jsm/libs/basis/' )
    .detectSupport( renderer );
new GLTFLoader()
    .setKTX2Loader( ktx2Loader )
    .setMeshoptDecoder( MeshoptDecoder )
    .load( 'models/head.gltf', ( gltf ) => {
        const mesh = gltf.scene.children[ 0 ];
        scene.add( mesh );
        const head = mesh.getObjectByName( 'mesh_2' );
        // head.material = new THREE.MeshNormalMaterial();
        face = mesh.getObjectByName( 'mesh_2' );
        eyeL = mesh.getObjectByName( 'eyeLeft' );
        eyeR = mesh.getObjectByName( 'eyeRight' );
        teeth = mesh.getObjectByName( 'mesh_3' );
        // GUI
        const gui = new GUI();
        gui.close();
        const influences = head.morphTargetInfluences;
        for ( const [ key, value ] of Object.entries( head.morphTargetDictionary ) ) {
            gui.add( influences, value, 0, 1, 0.01 )
                .name( key.replace( 'blendShape1.', '' ) )
                .listen( influences );
        }
        renderer.setAnimationLoop( animate );
    } );
// Video Texture
const video = document.createElement( 'video' );
const texture = new THREE.VideoTexture( video );
texture.colorSpace = THREE.SRGBColorSpace;
const geometry = new THREE.PlaneGeometry( 1, 1 );
const material = new THREE.MeshBasicMaterial( { map: texture, depthWrite: false } );
const videomesh = new THREE.Mesh( geometry, material );
scene.add( videomesh );
// MediaPipe
const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
);
const faceLandmarker = await FaceLandmarker.createFromOptions( filesetResolver, {
    baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU'
    },
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
    runningMode: 'VIDEO',
    numFaces: 1
} );
if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
    navigator.mediaDevices.getUserMedia( { video: { facingMode: 'user' } } )
        .then( function ( stream ) {
            video.srcObject = stream;
            video.play();
        } )
        .catch( function ( error ) {
            console.error( 'Unable to access the camera/webcam.', error );
        } );
}
const transform = new THREE.Object3D();
function animate() {
    if ( video.readyState >= HTMLMediaElement.HAVE_METADATA ) {
        const results = faceLandmarker.detectForVideo( video, Date.now() );
        if ( results.facialTransformationMatrixes.length > 0 ) {
            const facialTransformationMatrixes = results.facialTransformationMatrixes[ 0 ].data;
            transform.matrix.fromArray( facialTransformationMatrixes );
            transform.matrix.decompose( transform.position, transform.quaternion, transform.scale );
            const object = scene.getObjectByName( 'grp_transform' );
            // object.position.x = transform.position.x;
            // object.position.y = transform.position.z + 40;
            // object.position.z = - transform.position.y;
            object.rotation.x = transform.rotation.x;
            object.rotation.y = transform.rotation.z;
            object.rotation.z = - transform.rotation.y;
        }
        if ( results.faceBlendshapes.length > 0 ) {
            const faceBlendshapes = results.faceBlendshapes[ 0 ].categories;
            // Morph values does not exist on the eye meshes, so we map the eyes blendshape score into rotation values
            const eyeScore = {
                leftHorizontal: 0,
                rightHorizontal: 0,
                leftVertical: 0,
                rightVertical: 0,
                };
            // console.log(faceBlendshapes);
            for ( const blendshape of faceBlendshapes ) {
                const categoryName = blendshape.categoryName;
                const score = blendshape.score;
                console.log(categoryName, score);
                const index = face.morphTargetDictionary[ blendshapesMap[ categoryName ] ];
                if ( index !== undefined ) {
                    face.morphTargetInfluences[ index ] = score;
                    teeth.morphTargetInfluences[index] = score;
                }
                // There are two blendshape for movement on each axis (up/down , in/out)
                // Add one and subtract the other to get the final score in -1 to 1 range
                switch ( categoryName ) {
                    case 'eyeLookInLeft':
                        eyeScore.leftHorizontal += score;
                        break;
                    case 'eyeLookOutLeft':
                        eyeScore.leftHorizontal -= score;
                        break;
                    case 'eyeLookInRight':
                        eyeScore.rightHorizontal -= score;
                        break;
                    case 'eyeLookOutRight':
                        eyeScore.rightHorizontal += score;
                        break;
                    case 'eyeLookUpLeft':
                        eyeScore.leftVertical -= score;
                        break;
                    case 'eyeLookDownLeft':
                        eyeScore.leftVertical += score;
                        break;
                    case 'eyeLookUpRight':
                        eyeScore.rightVertical -= score;
                        break;
                    case 'eyeLookDownRight':
                        eyeScore.rightVertical += score;
                        break;
                }
            }
            eyeL.rotation.z = eyeScore.leftHorizontal * eyeRotationLimit;
            eyeR.rotation.z = eyeScore.rightHorizontal * eyeRotationLimit;
            eyeL.rotation.x = eyeScore.leftVertical * eyeRotationLimit;
            eyeR.rotation.x = eyeScore.rightVertical * eyeRotationLimit;
        }
    }
    videomesh.scale.x = video.videoWidth / 100;
    videomesh.scale.y = video.videoHeight / 100;
    renderer.render( scene, camera );
    controls.update();
}
window.addEventListener( 'resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
} );
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Loader } from '@googlemaps/js-api-loader';



/// MAP DATA
var data = getData()
var selected = 0;

const apiOptions = {
    "apiKey": "AIzaSyBHiUAtpqxTupKHUJTal9qfG_Z8DKvLPOQ",
    "version": "beta"
};

const mapOptions = {
    "tilt": 20,
    "heading": 0,
    "zoom": 17,
    "center": { lat: 33.8004048, lng: -118.3890381 },
    "mapId": "b498aa93b3c701a9"
}

var historySlider;

async function initMap() {
    const mapDiv = document.getElementById("map");
    const apiLoader = new Loader(apiOptions);
    await apiLoader.load();

    const map = new google.maps.Map(mapDiv, mapOptions)
    const sliderDiv = document.createElement("slider")
    historySlider = createHistoryControl(map)
    historySlider.min = 0;
    historySlider.max = data.length - 1;


    sliderDiv.appendChild(historySlider)
    map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(sliderDiv)
    return map
}

var selected = 0;
let points = []
let current = 0;
async function initWebGLOverlayView(map) {

    let scene, renderer, camera, loader;
    const webGLOverlayView = new google.maps.WebGLOverlayView();

    webGLOverlayView.onAdd = () => {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera();
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.75); // soft white light
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
        directionalLight.position.set(0.5, -1, 0.5);
        scene.add(directionalLight);

        loader = new GLTFLoader();

    }


    let elements = []

    webGLOverlayView.onDraw = ({ gl, transformer }) => {
        historySlider.addEventListener("input", (e) => {
            selected = e.target.value;
            renderer.resetState();
        })

        for (let i = 0; i < elements.length; i++) {
            scene.remove(elements[i])

        }
        webGLOverlayView.requestRedraw();
        renderer.render(scene, camera);
        renderer.resetState();

        for (let i = 0; i < points.length; i++) {
            drawSphereDot(transformer, points[i])
        }
        if (points.length > selected) {
            drawUncertainty(transformer, points[selected]);
        }
    }


    webGLOverlayView.onContextRestored = ({ gl }) => {
        renderer = new THREE.WebGLRenderer({
            canvas: gl.canvas,
            context: gl,
            ...gl.getContextAttributes(),
        });


        renderer.autoClear = false;
        scene.autoClear = false

        loader.manager.onLoad = () => {

        }
    }
    webGLOverlayView.setMap(map);


    function drawSphereDot(transformer, i) {
        let material, geometry;
        geometry = new THREE.SphereGeometry(2, 32, 32);
        material = new THREE.MeshBasicMaterial({ color: 'red', opacity: 0.7, transparent: true });
        const matrix = transformer.fromLatLngAltitude(i);
        camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);

        const sphere = new THREE.Mesh(geometry, material);
        elements.push(sphere)
        scene.add(sphere);
        webGLOverlayView.requestRedraw();
        renderer.render(scene, camera);
        renderer.resetState();
    }


    function drawUncertainty(transformer, point) {
        if (point === null) {
            return
        }
        const matrix = transformer.fromLatLngAltitude(point);
        camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);


        var geometry = new THREE.SphereGeometry(10, 16, 12);
        geometry.applyMatrix(new THREE.Matrix4().makeScale(1.5, 1.2, 1));
        const material = new THREE.LineBasicMaterial({ color: 'lightblue', opacity: 0.7, transparent: true });
        const ellipse = new THREE.Mesh(geometry, material);

        elements.push(ellipse)
        scene.add(ellipse);
        webGLOverlayView.requestRedraw();
        renderer.render(scene, camera);
        renderer.resetState();
    }
    let intf = setInterval(addCords, 1000)

    function addCords() {
        if (data.length > current) {
            points.push(data[current]);
            selected = current;
            current++;
            renderer.resetState();
        } else {
            clearInterval(intf)
        }
    }
}


(async() => {
    const map = await initMap();
    initWebGLOverlayView(map);
})();




///
/// API
///
function getData() {
    return [{
            lat: 33.8002048,
            lng: -118.389481,
            altitude: 72.79997,
        },
        {
            lat: 33.8004048,
            lng: -118.3890381,
            altitude: 72.7999878
        },
        {
            lat: 33.8005925,
            lng: -118.3887513,
            altitude: 72.5999756
        },
        {
            lat: 33.800705,
            lng: -118.3885462,
            altitude: 72.2000122
        },
        {
            lat: 33.8008574,
            lng: -118.3881463,
            altitude: 72.7999878
        },
    ];
}


// const exampleSocket = new WebSocket("wss://www.example.com/socketserver", "protocolOne");



///
/// SLIDER
///
const createHistoryControl = (map) => {
    const controlSlider = document.createElement("input");

    controlSlider.setAttribute("type", "range")
    controlSlider.setAttribute("class", "w-full h-2 bg-gray-200 mb-20 rounded-lg appearance-none cursor-pointer dark:bg-gray-700")
    controlSlider.setAttribute("min", 0)
    controlSlider.setAttribute("max", 100)
    controlSlider.setAttribute("value", 0)

    // controlSlider.style.width = "300px"
    // controlSlider.style.height = "200px"
    // controlSlider.style.border = "1px solid #000000"

    console.log(controlSlider)

    controlSlider.addEventListener("change", (e) => {
        console.log(e.target.value)
    })

    return controlSlider
}
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Loader } from '@googlemaps/js-api-loader';



/// MAP DATA
const users = {
    1: {
        color: "red",
        uncertaintyColor: "lightblue",
        data: [],
    },
};
let selectedUser;
var current = 0;

var selectedDot = 0;
var historySlider;

const apiOptions = {
    "apiKey": "AIzaSyBHiUAtpqxTupKHUJTal9qfG_Z8DKvLPOQ",
    "version": "beta"
};

const mapOptions = {
    "tilt": 20,
    "heading": 0,
    "zoom": 17,
    "center": { lat: 51.0905, lng: 71.3982 },
    "mapId": "b498aa93b3c701a9"
}



async function initMap() {

    const mapDiv = document.getElementById("map");
    const apiLoader = new Loader(apiOptions);
    await apiLoader.load();

    const map = new google.maps.Map(mapDiv, mapOptions)
    const sliderDiv = document.createElement("slider")
    historySlider = createHistoryControl(map)
    historySlider.min = 0;
    historySlider.max = 0;

    sliderDiv.appendChild(historySlider)
    map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(sliderDiv)
    return map
}

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
            selectedDot = e.target.value;
            renderer.resetState();
        })

        for (let i = 0; i < elements.length; i++) {
            scene.remove(elements[i])
        }
        webGLOverlayView.requestRedraw();
        renderer.render(scene, camera);
        renderer.resetState();

        if (!selectedUser) {
            return
        }

        for (let i = 0; i < users[selectedUser].data.length; i++) {
            drawSphereDot(transformer, users[selectedUser].data[i], users[selectedUser].color)
        }
        if (users[selectedUser].data.length > selectedDot) {
            drawUncertainty(transformer, users[selectedUser].data[selectedDot], users[selectedUser].uncertaintyColor);
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
        connectToSocket(renderer);
        loader.manager.onLoad = () => {

        }
    }
    webGLOverlayView.setMap(map);


    function drawSphereDot(transformer, point, color) {
        let material, geometry;

        geometry = new THREE.SphereGeometry(1, 32, 32);
        material = new THREE.MeshBasicMaterial({ color: color, opacity: 0.7, transparent: true });
        const matrix = transformer.fromLatLngAltitude(point);
        camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);

        const sphere = new THREE.Mesh(geometry, material);
        elements.push(sphere)
        scene.add(sphere);
        webGLOverlayView.requestRedraw();
        renderer.render(scene, camera);
        renderer.resetState();
    }


    function drawUncertainty(transformer, point, color) {
        if (point === null) {
            return
        }
        const matrix = transformer.fromLatLngAltitude(point);
        camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);


        var geometry = new THREE.SphereGeometry(10, 16, 16);

        let zScale = point.verticalAccuracy / point.horizontalAccuracy;
        geometry.applyMatrix(new THREE.Matrix4().makeScale(1, 1, zScale));
        const material = new THREE.LineBasicMaterial({ color: color, opacity: 0.7, transparent: true });
        const ellipse = new THREE.Mesh(geometry, material);

        elements.push(ellipse)
        scene.add(ellipse);
        webGLOverlayView.requestRedraw();
        renderer.render(scene, camera);
        renderer.resetState();
    }
    // let intf = setInterval(addCords, 1000)


}


(async() => {
    const map = await initMap();
    initWebGLOverlayView(map);
})();




///
/// API
///

// const exampleSocket = new WebSocket("wss://www.example.com/socketserver", "protocolOne");




///
/// WEBSOCKET
///

const connectToSocket = (renderer, map) => {
    console.log("CONNECCT!!!")
    var webSocket = new WebSocket("ws://3.70.126.190:4000/dispatcher", []);
    

  
    console.log("READ MESSAGES")
    webSocket.onmessage = (event) => {
        let incoming = JSON.parse(event.data);
        let userID = incoming.userID
        console.log(incoming)

        if (!users[userID]) {
            users[userID] = {
                color: 'red',
                uncertaintyColor: "lightblue",
                data: [],
            };
        } else {
            users[userID].data.push(incoming);
        }
        selectedDot = users[userID].data.length-1;
        if (!selectedUser) {
            selectedUser = userID;
        }
        console.log(users)
        current++;
        historySlider.value = selectedDot;
        historySlider.max = users[userID].data.length-1;
        renderer.resetState();
    }

    // webSocket.send(JSON.stringify(obj));
}

connectToSocket();


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
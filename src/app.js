import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Loader } from '@googlemaps/js-api-loader';

/// MAP DATA
const users = {};

let selectedUser;
let current = 0;

let selectedDot = 0;

let map

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

    slider.min = 0;
    slider.max = 0;
    const map = new google.maps.Map(mapDiv, mapOptions)
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


        let geometry = new THREE.SphereGeometry(10, 16, 16);

        let zScale = point.verticalAccuracy / point.horizontalAccuracy;
        geometry.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, zScale));
        const material = new THREE.LineBasicMaterial({ color: color, opacity: 0.7, transparent: true });
        const ellipse = new THREE.Mesh(geometry, material);

        elements.push(ellipse)
        scene.add(ellipse);
        webGLOverlayView.requestRedraw();
        renderer.render(scene, camera);
        renderer.resetState();
    }
}


(async() => {
    map = await initMap();
    initWebGLOverlayView(map);
})();



///
/// WEBSOCKET
///
const colors = ["#4285F4", 	"#34A853", "#FBBC05", "#EA4335"]
const cardsContainer = document.getElementById("cards_container")

const createCard = (id, data, color) => {
    const card = document.createElement("button")
    card.className = "card"
    card.id = "card_" + id
    card.innerHTML = `
        <div class="card_header" id="card_identifier_${id}" style="background-color: ${color}">${data.identifier}</div>
        <div class="card_body">
          <div class="card_time">Date: <span id="card_time_${id}" style="font-weight: normal;">${new Date(data.timestamp).toISOString().slice(0, 10)}</span></div>
          <div class="card_floor">Floor: <span id="card_floor_${id}" style="font-weight: normal;">${data.floor}</span></div>
          <div class="card_activity">Activity: <span id="card_activity_${id}" style="font-weight: normal;">${data.activity}</span></div>
        </div>
    `

    card.addEventListener("click", () => {
        selectedUser = id
        map.setCenter({
            lat: data.lat,
            lng: data.lng,
        })
        map.setZoom(20)
    })

    return card
}

const editCard = (id, data) => {
    const card = document.getElementById("card_" + id)
    const cardTime = document.getElementById("card_time_" + id)
    const cardFloor = document.getElementById("card_floor_" + id)
    const cardActivity = document.getElementById("card_activity_" + id)

    if (!card || !cardTime || !cardFloor || !cardActivity) return;

    card.addEventListener("click", () => {
        selectedUser = id
        map.setCenter({
            lat: data.lat,
            lng: data.lng,
        })
        map.setZoom(20)
    })

    cardTime.innerText = new Date(data.timestamp).toISOString().slice(0, 10)
    cardFloor.innerText = data.floor
    cardActivity.innerText = data.activity
}

const connectToSocket = (renderer, map) => {
    console.log("CONNECCT!!!")
    let webSocket = new WebSocket("ws://3.70.126.190:4000/dispatcher", []);

    console.log("READ MESSAGES")
    webSocket.onmessage = (event) => {
        let incoming = JSON.parse(event.data);
        let userID = incoming.userID
        const color = colors[Math.floor(Math.random()*colors.length)]
        console.log(incoming)

        if (!users[userID]) {
            users[userID] = {
                color,
                uncertaintyColor: "lightblue",
                data: [incoming],
            };
            cardsContainer.appendChild(createCard(userID, incoming, color))
        } else {
            users[userID].data.push(incoming);
            editCard(userID, incoming)
        }
        selectedDot = users[userID].data.length-1;
        if (!selectedUser) {
            selectedUser = userID;
        }
        slider.max = users[userID].data.length-1;
        console.log(users)
        current++;
        
        renderer.resetState();
    }
}

connectToSocket();


///
/// SLIDER
///
const slider = document.getElementById("slider")
const central_btn = document.getElementById("central_btn")
const slider_back_btn = document.getElementById("back_btn")
const slider_forward_btn = document.getElementById("forward_btn")

let isPlaying = false;
slider.addEventListener("input", (e) => {
    selectedDot = e.target.value
})
slider.addEventListener("change", (e) => {
    selectedDot = e.target.value
})
let timer;
central_btn.addEventListener("click", () => {
    if (isPlaying) {
        clearInterval(timer)
        central_btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24" height="24">' +
            '              <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />' +
            '            </svg>'
        isPlaying = false
        return;
    }
    isPlaying = true
    central_btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24" height="24">' +
        '  <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />' +
        '</svg>'
    const val = parseInt(slider.value)
    if (val === users[selectedUser].data.length - 1) {
        slider.value = 0
        selectedDot = 0
    }
    timer = setInterval(() => {
        slider.value = parseInt(slider.value) + 1;
        selectedDot = parseInt(slider.value)
        if (parseInt(slider.value) === users[selectedUser].data.length - 1) {
            clearInterval(timer)
            central_btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24" height="24">' +
                '              <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />' +
                '            </svg>'
            isPlaying = false
        }
    }, 1000)
})



slider_back_btn.addEventListener("click", () => {
    if (isPlaying) return;
    const val = parseInt(slider.value)
    if (val === 0) return;
    slider.value = val - 1;
    selectedDot = val - 1;
})

slider_forward_btn.addEventListener("click", () => {
    if (isPlaying) return;
    const val = parseInt(slider.value)
    if (val === users[selectedUser].data.length - 1) return;
    slider.value = val + 1;
    selectedDot = val + 1;
})
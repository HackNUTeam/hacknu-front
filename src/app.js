import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Loader } from '@googlemaps/js-api-loader';

const slider = document.getElementById("slider")
const central_btn = document.getElementById("central_btn")
const slider_back_btn = document.getElementById("back_btn")
const slider_forward_btn = document.getElementById("forward_btn")

/// MAP DATA
let data = getData()
let selected = 0;
let isPlaying = false;

slider.addEventListener("input", (e) => {
    selected = e.target.value
})
slider.addEventListener("change", (e) => {
    selected = e.target.value
})

let timer

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
    if (val === data.length - 1) {
        slider.value = 0
        selected = 0
    }
    timer = setInterval(() => {
        slider.value = parseInt(slider.value) + 1;
        selected = parseInt(slider.value)
        if (parseInt(slider.value) === data.length - 1) {
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
    selected = val - 1;
})

slider_forward_btn.addEventListener("click", () => {
    if (isPlaying) return;
    const val = parseInt(slider.value)
    if (val === data.length - 1) return;
    slider.value = val + 1;
    selected = val + 1;
})

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

async function initMap() {
    const mapDiv = document.getElementById("map");
    const apiLoader = new Loader(apiOptions);
    await apiLoader.load();

    return new google.maps.Map(mapDiv, mapOptions)
}

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


        var geometry = new THREE.SphereGeometry(10, 16, 16);

        let zScale = 1.2;
        geometry.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, zScale));
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
            slider.value = selected;
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
  return [
      {
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
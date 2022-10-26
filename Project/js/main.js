import '../style.css';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js'

import { Deck } from './Deck';
import { StandardDeck } from './StandardDeck';
import { Card } from './Card';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


//Graphics World
let scene, camera, renderer;
let gameCanvas = document.getElementById('gameOfWar');
let cardGeometry, cardMaterial;
let orbitControls;

//Logic Stuff
let startDeck;
let playerDecks = []; //players hands
let tableDecks = []; //players cards on table
let numPlayers = 3;
let gameStart = false;
let inTurn = false;


const CARD_THICKNESS = 0.00024;

/**
 * Startup Function
 */
function main() {

  loadAssets();
  initGraphics();
  initController();

  loop();

} //end of main

/**
 * Preloads all assets (textures and models)
 */
function loadAssets() {

} //end of loadAssets

/**
 * builds the view the user will see
 */
function initGraphics() {

  //Scene

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  //Camera

  camera = new THREE.PerspectiveCamera(90, gameCanvas.clientWidth / gameCanvas.clientHeight, 0.1, 1000);
  camera.name = 'camera';
  camera.position.z = 0.5;
  camera.position.y = 0.5;
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  scene.add(camera);

  //Lighting

  let ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.1);
  scene.add(ambientLight);

  let pointLight = new THREE.PointLight(0xFFFFFF);
  pointLight.position.y = 5.0;

  scene.add(pointLight);

  // Game models

  //Table

  //Decks

  startDeck = new StandardDeck();
  scene.add(startDeck.model);

  let spacing = (Math.PI * 2) / numPlayers;
  let outerRadius = 0.5;
  let innerRadius = 0.25;

  for (let i = 0; i < numPlayers; i++) {
    let hand = new Deck();
    playerDecks.push(hand);

    let value = spacing * i;
    hand.model.position.set(Math.cos(value) * outerRadius, 0, Math.sin(value) * outerRadius);

    let tabled = new Deck(); //cards that are on table
    tableDecks.push(tabled);

    tabled.model.position.set(Math.cos(value) * innerRadius, 0, Math.sin(value) * innerRadius);

    scene.add(hand.model);
    scene.add(tabled.model);

  }//end of for

  // Orbit controls

  orbitControls = new OrbitControls(camera, document.body);

  //Renderer

  renderer = new THREE.WebGLRenderer({
    canvas: gameCanvas,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(gameCanvas.clientWidth, gameCanvas.clientHeight);

  console.log(scene);
} //end of initGraphics

//Here We make our game :) 

/**
 * reset the game
 */
function reset() {
  scene.remove(startDeck.model);
  startDeck = new StandardDeck();
  scene.add(startDeck.model);

  for (let i = 0; i < numPlayers; i++) {
    playerDecks[i].clear();
    tableDecks[i].clear();
  }

  gameStart = false;

} //end of reset

/**
 * Starts the game if it hasnt been started already
 * @return {boolean} true if game starts, false otherwise
 */
async function startGame() {
  if (gameStart)
    return false;

  gameStart = true;

  startDeck.shuffle();

  let i = 0;
  while (!startDeck.isEmpty()) {
    let card = startDeck.takeTop();

    card.model.rotation.set(Math.PI / 2, 0, 0)
    scene.add(card.model);

    let beginX = startDeck.model.position.x;
    let beginY = startDeck.model.position.y;
    let beginZ = startDeck.model.position.z;
    let endX = playerDecks[i].model.position.x;
    let endY = playerDecks[i].model.position.y;
    let endZ = playerDecks[i].model.position.z;

    const tw = new TWEEN.Tween({ x: beginX, y: beginY, z: beginZ, i: i, card: card })
      .to({ x: endX, y: endY, z: endZ }, 1000)
      .easing(TWEEN.Easing.Exponential.Out)
      .onUpdate((tween) => {
        tween.card.model.position.x = tween.x;
        tween.card.model.position.y = tween.y;
        tween.card.model.position.z = tween.z;
      })
      .onComplete((tween) => {
        tween.card.model.rotation.set(0, 0, 0);
        tween.card.model.position.set(0, 0, card.DIMENSIONS.z * playerDecks[tween.i].getSize());
        playerDecks[tween.i].addTop(tween.card);
      });
    tw.start();

    i = (i + 1) % numPlayers;
    await delay(100);
  }
  await delay(1100);

  startTurn();


} //end of startGame

/**
 * starts the next turn sequence
 */
async function startTurn() {

  // Does only one deck have cards?
  var playerDict = {};
  for (let i = 0; i < playerDecks.length; i++) {
    if (!playerDecks[i].isEmpty()) {
      playerDict[i] = playerDecks[i].getSize();
    }
  }

  // Check if there is only one deck with cards remaining.
  if (Object.keys(playerDict).length == 1) {
    // If there is only one deck with cards, declare a winner.
    endGame(Number(Object.keys(playerDict)[0]) + 1);
  }

  // If there is more than one deck with cards remaining then 
  // play out a turn with those decks
  for (let i = 0; i < playerDecks.length; i++) {
    // Place top card on table
    if (!playerDecks[i].isEmpty()) {
      let card = playerDecks[i].takeTop();

      card.model.rotation.set(Math.PI / 2, 0, 0)
      scene.add(card.model);

      let beginX = playerDecks[i].model.position.x;
      let beginY = playerDecks[i].model.position.y;
      let beginZ = playerDecks[i].model.position.z;
      let endX = tableDecks[i].model.position.x;
      let endY = tableDecks[i].model.position.y;
      let endZ = tableDecks[i].model.position.z;


      const tw = new TWEEN.Tween({ x: beginX, y: beginY, z: beginZ, i: i, card: card })
        .to({ x: endX, y: endY, z: endZ }, 1000)
        .easing(TWEEN.Easing.Exponential.Out)
        .onUpdate((tween) => {
          tween.card.model.position.x = tween.x;
          tween.card.model.position.y = tween.y;
          tween.card.model.position.z = tween.z;
        })
        .onComplete((tween) => {
          tween.card.model.rotation.set(0, 0, 0);
          tween.card.model.position.set(0, 0, card.DIMENSIONS.z * tableDecks[tween.i].getSize());
          tableDecks[tween.i].addTop(tween.card);
        });
      tw.start();

      await delay(100);
    }
  }

  await delay(1000);

  // Flip each card face up
  for (let i = 0; i < tableDecks.length; i++) {
    if (!tableDecks[i].isEmpty()) {
      tableDecks[i].flipTopUp();
    }
  }

  // Is one greater than the others?
  for (let i = 0; i < tableDecks.length; i++) {
    if (!tableDecks[i].isEmpty()) {
      // continue working from here
    }
  }

} //end of startTurn


/**
 * Ends the game, typically when a player wins
 */
function endGame(winner) {
  console.log('I am player', winner, 'and I am better than everyone else');
} //end of endGame

/**
 * Creates the contoller for the user to interact
 * with the view.
 */
function initController() {
  document.onkeydown = function (e) {
    switch (e.key) {
      case 'n':
      case 'N':
        startGame();
        break;
      case 'r':
      case 'R':
        reset();
        break;
    }
  }
} //end of initController

/**
 * This is where the game and its events occur
 */
function loop(t) {

  TWEEN.update(t);
  render();

  orbitControls.update();

  window.requestAnimationFrame(loop);

} //end of loop

/**
 * A basic render method, in case special steps
 * must be taken during a single render.
 */
function render() {
  renderer.render(scene, camera);
} //end of render

main();

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}
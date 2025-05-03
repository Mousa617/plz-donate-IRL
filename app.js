import * as THREE from "three";
import { PlayerControls } from "./controls.js";
import { createPlayerModel } from "./player.js";
import { createBarriers, createTrees, createClouds, createDonationBooths } from "./worldGeneration.js";

// Simple seeded random number generator
class MathRandom {
  constructor(seed) {
    this.seed = seed;
  }

  random() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}

// Add raycaster for interaction with elements
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Store scene globally or pass it around. Passing it is safer.
// Let's refactor claimBooth and updateBoothText to accept scene.

async function main() {
  // Initialize WebsimSocket for multiplayer functionality
  const room = new WebsimSocket();
  await room.initialize();

  // Show main menu first, then start game
  const { playerName, paypalDonationLink } = await showMainMenu(); 

  // Generate a random player name if not available
  const playerInfo = room.peers[room.clientId] || {};
  const finalPlayerName = playerName || playerInfo.username || `Player${Math.floor(Math.random() * 1000)}`;

  // Safe initial position values
  const playerX = (Math.random() * 10) - 5;
  const playerZ = (Math.random() * 10) - 5;

  // Setup Three.js scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); 

  // Create booths in a circle and trees for minimal decoration
  createDonationBooths(scene);
  createTrees(scene);
  createClouds(scene);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);

  // Object to store other players
  const otherPlayers = {};
  const playerLabels = {};
  const chatMessages = {};
  const playerBooths = {}; 

  // Create player model
  const playerModel = createPlayerModel(THREE, finalPlayerName);
  scene.add(playerModel);

  // Create player label for local player
  playerLabels[room.clientId] = createPlayerLabel(room.clientId, finalPlayerName);

  // Initialize player controls
  const playerControls = new PlayerControls(scene, room, {
    renderer: renderer,
    initialPosition: {
      x: playerX,
      y: 0.5,
      z: playerZ
    },
    playerModel: playerModel
  });
  const camera = playerControls.getCamera();

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Directional light (sun)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -25;
  dirLight.shadow.camera.right = 25;
  dirLight.shadow.camera.top = 25;
  dirLight.shadow.camera.bottom = -25;
  scene.add(dirLight);

  // Ground
  const groundGeometry = new THREE.PlaneGeometry(150, 150);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x55aa55,
    roughness: 0.8,
    metalness: 0.2
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; 
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid helper for better spatial awareness
  const gridHelper = new THREE.GridHelper(150, 150);
  scene.add(gridHelper);

  // Create DOM element for player name label
  function createPlayerLabel(playerId, username) {
    const label = document.createElement('div');
    label.className = 'player-name';
    label.textContent = username;
    document.getElementById('game-container').appendChild(label);
    return label;
  }

  // Create DOM element for chat message
  function createChatMessage(playerId) {
    const message = document.createElement('div');
    message.className = 'chat-message';
    message.style.display = 'none';
    document.getElementById('game-container').appendChild(message);
    return message;
  }

  // Create chat input container
  const chatInputContainer = document.createElement('div');
  chatInputContainer.id = 'chat-input-container';
  const chatInput = document.createElement('input');
  chatInput.id = 'chat-input';
  chatInput.type = 'text';
  chatInput.maxLength = 100;
  chatInput.placeholder = 'Type a message...';
  chatInputContainer.appendChild(chatInput);

  // Add close button for chat input
  const closeChat = document.createElement('div');
  closeChat.id = 'close-chat';
  closeChat.innerHTML = '';
  chatInputContainer.appendChild(closeChat);

  document.getElementById('game-container').appendChild(chatInputContainer);

  // Create chat button for all devices
  const chatButton = document.createElement('div');
  chatButton.id = 'chat-button';
  chatButton.innerText = 'CHAT';
  document.getElementById('game-container').appendChild(chatButton);

  // Chat event listeners
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && chatInputContainer.style.display !== 'block') {
      e.preventDefault();
      openChatInput();
    } else if (e.key === 'Escape' && chatInputContainer.style.display === 'block') {
      closeChatInput();
    } else if (e.key === 'Enter' && chatInputContainer.style.display === 'block') {
      sendChatMessage();
    }
  });

  closeChat.addEventListener('click', () => {
    closeChatInput();
  });

  chatButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (chatInputContainer.style.display === 'block') {
      closeChatInput();
    } else {
      openChatInput();
    }
  });

  function openChatInput() {
    chatInputContainer.style.display = 'block';
    chatInput.focus();

    // Disable player controls while chatting
    if (playerControls) {
      playerControls.enabled = false;
    }
  }

  function closeChatInput() {
    chatInputContainer.style.display = 'none';
    chatInput.value = '';

    // Re-enable player controls
    if (playerControls) {
      playerControls.enabled = true;
    }
  }

  function sendChatMessage() {
    const message = chatInput.value.trim();
    if (message) {
      room.updatePresence({
        chat: {
          message: message,
          timestamp: Date.now()
        }
      });

      chatMessages[room.clientId].textContent = message;
      chatMessages[room.clientId].style.display = 'block';

      if (chatMessages[room.clientId].hideTimeout) {
          clearTimeout(chatMessages[room.clientId].hideTimeout);
      }

      chatMessages[room.clientId].hideTimeout = setTimeout(() => {
        if (chatMessages[room.clientId]) {
          chatMessages[room.clientId].style.display = 'none';
          delete chatMessages[room.clientId].hideTimeout; 
        }
      }, 5000);

      chatInput.value = '';
      closeChatInput();
    }
  }

  chatInput.addEventListener('keydown', (e) => {
    e.stopPropagation(); 
    if (e.key === 'Enter') {
      sendChatMessage();
    } else if (e.key === 'Escape') {
      closeChatInput();
    }
  });

  const boothButton = document.createElement('div');
  boothButton.id = 'booth-button';
  boothButton.innerText = 'BOOTH TEXT';
  boothButton.style.display = 'none'; 
  document.getElementById('game-container').appendChild(boothButton);

  const unclaimButton = document.createElement('div');
  unclaimButton.id = 'unclaim-button';
  unclaimButton.innerText = 'UNCLAIM';
  unclaimButton.style.display = 'none';
  unclaimButton.style.position = 'fixed';
  unclaimButton.style.bottom = '120px';
  unclaimButton.style.right = '120px';
  unclaimButton.style.width = '80px';
  unclaimButton.style.height = '80px';
  unclaimButton.style.backgroundColor = 'rgba(244, 67, 54, 0.7)';
  unclaimButton.style.borderRadius = '50%';
  unclaimButton.style.justifyContent = 'center';
  unclaimButton.style.alignItems = 'center';
  unclaimButton.style.zIndex = '1000';
  unclaimButton.style.touchAction = 'none';
  unclaimButton.style.textAlign = 'center';
  unclaimButton.style.fontWeight = 'bold';
  unclaimButton.style.color = '#FFF';
  unclaimButton.style.userSelect = 'none';
  unclaimButton.style.cursor = 'pointer';
  document.getElementById('game-container').appendChild(unclaimButton);

  let hasClaimedBooth = false;
  let claimedBoothId = null;
  let currentBoothText = "Please Donate!"; 

  unclaimButton.addEventListener('click', (e) => {
    e.preventDefault();
    
    if (hasClaimedBooth && claimedBoothId) {
      unclaimBooth(scene, claimedBoothId);
      hasClaimedBooth = false;
      claimedBoothId = null;
      boothButton.style.display = 'none';
      unclaimButton.style.display = 'none';
      
      room.updatePresence({
        claimedBooth: null,
        boothText: null,
        paypalDonationLink: null
      });
    }
  });

  boothButton.addEventListener('click', (e) => {
    e.preventDefault();

    if (hasClaimedBooth) {
      showBoothTextModal(currentBoothText, (newText) => {
        currentBoothText = newText; 
        updateBoothDisplay(scene, claimedBoothId, newText, finalPlayerName, room.clientId);

        room.updatePresence({
          claimedBooth: claimedBoothId,
          boothText: newText,
          paypalDonationLink: paypalDonationLink
        });
      });
    }
  });

  document.addEventListener('click', (event) => {
    if (chatInputContainer.style.display === 'block') return;

    const clickedPosition = new THREE.Vector2();
    clickedPosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    clickedPosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(clickedPosition, camera);

    const boothInteractableObjects = [];
     scene.traverse((object) => {
        if (object.userData.isClaimButton || object.userData.isDonateButton || (object.parent && object.parent.userData && object.parent.userData.isBooth && !object.userData.isDonateButton)) {
            boothInteractableObjects.push(object);
        }
     });

    const intersects = raycaster.intersectObjects(boothInteractableObjects, true);

    for (let i = 0; i < intersects.length; i++) {
      const object = intersects[i].object;
      const parentBooth = object.parent; 

      if (object.userData.isDonateButton && object.userData.paypalDonationLink) {
        showDonationModal(object.userData.ownerName, object.userData.paypalDonationLink);
        break;
      }

      if (object.userData.isClaimButton && parentBooth && parentBooth.userData.isEmptyBooth) {
        const boothId = parentBooth.userData.boothId;

        if (!hasClaimedBooth) {
             claimBooth(scene, parentBooth, finalPlayerName, currentBoothText, paypalDonationLink, room.clientId); 

            hasClaimedBooth = true;
            claimedBoothId = boothId;
            boothButton.style.display = 'flex'; 
            unclaimButton.style.display = 'flex'; 

            room.updatePresence({
              claimedBooth: boothId,
              boothText: currentBoothText,
              paypalDonationLink: paypalDonationLink
            });
        }

        break;
      }

      if (parentBooth && parentBooth.userData && parentBooth.userData.isBooth &&
          !object.userData.isDonateButton && parentBooth.userData.paypalDonationLink) {

          if (parentBooth.userData.ownerId !== room.clientId) { 
              showDonationModal(parentBooth.userData.ownerName, parentBooth.userData.paypalDonationLink);
              break;
          }
      }
    }
  });

  room.subscribePresence((presence) => {
    for (const clientId in presence) {
      if (clientId === room.clientId) continue; 

      const playerData = presence[clientId];
      if (!playerData) { 
          if (otherPlayers[clientId]) {
              scene.remove(otherPlayers[clientId]);
              if (otherPlayers[clientId].geometry) otherPlayers[clientId].geometry.dispose();
              if (otherPlayers[clientId].material) {
                if (Array.isArray(otherPlayers[clientId].material)) {
                    otherPlayers[clientId].material.forEach(mat => mat.dispose());
                } else {
                    otherPlayers[clientId].material.dispose();
                }
              }
              otherPlayers[clientId].traverse(child => {
                 if (child.geometry) child.geometry.dispose();
                 if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                         child.material.dispose();
                    }
                 }
                 if (child.texture) child.texture.dispose();
              });
              delete otherPlayers[clientId];
          }
          if (playerLabels[clientId]) {
              document.getElementById('game-container').removeChild(playerLabels[clientId]);
              delete playerLabels[clientId];
          }
          if (chatMessages[clientId]) {
               if (chatMessages[clientId].hideTimeout) {
                    clearTimeout(chatMessages[clientId].hideTimeout);
                    delete chatMessages[clientId].hideTimeout;
               }
              document.getElementById('game-container').removeChild(chatMessages[clientId]);
              delete chatMessages[clientId];
          }
           if (playerBooths[clientId]) {
                const boothId = playerBooths[clientId];
                unclaimBooth(scene, boothId); 
                delete playerBooths[clientId];
           }
          continue; 
      }

      if (!otherPlayers[clientId] && playerData.x !== undefined && playerData.z !== undefined) {
        const peerInfo = room.peers[clientId] || {};
        const peerName = peerInfo.username || `Player${clientId.substring(0, 4)}`;

        const playerModel = createPlayerModel(THREE, peerName);
        playerModel.position.set(playerData.x, playerData.y || 0.5, playerData.z);
        if (playerData.rotation !== undefined) {
          playerModel.rotation.y = playerData.rotation;
        }
        scene.add(playerModel);
        otherPlayers[clientId] = playerModel;

        playerLabels[clientId] = createPlayerLabel(clientId, peerName);

        chatMessages[clientId] = createChatMessage(clientId);
      }

      else if (otherPlayers[clientId] && playerData.x !== undefined && playerData.z !== undefined) {
        otherPlayers[clientId].position.set(playerData.x, playerData.y || 0, playerData.z);
        if (playerData.rotation !== undefined) {
          otherPlayers[clientId].rotation.y = playerData.rotation;
        }

        if (playerData.moving) {
          const leftLeg = otherPlayers[clientId].getObjectByName("leftLeg");
          const rightLeg = otherPlayers[clientId].getObjectByName("rightLeg");

          if (leftLeg && rightLeg) {
            const walkSpeed = 5;
            const walkAmplitude = 0.3;
            const animationPhase = performance.now() * 0.01 * walkSpeed; 
            leftLeg.rotation.x = Math.sin(animationPhase) * walkAmplitude;
            rightLeg.rotation.x = Math.sin(animationPhase + Math.PI) * walkAmplitude;
          }
        } else {
          const leftLeg = otherPlayers[clientId].getObjectByName("leftLeg");
          const rightLeg = otherPlayers[clientId].getObjectByName("rightLeg");

          if (leftLeg && rightLeg) {
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
          }
        }

        if (playerData.chat && playerData.chat.message) {
           const currentMessage = chatMessages[clientId].textContent;
           const lastTimestamp = chatMessages[clientId].dataset.timestamp; 

           if (currentMessage !== playerData.chat.message || lastTimestamp !== String(playerData.chat.timestamp)) {
                chatMessages[clientId].textContent = playerData.chat.message;
                chatMessages[clientId].dataset.timestamp = playerData.chat.timestamp;
                chatMessages[clientId].style.display = 'block';

                if (chatMessages[clientId].hideTimeout) {
                    clearTimeout(chatMessages[clientId].hideTimeout);
                }

                chatMessages[clientId].hideTimeout = setTimeout(() => {
                  if (chatMessages[clientId]) {
                    chatMessages[clientId].style.display = 'none';
                    delete chatMessages[clientId].hideTimeout; 
                  }
                }, 5000);
           }
        } else if (chatMessages[clientId] && chatMessages[clientId].style.display !== 'none') {
             if (chatMessages[clientId].hideTimeout) {
                  clearTimeout(chatMessages[clientId].hideTimeout);
                  delete chatMessages[clientId].hideTimeout;
             }
             chatMessages[clientId].style.display = 'none';
             chatMessages[clientId].textContent = ''; 
             delete chatMessages[clientId].dataset.timestamp; 
        }

        const peerInfo = room.peers[clientId] || {};
        const peerName = peerInfo.username || `Player${clientId.substring(0, 4)}`;

        if (playerData.claimedBooth) {
          const boothId = playerData.claimedBooth;
          const boothText = playerData.boothText || "Please Donate!"; 
          const paypalLink = playerData.paypalDonationLink;

          scene.traverse((object) => {
            if (object.userData.boothId === boothId) {
              if (object.userData.isEmptyBooth) {
                 claimBooth(scene, object, peerName, boothText, paypalLink, clientId); 
                 object.userData.isEmptyBooth = false;
                 object.userData.ownerId = clientId;
                 playerBooths[clientId] = boothId; 
              } else if (object.userData.ownerId === clientId) {
                 updateBoothDisplay(scene, object, boothText, peerName, clientId);
              }
            }
          });
        } else {
             if (playerBooths[clientId]) {
                const boothId = playerBooths[clientId];
                unclaimBooth(scene, boothId); 
                delete playerBooths[clientId];
             }
        }
      }
    }

    if (hasClaimedBooth === false) {
    }
  });

  chatMessages[room.clientId] = createChatMessage(room.clientId);

  function animate() {
    requestAnimationFrame(animate);
    playerControls.update();

    for (const clientId in otherPlayers) {
      if (playerLabels[clientId] && otherPlayers[clientId]) {
        const screenPosition = getScreenPosition(otherPlayers[clientId].position, camera, renderer);
        if (screenPosition) {
          playerLabels[clientId].style.left = `${screenPosition.x}px`;
          playerLabels[clientId].style.top = `${screenPosition.y - 20}px`;
          playerLabels[clientId].style.display = screenPosition.visible ? 'block' : 'none';

          if (chatMessages[clientId]) {
            chatMessages[clientId].style.left = `${screenPosition.x}px`;
            chatMessages[clientId].style.top = `${screenPosition.y - 45}px`;
            if (chatMessages[clientId].textContent && screenPosition.visible) {
              chatMessages[clientId].style.display = 'block';
            } else {
               chatMessages[clientId].style.display = 'none'; 
            }
          }
        } else {
          playerLabels[clientId].style.display = 'none';
          if (chatMessages[clientId]) {
            chatMessages[clientId].style.display = 'none';
          }
        }
      }
    }

    if (playerLabels[room.clientId] && playerModel) {
      const screenPosition = getScreenPosition(playerModel.position, camera, renderer);
      if (screenPosition) {
        playerLabels[room.clientId].style.left = `${screenPosition.x}px`;
        playerLabels[room.clientId].style.top = `${screenPosition.y - 20}px`;
        playerLabels[room.clientId].style.display = screenPosition.visible ? 'block' : 'none';
      } else {
        playerLabels[room.clientId].style.display = 'none';
      }
    }

    if (chatMessages[room.clientId] && playerModel) {
      const screenPosition = getScreenPosition(playerModel.position, camera, renderer);
      if (screenPosition && chatMessages[room.clientId].textContent) {
        chatMessages[room.clientId].style.left = `${screenPosition.x}px`;
        chatMessages[room.clientId].style.top = `${screenPosition.y - 45}px`;
        chatMessages[room.clientId].style.display = screenPosition.visible ? 'block' : 'none';
      } else {
        chatMessages[room.clientId].style.display = 'none';
      }
    }

    scene.traverse((object) => {
        if (object.userData.isBoothOwnerLabel) {
            object.lookAt(camera.position);
        }
    });

    renderer.render(scene, camera);
  }

  animate();
}

function claimBooth(scene, boothObject, ownerName, boothText, paypalDonationLink, ownerId) {
  const claimButton = boothObject.getObjectByName("claimButton");
  if (claimButton) {
    boothObject.remove(claimButton);
    if (claimButton.geometry) claimButton.geometry.dispose();
    if (claimButton.material) claimButton.material.dispose();
    if (claimButton.material.map) claimButton.material.map.dispose();
  }

  updateBoothDisplay(scene, boothObject, boothText || "Please Donate!", ownerName, ownerId); 

  const donateButtonCanvas = document.createElement('canvas');
  donateButtonCanvas.width = 256;
  donateButtonCanvas.height = 64;
  const donateContext = donateButtonCanvas.getContext('2d');

  donateContext.fillStyle = '#4CAF50';
  donateContext.fillRect(0, 0, donateButtonCanvas.width, donateButtonCanvas.height);
  donateContext.font = 'bold 24px Arial';
  donateContext.textAlign = 'center';
  donateContext.textBaseline = 'middle';
  donateContext.fillStyle = '#FFFFFF';
  donateContext.fillText('DONATE', donateButtonCanvas.width / 2, donateButtonCanvas.height / 2);

  const donateTexture = new THREE.CanvasTexture(donateButtonCanvas);
  const donateButtonMaterial = new THREE.MeshBasicMaterial({
    map: donateTexture,
    side: THREE.DoubleSide
  });

  const donateButtonGeometry = new THREE.PlaneGeometry(1, 0.3);
  const donateButtonMesh = new THREE.Mesh(donateButtonGeometry, donateButtonMaterial);
  donateButtonMesh.position.set(0, 0.86, 0.51);
  donateButtonMesh.rotation.x = -Math.PI / 4;
  donateButtonMesh.userData.isDonateButton = true;
  donateButtonMesh.userData.paypalDonationLink = paypalDonationLink;
  donateButtonMesh.userData.ownerName = ownerName;
  donateButtonMesh.name = "donateButton";
  boothObject.add(donateButtonMesh);

  boothObject.userData.isBooth = true; 
  boothObject.userData.isEmptyBooth = false;
  boothObject.userData.paypalDonationLink = paypalDonationLink;
  boothObject.userData.ownerName = ownerName;
  boothObject.userData.boothText = boothText;
  boothObject.userData.ownerId = ownerId;
}

function unclaimBooth(scene, boothId) {
     scene.traverse((object) => {
        if (object.userData.boothId === boothId && object.userData.isBooth) {
            const booth = object;

            const donateButton = booth.getObjectByName("donateButton");
            if (donateButton) {
                booth.remove(donateButton);
                 if (donateButton.geometry) donateButton.geometry.dispose();
                 if (donateButton.material) donateButton.material.dispose();
                 if (donateButton.material.map) donateButton.material.map.dispose();
            }

            const ownerLabel = booth.getObjectByName("boothOwnerLabel");
            if (ownerLabel) {
                 booth.remove(ownerLabel);
                 if (ownerLabel.geometry) ownerLabel.geometry.dispose();
                 if (ownerLabel.material) ownerLabel.material.dispose();
                 if (ownerLabel.material.map) ownerLabel.material.map.dispose();
            }

            updateBoothDisplay(scene, booth, "Please Donate!", null, null); 

            const claimButtonCanvas = document.createElement('canvas');
            claimButtonCanvas.width = 256;
            claimButtonCanvas.height = 64;
            const claimContext = claimButtonCanvas.getContext('2d');

            claimContext.fillStyle = '#4CAF50';
            claimContext.fillRect(0, 0, claimButtonCanvas.width, claimButtonCanvas.height);
            claimContext.font = 'bold 24px Arial';
            claimContext.textAlign = 'center';
            claimContext.textBaseline = 'middle';
            claimContext.fillStyle = '#FFFFFF';
            claimContext.fillText('CLAIM BOOTH', claimButtonCanvas.width / 2, claimButtonCanvas.height / 2);

            const claimTexture = new THREE.CanvasTexture(claimButtonCanvas);
            const claimButtonMaterial = new THREE.MeshBasicMaterial({
              map: claimTexture,
              side: THREE.DoubleSide
            });

            const claimButtonGeometry = new THREE.PlaneGeometry(1, 0.3);
            const claimButtonMesh = new THREE.Mesh(claimButtonGeometry, claimButtonMaterial);
            claimButtonMesh.position.set(0, 0.86, 0.51);
            claimButtonMesh.rotation.x = -Math.PI / 4;
            claimButtonMesh.userData.isClaimButton = true;
            claimButtonMesh.name = "claimButton";
            booth.add(claimButtonMesh);

            booth.userData.isBooth = false; 
            booth.userData.isEmptyBooth = true;
            booth.userData.paypalDonationLink = null;
            booth.userData.ownerName = null;
            booth.userData.boothText = null; 
            booth.userData.ownerId = null;
        }
     });
}

function updateBoothDisplay(scene, boothIdOrObject, text, ownerName, ownerId) {
  let booth;
  if (typeof boothIdOrObject === 'string') {
    scene.traverse((object) => {
      if (object.userData.boothId === boothIdOrObject) {
        booth = object;
      }
    });
  } else {
    booth = boothIdOrObject;
  }

  if (!booth) return;

  const textMesh = booth.getObjectByName("boothText");
  if (!textMesh) return;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = 'bold 24px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#000000';

  const maxWidth = 240;
  const words = text.split(' ');
  let line = '';
  let lines = [];
  let y = 35; 

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && i > 0) {
      lines.push(line.trim()); 
      line = words[i] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim()); 

  const mainLines = lines.slice(0, 2);
  const lineHeight = 30;
  let startY = canvas.height / 2 - ((mainLines.length - 1) * lineHeight) / 2 - 10; 

  for (let i = 0; i < mainLines.length; i++) {
    context.fillText(mainLines[i], canvas.width / 2, startY + i * lineHeight);
  }

  if (ownerName) {
    context.font = 'italic 16px Arial';
    context.fillStyle = '#555555';
    context.fillText(`by ${ownerName}`, canvas.width / 2, 110);
  }

  if (textMesh.material.map) {
      textMesh.material.map.dispose();
  }
  textMesh.material.map = new THREE.CanvasTexture(canvas);
  textMesh.material.map.needsUpdate = true;

  booth.userData.boothText = text;
  booth.userData.ownerName = ownerName; 
  booth.userData.ownerId = ownerId; 
}

function showMainMenu() {
  return new Promise((resolve) => {
    const menuContainer = document.createElement('div');
    menuContainer.id = 'main-menu';
    menuContainer.style.position = 'fixed';
    menuContainer.style.top = '0';
    menuContainer.style.left = '0';
    menuContainer.style.width = '100%';
    menuContainer.style.height = '100%';
    menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    menuContainer.style.display = 'flex';
    menuContainer.style.flexDirection = 'column';
    menuContainer.style.alignItems = 'center';
    menuContainer.style.justifyContent = 'center';
    menuContainer.style.zIndex = '3000';

    const title = document.createElement('h1');
    title.textContent = 'Donation Booth Multiplayer';
    title.style.color = 'white';
    title.style.marginBottom = '20px';
    title.style.fontSize = '36px';

    const formContainer = document.createElement('div');
    formContainer.style.width = '100%';
    formContainer.style.maxWidth = '400px';
    formContainer.style.padding = '20px';
    formContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    formContainer.style.borderRadius = '10px';

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Enter your name:';
    nameLabel.style.color = 'white';
    nameLabel.style.display = 'block';
    nameLabel.style.marginBottom = '10px';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Your name';
    nameInput.maxLength = '20';
    nameInput.style.width = '100%';
    nameInput.style.padding = '10px';
    nameInput.style.fontSize = '16px';
    nameInput.style.borderRadius = '5px';
    nameInput.style.border = 'none';
    nameInput.style.marginBottom = '20px';

    const paypalLabel = document.createElement('label');
    paypalLabel.textContent = 'Enter your PayPal donation link:';
    paypalLabel.style.color = 'white';
    paypalLabel.style.display = 'block';
    paypalLabel.style.marginBottom = '10px';

    const paypalInput = document.createElement('input');
    paypalInput.type = 'text';
    paypalInput.placeholder = 'https://paypal.me/yourusername';
    paypalInput.style.width = '100%';
    paypalInput.style.padding = '10px';
    paypalInput.style.fontSize = '16px';
    paypalInput.style.borderRadius = '5px';
    paypalInput.style.border = 'none';
    paypalInput.style.marginBottom = '20px';

    const helpText = document.createElement('p');
    helpText.textContent = 'Create your PayPal.me link at paypal.me';
    helpText.style.color = '#CCC';
    helpText.style.fontSize = '12px';
    helpText.style.marginBottom = '20px';

    const startButton = document.createElement('button');
    startButton.textContent = 'Start Game';
    startButton.style.padding = '10px 20px';
    startButton.style.fontSize = '18px';
    startButton.style.backgroundColor = '#4CAF50';
    startButton.style.color = 'white';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '5px';
    startButton.style.cursor = 'pointer';
    startButton.style.width = '100%';

    startButton.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const paypalDonationLink = paypalInput.value.trim();
      document.body.removeChild(menuContainer);
      resolve({ playerName: name, paypalDonationLink });
    });

    formContainer.appendChild(nameLabel);
    formContainer.appendChild(nameInput);
    formContainer.appendChild(paypalLabel);
    formContainer.appendChild(paypalInput);
    formContainer.appendChild(helpText);
    formContainer.appendChild(startButton);

    menuContainer.appendChild(title);
    menuContainer.appendChild(formContainer);

    document.body.appendChild(menuContainer);

    nameInput.focus();
  });
}

function showBoothTextModal(currentText, callback) {
  const modalContainer = document.createElement('div');
  modalContainer.style.position = 'fixed';
  modalContainer.style.top = '0';
  modalContainer.style.left = '0';
  modalContainer.style.width = '100%';
  modalContainer.style.height = '100%';
  modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  modalContainer.style.display = 'flex';
  modalContainer.style.alignItems = 'center';
  modalContainer.style.justifyContent = 'center';
  modalContainer.style.zIndex = '4000';

  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = 'white';
  modalContent.style.padding = '20px';
  modalContent.style.borderRadius = '10px';
  modalContent.style.width = '90%';
  modalContent.style.maxWidth = '400px';

  const title = document.createElement('h2');
  title.textContent = 'Edit Booth Text';
  title.style.marginBottom = '20px';

  const textInput = document.createElement('textarea');
  textInput.value = currentText || '';
  textInput.placeholder = 'Enter booth text...';
  textInput.style.width = '100%';
  textInput.style.padding = '10px';
  textInput.style.marginBottom = '10px';
  textInput.style.height = '80px';
  textInput.style.resize = 'none';
  textInput.maxLength = 60;

  const charCount = document.createElement('div');
  charCount.textContent = `${textInput.value.length}/60 characters`;
  charCount.style.marginBottom = '20px';
  charCount.style.color = '#666';
  charCount.style.fontSize = '14px';

  textInput.addEventListener('input', () => {
    charCount.textContent = `${textInput.value.length}/60 characters`;
  });

  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.justifyContent = 'space-between';

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.style.padding = '10px 20px';
  saveButton.style.backgroundColor = '#4CAF50';
  saveButton.style.color = 'white';
  saveButton.style.border = 'none';
  saveButton.style.borderRadius = '5px';
  saveButton.style.cursor = 'pointer';

  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '10px 20px';
  cancelButton.style.backgroundColor = '#f44336';
  cancelButton.style.color = 'white';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '5px';
  cancelButton.style.cursor = 'pointer';

  saveButton.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text) {
      callback(text);
    }
    document.body.removeChild(modalContainer);
  });

  cancelButton.addEventListener('click', () => {
    document.body.removeChild(modalContainer);
  });

  buttonsContainer.appendChild(cancelButton);
  buttonsContainer.appendChild(saveButton);

  modalContent.appendChild(title);
  modalContent.appendChild(textInput);
  modalContent.appendChild(charCount);
  modalContent.appendChild(buttonsContainer);

  modalContainer.appendChild(modalContent);
  document.body.appendChild(modalContainer);

  textInput.focus();
}

function showDonationModal(ownerName, paypalDonationLink) {
  document.getElementById('recipient-name').textContent = ownerName;
  document.getElementById('donation-modal').style.display = 'flex';

  document.getElementById('paypal-button-container').innerHTML = '';

  const donateButton = document.createElement('button');
  donateButton.textContent = 'Donate via PayPal';
  donateButton.className = 'direct-paypal-button';
  donateButton.style.backgroundColor = '#0070ba';
  donateButton.style.color = 'white';
  donateButton.style.border = 'none';
  donateButton.style.borderRadius = '5px';
  donateButton.style.padding = '12px 24px';
  donateButton.style.fontSize = '18px';
  donateButton.style.cursor = 'pointer';
  donateButton.style.width = '100%';
  donateButton.style.marginTop = '10px';

  donateButton.addEventListener('click', function() {
    const customAmount = document.getElementById('custom-amount').value.trim();
    let amount = 5; 

    const selectedBtn = document.querySelector('.amount-btn.selected');
    if (selectedBtn) {
      amount = parseFloat(selectedBtn.dataset.amount);
    }

    if (customAmount && !isNaN(parseFloat(customAmount))) {
      amount = parseFloat(customAmount);
    }

    let donationUrl = paypalDonationLink;
    if (donationUrl.includes('paypal.me/')) {
      donationUrl = donationUrl.endsWith('/') ? donationUrl + amount : donationUrl + '/' + amount;
    }

    window.open(donationUrl, '_blank');
    document.getElementById('donation-modal').style.display = 'none';
  });

  document.getElementById('paypal-button-container').appendChild(donateButton);

  const amountButtons = document.querySelectorAll('.amount-btn');
  amountButtons.forEach(btn => {
    btn.classList.remove('selected');
    btn.addEventListener('click', function() {
      amountButtons.forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
    });
  });

  document.querySelector('.amount-btn[data-amount="5"]').classList.add('selected');

  document.getElementById('cancel-donation').addEventListener('click', function() {
    document.getElementById('donation-modal').style.display = 'none';
  });
}

function getScreenPosition(position, camera, renderer) {
  const vector = new THREE.Vector3();
  const widthHalf = renderer.domElement.width / 2;
  const heightHalf = renderer.domElement.height / 2;

  vector.copy(position);
  vector.y += 1.5; 

  vector.project(camera);

  const isInFront = vector.z < 1;

  return {
    x: (vector.x * widthHalf) + widthHalf,
    y: -(vector.y * heightHalf) + heightHalf,
    visible: isInFront
  };
}

main();
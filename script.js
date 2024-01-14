// script.js
const DIRECTIONS = Object.freeze({
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
});

const DIRECTIONS_ARRAY = Object.freeze(Object.values(DIRECTIONS));

const directionToCssSide = {
  [DIRECTIONS.Up]: 'Top',
  [DIRECTIONS.Down]: 'Top',
  [DIRECTIONS.Left]: 'Left',
  [DIRECTIONS.Right]: 'Left',
};

const invalidArrowClassNames = [
  'up-down',
  'down-up',
  'left-right',
  'right-left',
  '',
];

const directionMultiply = {
  [DIRECTIONS.Up]: -1,
  [DIRECTIONS.Down]: 1,
  [DIRECTIONS.Left]: -1,
  [DIRECTIONS.Right]: 1,
};

const TARGET_SIZE = 20;

const MAX_TARGETS = 20;

const MAX_ACTIVE_TARGETS = 15;

/** ------------------------------- HELPERS --------------------------------- */

/**
 * Returns a random value from the provided array.
 * @param {Array} array - The array from which to get a random value.
 * @returns {*} The randomly selected value from the array.
 */
const getRandomValueFromArray = (array) => array[Math.floor(Math.random() * array.length)];

/**
 * Returns a random natural number from the provided range.
 * @param {number} min - The minimum value of the range.
 * @param {number} max - The maximum value of the range.
 * @returns {number} The randomly selected value from the range.
 */
const getRandomNaturalNumberFromRange = (min, max) => Math.floor(Math.random() * (max - min) + min);

/**
 * Remove element
 * @param {HTMLElement} element
 */
const removeElement = (element) => {
  if (!element.parentNode) return;
  element.parentNode.removeChild(element);
};

/**
 * Remove all elements with class name
 * @param {string} className
 */
const removeAllElementsWithClassName = (className) => {
  const elements = document.getElementsByClassName(className);
  Array.from(elements).forEach((el) => removeElement(el));
};

/**
 * Check collision
 * @param {HTMLElement} element1
 * @param {HTMLElement} element2
 * @returns {boolean}
 */
const checkCollision = (element1, element2) => {
  const element1Position = element1.getBoundingClientRect();
  const element2Position = element2.getBoundingClientRect();

  return (
    element1Position.left < element2Position.right
    && element1Position.right > element2Position.left
    && element1Position.top < element2Position.bottom
    && element1Position.bottom > element2Position.top
  );
};

/** ---------------------------- COMMON VARIABLES --------------------------------- */
const game = document.getElementById('game');
const gameWidth = game.getBoundingClientRect().width;
const gameHeight = game.getBoundingClientRect().height;
const popUpBtn = document.getElementById('popup-btn');
const popUpText = document.getElementById('popup-text');

/** ---------------------------- STATE MANAGEMENT --------------------------------- */

const keyDownActive = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  Space: false,
};
let gameActive = false;
let seconds = 0;
let scores = 0;
let generatedTargets = 0;

let shooterMoveInterval = null;
let shootBulletInterval = null;
let targetGenerateInterval = null;
let checkShooterCollisionInterval = null;
let timerInterval = null;

/** --------------------------------- MOVEMENT --------------------------------- */
/**
 * Check if object can move in the direction
 * @param {HTMLElement} object
 * @param {("up"|"down"|"left"|"right")} direction
 * @param {number} distance
 * @returns {boolean}
 */
const canObjectMove = (object, direction, distance = 10) => {
  switch (direction) {
    case DIRECTIONS.Up:
    case DIRECTIONS.Left:
      return object[`offset${directionToCssSide[direction]}`] > -distance;
    case DIRECTIONS.Down:
      return (
        object[`offset${directionToCssSide[direction]}`]
        < gameHeight - object.clientWidth + distance
      );
    case DIRECTIONS.Right:
      return (
        object[`offset${directionToCssSide[direction]}`]
        < gameWidth - object.clientWidth + distance
      );
    default:
      return false;
  }
};

/**
 * Get active arrow keys
 * @returns {("Up"|"Down"|"Left"|"Right")[]}
 */
const getActiveArrowKeys = () => Object.keys(DIRECTIONS).filter((key) => keyDownActive[`Arrow${key}`]);

/**
 * Move object in the direction
 * @param {HTMLElement} object
 * @param {("up"|"down"|"left"|"right")} direction
 * @returns {boolean}
 */
const move = (object, direction) => {
  const distance = object.clientWidth / 2;
  if (canObjectMove(object, direction)) {
    const cssSide = directionToCssSide[direction];
    object.style[cssSide.toLowerCase()] = `${
      object[`offset${cssSide}`] + distance * directionMultiply[direction]
    }px`;
    return true;
  }
  return false;
};

/** --------------------------------- SHOOTER --------------------------------- */

/**
 * Move shooter
 */
const shooterMoving = () => {
  const shooter = document.getElementById('shooter');
  getActiveArrowKeys().forEach((key) => {
    move(shooter, key.toLowerCase());
  });
};

/**
 * Setup shooter
 */
const setupShooter = () => {
  const shooter = document.getElementById('shooter');
  const shooterArrow = document.getElementById('shooter-arrow');
  shooter.style.left = `${Math.floor((gameWidth - shooter.clientWidth) / 2)}px`;
  shooter.style.top = `${Math.floor(
    (gameHeight - shooter.clientHeight) / 2,
  )}px`;
  shooterArrow.className = 'arrow up';
  shooterMoveInterval = setInterval(() => shooterMoving(), 60);
};

/**
 * Set shooter arrow direction
 */
const setShooterArrowDirection = () => {
  const arrowClassName = getActiveArrowKeys()
    .map((key) => DIRECTIONS[key])
    .join('-')
    .toLowerCase()
    .trim();
  if (!invalidArrowClassNames.includes(arrowClassName)) {
    const shooterArrow = document.getElementById('shooter-arrow');
    shooterArrow.className = `arrow ${arrowClassName}`;
  }
};

/** ---------------------------------- BULLET --------------------------------- */

/**
 * Create bullet
 */
const createBullet = () => {
  const shooter = document.getElementById('shooter');
  const bullet = document.createElement('div');
  bullet.className = 'bullet';
  bullet.style.top = shooter.style.top;
  bullet.style.left = shooter.style.left;
  document.getElementById('game').appendChild(bullet);
  return bullet;
};

/**
 * Shoot bullet
 */
const shootBullet = () => {
  const score = document.getElementById('score');
  const bullet = createBullet();
  const arrowDirections = document
    .getElementById('shooter-arrow')
    .className.split(' ')[1]
    .split('-');
  let moving = true;
  const moveBulletInterval = setInterval(() => {
    const targets = Array.from(document.getElementsByClassName('target'));
    arrowDirections.forEach((dir) => {
      if (moving && gameActive) moving = move(bullet, dir);
    });
    targets.forEach((target) => {
      if (checkCollision(bullet, target)) {
        removeElement(target);
        moving = false;
        scores += 1;
        score.innerText = scores.toString().padStart(3, '0');
      }
    });
    if (!moving) {
      removeElement(bullet);
      clearInterval(moveBulletInterval);
    }
  }, 30);
};

const generateBullets = () => {
  shootBulletInterval = setInterval(() => {
    if (keyDownActive.Space) {
      shootBullet();
    }
  }, 100);
};

/** ---------------------------------- TARGET --------------------------------- */

/**
 * Generate target coordinate
 * @returns {{x: number, y: number}}
 * @throws {Error} Invalid direction
 */
const generateTargetCoordinate = () => {
  const halfSize = TARGET_SIZE / 2;
  const divider = gameWidth / halfSize;
  const minCoordinate = -halfSize;
  const maxCoordinate = gameWidth - halfSize;
  const randomDirection = getRandomValueFromArray(DIRECTIONS_ARRAY);
  const randomCoordinate = minCoordinate + getRandomNaturalNumberFromRange(0, divider) * halfSize;
  switch (randomDirection) {
    case 'up':
      return { x: randomCoordinate, y: maxCoordinate };
    case 'down':
      return { x: randomCoordinate, y: minCoordinate };
    case 'left':
      return { x: maxCoordinate, y: randomCoordinate };
    case 'right':
      return { x: minCoordinate, y: randomCoordinate };
    default:
      throw new Error('Invalid direction');
  }
};

/**
 * Moving target
 * @param {HTMLElement} target
 * @returns {void}
 * @throws {Error} Invalid direction
 */
const targetMoving = (target) => {
  let moveInterval;
  let stepInterval;

  const startMoving = () => {
    if (!target.parentNode || !gameActive) {
      clearInterval(moveInterval);
      clearInterval(stepInterval);
    } else {
      const randomDirections = [
        getRandomValueFromArray(DIRECTIONS_ARRAY),
        getRandomValueFromArray(DIRECTIONS_ARRAY),
      ];
      clearInterval(stepInterval);
      stepInterval = setInterval(() => {
        randomDirections.forEach((direction) => move(target, direction));
      }, 200);
    }
  };
  moveInterval = setInterval(startMoving, 1000 + Math.random() * 1000);
  const freezeTargetInterval = setInterval(() => {
    if (!gameActive) {
      clearInterval(moveInterval);
      clearInterval(stepInterval);
      clearInterval(freezeTargetInterval);
    }
  }, 100);
  startMoving();
};

/**
 * Create target
 * @returns {HTMLElement}
 */
const createTarget = () => {
  const newTarget = document.createElement('div');
  newTarget.classList.add('target');
  newTarget.style.visibility = 'hidden';
  const targets = Array.from(document.getElementsByClassName('target'));
  game.appendChild(newTarget);
  // Set position
  let attempts = 0;
  const maxAttempts = 100;
  do {
    if (attempts >= maxAttempts) {
      game.removeChild(newTarget);
      throw new Error(
        `Could not find a spot for the new target after ${maxAttempts} attempts.`,
      );
    }
    const randomTargetCoordinate = generateTargetCoordinate();
    newTarget.style.left = `${randomTargetCoordinate.x}px`;
    newTarget.style.top = `${randomTargetCoordinate.y}px`;
    attempts += 1;
  } while (targets.some((target) => checkCollision(newTarget, target)));

  newTarget.style.visibility = 'visible';
  setTimeout(() => {
    targetMoving(newTarget);
  }, 800);

  return newTarget;
};

const generateTargets = () => {
  targetGenerateInterval = setInterval(() => {
    if (generateTargets > MAX_ACTIVE_TARGETS) return;
    if (gameActive && generatedTargets < MAX_TARGETS) {
      createTarget();
      generatedTargets += 1;
    } else {
      clearInterval(targetGenerateInterval);
    }
  }, 1000);
};

/** ---------------------------------- TIMER --------------------------------- */

const setTimer = (sec) => {
  const timer = document.getElementById('timer');
  const date = new Date(sec * 1000);
  timer.innerText = sec;
  const hhmmss = date.toISOString().slice(11, 19);
  timer.innerText = hhmmss;
};

const generateTimer = () => {
  setTimer(0);
  timerInterval = setInterval(() => {
    if (gameActive) {
      seconds += 1;
      setTimer(seconds);
    }
  }, 1000);
};

/** ---------------------------------- GAME --------------------------------- */

/**
 * Handle key event
 * @param {KeyboardEvent} event
 * @param {boolean} isActive
 */
const handleKeyEvent = (event, isActive) => {
  if (Object.prototype.hasOwnProperty.call(keyDownActive, event.code)) {
    keyDownActive[event.code] = isActive;
  }
  setShooterArrowDirection();
};

const handleKeyDownEvent = (event) => {
  handleKeyEvent(event, true);
};

const handleKeyUpEvent = (event) => {
  handleKeyEvent(event, false);
};

const endingGame = (isWinner) => {
  gameActive = false;
  const popup = document.getElementById('popup');
  popUpBtn.innerText = 'Restart';
  popUpText.innerText = isWinner ? 'You win' : 'You lose';
  popup.classList.remove('hidden');
  clearInterval(checkShooterCollisionInterval);
  clearInterval(shooterMoveInterval);
  clearInterval(shootBulletInterval);
  clearInterval(timerInterval);
  document.removeEventListener('keydown', handleKeyDownEvent);
  document.removeEventListener('keyup', handleKeyUpEvent);
};

const checkIfGameIsOver = () => {
  checkShooterCollisionInterval = setInterval(() => {
    const shooter = document.getElementById('shooter');
    const targets = Array.from(document.getElementsByClassName('target'));
    if (scores >= MAX_TARGETS) {
      endingGame(true);
    }
    if (targets.some((target) => checkCollision(shooter, target))) {
      endingGame(false);
    }
  }, 100);
};

const resetGame = () => {
  seconds = 0;
  scores = 0;
  keyDownActive.ArrowDown = false;
  keyDownActive.ArrowUp = false;
  keyDownActive.ArrowLeft = false;
  keyDownActive.ArrowRight = false;
  keyDownActive.Space = false;
  generatedTargets = 0;
  removeAllElementsWithClassName('target');
  removeAllElementsWithClassName('bullet');
};

const startingGame = () => {
  gameActive = true;
  resetGame();
  setupShooter();
  generateTimer();
  generateTargets();
  generateBullets();
  checkIfGameIsOver();
  document.addEventListener('keydown', handleKeyDownEvent);
  document.addEventListener('keyup', handleKeyUpEvent);
};

/** ------------------------------- EVENT -------------------------------- */

// Handle click event on restart button
popUpBtn.addEventListener('click', () => {
  const popup = document.getElementById('popup');
  popup.classList.add('hidden');
  startingGame();
});

const initializeGame = () => {
  popUpBtn.innerText = 'Start';
  popUpText.innerText = 'Press Start to play';
};

initializeGame();

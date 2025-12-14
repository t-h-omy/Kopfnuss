// Kopfnuss - Task Generators
// Generate mathematical tasks based on balancing values

import { BALANCING, KOPFNUSS_DIFFICULTY } from '../data/balancingLoader.js';

/**
 * @typedef {Object} TaskMetadata
 * @property {string} operation - Operation type (addition, subtraction, multiplication, division, squared)
 * @property {number[]} operands - Array of operands used in the task
 */

/**
 * @typedef {Object} Task
 * @property {string} question - The mathematical question to display (e.g., "5 + 3")
 * @property {number} answer - The correct answer to the question
 * @property {TaskMetadata} metadata - Additional information about the task
 */

/**
 * Helper function to generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate an addition task
 * @returns {Task} Task object with question, answer, and metadata
 */
export function generateAddition() {
  const a = randomInt(BALANCING.addition.min, BALANCING.addition.max);
  const b = randomInt(BALANCING.addition.min, BALANCING.addition.max);
  const answer = a + b;
  
  return {
    question: `${a} + ${b}`,
    answer: answer,
    metadata: {
      operation: 'addition',
      operands: [a, b]
    }
  };
}

/**
 * Generate a subtraction task
 * Ensures result is positive by making first number larger
 * @returns {Task} Task object with question, answer, and metadata
 */
export function generateSubtraction() {
  const a = randomInt(BALANCING.subtraction.min, BALANCING.subtraction.max);
  const b = randomInt(BALANCING.subtraction.min, BALANCING.subtraction.max);
  
  // Ensure a >= b for positive result
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  const answer = larger - smaller;
  
  return {
    question: `${larger} - ${smaller}`,
    answer: answer,
    metadata: {
      operation: 'subtraction',
      operands: [larger, smaller]
    }
  };
}

/**
 * Generate a multiplication task
 * @returns {Task} Task object with question, answer, and metadata
 */
export function generateMultiplication() {
  const a = randomInt(
    BALANCING.multiplication.factor1.min,
    BALANCING.multiplication.factor1.max
  );
  const b = randomInt(
    BALANCING.multiplication.factor2.min,
    BALANCING.multiplication.factor2.max
  );
  const answer = a * b;
  
  return {
    question: `${a} × ${b}`,
    answer: answer,
    metadata: {
      operation: 'multiplication',
      operands: [a, b]
    }
  };
}

/**
 * Generate a division task
 * Ensures result is a whole number
 * @returns {Task} Task object with question, answer, and metadata
 */
export function generateDivision() {
  const divisor = randomInt(
    BALANCING.division.divisor.min,
    BALANCING.division.divisor.max
  );
  const quotient = randomInt(
    BALANCING.division.quotient.min,
    BALANCING.division.quotient.max
  );
  
  // Calculate dividend to ensure whole number result
  const dividend = divisor * quotient;
  const answer = quotient;
  
  return {
    question: `${dividend} ÷ ${divisor}`,
    answer: answer,
    metadata: {
      operation: 'division',
      operands: [dividend, divisor]
    }
  };
}

/**
 * Generate a squared task
 * @returns {Task} Task object with question, answer, and metadata
 */
export function generateSquared() {
  const base = randomInt(
    BALANCING.squared.min,
    BALANCING.squared.max
  );
  const answer = base * base;
  
  return {
    question: `${base}²`,
    answer: answer,
    metadata: {
      operation: 'squared',
      operands: [base]
    }
  };
}

/**
 * Generate a mixed (random operation) task
 * Includes all operation types for variety
 * @returns {Task} Task object with question, answer, and metadata
 */
export function generateMixed() {
  const generators = [
    generateAddition,
    generateSubtraction,
    generateAdditionPlaceValue,
    generateSubtractionPlaceValue,
    generateMultiplication,
    generateDivision,
    generateSquared
  ];
  
  // Randomly select a generator
  const randomGenerator = generators[randomInt(0, generators.length - 1)];
  const task = randomGenerator();
  
  // Update metadata to indicate it's from mixed mode
  task.metadata.mixedMode = true;
  
  return task;
}

/**
 * Generate an addition task with place-value input requirement
 * Result range: 0-9999 (4 digits max)
 * @returns {Task} Task object with question, answer, metadata, and digit decomposition
 */
export function generateAdditionPlaceValue() {
  // Generate operands ensuring the sum doesn't exceed 9999
  let a, b, answer;
  do {
    a = randomInt(BALANCING.additionPlaceValue.min, BALANCING.additionPlaceValue.max);
    b = randomInt(BALANCING.additionPlaceValue.min, BALANCING.additionPlaceValue.max);
    answer = a + b;
  } while (answer > 9999);
  
  // Decompose answer into digits (thousands, hundreds, tens, ones)
  const answerStr = answer.toString().padStart(4, '0');
  const digitArray = [
    parseInt(answerStr[0], 10), // thousands
    parseInt(answerStr[1], 10), // hundreds
    parseInt(answerStr[2], 10), // tens
    parseInt(answerStr[3], 10)  // ones
  ];
  
  return {
    question: `${a} + ${b}`,
    answer: answer,
    metadata: {
      operation: 'additionPlaceValue',
      operands: [a, b],
      placeValueInput: true,
      digitArray: digitArray
    }
  };
}

/**
 * Generate a subtraction task with place-value input requirement
 * Result range: 0-9999 (4 digits max)
 * Ensures result is positive
 * @returns {Task} Task object with question, answer, metadata, and digit decomposition
 */
export function generateSubtractionPlaceValue() {
  const a = randomInt(BALANCING.subtractionPlaceValue.min, BALANCING.subtractionPlaceValue.max);
  const b = randomInt(BALANCING.subtractionPlaceValue.min, BALANCING.subtractionPlaceValue.max);
  
  // Ensure a >= b for positive result
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  const answer = larger - smaller;
  
  // Decompose answer into digits (thousands, hundreds, tens, ones)
  const answerStr = answer.toString().padStart(4, '0');
  const digitArray = [
    parseInt(answerStr[0], 10), // thousands
    parseInt(answerStr[1], 10), // hundreds
    parseInt(answerStr[2], 10), // tens
    parseInt(answerStr[3], 10)  // ones
  ];
  
  return {
    question: `${larger} - ${smaller}`,
    answer: answer,
    metadata: {
      operation: 'subtractionPlaceValue',
      operands: [larger, smaller],
      placeValueInput: true,
      digitArray: digitArray
    }
  };
}

/**
 * Generate a task based on operation type
 * @param {string} operationType - Type of operation (addition, subtraction, etc.)
 * @returns {Task} Task object with question, answer, and metadata
 */
export function generateTask(operationType) {
  switch (operationType) {
    case 'addition':
      return generateAddition();
    case 'subtraction':
      return generateSubtraction();
    case 'additionPlaceValue':
      return generateAdditionPlaceValue();
    case 'subtractionPlaceValue':
      return generateSubtractionPlaceValue();
    case 'multiplication':
      return generateMultiplication();
    case 'division':
      return generateDivision();
    case 'squared':
      return generateSquared();
    case 'mixed':
      return generateMixed();
    default:
      throw new Error(`Unknown operation type: ${operationType}`);
  }
}


// KOPFNUSS CHALLENGE TASK GENERATORS
// High-difficulty variants for the Kopfnuss Challenge
// ============================================

/**
 * Generate a high-difficulty addition task for Kopfnuss Challenge
 * @returns {Task} Task object with question, answer, and metadata
 */
function generateKopfnussAddition() {
  const a = randomInt(KOPFNUSS_DIFFICULTY.addition.minA, KOPFNUSS_DIFFICULTY.addition.maxA);
  const b = randomInt(KOPFNUSS_DIFFICULTY.addition.minB, KOPFNUSS_DIFFICULTY.addition.maxB);
  const answer = a + b;
  
  return {
    question: `${a} + ${b}`,
    answer: answer,
    metadata: {
      operation: 'addition',
      operands: [a, b],
      isKopfnuss: true
    }
  };
}

/**
 * Generate a high-difficulty subtraction task for Kopfnuss Challenge
 * @returns {Task} Task object with question, answer, and metadata
 */
function generateKopfnussSubtraction() {
  const a = randomInt(KOPFNUSS_DIFFICULTY.subtraction.minA, KOPFNUSS_DIFFICULTY.subtraction.maxA);
  const b = randomInt(KOPFNUSS_DIFFICULTY.subtraction.minB, KOPFNUSS_DIFFICULTY.subtraction.maxB);
  
  // Ensure a >= b for positive result
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  const answer = larger - smaller;
  
  return {
    question: `${larger} - ${smaller}`,
    answer: answer,
    metadata: {
      operation: 'subtraction',
      operands: [larger, smaller],
      isKopfnuss: true
    }
  };
}

/**
 * Generate a high-difficulty multiplication task for Kopfnuss Challenge
 * @returns {Task} Task object with question, answer, and metadata
 */
function generateKopfnussMultiplication() {
  const a = randomInt(
    KOPFNUSS_DIFFICULTY.multiplication.factor1.min,
    KOPFNUSS_DIFFICULTY.multiplication.factor1.max
  );
  const b = randomInt(
    KOPFNUSS_DIFFICULTY.multiplication.factor2.min,
    KOPFNUSS_DIFFICULTY.multiplication.factor2.max
  );
  const answer = a * b;
  
  return {
    question: `${a} × ${b}`,
    answer: answer,
    metadata: {
      operation: 'multiplication',
      operands: [a, b],
      isKopfnuss: true
    }
  };
}

/**
 * Generate a high-difficulty division task for Kopfnuss Challenge
 * @returns {Task} Task object with question, answer, and metadata
 */
function generateKopfnussDivision() {
  const divisor = randomInt(
    KOPFNUSS_DIFFICULTY.division.divisor.min,
    KOPFNUSS_DIFFICULTY.division.divisor.max
  );
  const quotient = randomInt(
    KOPFNUSS_DIFFICULTY.division.quotient.min,
    KOPFNUSS_DIFFICULTY.division.quotient.max
  );
  
  // Calculate dividend to ensure whole number result
  const dividend = divisor * quotient;
  const answer = quotient;
  
  return {
    question: `${dividend} ÷ ${divisor}`,
    answer: answer,
    metadata: {
      operation: 'division',
      operands: [dividend, divisor],
      isKopfnuss: true
    }
  };
}

/**
 * Generate a high-difficulty squared task for Kopfnuss Challenge
 * @returns {Task} Task object with question, answer, and metadata
 */
function generateKopfnussSquared() {
  const base = randomInt(
    KOPFNUSS_DIFFICULTY.squared.min,
    KOPFNUSS_DIFFICULTY.squared.max
  );
  const answer = base * base;
  
  return {
    question: `${base}²`,
    answer: answer,
    metadata: {
      operation: 'squared',
      operands: [base],
      isKopfnuss: true
    }
  };
}

/**
 * Generate a mixed Kopfnuss task (randomly selects from all operation types)
 * @returns {Task} Task object with question, answer, and metadata
 */
function generateKopfnussMixed() {
  const generators = [
    generateKopfnussAddition,
    generateKopfnussSubtraction,
    generateKopfnussMultiplication,
    generateKopfnussDivision,
    generateKopfnussSquared
  ];
  
  // Validate generators array
  if (generators.length === 0) {
    throw new Error('No Kopfnuss generators available');
  }
  
  // Randomly select a generator
  const randomGenerator = generators[randomInt(0, generators.length - 1)];
  const task = randomGenerator();
  
  // Update metadata to indicate it's from mixed mode
  task.metadata.mixedMode = true;
  
  return task;
}

/**
 * Generate a Kopfnuss Challenge task (always mixed, high-difficulty)
 * @returns {Task} Task object with question, answer, and metadata
 */
export function generateKopfnussTask() {
  return generateKopfnussMixed();
}

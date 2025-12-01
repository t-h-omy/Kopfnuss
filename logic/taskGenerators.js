// Kopfnuss - Task Generators
// Generate mathematical tasks based on balancing values

import { BALANCING, KOPFNUSS_DIFFICULTY } from '../data/balancingLoader.js';

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
 * @returns {Object} Task object with question, answer, and metadata
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
 * @returns {Object} Task object with question, answer, and metadata
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
 * @returns {Object} Task object with question, answer, and metadata
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
 * @returns {Object} Task object with question, answer, and metadata
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
 * @returns {Object} Task object with question, answer, and metadata
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
 * @returns {Object} Task object with question, answer, and metadata
 */
export function generateMixed() {
  const generators = [
    generateAddition,
    generateSubtraction,
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
 * Generate a task based on operation type
 * @param {string} operationType - Type of operation (addition, subtraction, etc.)
 * @returns {Object} Task object with question, answer, and metadata
 */
export function generateTask(operationType) {
  switch (operationType) {
    case 'addition':
      return generateAddition();
    case 'subtraction':
      return generateSubtraction();
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

// ============================================
// KOPFNUSS CHALLENGE TASK GENERATORS
// High-difficulty variants for the Kopfnuss Challenge
// ============================================

/**
 * Generate a high-difficulty addition task for Kopfnuss Challenge
 * @returns {Object} Task object with question, answer, and metadata
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
 * @returns {Object} Task object with question, answer, and metadata
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
 * @returns {Object} Task object with question, answer, and metadata
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
 * @returns {Object} Task object with question, answer, and metadata
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
 * @returns {Object} Task object with question, answer, and metadata
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
 * @returns {Object} Task object with question, answer, and metadata
 */
function generateKopfnussMixed() {
  const generators = [
    generateKopfnussAddition,
    generateKopfnussSubtraction,
    generateKopfnussMultiplication,
    generateKopfnussDivision,
    generateKopfnussSquared
  ];
  
  // Randomly select a generator
  const randomGenerator = generators[randomInt(0, generators.length - 1)];
  const task = randomGenerator();
  
  // Update metadata to indicate it's from mixed mode
  task.metadata.mixedMode = true;
  
  return task;
}

/**
 * Generate a Kopfnuss Challenge task (always mixed, high-difficulty)
 * @returns {Object} Task object with question, answer, and metadata
 */
export function generateKopfnussTask() {
  return generateKopfnussMixed();
}

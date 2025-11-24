// Kopfnuss - Task Generators
// Generate mathematical tasks based on balancing values

import { BALANCING } from '../data/balancing.js';

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
 * Generate a power of 2 task
 * @returns {Object} Task object with question, answer, and metadata
 */
export function generatePowers() {
  const exponent = randomInt(
    BALANCING.powers.exponent.min,
    BALANCING.powers.exponent.max
  );
  const answer = Math.pow(2, exponent);
  
  return {
    question: `2^${exponent}`,
    answer: answer,
    metadata: {
      operation: 'powers',
      operands: [2, exponent]
    }
  };
}

/**
 * Generate a mixed (random operation) task
 * Note: Powers are excluded from mixed mode as they have a different difficulty level
 * @returns {Object} Task object with question, answer, and metadata
 */
export function generateMixed() {
  const generators = [
    generateAddition,
    generateSubtraction,
    generateMultiplication,
    generateDivision
    // Powers excluded - they're more advanced and have their own challenge
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
    case 'powers':
      return generatePowers();
    case 'mixed':
      return generateMixed();
    default:
      throw new Error(`Unknown operation type: ${operationType}`);
  }
}

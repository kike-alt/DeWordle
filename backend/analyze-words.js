#!/usr/bin/env node

// Simple analysis script
const fs = require('fs');

// Read the words
const words = fs.readFileSync('./data/5-letter-words.txt', 'utf-8')
  .split('\n')
  .map(w => w.trim().toLowerCase())
  .filter(w => w.length === 5);

console.log(`Analyzing ${words.length} words`);

// Test current logic
const commonLetters = 'aeiourstlnm';
const distributions = {};

// Count common letters in each word
words.forEach((word, index) => {
  let commonCount = 0;
  for (const letter of word) {
    if (commonLetters.includes(letter)) commonCount++;
  }
  
  if (!distributions[commonCount]) distributions[commonCount] = [];
  distributions[commonCount].push(word);
  
  // Show first few examples
  if (index < 20) {
    console.log(`${word}: ${commonCount} common letters`);
  }
});

console.log('\nDistribution by common letter count:');
Object.keys(distributions).sort((a, b) => Number(a) - Number(b)).forEach(count => {
  console.log(`${count} common letters: ${distributions[count].length} words`);
  if (distributions[count].length > 0) {
    console.log(`  Examples: ${distributions[count].slice(0, 5).join(', ')}`);
  }
});

// Current difficulty assignment
console.log('\nOld difficulty assignment (>=4 easy, >=2 medium, <2 hard):');
const oldDifficulties = { 1: 0, 2: 0, 3: 0 };
words.forEach(word => {
  let commonCount = 0;
  for (const letter of word) {
    if (commonLetters.includes(letter)) commonCount++;
  }
  
  if (commonCount >= 4) oldDifficulties[1]++;
  else if (commonCount >= 2) oldDifficulties[2]++;
  else oldDifficulties[3]++;
});

console.log(`Easy: ${oldDifficulties[1]} (${(oldDifficulties[1]/words.length*100).toFixed(1)}%)`);
console.log(`Medium: ${oldDifficulties[2]} (${(oldDifficulties[2]/words.length*100).toFixed(1)}%)`);
console.log(`Hard: ${oldDifficulties[3]} (${(oldDifficulties[3]/words.length*100).toFixed(1)}%)`);

// New difficulty assignment  
console.log('\nNew difficulty assignment (>=4 easy, >=3 medium, <3 hard):');
const newDifficulties = { 1: 0, 2: 0, 3: 0 };
words.forEach(word => {
  let commonCount = 0;
  for (const letter of word) {
    if (commonLetters.includes(letter)) commonCount++;
  }
  
  if (commonCount >= 4) newDifficulties[1]++;
  else if (commonCount >= 3) newDifficulties[2]++;
  else newDifficulties[3]++;
});

console.log(`Easy: ${newDifficulties[1]} (${(newDifficulties[1]/words.length*100).toFixed(1)}%)`);
console.log(`Medium: ${newDifficulties[2]} (${(newDifficulties[2]/words.length*100).toFixed(1)}%)`);
console.log(`Hard: ${newDifficulties[3]} (${(newDifficulties[3]/words.length*100).toFixed(1)}%)`);

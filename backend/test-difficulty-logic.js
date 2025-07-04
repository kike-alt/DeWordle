const fs = require('fs');
const path = require('path');

try {
  // Read words from file
  const filePath = path.join(process.cwd(), 'data', '5-letter-words.txt');
  console.log('Reading file from:', filePath);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  console.log('File content length:', fileContent.length);
  
  const words = fileContent
    .split('\n')
    .map(word => word.trim().toLowerCase())
    .filter(word => word.length === 5);

  console.log(`Total words: ${words.length}`);
  console.log('First 5 words:', words.slice(0, 5));

// Apply the same difficulty logic
const commonLetters = 'aeiourstlnm';
const difficultyStats = { 1: 0, 2: 0, 3: 0 };
const sampleWords = { 1: [], 2: [], 3: [] };

words.forEach(word => {
  let commonCount = 0;
  for (const letter of word) {
    if (commonLetters.includes(letter)) commonCount++;
  }
  
  let difficulty;
  if (commonCount >= 4) {
    difficulty = 1; // Easy - mostly common letters
  } else if (commonCount >= 2) {
    difficulty = 2; // Medium - some common letters
  } else {
    difficulty = 3; // Hard - few common letters
  }
  
  difficultyStats[difficulty]++;
  if (sampleWords[difficulty].length < 10) {
    sampleWords[difficulty].push(`${word} (${commonCount} common)`);
  }
});

console.log('\nDifficulty Distribution:');
console.log(`Easy (1): ${difficultyStats[1]} words`);
console.log(`Medium (2): ${difficultyStats[2]} words`);
console.log(`Hard (3): ${difficultyStats[3]} words`);

console.log('\nSample words for each difficulty:');
Object.keys(sampleWords).forEach(diff => {
  console.log(`\nDifficulty ${diff}:`);
  sampleWords[diff].forEach(word => console.log(`  ${word}`));
});

} catch (error) {
  console.error('Error:', error.message);
}

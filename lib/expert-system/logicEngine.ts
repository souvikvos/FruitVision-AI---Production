import { fruitRules } from './fruitRules';
import { recommendationRules } from './recommendations';
import { DetectionResult, TopMatch, FruitData } from './types';

// Stop words to prevent generic filler words from skewing scores
const STOP_WORDS: Set<string> = new Set([
    "fruit", "fruits", "a", "an", "the", "is", "this", "that", "it",
    "has", "have", "with", "and", "or", "but", "very", "slightly",
    "like", "of", "in", "on", "are", "some", "my"
]);

// Strong unique keywords
const STRONG_KEYWORDS = [
    "hairy", "spiky", "curved", "star-shaped", "pear-shaped", "cylindrical",
    "dragon fruit", "queen of fruits", "king of fruits", "largest fruit",
    "crown fruit", "wine fruit", "monkey fruit", "doctor fruit", "easy peel",
    "fuzzy", "cluster fruit", "water rich fruit", "circle", "red circle",
    "aam", "langra", "himsagar", "fazli", "kathal", "anarosh", "peyara", "pepe",
    "jamrul", "kothbel", "ata", "sitaphal", "chalta", "paniphal", "taal", "kalo jam", "jamun"
];

// Medium strength keywords
const MEDIUM_KEYWORDS = [
    "tropical", "berry", "citrus", "sweet", "juicy", "rough", 
    "soft", "hard", "round", "oval"
];

function preprocessInput(userInput: string): { words: string[], fullText: string } {
    const fullText = userInput.toLowerCase();
    const words = fullText.split(/\s+/)
        .map(w => w.replace(/[^a-z-]/g, ''))
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
    return { words, fullText };
}

function calculateScore(fruitName: string, fruitData: FruitData, words: string[], fullText: string): number {
    let score = 0;

    // Direct name matching gives a massive boost
    const nameRegex = new RegExp(`\\b${fruitName.toLowerCase()}\\b`);
    if (nameRegex.test(fullText)) {
        score += 40; 
    } else {
        // Smart Multi-Word Riddle Solver: Detects "dragon ... fruit" or "wood ... apple"
        const nameWords = fruitName.toLowerCase().split(' ');
        if (nameWords.length > 1 && nameWords.every(w => words.includes(w))) {
            score += 35;
        }
    }

    const matchedWords = new Set<string>();

    for (const category in fruitData) {
        const values = fruitData[category as keyof FruitData];
        if (Array.isArray(values)) {
            for (let value of values) {
                value = value.toLowerCase();

                // Exact phrase matching
                if (fullText.includes(value) && value.length > 3) {
                    if (STRONG_KEYWORDS.includes(value)) {
                        score += 10;
                    } else if (MEDIUM_KEYWORDS.includes(value)) {
                        score += 5;
                    } else {
                        score += 3;
                    }
                }

                // Individual word matching (deduplicated)
                const valueWords = value.split(/\s+/).map(w => w.replace(/[^a-z-]/g, ''));
                for (const word of valueWords) {
                    if (word.length > 2 && !STOP_WORDS.has(word) && words.includes(word) && !matchedWords.has(word)) {
                        matchedWords.add(word); // Deduplication prevents "sweet" from scoring 10 times
                        if (STRONG_KEYWORDS.includes(word)) {
                            score += 5;
                        } else if (MEDIUM_KEYWORDS.includes(word)) {
                            score += 2;
                        } else {
                            score += 1;
                        }
                    }
                }
            }
        }
    }

    return score;
}

function detectFruitInternal(userInput: string): { bestFruit: string | null, bestScore: number, fruitScores: Record<string, number> } {
    const { words, fullText } = preprocessInput(userInput);

    let bestFruit: string | null = null;
    let bestScore = 0;

    const fruitScores: Record<string, number> = {};

    for (const [fruitName, fruitData] of Object.entries(fruitRules)) {
        const score = calculateScore(fruitName, fruitData as FruitData, words, fullText);
        
        if (score > 0) {
            fruitScores[fruitName] = score;
        }
    }

    // Pure mathematical sort without any artificial tie-breakers
    const sortedFruits = Object.entries(fruitScores)
        .sort((a, b) => b[1] - a[1]);

    if (sortedFruits.length > 0) {
        bestFruit = sortedFruits[0][0];
        bestScore = sortedFruits[0][1];
    }

    return { bestFruit, bestScore, fruitScores };
}

function showTopMatches(fruitScores: Record<string, number>, topN: number = 5): TopMatch[] {
    const sortedFruits = Object.entries(fruitScores)
        .sort((a, b) => b[1] - a[1]);

    return sortedFruits.slice(0, topN).map(([fruit, score]) => ({ fruit, score }));
}

// Improved confidence system: Realistic non-linear curve
function confidencePercentage(bestScore: number): number {
    if (bestScore === 0) return 0;
    
    // Intermediate curve: not too strict, not too generous
    let percentage = (bestScore / (bestScore + 12)) * 100;
    
    // Moderate base bump
    percentage += 15;
    return Number(Math.min(percentage, 99.9).toFixed(2));
}

// Dynamic Ripeness and Nutrition Engine
function determineRipenessState(fullText: string): string {
    if (fullText.includes('unripe') || fullText.includes('green') || fullText.includes('raw') || fullText.includes('hard')) {
        return 'unripe';
    } else if (fullText.includes('overripe') || fullText.includes('rotten') || fullText.includes('mushy') || fullText.includes('spoiled')) {
        return 'overripe';
    } else if (fullText.includes('ripe') || fullText.includes('ready')) {
        return 'ripe';
    }
    return 'unknown';
}

function generateGenericRecommendation(fruitName: string, data: FruitData): string {
    const nutrition = data.nutrition && data.nutrition.length > 0 ? data.nutrition.join(' and ') : 'various nutrients';
    const taste = data.taste && data.taste.length > 0 ? data.taste[0] : 'delicious';
    const category = data.category && data.category.length > 0 ? data.category[0] : 'fruit';
    
    return `This is a ${category} known for being rich in ${nutrition}. It generally has a ${taste} flavor. Ripeness was not detected in the image/prompt, so general nutritional advice is provided.`;
}

// Wrapper for the frontend
export function detectFruit(userInput: string): DetectionResult {
    const { words, fullText } = preprocessInput(userInput);
    const { bestFruit, bestScore, fruitScores } = detectFruitInternal(userInput);
    const confidence = bestScore > 0 ? confidencePercentage(bestScore) : 0;
    const topMatches = showTopMatches(fruitScores);
    
    let recommendation = "Recommendation not available.";
    
    if (bestFruit && bestScore > 0) {
        const state = determineRipenessState(fullText);
        const fruitData = fruitRules[bestFruit as keyof typeof fruitRules] as FruitData;
        
        if (state === 'unknown') {
            recommendation = generateGenericRecommendation(bestFruit, fruitData);
        } else {
            const recKey = `${bestFruit}:${state}`;
            if (recommendationRules[recKey]) {
                recommendation = recommendationRules[recKey];
            } else if (recommendationRules[`${bestFruit}:ripe`]) {
                recommendation = recommendationRules[`${bestFruit}:ripe`];
            } else {
                 recommendation = generateGenericRecommendation(bestFruit, fruitData);
            }
        }
    }

    return {
        fruit: bestFruit,
        confidence,
        score: bestScore,
        topMatches,
        recommendation
    };
}

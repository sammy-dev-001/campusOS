/**
 * Transaction Parser
 * Parses natural language input to extract transaction details
 * e.g., "Rice and chicken 2500" -> { amount: 2500, category: "Food", remark: "Rice and chicken" }
 */

export interface ParsedTransaction {
    amount: number;
    category: string;
    remark: string;
    date: Date;
}

// Category keyword mappings
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Food': ['rice', 'food', 'amala', 'snacks', 'lunch', 'dinner', 'breakfast', 'suya', 'chicken', 'meat', 'fish', 'drink', 'water', 'coke', 'fanta', 'shawarma', 'burger', 'pizza', 'indomie', 'noodles', 'bread', 'eba', 'fufu', 'jollof', 'fried rice', 'beans', 'yam', 'plantain', 'egg', 'pap', 'akara', 'moi moi', 'puff puff', 'chin chin', 'biscuit', 'groundnut', 'popcorn', 'fruit', 'salad'],
    'Transport': ['bus', 'bike', 'uber', 'transport', 'taxi', 'bolt', 'okada', 'keke', 'tricycle', 'danfo', 'brt', 'fuel', 'petrol', 'diesel', 'fare', 'trip', 'ride', 'cab'],
    'Data': ['data', 'airtime', 'sub', 'subscription', 'internet', 'wifi', 'glo', 'mtn', 'airtel', '9mobile', 'etisalat', 'netflix', 'spotify', 'dstv', 'gotv', 'showmax'],
    'School': ['school', 'fees', 'tuition', 'books', 'textbook', 'notebook', 'pen', 'pencil', 'handout', 'photocopy', 'print', 'assignment', 'project', 'lab', 'uniform', 'hostel', 'accommodation'],
    'Shopping': ['clothes', 'shoe', 'shoes', 'bag', 'watch', 'phone', 'laptop', 'headphones', 'earphones', 'charger', 'case', 'shirt', 'trouser', 'jean', 'dress', 'skirt', 'blouse', 'cap', 'glasses', 'perfume', 'cream', 'makeup', 'jewelry'],
    'Health': ['hospital', 'clinic', 'medicine', 'drug', 'pharmacy', 'doctor', 'dentist', 'test', 'lab test', 'glasses', 'checkup', 'treatment', 'surgery', 'panadol', 'vitamin'],
    'Entertainment': ['movie', 'cinema', 'game', 'games', 'bet', 'betting', 'party', 'club', 'concert', 'show', 'ticket', 'event', 'outing', 'fun', 'hangout'],
    'Utilities': ['light', 'electricity', 'nepa', 'phcn', 'water', 'gas', 'cooking gas', 'kerosene', 'recharge'],
};

/**
 * Parse amount from text, handling "k" notation (e.g., "2k" = 2000)
 */
function parseAmount(text: string): { amount: number; textWithoutAmount: string } {
    // Match patterns like: 2500, 2,500, 2.5k, 2k, ₦2500, N2500
    const amountPatterns = [
        // "2.5k" or "2k" pattern
        /(\d+(?:\.\d+)?)\s*k\b/gi,
        // Currency prefixed: ₦2,500 or N2500
        /[₦N]\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gi,
        // Plain numbers with possible commas: 2,500 or 2500
        /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g,
        // Plain numbers without commas
        /\b(\d+(?:\.\d+)?)\b/g,
    ];

    let amount = 0;
    let textWithoutAmount = text;

    // Try each pattern
    for (const pattern of amountPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            const matchedText = match[0];
            let value = match[1] || match[0];

            // Remove currency symbols and commas
            value = value.replace(/[₦N,]/g, '');

            // Handle "k" notation
            if (matchedText.toLowerCase().includes('k')) {
                amount = parseFloat(value) * 1000;
            } else {
                const parsed = parseFloat(value);
                if (parsed > amount) {
                    amount = parsed;
                }
            }

            // Remove the amount from text for remark extraction
            textWithoutAmount = textWithoutAmount.replace(matchedText, '').trim();
        }

        if (amount > 0) break;
    }

    return { amount, textWithoutAmount };
}

/**
 * Detect category from text based on keywords
 */
function detectCategory(text: string): string {
    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            // Use word boundary matching for more accurate detection
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(lowerText)) {
                return category;
            }
        }
    }

    return 'Miscellaneous';
}

/**
 * Extract remark from text (clean up the remaining text)
 */
function extractRemark(text: string): string {
    // Clean up the text
    let remark = text
        .replace(/[₦N]/g, '') // Remove currency symbols
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/^\s*and\s*/i, '') // Remove leading "and"
        .replace(/\s*and\s*$/i, '') // Remove trailing "and"
        .trim();

    // Capitalize first letter
    if (remark.length > 0) {
        remark = remark.charAt(0).toUpperCase() + remark.slice(1);
    }

    return remark || 'Quick expense';
}

/**
 * Main parser function
 * Parses natural language transaction input
 */
export function parseTransactionString(text: string): ParsedTransaction | null {
    if (!text || text.trim().length === 0) {
        return null;
    }

    const trimmedText = text.trim();

    // Parse amount
    const { amount, textWithoutAmount } = parseAmount(trimmedText);

    if (amount <= 0) {
        return null; // No valid amount found
    }

    // Detect category
    const category = detectCategory(trimmedText);

    // Extract remark
    const remark = extractRemark(textWithoutAmount);

    return {
        amount,
        category,
        remark,
        date: new Date(),
    };
}

/**
 * Format amount with Naira symbol
 */
export function formatNaira(amount: number): string {
    return `₦${amount.toLocaleString('en-NG')}`;
}

/**
 * Get category emoji
 */
export function getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
        'Food': '🍛',
        'Transport': '🚗',
        'Data': '📱',
        'School': '📚',
        'Shopping': '🛍️',
        'Health': '🏥',
        'Entertainment': '🎬',
        'Utilities': '💡',
        'Miscellaneous': '📝',
    };
    return emojis[category] || '📝';
}

export default parseTransactionString;

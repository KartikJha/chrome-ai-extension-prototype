// document.getElementById('actionButton').addEventListener('click', async () => {
//   try {
//     // Example: Get current tab info
//     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

//     // Example: Execute script in current tab
//     const result = await chrome.scripting.executeScript({
//       target: { tabId: tab.id },
//       function: () => document.documentElement.outerHTML,
//     })

//     // Display result
//     document.getElementById('output').value = result[0].result
//   } catch (error) {
//     console.error('Error:', error)
//     document.getElementById('output').value = 'Error: ' + error.message
//   }
// })

const testContent = `France,[a] officially the French Republic,[b] is a country located primarily in Western Europe. Its overseas regions and territories include French Guiana in South America, Saint Pierre and Miquelon in the North Atlantic, the French West Indies, and many islands in Oceania and the Indian Ocean, giving it one of the largest discontiguous exclusive economic zones in the world. Metropolitan France shares borders with Belgium and Luxembourg to the north, Germany to the northeast, Switzerland to the east, Italy and Monaco to the southeast, Andorra and Spain to the south, and a maritime border with the United Kingdom to the northwest. Its metropolitan area extends from the Rhine to the Atlantic Ocean and from the Mediterranean Sea to the English Channel and the North Sea. Its eighteen integral regions (five of which are overseas) span a combined area of 643,801 km2 (248,573 sq mi) and have a total population of 68.4 million as of January 2024.[6][8] France is a semi-presidential republic with its capital in Paris, the country's largest city and main cultural and commercial centre.

Metropolitan France was settled during the Iron Age by Celtic tribes known as Gauls before Rome annexed the area in 51 BC, leading to a distinct Gallo-Roman culture. In the Early Middle Ages, the Franks formed the Kingdom of Francia, which became the heartland of the Carolingian Empire. The Treaty of Verdun of 843 partitioned the empire, with West Francia evolving into the Kingdom of France. In the High Middle Ages, France was a powerful but decentralized feudal kingdom, but from the mid-14th to the mid-15th centuries, France was plunged into a dynastic conflict with England known as the Hundred Years' War. In the 16th century, the French Renaissance saw culture flourish and a French colonial empire rise.[13] Internally, France was dominated by the conflict with the House of Habsburg and the French Wars of Religion between Catholics and Huguenots. France was successful in the Thirty Years' War and further increased its influence during the reign of Louis XIV.[14]

The French Revolution of 1789 overthrew the Ancien Régime and produced the Declaration of the Rights of Man, which expresses the nation's ideals to this day. France reached its political and military zenith in the early 19th century under Napoleon Bonaparte, subjugating part of continental Europe and establishing the First French Empire. The collapse of the empire initiated a period of relative decline, in which France endured the Bourbon Restoration until the founding of the French Second Republic which was succeeded by the Second French Empire upon Napoleon III's takeover. His empire collapsed during the Franco-Prussian War in 1870. This led to the establishment of the Third French Republic, and subsequent decades saw a period of economic prosperity and cultural and scientific flourishing known as the Belle Époque. France was one of the major participants of World War I, from which it emerged victorious at great human and economic cost. It was among the Allies of World War II, but it surrendered and was occupied in 1940. Following its liberation in 1944, the short-lived Fourth Republic was established and later dissolved in the course of the defeat in the Algerian War. The current Fifth Republic was formed in 1958 by Charles de Gaulle. Algeria and most French colonies became independent in the 1960s, with the majority retaining close economic and military ties with France.

France retains its centuries-long status as a global centre of art, science, and philosophy. It hosts the fourth-largest number of UNESCO World Heritage Sites and is the world's leading tourist destination, receiving 100 million foreign visitors in 2023.[15] A developed country, France has a high nominal per capita income globally, and its advanced economy ranks among the largest in the world. It is a great power,[16] being one of the five permanent members of the United Nations Security Council and an official nuclear-weapon state. France is a founding and leading member of the European Union and the eurozone,[17] as well as a member of the Group of Seven, North Atlantic Treaty Organization (NATO), Organisation for Economic Co-operation and Development (OECD), and Francophonie.`

document.getElementById('actionButton').addEventListener('click', () => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.active) {
        // Inject content.js into each active tab
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ['content.js'],
          },
          () => {
            console.log(`Content script injected into tab: ${tab.id}`)
          }
        )
      }
    })
  })
})

// Listen for messages from the content script
chrome.runtime.onMessage.addListener(async (message, sender) => {
  const textarea = document.getElementById('output')
  if (message.type === 'metaTagContent') {
    const { available, defaultTemperature, defaultTopK, maxTopK } =
      await ai.languageModel.capabilities()

    if (available !== 'no') {
      const session = await ai.languageModel.create()

      // Prompt the model and wait for the whole result to come back.
      const result = await session.prompt(
        `Based on the meta tags values provided, {tag_values: ${cleanStringArrayEnhanced(
          message.content
        )}},  generate a one word category for website these tags are attached to`
      )
      textarea.value += `Tab: ${sender.tab.title}\n\n Tags: ${result} \n\n---\n\n`
    }
  } else if (message.type === 'siteTextContent') {
    console.log(message.content)
    const canSummarize = await ai.summarizer.capabilities()
    let summarizer

    if (canSummarize && canSummarize.available !== 'no') {
      if (canSummarize.available === 'readily') {
        // The summarizer can immediately be used.
        summarizer = await ai.summarizer.create()
      } else {
        // The summarizer can be used after the model download.
        summarizer = await ai.summarizer.create()
        summarizer.addEventListener('downloadprogress', (e) => {
          console.log(e.loaded, e.total)
        })
        await summarizer.ready
      }
      const onlyEnglishText = await filterNonEnglishText(message.content);
      const result = await summarizer.summarize(testContent)
      textarea.value += `Summary of webpage: ${result}`
      console.log(result)
    } else {
      console.log(`Unable to summarize text`)
    }

  }
})

function cleanStringArrayEnhanced(arrayOfStrings, options = {}) {
  const {
    minLength = 3,
    caseSensitive = false,
    allowSpaces = false,
    removeDuplicates = true,
  } = options

  if (!Array.isArray(arrayOfStrings)) {
    throw new Error('Input must be an array')
  }

  // Create regex based on options
  const regexPattern = allowSpaces ? /^[a-zA-Z\s]+$/ : /^[a-zA-Z]+$/

  let cleaned = arrayOfStrings
    .map((item) => {
      // Convert to string and trim
      const str = String(item).trim()

      // Convert case if not case sensitive
      return caseSensitive ? str : str.toLowerCase()
    })
    .filter((str) => {
      // Basic validation
      if (!str) return false
      if (str.length <= minLength) return false

      // Check if string matches pattern
      return regexPattern.test(str)
    })

  // Remove duplicates if specified
  if (removeDuplicates) {
    cleaned = [...new Set(cleaned)]
  }

  return cleaned
}

/**
 * Filter non-English words and sentences from an array of strings
 * @param {string[]} inputArray - Array of strings to filter
 * @param {Object} options - Configuration options
 * @returns {string[]} - Filtered array containing only English text
 */
async function filterNonEnglishText(inputArray, options = {}) {
    // Default options
    const {
        minLength = 2,
        maxLength = 1000,
        removeNumbers = true,
        removeDuplicates = true,
        allowProperNouns = true,
        confidence = 0.8
    } = options;

    // Input validation
    if (!Array.isArray(inputArray)) {
        throw new Error('Input must be an array of strings');
    }

    // Common English words for basic validation
    const commonEnglishWords = new Set([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
        'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
        'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
        'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
        'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
        'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
        'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
        'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
        'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also'
    ]);

    // Regular expressions
    const numberRegex = /\d+/;
    const alphabetRegex = /^[a-zA-Z\s]+$/;
    const properNounRegex = /^[A-Z][a-z]+/;

    /**
     * Check if a word appears to be English
     * @param {string} word - Word to check
     * @returns {boolean} - True if the word appears to be English
     */
    function isLikelyEnglish(word) {
        word = word.toLowerCase().trim();
        
        // Check common English words
        if (commonEnglishWords.has(word)) {
            return true;
        }

        // Check for common English letter patterns
        const commonPatterns = [
            'th', 'ch', 'sh', 'ph', 'ing', 'tion', 'ed', 'ly', 'es', 's'
        ];
        
        if (commonPatterns.some(pattern => word.includes(pattern))) {
            return true;
        }

        // Check vowel to consonant ratio (English words typically have vowels)
        const vowels = (word.match(/[aeiou]/gi) || []).length;
        const ratio = vowels / word.length;
        return ratio >= 0.2 && ratio <= 0.6;
    }

    /**
     * Check if a sentence appears to be English
     * @param {string} sentence - Sentence to check
     * @returns {boolean} - True if the sentence appears to be English
     */
    function isLikelyEnglishSentence(sentence) {
        const words = sentence.split(/\s+/);
        
        // Too few or too many words
        if (words.length < 2 || words.length > 100) {
            return false;
        }

        // Check if enough words appear to be English
        const englishWordCount = words.filter(isLikelyEnglish).length;
    }

    // Process the input array
    let filtered = inputArray
        .map(item => {
            // Convert to string and trim
            if (typeof item !== 'string') return '';
            return item.trim();
        })
        .filter(str => {
            // Basic validation
            if (!str) return false;
            if (str.length < minLength || str.length > maxLength) return false;
            
            // Remove strings with numbers if specified
            if (removeNumbers && numberRegex.test(str)) return false;

            // Handle single words vs sentences
            const words = str.split(/\s+/);
            
            if (words.length === 1) {
                // Single word processing
                if (!alphabetRegex.test(str)) return false;
                
                // Allow proper nouns if specified
                if (allowProperNouns && properNounRegex.test(str)) return true;
                
                return isLikelyEnglish(str);
            } else {
                // Sentence processing
                return isLikelyEnglishSentence(str);
            }
        });

    // Remove duplicates if specified
    if (removeDuplicates) {
        filtered = [...new Set(filtered)];
    }

    return filtered;
}

// Example usage and testing
// async function testFilterNonEnglishText() {
//     const testCases = [
//         // Single words
//         "hello",
//         "bonjour",      // French
//         "Programming",
//         "こんにちは",    // Japanese
//         "Computer",
//         "café",         // French
        
//         // Proper nouns
//         "John",
//         "Paris",
//         "Microsoft",
        
//         // Sentences
//         "This is a valid English sentence.",
//         "Je ne parle pas français.",  // French
//         "The quick brown fox jumps over the lazy dog.",
//         "Das ist ein deutscher Satz.", // German
        
//         // Mixed content
//         "Hello world 123",
//         "Testing 测试 test",
        
//         // Edge cases
//         "",
//         "   ",
//         "123",
//         "!@#$",
//         "a",
//         "I"
//     ];

//     const options = {
//         minLength: 2,
//         maxLength: 1000,
//         removeNumbers: true,
//         removeDuplicates: true,
//         allowProperNouns: true,
//         confidence: 0.8
//     };

//     try {
//         const filtered = await filterNonEnglishText(testCases, options);
//         console.log('Original texts:', testCases);
//         console.log('Filtered texts:', filtered);
        
//         // Additional test cases
//         console.log('\nTesting with different options:');
        
//         const strictOptions = {
//             ...options,
//             allowProperNouns: false,
//             confidence: 0.9
//         };
//         const strictFiltered = await filterNonEnglishText(testCases, strictOptions);
//         console.log('Strict filtering:', strictFiltered);
        
//         const lenientOptions = {
//             ...options,
//             removeNumbers: false,
//             confidence: 0.6
//         };
//         const lenientFiltered = await filterNonEnglishText(testCases, lenientOptions);
//         console.log('Lenient filtering:', lenientFiltered);
        
//     } catch (error) {
//         console.error('Error during testing:', error);
//     }
// }

// Run the tests
// testFilterNonEnglishText();


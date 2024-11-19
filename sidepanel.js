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

let messageHandlerTriggered = false;
let timerId = null;

async function checkIfMessageHandlerHasTriggered() {
    if (messageHandlerTriggered) {
        console.log('Message handler has already been triggered.');
        document.getElementById('actionButton').textContent = 'Summarize';
        return true;
    } else {
        let data = null;
        try {
            data = await await getFromChromeStorageAsync('webPageContent')
            if (data) {
                console.log('Retrieved webPageContent:', data)
            } else {
                console.log('No data found for content.')
            }
        } catch (error) {
            console.error('Failed to retrieve data:', error)
        }
        const textArea = document.getElementById('output');
        textArea.disabled = true;
        await handleSiteTextContent({ content: data }, textArea);
    }
}

chrome.runtime.onMessage.addListener(async (message, sender) => {
  const textarea = document.getElementById('output');
  textarea.disabled = true;

  if (message.type === 'metaTagContent') {
    await handleMetaTagContent(message, sender, textarea);
  } else if (message.type === 'siteTextContent') {
    await handleSiteTextContent(message, textarea);
  }
});

async function handleMetaTagContent(message, sender, textarea) {
  const { available, defaultTemperature, defaultTopK, maxTopK } =
    await ai.languageModel.capabilities();

  if (available !== 'no') {
    const session = await ai.languageModel.create();

    // Prompt the model and wait for the whole result to come back.
    const result = await session.prompt(
      `Based on the meta tags values provided, {tag_values: ${cleanStringArrayEnhanced(
        message.content
      )}}, generate a one word category for website these tags are attached to`
    );
    textarea.value += `Tab: ${sender.tab.title}\n\n Tags: ${result} \n\n---\n\n`;
  }
}

async function handleSiteTextContent(message, textarea) {
  messageHandlerTriggered = true;
  clearTimeout(timerId);
  const canSummarize = await ai.summarizer.capabilities();
  let summarizer;

  if (canSummarize && canSummarize.available !== 'no') {
    if (canSummarize.available === 'readily') {
      // The summarizer can immediately be used.
      summarizer = await ai.summarizer.create();
    } else {
      // The summarizer can be used after the model download.
      summarizer = await ai.summarizer.create();
      summarizer.addEventListener('downloadprogress', (e) => {
        console.log(e.loaded, e.total);
      });
      await summarizer.ready;
    }

    const filteredWebPageContent = message.content.filter((c) => c);

    if (filteredWebPageContent.length) {
      try {
        await setToChromeStorageAsync('webPageContent', filteredWebPageContent);
        console.log('Data successfully saved!');
      } catch (error) {
        console.error('Failed to save data:', error);
      }

      textarea.value = '';

      const result = await summarizer.summarize(
        filteredWebPageContent.join('\n')
      );

      textarea.value += `Summary of webpage: \n\n${result}`;
      textarea.disabled = false;
      document.getElementById('actionButton').textContent = 'Summarize';
      console.log(result);
    }
  } else {
    console.log(`Unable to summarize text`);
  }
}


async function setToChromeStorageAsync(key, value) {
  return new Promise((resolve, reject) => {
    const data = { [key]: value }
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        console.error('Error setting data:', chrome.runtime.lastError)
        reject(chrome.runtime.lastError)
      } else {
        console.log(`Data saved: ${key} =`, value)
        resolve()
      }
    })
  })
}

async function getFromChromeStorageAsync(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting data:', chrome.runtime.lastError)
        reject(chrome.runtime.lastError)
      } else {
        console.log(`Data retrieved: ${key} =`, result[key])
        resolve(result[key] || null) // Resolve with the value or null if not found
      }
    })
  })
}

document.getElementById('actionButton').addEventListener('click', async (e) => {
  e.target.textContent = 'Summarizing'
  let sidePanelState = null;
  let data = null;

//   chrome.tabs.query({}, (tabs) => {
//     tabs.forEach((tab) => {
//       if (tab.active) {
//         // Inject content.js into each active tab
//         chrome.scripting.executeScript(
//           {
//             target: { tabId: tab.id },
//             files: ['clear_extension_data.js'],
//           },
//           () => {
//             console.log(`Content script injected into tab: ${tab.id}`)
//           }
//         )
//       }
//     })
//   })

//   try {
//     sidePanelState = await await getFromChromeStorageAsync('sidePanelOpened')
//     if (sidePanelState) {
//       console.log('Retrieved webPageContent:', sidePanelState)
//     } else {
//       console.log('No data found for content.')
//     }
//   } catch (error) {
//     console.error('Failed to retrieve data:', error)
//   }

//   if (sidePanelState) {
//    try {
//       data = await await getFromChromeStorageAsync('webPageContent')
//       if (data) {
//         console.log('Retrieved webPageContent:', data)
//       } else {
//         console.log('No data found for content.')
//       }
//     } catch (error) {
//       console.error('Failed to retrieve data:', error)
//     }
//   } else {
//     try {
//         await setToChromeStorageAsync(
//           'sidePanelOpened',
//           true
//         )
//         console.log('Data successfully saved!')
//       } catch (error) {
//         console.error('Failed to save data:', error)
//       }
//   }
 
  if (data) {
    chrome.runtime.sendMessage({
      type: 'siteTextContent',
      content: data,
    })
  } else {
    chrome.tabs.query({}, (tabs) => {
      timerId = setTimeout(() => {
        checkIfMessageHandlerHasTriggered()
      }, 5000)
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
    confidence = 0.8,
  } = options

  // Input validation
  if (!Array.isArray(inputArray)) {
    throw new Error('Input must be an array of strings')
  }

  // Common English words for basic validation
  const commonEnglishWords = new Set([
    'the',
    'be',
    'to',
    'of',
    'and',
    'a',
    'in',
    'that',
    'have',
    'i',
    'it',
    'for',
    'not',
    'on',
    'with',
    'he',
    'as',
    'you',
    'do',
    'at',
    'this',
    'but',
    'his',
    'by',
    'from',
    'they',
    'we',
    'say',
    'her',
    'she',
    'or',
    'an',
    'will',
    'my',
    'one',
    'all',
    'would',
    'there',
    'their',
    'what',
    'so',
    'up',
    'out',
    'if',
    'about',
    'who',
    'get',
    'which',
    'go',
    'me',
    'when',
    'make',
    'can',
    'like',
    'time',
    'no',
    'just',
    'him',
    'know',
    'take',
    'people',
    'into',
    'year',
    'your',
    'good',
    'some',
    'could',
    'them',
    'see',
    'other',
    'than',
    'then',
    'now',
    'look',
    'only',
    'come',
    'its',
    'over',
    'think',
    'also',
  ])

  // Regular expressions
  const numberRegex = /\d+/
  const alphabetRegex = /^[a-zA-Z\s]+$/
  const properNounRegex = /^[A-Z][a-z]+/

  /**
   * Check if a word appears to be English
   * @param {string} word - Word to check
   * @returns {boolean} - True if the word appears to be English
   */
  function isLikelyEnglish(word) {
    word = word.toLowerCase().trim()

    // Check common English words
    if (commonEnglishWords.has(word)) {
      return true
    }

    // Check for common English letter patterns
    const commonPatterns = [
      'th',
      'ch',
      'sh',
      'ph',
      'ing',
      'tion',
      'ed',
      'ly',
      'es',
      's',
    ]

    if (commonPatterns.some((pattern) => word.includes(pattern))) {
      return true
    }

    // Check vowel to consonant ratio (English words typically have vowels)
    const vowels = (word.match(/[aeiou]/gi) || []).length
    const ratio = vowels / word.length
    return ratio >= 0.2 && ratio <= 0.6
  }

  /**
   * Check if a sentence appears to be English
   * @param {string} sentence - Sentence to check
   * @returns {boolean} - True if the sentence appears to be English
   */
  function isLikelyEnglishSentence(sentence) {
    const words = sentence.split(/\s+/)

    // Too few or too many words
    if (words.length < 2 || words.length > 100) {
      return false
    }

    // Check if enough words appear to be English
    const englishWordCount = words.filter(isLikelyEnglish).length
  }

  // Process the input array
  let filtered = inputArray
    .map((item) => {
      // Convert to string and trim
      if (typeof item !== 'string') return ''
      return item.trim()
    })
    .filter((str) => {
      // Basic validation
      if (!str) return false
      if (str.length < minLength || str.length > maxLength) return false

      // Remove strings with numbers if specified
      if (removeNumbers && numberRegex.test(str)) return false

      // Handle single words vs sentences
      const words = str.split(/\s+/)

      if (words.length === 1) {
        // Single word processing
        if (!alphabetRegex.test(str)) return false

        // Allow proper nouns if specified
        if (allowProperNouns && properNounRegex.test(str)) return true

        return isLikelyEnglish(str)
      } else {
        // Sentence processing
        return isLikelyEnglishSentence(str)
      }
    })

  // Remove duplicates if specified
  if (removeDuplicates) {
    filtered = [...new Set(filtered)]
  }

  return filtered
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

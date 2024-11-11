async function requestMicrophonePermission() {
  await chrome.tabs.query(
    { active: true, currentWindow: true },
    async (tabs) => {
      console.log(JSON.stringify(tabs))
      await chrome.scripting.executeScript({
        target: { tabId: (tabs && tabs[0] && tabs[0].id) || 0 },
        func: async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            })
            console.log('Microphone permission granted.')

            // Stop the stream immediately to release the microphone
            stream.getTracks().forEach((track) => track.stop())
          } catch (error) {
            console.error('Microphone permission denied:', error)
          }
        },
      })
    }
  )
}


document.addEventListener("DOMContentLoaded", async function() {
    // Your code here
    console.log("DOM fully loaded and parsed");
    await requestMicrophonePermission()
});
// requestMicrophonePermission()

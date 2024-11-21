async function requestMicrophonePermission() {
  await chrome.tabs.query(
    { active: true, currentWindow: true },
    async (tabs) => {
      // console.log(JSON.stringify(tabs))
      await chrome.scripting.executeScript({
        target: { tabId: (tabs && tabs[0] && tabs[0].id) || 0 },
        func: async () => {
          const constraints = { audio: true }
          try {
            // const stream = await navigator.mediaDevices.getUserMedia(constraints)

            const stream = await navigator.mediaDevices.getUserMedia(
              constraints
            )

            // background.js

            // Listen for messages from the popup or content scripts (if any)
            chrome.runtime.onMessage.addListener(
              (message, sender, sendResponse) => {

                console.log(message);

                const mediaRecorder = new MediaRecorder(stream)
                mediaRecorder.start()

                setTimeout(() => {
                  mediaRecorder.stop()
                }, 15000)

                const audioChunks = []
                mediaRecorder.addEventListener('dataavailable', (event) => {
                  audioChunks.push(event.data)
                })

                mediaRecorder.addEventListener('stop', () => {
                  const audioBlob = new Blob(audioChunks)
                  const audioUrl = URL.createObjectURL(audioBlob)
                  console.log('Audio URL:', audioUrl)
                  const audio = new Audio(audioUrl)
                  audio.play()
                })

                if (message.type === 'logInput') {
                  console.log('User Input Logged: ', message.input)
                }

                stream.getTracks().forEach((track) => track.stop())
              }
            )

            console.log('Microphone permission granted.')

            // Stop the stream immediately to release the microphone
            
          } catch (error) {
            console.error('Microphone permission denied:', error)
          }
        },
      })
    }
  )
}

document.addEventListener('DOMContentLoaded', async function () {
  // Your code here
  console.log('DOM fully loaded and parsed')
  await requestMicrophonePermission()
})
// requestMicrophonePermission()

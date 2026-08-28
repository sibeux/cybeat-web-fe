import { watchEffect } from 'vue'

export function useTitle(titleFn: () => string) {
  watchEffect(() => {
    const title = titleFn()
    
    // THE CHROMIUM DESYNC BUG:
    // When navigating back via history (popstate), Chromium natively sets the 
    // browser tab title to the history state's title (e.g. "Cybeat").
    // However, JS `document.title` might STILL hold the old page's title (e.g. "Song Name").
    // When Vue evaluates the new title (which is also "Song Name" because music is still playing),
    // it executes `document.title = "Song Name"`.
    // Because `document.title` is ALREADY "Song Name" in JS, the browser treats it as a NO-OP!
    // As a result, the tab title remains stuck on the history state ("Cybeat"), while JS thinks it's correct.
    // 
    // THE FIX: "Title Toggle Hack"
    // We force a DOM mutation by temporarily setting the title to something slightly different
    // (appending a zero-width space), and then immediately setting it to the actual title.
    // This forces the browser to synchronize the tab title with the DOM.

    document.title = title + '\u200B' // Append Zero-Width Space to force mutation
    
    setTimeout(() => {
      document.title = title
    }, 50)
  })
}



